import { app, Tray, Menu, nativeImage, BrowserWindow } from 'electron'
import path from 'path'

export class TrayManager {
  private tray: Tray | null = null
  private mainWindow: BrowserWindow | null = null
  private timerStatus = {
    isRunning: true,
    isPaused: false,
    remainingTime: 1200, // 20 minutes in seconds
    mode: 'hard' as const
  }

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
  }

  createTray() {
    // Create tray icon from logo
    const isDev = process.env.NODE_ENV === 'development'
    const iconPath = isDev
      ? path.join(__dirname, '../../build/logo.ico')
      : path.join(process.resourcesPath, 'logo.ico')
    
    let trayIcon = nativeImage.createFromPath(iconPath)
    
    // Resize icon for tray (16x16 for Windows)
    trayIcon = trayIcon.resize({ width: 16, height: 16 })
    
    this.tray = new Tray(trayIcon)
    this.tray.setToolTip('BlinkBreak - Eye Care Assistant')
    
    this.updateTrayMenu()
    
    // Show/hide window on tray icon click
    this.tray.on('click', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isVisible()) {
          this.mainWindow.hide()
        } else {
          this.mainWindow.show()
          this.mainWindow.focus()
        }
      }
    })
  }

  updateTimerStatus(status: typeof this.timerStatus) {
    this.timerStatus = status
    this.updateTrayMenu()
    this.updateTooltip()
  }

  private updateTrayMenu() {
    if (!this.tray) return

    const isDev = process.env.NODE_ENV === 'development'
    const iconPath = isDev
      ? path.join(__dirname, '../../build/logo.ico')
      : path.join(process.resourcesPath, 'logo.ico')

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'BlinkBreak',
        enabled: false,
        icon: nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
      },
      { type: 'separator' },
      {
        label: this.mainWindow?.isVisible() ? 'Hide Window' : 'Show Window',
        click: () => {
          if (this.mainWindow) {
            if (this.mainWindow.isVisible()) {
              this.mainWindow.hide()
            } else {
              this.mainWindow.show()
              this.mainWindow.focus()
            }
          }
        }
      },
      { type: 'separator' },
      {
        label: this.timerStatus.isPaused ? 'Resume BlinkBreak' : 'Pause BlinkBreak',
        click: () => {
          // Send IPC to toggle pause/resume
          this.mainWindow?.webContents.send('tray-toggle-pause')
        }
      },
      {
        label: `Mode: ${this.timerStatus.mode.charAt(0).toUpperCase() + this.timerStatus.mode.slice(1)}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Quit BlinkBreak',
        click: () => {
          app.quit()
        }
      }
    ])

    this.tray.setContextMenu(contextMenu)
  }

  private updateTooltip() {
    if (!this.tray) return

    const mins = Math.floor(this.timerStatus.remainingTime / 60)
    const secs = this.timerStatus.remainingTime % 60
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`

    let tooltip = 'BlinkBreak - Eye Care Assistant\n'
    
    if (this.timerStatus.isPaused) {
      tooltip += 'Paused'
    } else {
      tooltip += `Next break in: ${timeStr}`
    }
    
    tooltip += `\nMode: ${this.timerStatus.mode.charAt(0).toUpperCase() + this.timerStatus.mode.slice(1)}`

    this.tray.setToolTip(tooltip)
  }

  destroy() {
    if (this.tray) {
      this.tray.destroy()
      this.tray = null
    }
  }
}
