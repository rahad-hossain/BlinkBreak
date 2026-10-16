export type BreakMode = "hard" | "soft" | "smart";
export type Theme = "dark-neon" | "white";

export interface Settings {
  mode: BreakMode;
  interval: number; // minutes
  duration: number; // seconds
  autoLaunch: boolean;
  theme: Theme;
  blueLightFilter: {
    enabled: boolean;
    intensity: number;
    schedule: boolean;
    startTime: string;
    endTime: string;
  };
  colorMask: {
    enabled: boolean;
    intensity: number;
    red: number;
    green: number;
    blue: number;
  };
  postureReminder: {
    enabled: boolean;
    interval: number;
  };
  hydrationReminder: {
    enabled: boolean;
    interval: number;
  };
  sounds: {
    enabled: boolean;
    break: string | null;
    posture: string | null;
    hydration: string | null;
  };
  focusMode: {
    enabled: boolean;
    blockedDomains: string[];
    pomodoroLength: number;
    shortBreak: number;
    longBreak: number;
  };
  smartModeWhitelist: string[];
  taskbar?: TaskbarSettings;
  widget?: WidgetSettings;
}

export type TaskbarMode = "default" | "clear" | "blur" | "acrylic" | "solid";

// Desktop widget (GitHub). Tokens are not part of settings; they are stored
// encrypted by the main process and never sent to renderers.
export interface GithubAccount {
  id: string;
  label: string;
  login: string;
  includePrivate: boolean;
}

export interface WidgetSettings {
  enabled: boolean;
  refreshMinutes: number;
  repoCount: number;
  opacity: number; // 0-100
  color: string; // background colour, "#RRGGBB"
  blur: boolean; // blurred desktop wallpaper behind the widget
  blurStrength: number; // 0-40 px
  repoBranches: Record<string, string>; // repo "owner/name" -> tracked branch; missing = repo default
  showAvatars: boolean; // contributor profile pictures (fetched by the main process)
  accounts: GithubAccount[];
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface GithubPullRequest {
  title: string;
  number: number;
  url: string;
  author: string;
  createdAt: string;
  avatar?: string; // data URL
  baseRef: string;
  headRef: string;
  isDraft: boolean;
  review: "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | null;
  repo: string;
}

export interface GithubIssue {
  title: string;
  number: number;
  url: string;
  author: string;
  avatar?: string;
  createdAt: string;
}

export interface GithubCommit {
  message: string;
  author: string;
  date: string;
  url: string;
  avatar?: string;
}

export interface GithubBranch {
  name: string;
  commits: GithubCommit[]; // newest first
}

export interface GithubRepoStats {
  name: string;
  url: string;
  isPrivate: boolean;
  pushedAt: string;
  stars: number;
  language: { name: string; color: string } | null;
  openPullRequests: number;
  openIssues: number;
  pullRequests: GithubPullRequest[];
  issues: GithubIssue[];
  lastCommit: GithubCommit | null;
  defaultBranch: string;
  branchCount: number;
  branches: GithubBranch[]; // most recently updated first
}

export interface GithubAccountStats {
  accountId: string;
  label: string;
  login: string;
  reviewRequests: number;
  reviews: GithubPullRequest[];
  repos: GithubRepoStats[];
  updatedAt: number;
  error?: string;
}

export interface GithubDeviceCode {
  userCode: string;
  verificationUri: string;
  expiresIn: number;
}

export interface TaskbarSettings {
  mode: TaskbarMode;
  color: string; // tint or solid colour, "#RRGGBB"
  opacity: number; // tint strength, 0-100
  blur: number; // blur strength for blur and acrylic, 0-60
  layout: "full" | "adaptive"; // adaptive wraps the icons and the tray, dock style
  iconScale: number; // centre icon size in percent: 100 normal, 112 medium, 125 large
}

export interface Statistics {
  totalBreaksTaken: number;
  totalBreaksSkipped: number;
  currentStreak: number;
  longestStreak: number;
  lastBreakDate: string;
  dailyStats: DailyStats[];
  weeklyStats: WeeklyStats[];
  monthlyStats: MonthlyStats[];
  weekComparison: WeekComparison;
  recentActivity: BreakEvent[];
}

export interface BreakEvent {
  timestamp: number; // Unix timestamp
  type: "taken" | "skipped";
  duration: number; // seconds
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  breaksTaken: number;
  breaksSkipped: number;
  screenTime: number; // minutes
  completionRate: number; // percentage
}

export interface WeeklyStats {
  weekStart: string; // YYYY-MM-DD (Monday)
  breaksTaken: number;
  breaksSkipped: number;
  screenTime: number;
  completionRate: number;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  breaksTaken: number;
  breaksSkipped: number;
  screenTime: number;
  completionRate: number;
}

export interface WeekComparison {
  currentWeek: {
    breaksTaken: number;
    completionRate: number;
  };
  previousWeek: {
    breaksTaken: number;
    completionRate: number;
  };
  improvement: {
    breaks: number; // difference
    breaksPercent: number; // percentage change
    completionRate: number; // difference in percentage points
  };
}

export interface ElectronAPI {
  // Settings
  getSettings: () => Promise<Settings>;

