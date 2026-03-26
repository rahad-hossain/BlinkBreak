import ActiveWindow from '@paymoapp/active-window'
import psList from 'ps-list'
import { BrowserWindow } from 'electron'

/*
 * Base interface for meeting detectors.
 * Implement this to support additional platforms (e.g. Teams, Webex).
 */
export interface MeetingDetector {
  readonly name: string
  readonly processNames: string[]
  readonly windowTitlePatterns: RegExp[]
  isInMeeting(windowTitle: string | null, runningProcesses: string[]): boolean
}

/*
 * Detects Zoom meetings via window title.
 * Falls back to process name if title is ambiguous.
 */
export class ZoomDetector implements MeetingDetector {
  readonly name = 'Zoom'
  readonly processNames = ['zoom', 'zoom.exe']
  readonly windowTitlePatterns = [/zoom meeting/i, /zoom call/i]

  isInMeeting(windowTitle: string | null, runningProcesses: string[]): boolean {
    if (windowTitle && this.windowTitlePatterns.some(p => p.test(windowTitle))) {
      return true
    }

    const zoomRunning = runningProcesses.some(p => this.processNames.includes(p.toLowerCase()))
    if (zoomRunning && windowTitle && /zoom/i.test(windowTitle)) {
      return true
    }

    return false
  }
}

/*
 * Detects Google Meet sessions in a browser tab.
 * Requires a supported browser to be focused with a matching title.
 */
export class GoogleMeetDetector implements MeetingDetector {
  readonly name = 'Google Meet'
  readonly processNames = ['chrome', 'chrome.exe', 'msedge', 'msedge.exe', 'firefox', 'firefox.exe']
  readonly windowTitlePatterns = [/google meet/i, /meet\.google\.com/i]

  isInMeeting(windowTitle: string | null, runningProcesses: string[]): boolean {
    if (!windowTitle) return false
    const browserRunning = runningProcesses.some(p => this.processNames.includes(p.toLowerCase()))
    return browserRunning && this.windowTitlePatterns.some(p => p.test(windowTitle))
  }
}

/* Smart mode state sent to the renderer and tray. */
export interface SmartModeStatus {
  enabled: boolean
  inMeeting: boolean
  detectedBy: string | null
  manualOverride: boolean
}

/*
 * Polls for active meetings and pauses/resumes the timer accordingly.
 * Uses active window title as primary signal, ps-list as fallback.
 * Debounces state changes to avoid reacting to brief focus switches.
 * Manual override always takes precedence over auto-detection.
 */
export class SmartModeManager {
  private detectors: MeetingDetector[] = [new ZoomDetector(), new GoogleMeetDetector()]
  private pollTimer: NodeJS.Timeout | null = null
  private enabled = false
  private inMeeting = false
  private manualOverride = false
  private detectedBy: string | null = null
  private whitelist: string[] = []

  private consecutiveMeetingCount = 0
  private consecutiveIdleCount = 0
  private readonly DEBOUNCE_COUNT = 2
  private readonly POLL_INTERVAL_MS = 5000

  private mainWindow: BrowserWindow
  private onMeetingStart: () => void
  private onMeetingEnd: () => void
  private activeWindowAvailable = false

  constructor(
    mainWindow: BrowserWindow,
    onMeetingStart: () => void,
    onMeetingEnd: () => void
  ) {
    this.mainWindow = mainWindow
    this.onMeetingStart = onMeetingStart
    this.onMeetingEnd = onMeetingEnd
    this.initActiveWindow()
  }

  /*
   * Initializes native window tracking.
   * Falls back to process-only detection on failure.
   */
  private initActiveWindow(): void {
    try {
      ActiveWindow.initialize()
      this.activeWindowAvailable = true
      console.log('[SmartMode] @paymoapp/active-window initialized')
    } catch (err) {
      console.warn('[SmartMode] active-window unavailable, falling back to ps-list only:', err)
      this.activeWindowAvailable = false
    }
  }

  /*
   * Registers a custom detector at runtime.
   * Runs after built-in detectors in registration order.
   */
  registerDetector(detector: MeetingDetector): void {
    this.detectors.push(detector)
    console.log(`[SmartMode] Registered detector: ${detector.name}`)
  }

  /*
   * Updates the process whitelist.
   * Any whitelisted process running in the foreground pauses breaks,
   * independent of meeting detection (e.g. Figma, OBS).
   */
  setWhitelist(list: string[]): void {
    this.whitelist = list.map(p => p.toLowerCase())
    console.log(`[SmartMode] Whitelist updated: ${this.whitelist.join(', ')}`)
  }

  getWhitelist(): string[] {
    return this.whitelist
  }

