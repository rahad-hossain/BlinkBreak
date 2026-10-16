import { safeStorage, shell } from "electron";
import Store from "electron-store";
import { randomUUID } from "crypto";
import {
  GithubAccount,
  GithubAccountStats,
  GithubDeviceCode,
  GithubPullRequest,
  GithubCommit,
  WidgetSettings,
} from "@shared/types";
import { SettingsManager } from "./storage";

/**
 * OAuth App client ID for GitHub's device flow. Client IDs are public; device
 * flow needs no client secret, so none is stored in the app.
 */
const GITHUB_CLIENT_ID = "Ov23lih2IFTxxD27oR60";

const API = "https://api.github.com/graphql";

export const DEFAULT_WIDGET: WidgetSettings = {
  enabled: false,
  refreshMinutes: 15,
  repoCount: 8,
  opacity: 85,
  color: "#18181e",
  blur: false,
  blurStrength: 16,
  repoBranches: {},
  showAvatars: true,
  accounts: [],
};

const QUERY = `query($count: Int!) {
  viewer {
    login
    repositories(first: $count, orderBy: { field: PUSHED_AT, direction: DESC },
                 ownerAffiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
      nodes {
        nameWithOwner
        url
        isPrivate
        pushedAt
        stargazerCount
        primaryLanguage { name color }
        pullRequests(states: OPEN, first: 3, orderBy: { field: CREATED_AT, direction: DESC }) {
          totalCount
          nodes { ...pr }
        }
        issues(states: OPEN, first: 3, orderBy: { field: CREATED_AT, direction: DESC }) {
          totalCount
          nodes { title number url createdAt author { login avatarUrl(size: 48) } }
        }
        defaultBranchRef {
          name
          target { ... on Commit { history(first: 3) { nodes { ...commit } } } }
        }
        refs(refPrefix: "refs/heads/", first: 6, orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
          totalCount
          nodes { name target { ... on Commit { history(first: 3) { nodes { ...commit } } } } }
        }
      }
    }
  }
  reviews: search(query: "is:pr is:open review-requested:@me", type: ISSUE, first: 5) {
    issueCount
    nodes { ...pr }
  }
}

fragment pr on PullRequest {
  title number url createdAt isDraft reviewDecision baseRefName headRefName
  author { login avatarUrl(size: 48) }
  repository { nameWithOwner }
}

fragment commit on Commit {
  messageHeadline committedDate url
  author { name user { login avatarUrl(size: 48) } }
}`;

const mapPr = (p: any): GithubPullRequest => ({
  title: p.title,
  number: p.number,
  url: p.url,
  author: p.author?.login ?? "ghost",
  avatar: p.author?.avatarUrl,
  createdAt: p.createdAt,
  baseRef: p.baseRefName,
  headRef: p.headRefName,
  isDraft: p.isDraft,
  review: p.reviewDecision ?? null,
  repo: p.repository?.nameWithOwner ?? "",
});

const mapCommit = (c: any): GithubCommit => ({
  message: c.messageHeadline,
  author: c.author?.user?.login ?? c.author?.name ?? "unknown",
  avatar: c.author?.user?.avatarUrl,
  date: c.committedDate,
  url: c.url,
});

/**
 * GitHub accounts for the desktop widget.
 *
 * Privacy: sign-in happens on github.com (device flow), so BlinkBreak never
 * sees passwords. Tokens are encrypted with the OS keychain (DPAPI on
 * Windows) in a separate store and never leave the main process. Repository
 * data is kept in memory only. The only hosts contacted are github.com and
 * api.github.com.
 */
export class GithubManager {
  private secrets = new Store<{ tokens: Record<string, string> }>({
    name: "secrets",
    defaults: { tokens: {} },
  });
  private stats: GithubAccountStats[] = [];
  private timer: NodeJS.Timeout | null = null;
  private paused = false;
  private pendingLogin: AbortController | null = null;
  private avatars = new Map<string, string>(); // avatar URL -> data URL, memory only

  constructor(
    private settingsManager: SettingsManager,
    private onStats: (stats: GithubAccountStats[]) => void,
  ) {}

  isConfigured(): boolean {
    return GITHUB_CLIENT_ID.length > 0;
  }

  getSettings(): WidgetSettings {
    return { ...DEFAULT_WIDGET, ...this.settingsManager.getSettings().widget };
  }

