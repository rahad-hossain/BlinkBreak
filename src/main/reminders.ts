import { BrowserWindow, Notification } from 'electron'

type ReminderType = 'posture' | 'hydration'

interface ReminderConfig {
  enabled: boolean
  intervalMinutes: number
}

/**
 * Manages posture and hydration reminders using system notifications.
 * Each reminder type runs independently with its own interval.
 */
export class ReminderManager {
  private timers: Map<ReminderType, NodeJS.Timeout> = new Map()
  private mainWindow: BrowserWindow | null

  private readonly messages: Record<ReminderType, { title: string; body: string }> = {
    posture: {
      title: 'Posture Check',
      body: 'Sit up straight, relax your shoulders, and align your screen at eye level.'
    },
    hydration: {
      title: 'Hydration Reminder',
      body: 'Time to drink some water. Staying hydrated improves focus and reduces fatigue.'
    }
  }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  configure(type: ReminderType, config: ReminderConfig): void {
    this.stop(type)
    if (config.enabled && config.intervalMinutes > 0) {
      this.start(type, config.intervalMinutes)
    }
  }

  private start(type: ReminderType, intervalMinutes: number): void {
    const ms = intervalMinutes * 60 * 1000
    const timer = setInterval(() => this.notify(type), ms)
    this.timers.set(type, timer)
    console.log(`[Reminders] ${type} reminder started - every ${intervalMinutes} min`)
  }

  private stop(type: ReminderType): void {
    const timer = this.timers.get(type)
    if (timer) {
      clearInterval(timer)
      this.timers.delete(type)
    }
  }

  private notify(type: ReminderType): void {
    const { title, body } = this.messages[type]

    if (Notification.isSupported()) {
      new Notification({ title, body, silent: false }).show()
    }

    // Also send to renderer for in-app display
    this.mainWindow?.webContents.send('reminder-triggered', { type, title, body })
    console.log(`[Reminders] ${type} notification sent`)
  }

  destroy(): void {
    this.timers.forEach((_, type) => this.stop(type))
  }
}
