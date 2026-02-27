export type BreakMode = 'hard' | 'soft' | 'smart'
export type Theme = 'dark-neon' | 'white'

export interface Settings {
  mode: BreakMode
  interval: number // minutes
  duration: number // seconds
  autoLaunch: boolean
  theme: Theme
  blueLightFilter: {
    enabled: boolean
    intensity: number
    schedule: boolean
    startTime: string
    endTime: string
  }
  postureReminder: {
    enabled: boolean
    interval: number
  }
  hydrationReminder: {
    enabled: boolean
    interval: number
  }
  focusMode: {
    enabled: boolean
    pomodoroLength: number
    shortBreak: number
    longBreak: number
  }
}

export interface Statistics {
  breaksTaken: number
  breaksSkipped: number
  totalScreenTime: number
  lastBreakTime: number
  dailyStats: DailyStats[]
}

export interface DailyStats {
  date: string
  breaksTaken: number
  breaksSkipped: number
  screenTime: number
}

export interface ElectronAPI {
  // Settings
  getSettings: () => Promise<Settings>
  
  // Theme
  setTheme: (theme: Theme) => void
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
