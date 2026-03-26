import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { execSync, spawnSync } from 'child_process'

const BLOCK_START = '# BlinkBreak-Start'
const BLOCK_END = '# BlinkBreak-End'
const REDIRECT = '127.0.0.1'

/* Returns the platform-specific path to the system hosts file. */
function getHostsPath(): string {
  return os.platform() === 'win32'
    ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'drivers', 'etc', 'hosts')
    : '/etc/hosts'
}

/* Returns true if the current process has direct write access to the hosts file. */
function canWriteHosts(hostsPath: string): boolean {
  try {
    fs.accessSync(hostsPath, fs.constants.W_OK)
    return true
  } catch {
    return false
  }
}

/*
 * Writes hosts file content via OS-level privilege elevation.
 * Called only when the process lacks direct write access.
 *
 * Windows 10/11:
 *   Writes a temporary .bat file and executes it via PowerShell
 *   Start-Process with -Verb RunAs, which triggers a UAC prompt.
 *   A .bat file is used to avoid PowerShell quote-escaping issues
 *   with paths that may contain spaces.
 *
 * macOS:
 *   Uses osascript to request administrator privileges via the
 *   native macOS password dialog.
 *
 * Linux:
 *   Uses pkexec (PolicyKit) for a GUI prompt. Falls back to sudo
 *   if pkexec is unavailable.
 */
function writeHostsElevated(hostsPath: string, content: string): void {
  const tmpDir = os.tmpdir()
  const tmpContent = path.join(tmpDir, 'blinkbreak-hosts.tmp')
  fs.writeFileSync(tmpContent, content, 'utf8')

  const platform = os.platform()

  if (platform === 'win32') {
    const scriptPath = path.join(tmpDir, 'blinkbreak-elevate.bat')
    fs.writeFileSync(scriptPath, `@echo off\ncopy /y "${tmpContent}" "${hostsPath}"\n`, 'utf8')

    const result = spawnSync('powershell', [
      '-NoProfile', '-NonInteractive', '-Command',
      `Start-Process '${scriptPath}' -Verb RunAs -Wait -WindowStyle Hidden`
    ], { timeout: 20000 })

    try { fs.unlinkSync(scriptPath) } catch { /* ignore cleanup failure */ }

    if (result.status !== 0) {
      throw new Error(`Elevation failed: ${result.stderr?.toString() ?? 'unknown error'}`)
    }
  } else if (platform === 'darwin') {
    const src = tmpContent.replace(/'/g, "\\'")
    const dest = hostsPath.replace(/'/g, "\\'")
    execSync(`osascript -e 'do shell script "cp \\'${src}\\' \\'${dest}\\'" with administrator privileges'`, { timeout: 15000 })
  } else {
    try {
      execSync(`pkexec cp "${tmpContent}" "${hostsPath}"`, { timeout: 15000 })
    } catch {
      execSync(`sudo cp "${tmpContent}" "${hostsPath}"`, { timeout: 15000 })
    }
  }

  try { fs.unlinkSync(tmpContent) } catch { /* ignore cleanup failure */ }
}

/*
 * Manages website blocking by injecting entries into the system hosts file.
 *
 * All modifications are confined to a clearly marked section between
 * BLOCK_START and BLOCK_END markers. No other content in the hosts file
 * is read, modified, or removed.
 *
 * Write strategy:
 *   - If the process already has write access (e.g. launched as administrator),
 *     the hosts file is written directly via fs.writeFileSync.
 *   - Otherwise, elevation is requested through the OS (UAC on Windows,
 *     password dialog on macOS, pkexec on Linux).
 */
export class WebsiteBlockerManager {
  private enabled = false
  private domains: string[] = []
  private readonly hostsPath: string

  constructor() {
    this.hostsPath = getHostsPath()
  }

  /* Injects blocked domains into the hosts file. Requests elevation if required. */
  async enable(domains: string[]): Promise<{ success: boolean; error?: string; needsElevation?: boolean }> {
    this.domains = domains
    if (domains.length === 0) return { success: true }

    try {
      this.writeBlock(domains)
      this.enabled = true
      console.log(`[WebsiteBlocker] Enabled — blocking ${domains.length} domain(s)`)
      return { success: true }
    } catch (err: any) {
      console.error('[WebsiteBlocker] Failed to enable:', err.message)
      return { success: false, error: err.message, needsElevation: !canWriteHosts(this.hostsPath) }
    }
  }

  /* Removes the BlinkBreak section from the hosts file. */
  async disable(): Promise<{ success: boolean; error?: string }> {
    try {
      this.removeBlock()
      this.enabled = false
      console.log('[WebsiteBlocker] Disabled')
      return { success: true }
    } catch (err: any) {
      console.error('[WebsiteBlocker] Failed to disable:', err.message)
      return { success: false, error: err.message }
    }
  }

  /* Updates the domain list and rewrites the hosts block if currently active. */
  async setDomains(domains: string[]): Promise<{ success: boolean; error?: string }> {
    this.domains = domains
    if (!this.enabled) return { success: true }
    return this.enable(domains)
  }

  /* Returns true if the process can write the hosts file without elevation. */
  hasWriteAccess(): boolean {
    return canWriteHosts(this.hostsPath)
  }

  getDomains(): string[] {
    return this.domains
  }

  isEnabled(): boolean {
    return this.enabled
  }

  async destroy(): Promise<void> {
    if (this.enabled) {
      await this.disable()
    }
  }

  /*
   * Builds the hosts block section for the given domains.
   * Both the bare domain and the www. variant are included.
   */
  private buildBlockSection(domains: string[]): string {
    const entries = domains.flatMap(domain => {
      const clean = domain
        .replace(/^https?:\/\//, '')
        .replace(/\/.*$/, '')
        .toLowerCase()
        .trim()
      const base = clean.startsWith('www.') ? clean.slice(4) : clean
      return [`${REDIRECT} ${base}`, `${REDIRECT} www.${base}`]
    })
    return `\n${BLOCK_START}\n${entries.join('\n')}\n${BLOCK_END}\n`
  }

  private readHosts(): string {
    try {
      return fs.readFileSync(this.hostsPath, 'utf8')
    } catch {
      return ''
    }
  }

  /* Removes the BlinkBreak section from hosts content, preserving everything else. */
  private stripBlock(content: string): string {
    const start = content.indexOf(BLOCK_START)
    const end = content.indexOf(BLOCK_END)
    if (start === -1 || end === -1) return content
    return content.slice(0, start).trimEnd() + content.slice(end + BLOCK_END.length)
  }

  private writeHosts(content: string): void {
    if (canWriteHosts(this.hostsPath)) {
      fs.writeFileSync(this.hostsPath, content, { encoding: 'utf8', flag: 'w' })
    } else {
      writeHostsElevated(this.hostsPath, content)
    }
  }

  private writeBlock(domains: string[]): void {
    const stripped = this.stripBlock(this.readHosts())
    this.writeHosts(stripped + this.buildBlockSection(domains))
  }

  private removeBlock(): void {
    const stripped = this.stripBlock(this.readHosts())
    this.writeHosts(stripped)
  }
}
