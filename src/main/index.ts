import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import AutoLaunch from 'auto-launch'
import { SettingsManager } from './storage'
import { TimerManager } from './timer'
import { TrayManager } from './tray'

let mainWindow: BrowserWindow | null = null
let settingsManager: SettingsManager
let timerManager: TimerManager
let trayManager: TrayManager
let isQuitting = false

const isDev = process.env.NODE_ENV === 'development'

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
  name: 'BlinkBreak',
  path: app.getPath('exe')
})

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

  // Minimize to tray instead of closing
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
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
    trayManager = new TrayManager(mainWindow)
    
    // Create system tray
    trayManager.createTray()
    
    // Enable auto-launch by default -> toggled in settings
    autoLauncher.isEnabled().then((isEnabled: boolean) => {
      if (!isEnabled) {
        autoLauncher.enable()
      }
    })
    
    // Auto-start timer with saved settings after window is ready
    mainWindow.webContents.once('did-finish-load', () => {
      // Load saved settings or use defaults
      const settings = settingsManager.getSettings()
      setTimeout(() => {
        timerManager.start(settings.interval, settings.duration, settings.mode)
      }, 2000) // Wait 2 seconds after loading screen
    })
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Set quitting flag when app is about to quit
app.on('before-quit', () => {
  isQuitting = true
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
  // Save settings when timer is started with new values
  settingsManager.updateTimerSettings(interval, duration, mode)
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

// IPC Handler - Update tray with timer status
ipcMain.on('update-tray-status', (_, status) => {
  trayManager.updateTimerStatus(status)
})

// IPC Handlers - Auto-launch
ipcMain.handle('get-auto-launch-status', async () => {
  return await autoLauncher.isEnabled()
})

ipcMain.handle('enable-auto-launch', async () => {
  try {
    await autoLauncher.enable()
    return { success: true }
  } catch (error) {
    console.error('Failed to enable auto-launch:', error)
    return { success: false, error }
  }
})

ipcMain.handle('disable-auto-launch', async () => {
  try {
    await autoLauncher.disable()
    return { success: true }
  } catch (error) {
    console.error('Failed to disable auto-launch:', error)
    return { success: false, error }
  }
})
