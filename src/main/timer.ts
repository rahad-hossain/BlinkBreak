import { BrowserWindow } from 'electron'
import { BreakMode } from '@shared/types'
import { BreakWindowManager } from './breakWindow'

export class TimerManager {
  private interval: number = 20 // minutes
  private duration: number = 20 // seconds
  private mode: BreakMode = 'hard'
  private isRunning: boolean = false
  private isPaused: boolean = false
  private isPausedByMeeting: boolean = false
  private timerId: NodeJS.Timeout | null = null
  private remainingTime: number = 0 // seconds
  private startTime: number = 0
  private mainWindow: BrowserWindow | null = null
  private breakWindowManager: BreakWindowManager
  private onBreakTaken?: (duration: number) => void
  private onBreakSkipped?: (duration: number) => void

  constructor(mainWindow: BrowserWindow, onBreakTaken?: (duration: number) => void, onBreakSkipped?: (duration: number) => void) {
    this.mainWindow = mainWindow
    this.breakWindowManager = new BreakWindowManager()
    this.onBreakTaken = onBreakTaken
    this.onBreakSkipped = onBreakSkipped
  }

  start(interval: number, duration: number, mode: BreakMode) {
    if (this.isRunning) {
      this.stop()
    }

    this.interval = interval
    this.duration = duration
    this.mode = mode
    this.isRunning = true
    this.isPaused = false
    this.remainingTime = interval * 60
    this.startTime = Date.now()

    this.scheduleNextBreak()
    this.sendStatus()
  }

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.isRunning = false
    this.isPaused = false
    this.remainingTime = 0
    this.breakWindowManager.closeAllWindows()
    this.sendStatus()
  }

  /** Called by SmartMode when a meeting starts - does not conflict with user pause */
  pauseForMeeting(): void {
    if (!this.isRunning || this.isPaused) return
    this.isPausedByMeeting = true
    this.pause()
  }

  /** Called by SmartMode when a meeting ends - only resumes if paused by meeting */
  resumeFromMeeting(): void {
    if (!this.isPausedByMeeting) return
    this.isPausedByMeeting = false
    this.resume()
  }

  pause() {
    if (!this.isRunning || this.isPaused) return

    this.isPaused = true
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }

    // Calculate remaining time
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
    this.remainingTime = Math.max(0, this.remainingTime - elapsed)
    this.sendStatus()
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return

    this.isPaused = false
    this.startTime = Date.now()
    this.scheduleNextBreak()
    this.sendStatus()
  }

  skip() {
    if (!this.isRunning) return

    // Record break as skipped with duration
    if (this.onBreakSkipped) {
      this.onBreakSkipped(this.duration)
    }

    // Close any open break windows
    this.breakWindowManager.closeAllWindows()

    // Skip current break and start next interval
    this.remainingTime = this.interval * 60
    this.startTime = Date.now()
    this.scheduleNextBreak()
    this.sendStatus()
  }

  private scheduleNextBreak() {
    if (this.timerId) {
      clearInterval(this.timerId)
    }

    // Update every second
    this.timerId = setInterval(() => {
      if (this.isPaused) return

      const elapsed = Math.floor((Date.now() - this.startTime) / 1000)
      this.remainingTime = Math.max(0, this.interval * 60 - elapsed)

      this.sendStatus()

      if (this.remainingTime <= 0) {
        this.triggerBreak()
      }
    }, 1000)
  }

  private triggerBreak() {
    if (this.timerId) {
      clearInterval(this.timerId)
      this.timerId = null
    }

    // Show break window based on mode
    if (this.mode === 'hard') {
      this.breakWindowManager.showHardModeBreak(this.duration)
    } else if (this.mode === 'soft') {
      this.breakWindowManager.showSoftModeBreak(this.duration)
    }

    // Send break notification to main window (for in-app display if needed)
    this.mainWindow?.webContents.send('break-start', {
      mode: this.mode,
      duration: this.duration
    })

    // After break duration, restart timer
    setTimeout(() => {
      // Record break as taken with duration
      if (this.onBreakTaken) {
        this.onBreakTaken(this.duration)
      }

      this.mainWindow?.webContents.send('break-end')
      
      if (this.isRunning) {
        this.remainingTime = this.interval * 60
        this.startTime = Date.now()
        this.scheduleNextBreak()
      }
    }, this.duration * 1000)
  }

  private sendStatus() {
    const status = {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      remainingTime: this.remainingTime,
      interval: this.interval,
      duration: this.duration,
      mode: this.mode
    }
    
    this.mainWindow?.webContents.send('timer-status', status)
    
    // Update tray with timer status
    this.mainWindow?.webContents.send('update-tray', status)
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      remainingTime: this.remainingTime,
      interval: this.interval,
      duration: this.duration,
      mode: this.mode
    }
  }
}