  // Theme
  setTheme: (theme: Theme) => void;

  // Timer
  startTimer: (interval: number, duration: number, mode: BreakMode) => void;
  stopTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipBreak: () => void;
  getTimerStatus: () => Promise<TimerStatus>;
  onTimerStatus: (callback: (status: TimerStatus) => void) => void;
  onBreakStart: (
    callback: (data: { mode: BreakMode; duration: number }) => void,
  ) => void;
  onBreakEnd: (callback: () => void) => void;

  // Tray
  onTrayTogglePause: (callback: () => void) => void;
  onUpdateTray: (callback: (status: TimerStatus) => void) => void;
  updateTrayStatus: (status: TimerStatus) => void;

  // Auto-launch
  getAutoLaunchStatus: () => Promise<boolean>;
  enableAutoLaunch: () => Promise<{ success: boolean; error?: any }>;
  disableAutoLaunch: () => Promise<{ success: boolean; error?: any }>;

  // Statistics
  getStatistics: () => Promise<Statistics>;
  recordBreakTaken: (duration: number) => Promise<void>;
  recordBreakSkipped: (duration: number) => Promise<void>;

  // Blue Light Filter
  enableBlueLightFilter: (intensity: number) => void;
  disableBlueLightFilter: () => void;
  updateBlueLightIntensity: (intensity: number) => void;

  // Color Mask
  enableColorMask: (
    intensity: number,
    red: number,
    green: number,
    blue: number,
  ) => void;
  disableColorMask: () => void;
  updateColorMask: (
    intensity: number,
    red: number,
    green: number,
    blue: number,
  ) => void;

  // Desktop widget
  getWidgetSettings: () => Promise<{ settings: WidgetSettings; configured: boolean }>;
  saveWidgetSettings: (patch: Partial<WidgetSettings>) => Promise<WidgetSettings>;
  setWidgetEnabled: (enabled: boolean) => Promise<void>;
  githubStartLogin: (label: string, includePrivate: boolean) => Promise<GithubDeviceCode>;
  githubCancelLogin: () => void;
  githubRemoveAccount: (id: string) => Promise<void>;
  githubRefresh: () => Promise<void>;
  githubGetStats: () => Promise<GithubAccountStats[]>;
  onWidgetSettings: (callback: (settings: WidgetSettings) => void) => void;
  onGithubStats: (callback: (stats: GithubAccountStats[]) => void) => void;
  onWidgetData: (callback: (data: { stats: GithubAccountStats[]; opacity: number; color: string; blur: boolean; blurStrength: number; wallpaper: string | null; repoBranches: Record<string, string>; showAvatars: boolean }) => void) => void;
  onWidgetGeometry: (callback: (geo: { x: number; y: number; width: number; height: number }) => void) => void;
  openWidgetLink: (url: string) => void;

  // Taskbar appearance
  getTaskbarSettings: () => Promise<{ settings: TaskbarSettings; available: boolean }>;
  setTaskbarStyle: (style: TaskbarSettings) => Promise<boolean>;

  // Monitor Controls
  setMonitorBrightness: (value: number) => Promise<boolean>;
  setMonitorContrast: (value: number) => Promise<boolean>;
  getMonitorBrightness: () => Promise<number>;

  // Reminders
  setReminderConfig: (
    type: "posture" | "hydration",
    enabled: boolean,
    intervalMinutes: number,
  ) => void;
  snoozeReminder: (type: "posture" | "hydration", minutes: number) => void;

  // Sounds
  pickSoundFile: () => Promise<string | null>;
  setSoundConfig: (config: {
    enabled: boolean;
    break: string | null;
    posture: string | null;
    hydration: string | null;
  }) => void;

  // Smart Mode
  setSmartMode: (enabled: boolean) => void;
  setManualMeeting: (inMeeting: boolean) => void;
  getSmartModeStatus: () => Promise<{
    enabled: boolean;
    inMeeting: boolean;
    detectedBy: string | null;
    manualOverride: boolean;
  }>;
  onSmartModeStatus: (
    callback: (status: {
      enabled: boolean;
      inMeeting: boolean;
      detectedBy: string | null;
      manualOverride: boolean;
    }) => void,
  ) => void;
  setSmartModeWhitelist: (list: string[]) => void;
  getSmartModeWhitelist: () => Promise<string[]>;

  // Focus Mode / Website Blocker
  setFocusMode: (
    enabled: boolean,
  ) => Promise<{ success: boolean; error?: string; needsElevation?: boolean }>;
  setBlockedDomains: (
    domains: string[],
  ) => Promise<{ success: boolean; error?: string }>;
  getBlockedDomains: () => Promise<string[]>;
  getFocusModeStatus: () => Promise<boolean>;
  getHostsWriteAccess: () => Promise<boolean>;
}

export interface TimerStatus {
  isRunning: boolean;
  isPaused: boolean;
  remainingTime: number;
  interval: number;
  duration: number;
  mode: BreakMode;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
