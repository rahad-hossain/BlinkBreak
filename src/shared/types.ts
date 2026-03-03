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
  totalBreaksTaken: number
  totalBreaksSkipped: number
  currentStreak: number
  longestStreak: number
  lastBreakDate: string
  dailyStats: DailyStats[]
  weeklyStats: WeeklyStats[]
  monthlyStats: MonthlyStats[]
  weekComparison: WeekComparison
  recentActivity: BreakEvent[]
}

export interface BreakEvent {
  timestamp: number // Unix timestamp
  type: 'taken' | 'skipped'
  duration: number // seconds
}

export interface DailyStats {
  date: string // YYYY-MM-DD
  breaksTaken: number
  breaksSkipped: number
  screenTime: number // minutes
  completionRate: number // percentage
}

export interface WeeklyStats {
  weekStart: string // YYYY-MM-DD (Monday)
  breaksTaken: number
  breaksSkipped: number
  screenTime: number
  completionRate: number
}

export interface MonthlyStats {
  month: string // YYYY-MM
  breaksTaken: number
  breaksSkipped: number
  screenTime: number
  completionRate: number
}

export interface WeekComparison {
  currentWeek: {
    breaksTaken: number
    completionRate: number
  }
  previousWeek: {
    breaksTaken: number
    completionRate: number
  }
  improvement: {
    breaks: number // difference
    breaksPercent: number // percentage change
    completionRate: number // difference in percentage points
  }
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
  
  // Auto-launch
  getAutoLaunchStatus: () => Promise<boolean>
  enableAutoLaunch: () => Promise<{ success: boolean; error?: any }>
  disableAutoLaunch: () => Promise<{ success: boolean; error?: any }>
  
  // Statistics
  getStatistics: () => Promise<Statistics>
  recordBreakTaken: (duration: number) => Promise<void>
  recordBreakSkipped: (duration: number) => Promise<void>
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
