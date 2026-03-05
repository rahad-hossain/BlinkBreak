import { BrowserWindow, screen } from 'electron'

export class BlueLightFilterManager {
  private overlayWindows: BrowserWindow[] = []
  private enabled: boolean = false

  constructor() {}

  async enable(intensity: number = 30): Promise<void> {
    if (this.enabled) {
      await this.updateIntensity(intensity)
      return
    }

    this.enabled = true
    this.createOverlays(intensity)
  }

  async disable(): Promise<void> {
    if (!this.enabled) return
    this.enabled = false
    this.closeOverlays()
  }

  async updateIntensity(intensity: number): Promise<void> {
    if (this.enabled && this.overlayWindows.length > 0) {
      // Update existing overlays without recreating them
      const opacity = (intensity / 100) * 0.4 // Max 40% opacity
      
      this.overlayWindows.forEach((window, index) => {
        if (!window.isDestroyed()) {
          window.webContents.executeJavaScript(`
            document.body.style.background = 'rgba(255, 147, 41, ${opacity})';
          `).catch(err => {
            console.error(`Failed to update overlay ${index}:`, err)
          })
        }
      })
    }
  }

  private createOverlays(intensity: number): void {
    const displays = screen.getAllDisplays()
    
    console.log(`[BlueLightFilter] Total displays: ${displays.length}`)

    displays.forEach((display, index) => {
      const { x, y, width, height } = display.bounds
      
      console.log(`[BlueLightFilter] Display ${index}:`, { x, y, width, height })

      const overlay = new BrowserWindow({
        x,
        y,
        width,
        height,
        fullscreen: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        enableLargerThanScreen: true,
        resizable: false,
        movable: false,
        minimizable: false,
        maximizable: false,
        closable: true,
        focusable: false,
        hasShadow: false,
        show: false, // Don't show until loaded
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Forces above taskbar on Windows
      overlay.setAlwaysOnTop(true, 'screen-saver')
      
      // Set window to be click-through
      overlay.setIgnoreMouseEvents(true, { forward: true })
      
      // Make sure it's visible
      overlay.setOpacity(1.0)

      // Load the filter HTML
      const html = this.getFilterHTML(intensity)
      overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      
      overlay.webContents.on('did-finish-load', () => {
        console.log(`[BlueLightFilter] Overlay ${index} loaded successfully`)
        // Show after content is loaded to prevent flicker
        if (!overlay.isDestroyed()) {
          overlay.show()
        }
      })

      this.overlayWindows.push(overlay)
    })
    
    console.log(`[BlueLightFilter] Created ${this.overlayWindows.length} overlay windows`)
  }

  private closeOverlays(): void {
    this.overlayWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.destroy()
      }
    })
    this.overlayWindows = []
  }

  private getFilterHTML(intensity: number): string {
    const opacity = (intensity / 100) * 0.4 // Max 40% opacity
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * {
              margin: 0;
              padding: 0;
            }
            html, body {
              width: 100%;
              height: 100%;
              overflow: hidden;
            }
            body {
              background: rgba(255, 147, 41, ${opacity});
              pointer-events: none;
              transition: background 0.3s ease;
            }
          </style>
        </head>
        <body></body>
      </html>
    `
  }

  // Clean up on app close
  async destroy(): Promise<void> {
    if (this.enabled) {
      this.closeOverlays()
    }
  }
}
