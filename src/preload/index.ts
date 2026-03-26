import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI } from '@shared/types'

const electronAPI: ElectronAPI = {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme),
  
  // Timer
  startTimer: (interval, duration, mode) => ipcRenderer.send('start-timer', { interval, duration, mode }),
  stopTimer: () => ipcRenderer.send('stop-timer'),
  pauseTimer: () => ipcRenderer.send('pause-timer'),
  resumeTimer: () => ipcRenderer.send('resume-timer'),
  skipBreak: () => ipcRenderer.send('skip-break'),
  getTimerStatus: () => ipcRenderer.invoke('get-timer-status'),
  onTimerStatus: (callback) => {
    ipcRenderer.on('timer-status', (_, status) => callback(status))
  },
  onBreakStart: (callback) => {
    ipcRenderer.on('break-start', (_, data) => callback(data))
  },
  onBreakEnd: (callback) => {
    ipcRenderer.on('break-end', () => callback())
  },
  
  // Tray
  onTrayTogglePause: (callback) => {
    ipcRenderer.on('tray-toggle-pause', () => callback())
  },
  onUpdateTray: (callback) => {
    ipcRenderer.on('update-tray', (_, status) => callback(status))
  },
  updateTrayStatus: (status) => {
    ipcRenderer.send('update-tray-status', status)
  },
  
  // Auto-launch
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  enableAutoLaunch: () => ipcRenderer.invoke('enable-auto-launch'),
  disableAutoLaunch: () => ipcRenderer.invoke('disable-auto-launch'),
  
  // Statistics
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  recordBreakTaken: (duration) => ipcRenderer.invoke('record-break-taken', duration),
  recordBreakSkipped: (duration) => ipcRenderer.invoke('record-break-skipped', duration),
  
  // Blue Light Filter
  enableBlueLightFilter: (intensity) => ipcRenderer.send('enable-blue-light-filter', intensity),
  disableBlueLightFilter: () => ipcRenderer.send('disable-blue-light-filter'),
  updateBlueLightIntensity: (intensity) => ipcRenderer.send('update-blue-light-intensity', intensity),
  
  // Color Mask
  enableColorMask: (intensity, red, green, blue) => ipcRenderer.send('enable-color-mask', { intensity, red, green, blue }),
  disableColorMask: () => ipcRenderer.send('disable-color-mask'),
  updateColorMask: (intensity, red, green, blue) => ipcRenderer.send('update-color-mask', { intensity, red, green, blue }),
  
  // Monitor Controls
  setMonitorBrightness: (value) => ipcRenderer.invoke('set-monitor-brightness', value),
  setMonitorContrast: (value) => ipcRenderer.invoke('set-monitor-contrast', value),
  getMonitorBrightness: () => ipcRenderer.invoke('get-monitor-brightness'),

  // Reminders
  setReminderConfig: (type, enabled, intervalMinutes) =>
    ipcRenderer.send('set-reminder-config', { type, enabled, intervalMinutes }),
  snoozeReminder: (type, minutes) =>
    ipcRenderer.send('snooze-reminder', { type, minutes }),

  // Smart Mode
  setSmartMode: (enabled) => ipcRenderer.send('set-smart-mode', enabled),
  setManualMeeting: (inMeeting) => ipcRenderer.send('set-manual-meeting', inMeeting),
  getSmartModeStatus: () => ipcRenderer.invoke('get-smart-mode-status'),
  onSmartModeStatus: (callback) => {
    ipcRenderer.on('smart-mode-status', (_, status) => callback(status))
  },
  setSmartModeWhitelist: (list) => ipcRenderer.send('set-smart-mode-whitelist', list),
  getSmartModeWhitelist: () => ipcRenderer.invoke('get-smart-mode-whitelist'),

  // Focus Mode / Website Blocker
  setFocusMode: (enabled) => ipcRenderer.invoke('set-focus-mode', enabled),
  setBlockedDomains: (domains) => ipcRenderer.invoke('set-blocked-domains', domains),
  getBlockedDomains: () => ipcRenderer.invoke('get-blocked-domains'),
  getFocusModeStatus: () => ipcRenderer.invoke('get-focus-mode-status')
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
