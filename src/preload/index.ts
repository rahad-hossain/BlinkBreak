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
  recordBreakSkipped: (duration) => ipcRenderer.invoke('record-break-skipped', duration)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