  saveSettings(patch: Partial<WidgetSettings>): WidgetSettings {
    const settings = this.settingsManager.getSettings();
    settings.widget = { ...this.getSettings(), ...patch };
    this.settingsManager.saveSettings(settings);
    this.schedule();
    return settings.widget;
  }

  getStats(): GithubAccountStats[] {
    return this.stats;
  }

  // Sign-in (OAuth device flow)

  /** Starts sign-in; returns the code the user enters on github.com. */
  async startLogin(label: string, includePrivate: boolean): Promise<GithubDeviceCode> {
    if (!this.isConfigured()) throw new Error("GitHub sign-in is not configured.");
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error("Secure storage is unavailable, so the account cannot be saved safely.");
    }

    const res = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, scope: includePrivate ? "repo" : "" }),
    });
    const data = await res.json();
    if (!res.ok || !data.device_code) throw new Error(data.error_description ?? "Could not start sign-in.");

    shell.openExternal(data.verification_uri);
    this.pollForToken(data.device_code, data.interval, data.expires_in, label, includePrivate);
    return { userCode: data.user_code, verificationUri: data.verification_uri, expiresIn: data.expires_in };
  }

  cancelLogin() {
    this.pendingLogin?.abort();
    this.pendingLogin = null;
  }

  private async pollForToken(
    deviceCode: string,
    interval: number,
    expiresIn: number,
    label: string,
    includePrivate: boolean,
  ) {
    this.cancelLogin();
    const controller = new AbortController();
    this.pendingLogin = controller;
    const deadline = Date.now() + expiresIn * 1000;
    let wait = interval * 1000;

    while (!controller.signal.aborted && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, wait));
      if (controller.signal.aborted) return;

      const res = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: GITHUB_CLIENT_ID,
          device_code: deviceCode,
          grant_type: "urn:ietf:params:oauth:grant-type:device_code",
        }),
        signal: controller.signal,
      }).catch(() => null);
      const data = res ? await res.json().catch(() => ({})) : {};

      if (data.access_token) {
        await this.addAccount(label, data.access_token, includePrivate);
        this.pendingLogin = null;
        return;
      }
      if (data.error === "slow_down") wait += 5000;
      else if (data.error && data.error !== "authorization_pending") break; // denied or expired
    }
    this.pendingLogin = null;
  }

  private async addAccount(label: string, token: string, includePrivate: boolean) {
    const id = randomUUID();
    const tokens = this.secrets.get("tokens");
    tokens[id] = safeStorage.encryptString(token).toString("base64");
    this.secrets.set("tokens", tokens);

    const login = await this.fetchLogin(token).catch(() => "");
    const account: GithubAccount = { id, label: label || login, login, includePrivate };
    this.saveSettings({ accounts: [...this.getSettings().accounts, account] });
    this.refresh();
  }

  removeAccount(id: string) {
    const tokens = this.secrets.get("tokens");
    delete tokens[id];
    this.secrets.set("tokens", tokens);
    this.stats = this.stats.filter((s) => s.accountId !== id);
    this.saveSettings({ accounts: this.getSettings().accounts.filter((a) => a.id !== id) });
    this.onStats(this.stats);
  }

  private token(id: string): string | null {
    const encrypted = this.secrets.get("tokens")[id];
    if (!encrypted) return null;
    try {
      return safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    } catch {
      return null;
    }
  }

  // Data

  private async graphql(token: string, query: string, variables: object = {}) {
    const res = await fetch(API, {
      method: "POST",
      headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    if (res.status === 401) throw new Error("Access was revoked. Remove the account and sign in again.");
    const data = await res.json();
    if (data.errors?.length) throw new Error(data.errors[0].message);
    return data.data;
  }

  private async fetchLogin(token: string): Promise<string> {
    return (await this.graphql(token, "query { viewer { login } }")).viewer.login;
  }

  /** One request per account. */
  async refresh(): Promise<GithubAccountStats[]> {
    const { accounts, repoCount } = this.getSettings();
    this.stats = await Promise.all(
      accounts.map(async (account): Promise<GithubAccountStats> => {
        const base = { accountId: account.id, label: account.label, login: account.login, updatedAt: Date.now() };
        const token = this.token(account.id);
        if (!token) return { ...base, repos: [], reviews: [], reviewRequests: 0, error: "Sign in again." };
        try {
          const data = await this.graphql(token, QUERY, { count: repoCount });
          return {
            ...base,
            reviewRequests: data.reviews.issueCount,
            reviews: data.reviews.nodes.filter((p: any) => p?.title).map(mapPr),
            repos: data.viewer.repositories.nodes
              .filter((r: any) => account.includePrivate || !r.isPrivate)
              .map((r: any) => {
                const defaultCommits = (r.defaultBranchRef?.target?.history?.nodes ?? []).map(mapCommit);
                const branches = (r.refs?.nodes ?? []).map((b: any) => ({
                  name: b.name,
                  commits: (b.target?.history?.nodes ?? []).map(mapCommit),
                }));
                // Make sure the default branch is always selectable
                if (r.defaultBranchRef && !branches.some((b: any) => b.name === r.defaultBranchRef.name)) {
                  branches.push({ name: r.defaultBranchRef.name, commits: defaultCommits });
                }
                return {
                  name: r.nameWithOwner,
                  url: r.url,
                  isPrivate: r.isPrivate,
                  pushedAt: r.pushedAt,
                  stars: r.stargazerCount,
                  language: r.primaryLanguage,
                  openPullRequests: r.pullRequests.totalCount,
                  openIssues: r.issues.totalCount,
                  pullRequests: r.pullRequests.nodes.map(mapPr),
                  issues: r.issues.nodes.map((i: any) => ({
                    title: i.title,
                    number: i.number,
                    url: i.url,
                    author: i.author?.login ?? "ghost",
                    avatar: i.author?.avatarUrl,
                    createdAt: i.createdAt,
                  })),
                  lastCommit: defaultCommits[0] ?? null,
                  defaultBranch: r.defaultBranchRef?.name ?? "",
                  branchCount: r.refs?.totalCount ?? 0,
                  branches,
                };
              }),
          };
        } catch (error: any) {
          return { ...base, repos: [], reviews: [], reviewRequests: 0, error: error.message };
        }
      }),
    );
    await this.embedAvatars(this.stats);
    this.onStats(this.stats);
    return this.stats;
  }

  /**
   * Replaces avatar URLs with data URLs so the widget never loads anything from
   * the network. Downloads only from GitHub's avatar host, once per URL, and
   * keeps them in memory. With profile pictures off, avatars are removed.
   */
  private async embedAvatars(stats: GithubAccountStats[]) {
    const show = this.getSettings().showAvatars;
    const items: { avatar?: string }[] = [];
    for (const a of stats) {
      items.push(...a.reviews);
      for (const r of a.repos) {
        items.push(...r.pullRequests, ...r.issues);
        if (r.lastCommit) items.push(r.lastCommit);
        r.branches.forEach((b) => items.push(...b.commits));
      }
    }

    const wanted = new Set(
      items.map((i) => i.avatar).filter((u): u is string => !!u && /^https:\/\/avatars\.githubusercontent\.com\//.test(u)),
    );
    if (show) {
      await Promise.all(
        [...wanted].filter((u) => !this.avatars.has(u)).map(async (url) => {
          try {
            const res = await fetch(url);
            if (!res.ok) return;
            const type = res.headers.get("content-type") ?? "image/png";
            if (!type.startsWith("image/")) return;
            const data = Buffer.from(await res.arrayBuffer()).toString("base64");
            this.avatars.set(url, `data:${type};base64,${data}`);
          } catch {
            // fall back to initials
          }
        }),
      );
    }
    for (const item of items) item.avatar = show && item.avatar ? this.avatars.get(item.avatar) : undefined;
  }

  /** Refreshes on the configured interval while the widget is on and the PC is in use. */
  schedule() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const { enabled, accounts, refreshMinutes } = this.getSettings();
    if (!enabled || accounts.length === 0) return;
    this.timer = setInterval(() => {
      if (!this.paused) this.refresh();
    }, refreshMinutes * 60_000);
  }

  /** Pause while the PC is locked or asleep; refresh once on return. */
  setPaused(paused: boolean) {
    const resumed = this.paused && !paused;
    this.paused = paused;
    if (resumed && this.getSettings().enabled) this.refresh();
  }

  destroy() {
    if (this.timer) clearInterval(this.timer);
    this.cancelLogin();
  }
}
