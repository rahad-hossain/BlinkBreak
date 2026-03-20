import { BrowserWindow, screen } from 'electron'
import path from 'path'

type ReminderType = 'posture' | 'hydration'

interface ReminderConfig {
  enabled: boolean
  intervalMinutes: number
}

/**
 * Manages posture and hydration reminders using soft popup windows.
 * Each reminder type runs independently with its own interval.
 * Supports snooze via one-shot timers.
 */
export class ReminderManager {
  private timers: Map<ReminderType, NodeJS.Timeout> = new Map()
  private snoozeTimers: Map<ReminderType, NodeJS.Timeout> = new Map()
  private popups: Map<ReminderType, BrowserWindow> = new Map()

  private readonly meta: Record<ReminderType, { title: string; body: string }> = {
    posture: {
      title: 'Posture Check',
      body: 'Sit up straight, relax your shoulders, and align your screen at eye level.'
    },
    hydration: {
      title: 'Hydration Reminder',
      body: 'Time to drink some water. Staying hydrated improves focus and reduces fatigue.'
    }
  }

  configure(type: ReminderType, config: ReminderConfig): void {
    this.stopTimer(type)
    if (config.enabled && config.intervalMinutes > 0) {
      this.startTimer(type, config.intervalMinutes)
    }
  }

  snooze(type: ReminderType, minutes: number): void {
    // Cancel any existing snooze for this type
    const existing = this.snoozeTimers.get(type)
    if (existing) clearTimeout(existing)

    const timer = setTimeout(() => {
      this.showPopup(type)
      this.snoozeTimers.delete(type)
    }, minutes * 60 * 1000)

    this.snoozeTimers.set(type, timer)
    console.log(`[Reminders] ${type} snoozed for ${minutes} min`)
  }

  private startTimer(type: ReminderType, intervalMinutes: number): void {
    const ms = intervalMinutes * 60 * 1000
    const timer = setInterval(() => this.showPopup(type), ms)
    this.timers.set(type, timer)
    console.log(`[Reminders] ${type} reminder started - every ${intervalMinutes} min`)
  }

  private stopTimer(type: ReminderType): void {
    const timer = this.timers.get(type)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(type)
    }
  }

  private showPopup(type: ReminderType): void {
    // Close existing popup for this type if still open
    const existing = this.popups.get(type)
    if (existing && !existing.isDestroyed()) existing.close()

    const { title, body } = this.meta[type]
    const { width, height } = screen.getPrimaryDisplay().workAreaSize

    const win = new BrowserWindow({
      width: 400,
      height: 220,
      x: width - 420,
      y: height - 240,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js')
      }
    })

    win.setMenu(null)
    win.setAlwaysOnTop(true, 'floating', 1)
    win.setVisibleOnAllWorkspaces(true)

    const isDev = process.env.NODE_ENV === 'development'
    const htmlPath = isDev
      ? path.join(__dirname, '../../src/renderer/reminder.html')
      : path.join(__dirname, '../renderer/reminder.html')

    win.loadFile(htmlPath, {
      query: { type, title, body }
    })

    win.on('closed', () => this.popups.delete(type))
    this.popups.set(type, win)

    console.log(`[Reminders] ${type} popup shown`)
  }

  destroy(): void {
    this.timers.forEach((_, type) => this.stopTimer(type))
    this.snoozeTimers.forEach((t) => clearTimeout(t))
    this.snoozeTimers.clear()
    this.popups.forEach((win) => { if (!win.isDestroyed()) win.close() })
    this.popups.clear()
  }
}
