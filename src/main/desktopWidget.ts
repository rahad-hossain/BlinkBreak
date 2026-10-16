import { BrowserWindow, screen, shell } from "electron";
import fs from "fs";
import path from "path";
import { GithubAccountStats } from "@shared/types";
import { GithubManager } from "./github";

/**
 * The widget always sits behind other windows, so the desktop wallpaper is
 * what is behind it. Blur is drawn from the wallpaper file itself; Windows
 * blur accents do not apply to Electron's transparent windows.
 */
function readWallpaper(): string | null {
  const candidates = [
    path.join(process.env.APPDATA ?? "", "Microsoft/Windows/Themes/TranscodedWallpaper"),
  ];
  for (const file of candidates) {
    try {
      const data = fs.readFileSync(file);
      const png = data[0] === 0x89 && data[1] === 0x50;
      return `data:image/${png ? "png" : "jpeg"};base64,${data.toString("base64")}`;
    } catch {
      // try the next location
    }
  }
  return null;
}

const WIDTH = 579;
const HEIGHT = 439;
const MARGIN = 12; // gap from the screen's top-right corner
/**
 * Desktop widget window: frameless, translucent, resizable, kept behind normal
 * windows and out of the taskbar. It opens in the top-right corner of the screen
 * it was last on, and a size chosen by the user is remembered.
 */
export class DesktopWidgetManager {
  private window: BrowserWindow | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  private wallpaper: string | null = null; // data URL, read from a local file only

  constructor(private github: GithubManager) {}

  init() {
    if (this.github.getSettings().enabled) this.show();
  }

  setEnabled(enabled: boolean) {
    this.github.saveSettings({ enabled });
    if (enabled) {
      this.show();
      this.github.refresh();
    } else {
      this.hide();
    }
  }

  /** Sends repository data and appearance settings to the widget. */
  push(stats: GithubAccountStats[]) {
    if (!this.window || this.window.isDestroyed()) return;
    const { opacity, color, blur, blurStrength, repoBranches, showAvatars } = this.github.getSettings();
    if (blur && !this.wallpaper) this.wallpaper = readWallpaper();
    this.window.webContents.send("widget-data", { stats, opacity, color, blur, blurStrength, wallpaper: blur ? this.wallpaper : null, repoBranches, showAvatars });
    this.pushGeometry();
  }

  /** Tells the widget where it sits on its display, so the wallpaper lines up. */
  private pushGeometry() {
    if (!this.window || this.window.isDestroyed()) return;
    const win = this.window.getBounds();
    const display = screen.getDisplayMatching(win).bounds;
    this.window.webContents.send("widget-geometry", {
      x: win.x - display.x,
      y: win.y - display.y,
      width: display.width,
      height: display.height,
    });
  }
  /** Only GitHub web pages may be opened from the widget. */
  openLink(url: string) {
    if (/^https:\/\/github\.com\//.test(url)) shell.openExternal(url);
  }

  private show() {
    if (this.window && !this.window.isDestroyed()) return;

    // Snap to the top-right corner of the screen the widget was last on
    const { x, y, width, height } = this.github.getSettings();
    const display = x !== undefined && y !== undefined ? screen.getDisplayNearestPoint({ x, y }) : screen.getPrimaryDisplay();
    const w = width ?? WIDTH;
    const h = height ?? HEIGHT;
    const bounds = {
      x: display.workArea.x + display.workArea.width - w - MARGIN,
      y: display.workArea.y + MARGIN,
      width: w,
      height: h,
    };

    this.window = new BrowserWindow({
      ...bounds,
      minWidth: 300,
      minHeight: 360,
      maxWidth: 900,
      maxHeight: 1200,
      frame: false,
      transparent: true,
      backgroundColor: "#00000000",
      resizable: true,
      skipTaskbar: true,
      alwaysOnTop: false,
      minimizable: false,
      maximizable: false,
      hasShadow: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/index.js"),
      },
    });
    this.window.setMenu(null);
    // With mixed display scaling Windows rescales the window when it lands on a
    // screen with a different scale factor; apply the intended bounds again.
    this.window.setBounds(bounds);
    this.window.setBounds(bounds);

    this.window.on("move", () => this.pushGeometry());
    this.window.on("resize", () => this.pushGeometry());

    // Save only what the user does: automatic DPI rescaling must not overwrite
    // the chosen size. will-move / will-resize fire only for user drags.
    let userMoved = false;
    let userResized = false;
    this.window.on("will-move", () => (userMoved = true));
    this.window.on("will-resize", () => (userResized = true));
    const persist = () => {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => {
        if (!this.window || this.window.isDestroyed()) return;
        const b = this.window.getBounds();
        if (userMoved) this.github.saveSettings({ x: b.x, y: b.y });
        if (userResized) this.github.saveSettings({ width: b.width, height: b.height });
        userMoved = userResized = false;
      }, 500);
    };
    this.window.on("moved", persist);
    this.window.on("resized", persist);

    const isDev = process.env.NODE_ENV === "development";
    this.window.loadFile(
      isDev
        ? path.join(__dirname, "../../src/renderer/widget.html")
        : path.join(__dirname, "../renderer/widget.html"),
    );
    this.window.webContents.on("did-finish-load", () => this.push(this.github.getStats()));
  }

  private hide() {
    const win = this.window;
    this.window = null;
    if (win && !win.isDestroyed()) {
      win.hide();
      win.destroy();
    }
  }

  destroy() {
    this.hide();
  }
}
