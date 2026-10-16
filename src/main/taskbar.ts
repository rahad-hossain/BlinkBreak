import path from "path";
import koffi from "koffi";
import { TaskbarSettings, TaskbarMode } from "@shared/types";
import { SettingsManager } from "./storage";

const MODE_CODE: Record<TaskbarMode, number> = {
  default: 0,
  clear: 1,
  blur: 2,
  acrylic: 3,
  solid: 4,
};

// Native function bound with koffi: callable directly, or via .async(...args, callback).
type NativeFn = ((...args: any[]) => any) & { async: (...args: any[]) => void };

export const DEFAULT_TASKBAR: TaskbarSettings = {
  mode: "default",
  color: "#000000",
  opacity: 25,
  blur: 16,
  layout: "full",
  iconScale: 100,
};

/**
 * Controls the appearance of the Windows taskbar through the native
 * BlinkTaskbar engine (native/BlinkTaskbar.dll).
 *
 * The engine runs inside Explorer and keeps the style applied on its own.
 * This class attaches it, sends style changes, and re-attaches it whenever
 * Explorer restarts.
 */
export class TaskbarManager {
  private inject: NativeFn | null = null;
  private setStyle: NativeFn | null = null;
  private injecting: Promise<boolean> | null = null;
  private watchdog: NodeJS.Timeout | null = null;

  constructor(private settingsManager: SettingsManager) {
    if (process.platform !== "win32") return;
    try {
      const dll =
        process.env.NODE_ENV === "development"
          ? path.join(__dirname, "../../native/bin/BlinkTaskbar.dll")
          : path.join(process.resourcesPath, "native/BlinkTaskbar.dll");
      const lib = koffi.load(dll);
      this.inject = lib.func("int BB_Inject()");
      this.setStyle = lib.func(
        "int BB_SetStyle(uint32_t mode, uint32_t argb, uint32_t blur, uint32_t layout, uint32_t iconScale)",
      );
    } catch (error: any) {
      console.error("[Taskbar] Failed to load BlinkTaskbar.dll:", error.message);
    }
  }

  isAvailable(): boolean {
    return !!this.inject;
  }

  getSettings(): TaskbarSettings {
    return { ...DEFAULT_TASKBAR, ...this.settingsManager.getSettings().taskbar };
  }

  /** Applies the saved style at startup so the taskbar matches the app's settings. */
  init() {
    this.apply(this.getSettings());
  }

  async apply(style: TaskbarSettings): Promise<boolean> {
    const settings = this.settingsManager.getSettings();
    settings.taskbar = style;
    this.settingsManager.saveSettings(settings);

    if (!this.setStyle) return false;

    // Store the style before attaching; the engine reads it as soon as it starts.
    this.setStyle(
      MODE_CODE[style.mode],
      this.toArgb(style),
      Math.round(style.blur),
      style.layout === "adaptive" ? 1 : 0,
      Math.round(style.iconScale),
    );

    if (style.mode === "default" && style.layout === "full" && style.iconScale === 100) {
      this.stopWatchdog();
      return true;
    }
    const ok = await this.ensureInjected();
    this.startWatchdog();
    return ok;
  }

  /** Converts a "#RRGGBB" colour and opacity percentage to a 32-bit ARGB value. */
  private toArgb(style: TaskbarSettings): number {
    const rgb = parseInt(style.color.replace("#", ""), 16) & 0xffffff;
    const alpha = Math.round((Math.min(100, Math.max(0, style.opacity)) / 100) * 255);
    return ((alpha << 24) | rgb) >>> 0;
  }

  /** Attaching can take up to 15 seconds, so it runs off the main thread. */
  private ensureInjected(): Promise<boolean> {
    if (!this.inject) return Promise.resolve(false);
    if (this.injecting) return this.injecting;

    this.injecting = new Promise<boolean>((resolve) => {
      this.inject!.async((err: any, result: number) => {
        this.injecting = null;
        if (err || result !== 0) {
          // -5 means Explorer is still starting; the watchdog retries shortly.
          if (result !== -5) console.error(`[Taskbar] BB_Inject failed: ${err ?? result}`);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
    return this.injecting;
  }

  /** Periodically re-attaches after an Explorer restart; a no-op while attached. */
  private startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(() => this.ensureInjected(), 5000);
  }

  private stopWatchdog() {
    if (this.watchdog) clearInterval(this.watchdog);
    this.watchdog = null;
  }

  destroy() {
    this.stopWatchdog();
  }
}
