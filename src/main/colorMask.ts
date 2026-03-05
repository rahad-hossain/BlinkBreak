import { BrowserWindow, screen } from 'electron'

export class ColorMaskManager {
  private overlayWindows: BrowserWindow[] = []
  private enabled: boolean = false

  constructor() {}

  async enable(intensity: number = 30, red: number = 34, green: number = 197, blue: number = 94): Promise<void> {
    if (this.enabled) {
      await this.updateMask(intensity, red, green, blue)
      return
    }

    this.enabled = true
    this.createOverlays(intensity, red, green, blue)
  }

  async disable(): Promise<void> {
    if (!this.enabled) return
    this.enabled = false
    this.closeOverlays()
  }

  async updateMask(intensity: number, red: number, green: number, blue: number): Promise<void> {
    if (this.enabled && this.overlayWindows.length > 0) {
      const opacity = (intensity / 100) * 0.5 // Max 50% opacity
      
      this.overlayWindows.forEach((window, index) => {
        if (!window.isDestroyed()) {
          window.webContents.executeJavaScript(`
            document.body.style.background = 'rgba(${red}, ${green}, ${blue}, ${opacity})';
          `).catch(err => {
            console.error(`Failed to update color mask ${index}:`, err)
          })
        }
      })
    }
  }

  private createOverlays(intensity: number, red: number, green: number, blue: number): void {
    const displays = screen.getAllDisplays()
    
    console.log(`[ColorMask] Total displays: ${displays.length}`)

    displays.forEach((display, index) => {
      const { x, y, width, height } = display.bounds
      
      console.log(`[ColorMask] Display ${index}:`, { x, y, width, height })

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
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Forces above taskbar on Windows
      overlay.setAlwaysOnTop(true, 'screen-saver')
      
      // Set window to be click-through
      overlay.setIgnoreMouseEvents(true, { forward: true })
      
      overlay.setOpacity(1.0)

      // Load the mask HTML
      const html = this.getMaskHTML(intensity, red, green, blue)
      overlay.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
      
      overlay.webContents.on('did-finish-load', () => {
        console.log(`[ColorMask] Overlay ${index} loaded successfully`)
        if (!overlay.isDestroyed()) {
          overlay.show()
        }
      })

      this.overlayWindows.push(overlay)
    })
    
    console.log(`[ColorMask] Created ${this.overlayWindows.length} overlay windows`)
  }

  private closeOverlays(): void {
    this.overlayWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.destroy()
      }
    })
    this.overlayWindows = []
  }

  private getMaskHTML(intensity: number, red: number, green: number, blue: number): string {
    const opacity = (intensity / 100) * 0.5 // Max 50% opacity
    
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
              background: rgba(${red}, ${green}, ${blue}, ${opacity});
              pointer-events: none;
              transition: background 0.3s ease;
            }
          </style>
        </head>
        <body></body>
      </html>
    `
  }

  async destroy(): Promise<void> {
    if (this.enabled) {
      this.closeOverlays()
    }
  }
}
