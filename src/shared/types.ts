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
  
  // Timer
  startTimer: (interval: number, duration: number, mode: BreakMode) => void
  stopTimer: () => void
  pauseTimer: () => void
  resumeTimer: () => void
  skipBreak: () => void
  getTimerStatus: () => Promise<TimerStatus>
  onTimerStatus: (callback: (status: TimerStatus) => void) => void
  onBreakStart: (callback: (data: { mode: BreakMode; duration: number }) => void) => void
  onBreakEnd: (callback: () => void) => void
  
  // Tray
  onTrayTogglePause: (callback: () => void) => void
  onUpdateTray: (callback: (status: TimerStatus) => void) => void
  updateTrayStatus: (status: TimerStatus) => void
}

export interface TimerStatus {
  isRunning: boolean
  isPaused: boolean
  remainingTime: number
  interval: number
  duration: number
  mode: BreakMode
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
