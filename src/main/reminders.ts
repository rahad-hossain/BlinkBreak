import { BrowserWindow, screen, shell } from "electron";
import path from "path";

type ReminderType = "posture" | "hydration";

interface ReminderConfig {
  enabled: boolean;
  intervalMinutes: number;
}

/**
 * Manages posture and hydration reminders using soft popup windows.
 * Each reminder type runs independently with its own interval.
 * Supports snooze via one-shot timers.
 */
export class ReminderManager {
  private timers: Map<ReminderType, NodeJS.Timeout> = new Map();
  private snoozeTimers: Map<ReminderType, NodeJS.Timeout> = new Map();
  private popups: Map<ReminderType, BrowserWindow> = new Map();
  private settingsManager: any = null;

  constructor(settingsManager?: any) {
    this.settingsManager = settingsManager ?? null;
  }

  private readonly meta: Record<ReminderType, { title: string; body: string }> =
    {
      posture: {
        title: "Posture Check",
        body: "Sit up straight, relax your shoulders, and align your screen at eye level.",
      },
      hydration: {
        title: "Hydration Reminder",
        body: "Time to drink some water. Staying hydrated improves focus and reduces fatigue.",
      },
    };

  configure(type: ReminderType, config: ReminderConfig): void {
    this.stopTimer(type);
    if (config.enabled && config.intervalMinutes > 0) {
      this.startTimer(type, config.intervalMinutes);
    }
  }

  snooze(type: ReminderType, minutes: number): void {
    // Cancel any existing snooze for this type
    const existing = this.snoozeTimers.get(type);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(
      () => {
        this.showPopup(type);
        this.snoozeTimers.delete(type);
      },
      minutes * 60 * 1000,
    );

    this.snoozeTimers.set(type, timer);
    console.log(`[Reminders] ${type} snoozed for ${minutes} min`);
  }

  private startTimer(type: ReminderType, intervalMinutes: number): void {
    const ms = intervalMinutes * 60 * 1000;
    const timer = setInterval(() => this.showPopup(type), ms);
    this.timers.set(type, timer);
    console.log(
      `[Reminders] ${type} reminder started - every ${intervalMinutes} min`,
    );
  }

  private stopTimer(type: ReminderType): void {
    const timer = this.timers.get(type);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(type);
    }
  }

  private showPopup(type: ReminderType): void {
    // Close existing popup for this type if still open
    const existing = this.popups.get(type);
    if (existing && !existing.isDestroyed()) existing.close();

    const { title, body } = this.meta[type];
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    // Stack multiple popups upward to avoid complete overlap
    const popupWidth = 400;
    const popupHeight = 220;
    const gap = 10;
    const activePopups = Array.from(this.popups.values()).filter(
      (w) => !w.isDestroyed(),
    );
    const index = activePopups.length;

    const xPos = width - (popupWidth + 20);
    const yPos = height - (popupHeight + 20) - index * (popupHeight + gap);

    const win = new BrowserWindow({
      width: popupWidth,
      height: popupHeight,
      x: xPos,
      y: yPos,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "../preload/index.js"),
      },
    });

    win.setMenu(null);
    win.setAlwaysOnTop(true, "floating", 1);
    win.setVisibleOnAllWorkspaces(true);

    const isDev = process.env.NODE_ENV === "development";
    const htmlPath = isDev
      ? path.join(__dirname, "../../src/renderer/reminder.html")
      : path.join(__dirname, "../renderer/reminder.html");

    const soundPath = this.settingsManager?.getSettings()?.sounds?.[type] ?? "";

    win.loadFile(htmlPath, {
      query: { type, title, body, sound: soundPath ?? "" },
    });

    win.on("closed", () => this.popups.delete(type));
    this.popups.set(type, win);

    // As a fallback, play a short beep from main process
    try {
      if (!this.settingsManager?.getSettings()?.sounds?.enabled) {
        shell.beep();
      }
    } catch (e) {
      console.log("[Reminders] beep failed", e);
    }

    console.log(`[Reminders] ${type} popup shown at ${xPos},${yPos}`);
  }

  destroy(): void {
    this.timers.forEach((_, type) => this.stopTimer(type));
    this.snoozeTimers.forEach((t) => clearTimeout(t));
    this.snoozeTimers.clear();
    this.popups.forEach((win) => {
      if (!win.isDestroyed()) win.close();
    });
    this.popups.clear();
  }
}