  enable(): void {
    if (this.enabled) return
    this.enabled = true
    this.startPolling()
    console.log('[SmartMode] Enabled')
  }

  disable(): void {
    if (!this.enabled) return
    this.enabled = false
    this.stopPolling()
    this.resetState()
    console.log('[SmartMode] Disabled')
  }

  /*
   * Manually sets meeting state from the UI or tray.
   * Pass false to clear the override and resume auto-detection.
   */
  setManualMeeting(inMeeting: boolean): void {
    this.manualOverride = inMeeting
    this.detectedBy = inMeeting ? 'Manual' : null

    if (inMeeting && !this.inMeeting) {
      this.inMeeting = true
      this.onMeetingStart()
    } else if (!inMeeting && this.inMeeting) {
      this.inMeeting = false
      this.onMeetingEnd()
    }

    this.sendStatus()
    console.log(`[SmartMode] Manual override: ${inMeeting ? 'in meeting' : 'not in meeting'}`)
  }

  getStatus(): SmartModeStatus {
    return {
      enabled: this.enabled,
      inMeeting: this.inMeeting,
      detectedBy: this.detectedBy,
      manualOverride: this.manualOverride
    }
  }

  private startPolling(): void {
    this.pollTimer = setInterval(() => this.poll(), this.POLL_INTERVAL_MS)
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer)
      this.pollTimer = null
    }
  }

  /*
   * Resets counters and ends any active meeting state.
   * Called when smart mode is disabled.
   */
  private resetState(): void {
    this.consecutiveMeetingCount = 0
    this.consecutiveIdleCount = 0
    if (this.inMeeting) {
      this.inMeeting = false
      this.detectedBy = null
      this.onMeetingEnd()
      this.sendStatus()
    }
  }

  /*
   * Polling tick — runs every POLL_INTERVAL_MS.
   * Fetches window title and processes in parallel, then applies debounce.
   */
  private async poll(): Promise<void> {
    if (this.manualOverride) return

    try {
      const [windowTitle, processes] = await Promise.all([
        this.getActiveWindowTitle(),
        this.getRunningProcessNames()
      ])

      const detected = this.runDetectors(windowTitle, processes)
      const whitelisted = this.checkWhitelist(processes)
      const shouldPause = detected.inMeeting || whitelisted.matched
      const detectorName = detected.inMeeting ? detected.detectorName : (whitelisted.processName ?? '')

      if (shouldPause) {
        this.consecutiveIdleCount = 0
        this.consecutiveMeetingCount++

        if (this.consecutiveMeetingCount >= this.DEBOUNCE_COUNT && !this.inMeeting) {
          this.inMeeting = true
          this.detectedBy = detectorName
          this.onMeetingStart()
          this.sendStatus()
          console.log(`[SmartMode] Meeting detected by: ${detectorName}`)
        }
      } else {
        this.consecutiveMeetingCount = 0
        this.consecutiveIdleCount++

        if (this.consecutiveIdleCount >= this.DEBOUNCE_COUNT && this.inMeeting) {
          this.inMeeting = false
          this.detectedBy = null
          this.onMeetingEnd()
          this.sendStatus()
          console.log('[SmartMode] Meeting ended')
        }
      }
    } catch (err) {
      console.error('[SmartMode] Poll error:', err)
    }
  }

  /* Returns the first detector that reports a meeting, or no match. */
  private runDetectors(
    windowTitle: string | null,
    processes: string[]
  ): { inMeeting: boolean; detectorName: string } {
    for (const detector of this.detectors) {
      if (detector.isInMeeting(windowTitle, processes)) {
        return { inMeeting: true, detectorName: detector.name }
      }
    }
    return { inMeeting: false, detectorName: '' }
  }

  /*
   * Checks if any whitelisted process is currently running.
   * Returns the matched process name for status reporting.
   */
  private checkWhitelist(processes: string[]): { matched: boolean; processName: string | null } {
    for (const entry of this.whitelist) {
      if (processes.includes(entry)) {
        return { matched: true, processName: entry }
      }
    }
    return { matched: false, processName: null }
  }

  /* Returns the focused window title, or null if unavailable. */
  private async getActiveWindowTitle(): Promise<string | null> {
    if (!this.activeWindowAvailable) return null
    try {
      const win = ActiveWindow.getActiveWindow()
      return win?.title ?? null
    } catch {
      return null
    }
  }

  /* Returns lowercase names of all running processes. */
  private async getRunningProcessNames(): Promise<string[]> {
    try {
      const list = await psList()
      return list.map(p => p.name.toLowerCase())
    } catch {
      return []
    }
  }

  private sendStatus(): void {
    this.mainWindow?.webContents.send('smart-mode-status', this.getStatus())
  }

  destroy(): void {
    this.stopPolling()
  }
}
