import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { SettingsManager } from './storage'
import { TimerManager } from './timer'

let mainWindow: BrowserWindow | null = null
let settingsManager: SettingsManager
let timerManager: TimerManager

const isDev = process.env.NODE_ENV === 'development'

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 700,
    minWidth: 800,
    minHeight: 550,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    frame: true,
    show: false
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  settingsManager = new SettingsManager()
  
  createWindow()
  
  if (mainWindow) {
    timerManager = new TimerManager(mainWindow)
    
    // Auto-start timer with default settings after window is ready
    mainWindow.webContents.once('did-finish-load', () => {
      // Start with default: 20 min interval, 20 sec duration, Hard mode
      setTimeout(() => {
        timerManager.start(20, 20, 'hard')
      }, 2000) // Wait 2 seconds after loading screen
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC Handlers - Settings
ipcMain.handle('get-settings', async () => {
  return settingsManager.getSettings()
})

ipcMain.on('set-theme', (_, theme) => {
  mainWindow?.webContents.send('theme-changed', theme)
})

// IPC Handlers - Timer
ipcMain.on('start-timer', (_, { interval, duration, mode }) => {
  timerManager.start(interval, duration, mode)
})

ipcMain.on('stop-timer', () => {
  timerManager.stop()
})

ipcMain.on('pause-timer', () => {
  timerManager.pause()
})

ipcMain.on('resume-timer', () => {
  timerManager.resume()
})

ipcMain.on('skip-break', () => {
  timerManager.skip()
})

ipcMain.handle('get-timer-status', () => {
  return timerManager.getStatus()
})
