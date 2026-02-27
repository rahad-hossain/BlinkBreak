import { BrowserWindow, screen } from 'electron'
import path from 'path'

/**
 * BreakWindowManager
 * 
 * Multi-monitor fullscreen with taskbar coverage:
 * enableLargerThanScreen: true + setAlwaysOnTop(true, 'screen-saver')
 */
export class BreakWindowManager {
  private breakWindows: BrowserWindow[] = []
  private softModeWindow: BrowserWindow | null = null

  /**
   * Hard Mode: Full screen lock on all monitors
   * Note: Don't use setIgnoreMouseEvents() - it makes clicks pass through
   */
  showHardModeBreak(duration: number) {
    console.log(`[BreakWindow] Showing hard mode break for ${duration} seconds`)
    
    // Close any existing break windows
    this.closeAllBreakWindows()

    // Get all displays
    const displays = screen.getAllDisplays()
    console.log(`[BreakWindow] Found ${displays.length} displays`)

    // Create a full-screen window for each display
    displays.forEach((display, index) => {
      console.log(`[BreakWindow] Display ${index}: ${display.bounds.width}x${display.bounds.height} at (${display.bounds.x}, ${display.bounds.y})`)
      
      const breakWindow = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        fullscreen: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        enableLargerThanScreen: true,
        backgroundColor: '#000000',
        autoHideMenuBar: true,
        focusable: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '../preload/index.js')
        }
      })

      // Key: Forces above taskbar on Windows
      breakWindow.setAlwaysOnTop(true, 'screen-saver')
      
      // DO NOT use setIgnoreMouseEvents - we want to BLOCK clicks, not pass them through
      // The window itself will capture all mouse events
      
      // Block menu
      breakWindow.setMenu(null)

      // Load the break screen HTML
      const htmlPath = path.join(__dirname, '../renderer/hardBreak.html')
      breakWindow.loadFile(htmlPath, {
        query: { duration: duration.toString() }
      })

      this.breakWindows.push(breakWindow)
    })

    // Auto-close after duration
    const closeTimeout = duration * 1000
    console.log(`[BreakWindow] Will close windows in ${closeTimeout}ms`)
    
    setTimeout(() => {
      console.log('[BreakWindow] Closing break windows now')
      this.breakWindows.forEach(win => { 
        if (!win.isDestroyed()) win.close() 
      })
      this.breakWindows = []
    }, closeTimeout)
  }

  showSoftModeBreak(duration: number) {
    // Close existing soft mode window if any
    if (this.softModeWindow && !this.softModeWindow.isDestroyed()) {
      this.softModeWindow.close()
    }

    // Get primary display
    const primaryDisplay = screen.getPrimaryDisplay()
    const { width, height } = primaryDisplay.workAreaSize

    // Create a small popup window at bottom-right
    this.softModeWindow = new BrowserWindow({
      width: 400,
      height: 250,
      x: width - 420,
      y: height - 270,
      frame: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      transparent: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/index.js')
      }
    })

    this.softModeWindow.setMenu(null)
    this.softModeWindow.setAlwaysOnTop(true, 'floating', 1)
    this.softModeWindow.setVisibleOnAllWorkspaces(true)

    // Load the soft break screen
    const htmlPath = path.join(__dirname, '../renderer/softBreak.html')
    this.softModeWindow.loadFile(htmlPath, {
      query: { duration: duration.toString() }
    })

    // Auto-close after duration
    setTimeout(() => {
      this.closeSoftModeWindow()
    }, duration * 1000)
  }

  closeAllBreakWindows() {
    this.breakWindows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.close()
      }
    })
    this.breakWindows = []
  }

  closeSoftModeWindow() {
    if (this.softModeWindow && !this.softModeWindow.isDestroyed()) {
      this.softModeWindow.close()
      this.softModeWindow = null
    }
  }

  closeAllWindows() {
    this.closeAllBreakWindows()
    this.closeSoftModeWindow()
  }
}
