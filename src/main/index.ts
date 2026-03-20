import { app, BrowserWindow, ipcMain, powerMonitor } from 'electron'
import path from 'path'
import AutoLaunch from 'auto-launch'
import { SettingsManager } from './storage'
import { TimerManager } from './timer'
import { TrayManager } from './tray'
import { StatisticsManager } from './statistics'
import { BlueLightFilterManager } from './blueLightFilter'
import { ColorMaskManager } from './colorMask'
import { MonitorControlManager } from './monitorControl'
import { ReminderManager } from './reminders'

let mainWindow: BrowserWindow | null = null
let settingsManager: SettingsManager
let timerManager: TimerManager
let trayManager: TrayManager
let statisticsManager: StatisticsManager
let blueLightFilterManager: BlueLightFilterManager
let colorMaskManager: ColorMaskManager
let monitorControlManager: MonitorControlManager
let reminderManager: ReminderManager
let isQuitting = false
let screenTimeTracker: NodeJS.Timeout | null = null

const isDev = process.env.NODE_ENV === 'development'

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  // quit running one
  app.quit()
} else {
  // This is the first instance
  app.on('second-instance', () => {
    // tried focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      if (!mainWindow.isVisible()) mainWindow.show()
      mainWindow.focus()
    }
  })
}

// Auto-launch configuration
const autoLauncher = new AutoLaunch({
  name: 'BlinkBreak',
  path: app.getPath('exe')
})

