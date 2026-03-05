import Store from 'electron-store'
import { Settings } from '@shared/types'

const defaultSettings: Settings = {
  mode: 'hard',
  interval: 20,
  duration: 20,
  autoLaunch: false,
  theme: 'dark-neon',
  blueLightFilter: {
    enabled: false,
    intensity: 30,
    schedule: false,
    startTime: '20:00',
    endTime: '06:00'
  },
  colorMask: {
    enabled: false,
    intensity: 30,
    red: 34,
    green: 197,
    blue: 94
  },
  postureReminder: {
    enabled: false,
    interval: 30
  },
  hydrationReminder: {
    enabled: false,
    interval: 60
  },
  focusMode: {
    enabled: false,
    pomodoroLength: 25,
    shortBreak: 5,
    longBreak: 15
  }
}

export class SettingsManager {
  private store: Store<{ settings: Settings }>

  constructor() {
    this.store = new Store<{ settings: Settings }>({
      defaults: {
        settings: defaultSettings
      }
    })
  }

  getSettings(): Settings {
    return this.store.get('settings') as Settings
  }

  saveSettings(settings: Settings): void {
    this.store.set('settings', settings)
  }

  updateTimerSettings(interval: number, duration: number, mode: string): void {
    const settings = this.getSettings()
    settings.interval = interval
    settings.duration = duration
    settings.mode = mode as any
    this.saveSettings(settings)
  }
}
