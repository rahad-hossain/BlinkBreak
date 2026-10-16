import { exec } from 'child_process'
import { promisify } from 'util'
import * as os from 'os'
import { BrowserWindow, screen } from 'electron'

const execAsync = promisify(exec)

/**
 * Manages monitor brightness and contrast across all connected displays.
 * Uses native OS APIs without third-party dependencies.
 */
export class MonitorControlManager {
  private currentBrightness: number = 100
  private currentContrast: number = 100
  private platform: string = os.platform()
  private dimWindows: BrowserWindow[] = []

  constructor() {
    console.log(`[MonitorControl] Platform: ${this.platform}`)
  }

  /**
   * Values below 0 extend past the hardware minimum: the monitor stays at 0
   * and a click-through overlay darkens every display by |value| percent.
   */
  async setBrightness(value: number): Promise<boolean> {
    this.setDimOverlay(value < 0 ? Math.min(-value, 90) : 0)
    if (value < 0) {
      const wasHardwareZero = this.currentBrightness <= 0
      this.currentBrightness = value
      return wasHardwareZero ? true : await this.setHardwareBrightness(0)
    }
    this.currentBrightness = value
    return await this.setHardwareBrightness(value)
  }

  private setDimOverlay(percent: number) {
    if (percent <= 0) {
      this.dimWindows.forEach(w => {
        if (!w.isDestroyed()) {
          w.hide()
          w.destroy()
        }
      })
      this.dimWindows = []
      return
    }

    const html = (o: number) =>
      `data:text/html,<html style="height:100%25"><body style="margin:0;height:100%25;background:rgba(0,0,0,${o})"></body></html>`

    if (this.dimWindows.length) {
      this.dimWindows.forEach(w => !w.isDestroyed() && w.loadURL(html(percent / 100)))
      return
    }

    this.dimWindows = screen.getAllDisplays().map(display => {
      const win = new BrowserWindow({
        ...display.bounds,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        alwaysOnTop: true,
        skipTaskbar: true,
        focusable: false,
        resizable: false,
        movable: false,
        hasShadow: false,
        enableLargerThanScreen: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true }
      })
      // With mixed display scaling the initial size uses the primary display's
      // scale factor, so apply the bounds again once the window is on its display.
      win.setBounds(display.bounds)
      win.setBounds(display.bounds)
      win.setAlwaysOnTop(true, 'screen-saver')
      win.setIgnoreMouseEvents(true)
      win.loadURL(html(percent / 100))
      return win
    })
  }

  private async setHardwareBrightness(value: number): Promise<boolean> {

    if (this.platform === 'win32') {
      return await this.setBrightnessWindows(value)
    } else if (this.platform === 'linux') {
      return await this.setBrightnessLinux(value)
    } else if (this.platform === 'darwin') {
      return await this.setBrightnessMac(value)
    }

    console.warn('[MonitorControl] Unsupported platform')
    return false
  }

  /**
   * Controls brightness on Windows using DXVA2 API and WMI.
   * Applies to both built-in and external DDC/CI monitors.
   */
  private async setBrightnessWindows(value: number): Promise<boolean> {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const scriptPath = isDev
        ? require('path').join(__dirname, '../../helpers/SetAllMonitorsBrightness.ps1')
        : require('path').join(process.resourcesPath, 'helpers/SetAllMonitorsBrightness.ps1')

      const { stdout } = await execAsync(
        `powershell -ExecutionPolicy Bypass -File "${scriptPath}" -Brightness ${value}`,
        { timeout: 5000 }
      )

      const lines = stdout.trim().split('\n')
      console.log(`[MonitorControl] Brightness control:`)
      lines.forEach(line => console.log(`[MonitorControl]   ${line.trim()}`))

      const successLine = lines.find(l => l.includes('SUCCESS:'))
      return !!successLine
    } catch (error: any) {
      console.error('[MonitorControl] Windows brightness failed:', error.message)
      return false
    }
  }

  /**
   * Controls brightness on Linux using xrandr, sysfs, and ddcutil.
   * Supports laptop displays and external DDC/CI monitors.
   */
  private async setBrightnessLinux(value: number): Promise<boolean> {
    try {
      const isDev = process.env.NODE_ENV === 'development'
      const scriptPath = isDev
        ? require('path').join(__dirname, '../../helpers/set-brightness-linux.sh')
        : require('path').join(process.resourcesPath, 'helpers/set-brightness-linux.sh')

      await execAsync(`chmod +x "${scriptPath}"`, { timeout: 1000 }).catch(() => { })

      const { stdout } = await execAsync(`bash "${scriptPath}" ${value}`, { timeout: 5000 })

      const lines = stdout.trim().split('\n')
      console.log(`[MonitorControl] Linux brightness control:`)
      lines.forEach(line => console.log(`[MonitorControl]   ${line.trim()}`))

      const successLine = lines.find(l => l.includes('SUCCESS:'))
      return !!successLine
    } catch (error: any) {
      console.error('[MonitorControl] Linux brightness failed:', error.message)
      return false
    }
  }

  /**
   * Controls brightness on macOS using AppleScript.
   * Simulates keyboard brightness keys.
   */
  private async setBrightnessMac(value: number): Promise<boolean> {
    try {
      const script = `
        tell application "System Events"
          key code 144 -- brightness down to minimum
          repeat ${value} times
            key code 145 -- brightness up
          end repeat
        end tell
      `
      await execAsync(`osascript -e '${script}'`, { timeout: 3000 })
      console.log(`[MonitorControl] macOS brightness set to ${value}%`)
      return true
    } catch (error: any) {
      console.error('[MonitorControl] macOS brightness failed:', error.message)
      return false
    }
  }

  async setContrast(value: number): Promise<boolean> {
    this.currentContrast = value

    if (this.platform === 'win32') {
      return await this.setContrastWindows(value)
    } else if (this.platform === 'linux') {
      return await this.setContrastLinux(value)
    }

    console.log(`[MonitorControl] Contrast set to ${value}% (software tracking only)`)
    return false
  }

  /**
   * Attempts contrast control on Windows via WMI.
   * Rarely supported by monitors.
   */
  private async setContrastWindows(value: number): Promise<boolean> {
    try {
      const script = `
        $contrast = ${value};
        Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods | ForEach-Object {
          try {
            $_.WmiSetContrast(1, $contrast) | Out-Null;
          } catch {
            Write-Host "Contrast not supported";
          }
        }
      `.replace(/\s+/g, ' ').trim()

      const { stdout } = await execAsync(`powershell -NoProfile -Command "${script}"`, { timeout: 3000 })
      const output = stdout.toString().toLowerCase()

      if (output.includes('contrast not supported') || output.includes('not supported')) {
        console.log('[MonitorControl] Windows contrast not supported - use monitor OSD buttons')
        return false
      }

      console.log(`[MonitorControl] Windows contrast set to ${value}%`)
      return true
    } catch (error) {
      console.log('[MonitorControl] Windows contrast not supported - use monitor OSD buttons')
      return false
    }
  }

  /**
   * Controls contrast on Linux using ddcutil for external monitors.
   * Requires DDC/CI support.
   */
  private async setContrastLinux(value: number): Promise<boolean> {
    try {
      await execAsync('command -v ddcutil', { timeout: 1000 })

      const { stdout } = await execAsync('ddcutil detect --brief', { timeout: 3000 })
      const lines = stdout.trim().split('\n')
      let success = false

      for (const line of lines) {
        if (line.startsWith('Display')) {
          const displayNum = line.match(/Display (\d+)/)?.[1]
          if (displayNum) {
            try {
              await execAsync(`ddcutil setvcp 12 ${value} --display ${displayNum}`, { timeout: 3000 })
              console.log(`[MonitorControl] ddcutil contrast set to ${value}% on Display ${displayNum}`)
              success = true
            } catch (e) {
              console.log(`[MonitorControl] Failed to set contrast on Display ${displayNum}`)
            }
          }
        }
      }

      if (!success) {
        console.log('[MonitorControl] No DDC/CI monitors found for contrast control')
      }

      return success
    } catch (error) {
      console.log('[MonitorControl] ddcutil not available - contrast control requires ddcutil')
      console.log('[MonitorControl] Install: sudo apt install ddcutil')
      return false
    }
  }

  async getBrightness(): Promise<number> {
    if (this.currentBrightness < 0) return this.currentBrightness
    if (this.platform === 'win32') {
      return await this.getBrightnessWindows()
    } else if (this.platform === 'linux') {
      return await this.getBrightnessLinux()
    }

    return this.currentBrightness
  }

  private async getBrightnessWindows(): Promise<number> {
    try {
      const script = `(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightness | Select-Object -First 1).CurrentBrightness`
      const { stdout } = await execAsync(`powershell -NoProfile -Command "${script}"`, { timeout: 3000 })
      const brightness = parseInt(stdout.trim())

      if (!isNaN(brightness)) {
        this.currentBrightness = brightness
        return brightness
      }
    } catch (error) {
      console.log('[MonitorControl] Failed to get Windows brightness')
    }

    return this.currentBrightness
  }

  private async getBrightnessLinux(): Promise<number> {
    try {
      const { stdout: backlights } = await execAsync('ls /sys/class/backlight/', { timeout: 1000 })
      const backlight = backlights.trim().split('\n')[0]

      if (backlight) {
        const { stdout: currentStr } = await execAsync(`cat /sys/class/backlight/${backlight}/brightness`, { timeout: 1000 })
        const { stdout: maxStr } = await execAsync(`cat /sys/class/backlight/${backlight}/max_brightness`, { timeout: 1000 })

        const current = parseInt(currentStr.trim())
        const max = parseInt(maxStr.trim())

        if (!isNaN(current) && !isNaN(max)) {
          this.currentBrightness = Math.round((current / max) * 100)
          return this.currentBrightness
        }
      }
    } catch (error) {
      console.log('[MonitorControl] Failed to get Linux brightness')
    }

    return this.currentBrightness
  }

  getCurrentBrightness(): number {
    return this.currentBrightness
  }

  getCurrentContrast(): number {
    return this.currentContrast
  }

  isAvailable(): boolean {
    return true
  }

  getPlatform(): string {
    return this.platform
  }
}
