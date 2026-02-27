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
  }
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