function createWindow() {
  const iconPath = isDev 
    ? path.join(__dirname, '../../build/logo.ico')
    : path.join(process.resourcesPath, 'logo.ico')
  
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
    autoHideMenuBar: true,
    icon: iconPath,
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
  statisticsManager = new StatisticsManager()
  blueLightFilterManager = new BlueLightFilterManager()
  colorMaskManager = new ColorMaskManager()
  monitorControlManager = new MonitorControlManager()
  
  createWindow()
  
  if (mainWindow) {
    timerManager = new TimerManager(
      mainWindow,
      (duration) => statisticsManager.recordBreakTaken(duration),
      (duration) => statisticsManager.recordBreakSkipped(duration)
    )
    trayManager = new TrayManager(mainWindow)
    reminderManager = new ReminderManager(mainWindow)
    
    // Create system tray
    trayManager.createTray()
    
    // Enable auto-launch by default -> toggled in settings
    autoLauncher.isEnabled().then((isEnabled: boolean) => {
      if (!isEnabled) {
        autoLauncher.enable()
      }
    })
    
    // Start screen time tracking (every minute, save every 5 minutes)
    startScreenTimeTracking()
    
    // Auto-start timer with saved settings after window is ready
    mainWindow.webContents.once('did-finish-load', async () => {
      // Load saved settings or use defaults
      const settings = settingsManager.getSettings()
      
      // Apply blue light filter if enabled
      if (settings.blueLightFilter.enabled) {
        await blueLightFilterManager.enable(settings.blueLightFilter.intensity)
      }
      
      // Apply color mask if enabled
      if (settings.colorMask.enabled) {
        await colorMaskManager.enable(
          settings.colorMask.intensity,
          settings.colorMask.red,
          settings.colorMask.green,
          settings.colorMask.blue
        )
      }
      
      setTimeout(() => {
        timerManager.start(settings.interval, settings.duration, settings.mode)

        // Apply saved reminder settings
        reminderManager.configure('posture', {
          enabled: settings.postureReminder.enabled,
          intervalMinutes: settings.postureReminder.interval
        })
        reminderManager.configure('hydration', {
          enabled: settings.hydrationReminder.enabled,
          intervalMinutes: settings.hydrationReminder.interval
        })
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
app.on('before-quit', async () => {
  isQuitting = true
  // Save statistics session end time
  statisticsManager.onAppClose()
  // Stop screen time tracking
  if (screenTimeTracker) {
    clearInterval(screenTimeTracker)
  }
  // Clean up blue light filter
  await blueLightFilterManager.destroy()
  // Clean up color mask
  await colorMaskManager.destroy()
  // Clean up reminders
  reminderManager.destroy()
})

// Screen time tracking
let activeMinutesBuffer = 0
let lastSaveTime = Date.now()

function startScreenTimeTracking() {
  // Track active time every minute
  screenTimeTracker = setInterval(() => {
    const idleTime = powerMonitor.getSystemIdleTime()
    
    // If user was active in last minute (idle < 60 seconds)
    if (idleTime < 60) {
      activeMinutesBuffer++
      
      // Save to storage every 5 minutes
      const timeSinceLastSave = Date.now() - lastSaveTime
      if (timeSinceLastSave >= 5 * 60 * 1000) { // 5 minutes
        statisticsManager.addScreenTime(activeMinutesBuffer)
        activeMinutesBuffer = 0
        lastSaveTime = Date.now()
      }
    }
  }, 60000) // Check every minute
  
  // Handle suspend (sleep/hibernate)
  powerMonitor.on('suspend', () => {
    // Save any buffered time before suspend
    if (activeMinutesBuffer > 0) {
      statisticsManager.addScreenTime(activeMinutesBuffer)
      activeMinutesBuffer = 0
      lastSaveTime = Date.now()
    }
  })
  
  // Handle resume
  powerMonitor.on('resume', () => {
    lastSaveTime = Date.now()
  })
}

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

// IPC Handlers - Statistics
ipcMain.handle('get-statistics', async () => {
  return statisticsManager.getStatistics()
})

ipcMain.handle('record-break-taken', async (_, duration: number) => {
  statisticsManager.recordBreakTaken(duration)
})

ipcMain.handle('record-break-skipped', async (_, duration: number) => {
  statisticsManager.recordBreakSkipped(duration)
})

// IPC Handlers - Blue Light Filter
ipcMain.on('enable-blue-light-filter', async (_, intensity: number) => {
  await blueLightFilterManager.enable(intensity)
  // Save to settings
  const settings = settingsManager.getSettings()
  settings.blueLightFilter.enabled = true
  settings.blueLightFilter.intensity = intensity
  settingsManager.saveSettings(settings)
})

ipcMain.on('disable-blue-light-filter', async () => {
  await blueLightFilterManager.disable()
  // Save to settings
  const settings = settingsManager.getSettings()
  settings.blueLightFilter.enabled = false
  settingsManager.saveSettings(settings)
})

ipcMain.on('update-blue-light-intensity', async (_, intensity: number) => {
  await blueLightFilterManager.updateIntensity(intensity)
  // Save to settings
  const settings = settingsManager.getSettings()
  settings.blueLightFilter.intensity = intensity
  settingsManager.saveSettings(settings)
})

// IPC Handlers - Color Mask
ipcMain.on('enable-color-mask', async (_, { intensity, red, green, blue }) => {
  await colorMaskManager.enable(intensity, red, green, blue)
  // Save to settings
  const settings = settingsManager.getSettings()
  settings.colorMask.enabled = true
  settings.colorMask.intensity = intensity
  settings.colorMask.red = red
  settings.colorMask.green = green
  settings.colorMask.blue = blue
  settingsManager.saveSettings(settings)
})

ipcMain.on('disable-color-mask', async () => {
  await colorMaskManager.disable()
  // Save to settings
  const settings = settingsManager.getSettings()
  settings.colorMask.enabled = false
  settingsManager.saveSettings(settings)
})

ipcMain.on('update-color-mask', async (_, { intensity, red, green, blue }) => {
  await colorMaskManager.updateMask(intensity, red, green, blue)
  // Save to settings
  const settings = settingsManager.getSettings()
  settings.colorMask.intensity = intensity
  settings.colorMask.red = red
  settings.colorMask.green = green
  settings.colorMask.blue = blue
  settingsManager.saveSettings(settings)
})

// IPC Handlers - Monitor Controls
ipcMain.handle('set-monitor-brightness', async (_, value: number) => {
  return await monitorControlManager.setBrightness(value)
})

ipcMain.handle('set-monitor-contrast', async (_, value: number) => {
  return await monitorControlManager.setContrast(value)
})

ipcMain.handle('get-monitor-brightness', async () => {
  return await monitorControlManager.getBrightness()
})

// IPC Handlers - Reminders
ipcMain.on('set-reminder-config', (_, { type, enabled, intervalMinutes }) => {
  reminderManager.configure(type, { enabled, intervalMinutes })
  const settings = settingsManager.getSettings()
  if (type === 'posture') {
    settings.postureReminder.enabled = enabled
    settings.postureReminder.interval = intervalMinutes
  } else if (type === 'hydration') {
    settings.hydrationReminder.enabled = enabled
    settings.hydrationReminder.interval = intervalMinutes
  }
  settingsManager.saveSettings(settings)
})
