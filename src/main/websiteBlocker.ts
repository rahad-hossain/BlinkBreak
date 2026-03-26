import * as fs from 'fs'
import * as path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const HOSTS_PATH = 'C:\\Windows\\System32\\drivers\\etc\\hosts'
const BLOCK_START = '# BlinkBreak-Start'
const BLOCK_END = '# BlinkBreak-End'
const REDIRECT = '127.0.0.1'

/*
 * Manages website blocking via the system hosts file.
 * Injects a clearly marked section for blocked domains.
 * On disable or app quit, removes only the marked section.
 * Requires elevated privileges — uses elevate.exe already bundled.
 */
export class WebsiteBlockerManager {
  private enabled = false
  private domains: string[] = []
  private elevatePath: string

  constructor() {
    const isDev = process.env.NODE_ENV === 'development'
    this.elevatePath = isDev
      ? path.join(__dirname, '../../release/win-unpacked/resources/elevate.exe')
      : path.join(process.resourcesPath, 'elevate.exe')
  }

  /* Enables blocking for the given domain list. */
  async enable(domains: string[]): Promise<{ success: boolean; error?: string }> {
    this.domains = domains
    if (domains.length === 0) return { success: true }

    try {
      await this.writeBlock(domains)
      this.enabled = true
      console.log(`[WebsiteBlocker] Enabled — blocking ${domains.length} domain(s)`)
      return { success: true }
    } catch (err: any) {
      console.error('[WebsiteBlocker] Failed to enable:', err.message)
      return { success: false, error: err.message }
    }
  }

  /* Removes the BlinkBreak block section from the hosts file. */
  async disable(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.removeBlock()
      this.enabled = false
      console.log('[WebsiteBlocker] Disabled')
      return { success: true }
    } catch (err: any) {
      console.error('[WebsiteBlocker] Failed to disable:', err.message)
      return { success: false, error: err.message }
    }
  }

  /* Updates the blocked domain list while active. */
  async setDomains(domains: string[]): Promise<{ success: boolean; error?: string }> {
    this.domains = domains
    if (!this.enabled) return { success: true }
    return this.enable(domains)
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

  private buildBlockSection(domains: string[]): string {
    const entries = domains.flatMap(domain => {
      const clean = domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase()
      const www = clean.startsWith('www.') ? clean : `www.${clean}`
      const base = clean.startsWith('www.') ? clean.slice(4) : clean
      return [`${REDIRECT} ${base}`, `${REDIRECT} ${www}`]
    })

    return `\n${BLOCK_START}\n${entries.join('\n')}\n${BLOCK_END}\n`
  }

  private readHosts(): string {
    try {
      return fs.readFileSync(HOSTS_PATH, 'utf8')
    } catch {
      return ''
    }
  }

  private stripBlock(content: string): string {
    const startIdx = content.indexOf(BLOCK_START)
    const endIdx = content.indexOf(BLOCK_END)
    if (startIdx === -1 || endIdx === -1) return content
    return content.slice(0, startIdx).trimEnd() + content.slice(endIdx + BLOCK_END.length)
  }

  private async writeHosts(content: string): Promise<void> {
    const tmpPath = path.join(require('os').tmpdir(), 'blinkbreak-hosts.tmp')
    fs.writeFileSync(tmpPath, content, 'utf8')

    /* Copy via elevate.exe to bypass UAC without a persistent prompt. */
    await execAsync(
      `"${this.elevatePath}" cmd /c copy /y "${tmpPath}" "${HOSTS_PATH}"`,
      { timeout: 10000 }
    )

    fs.unlinkSync(tmpPath)
  }

  private async writeBlock(domains: string[]): Promise<void> {
    const current = this.readHosts()
    const stripped = this.stripBlock(current)
    const updated = stripped + this.buildBlockSection(domains)
    await this.writeHosts(updated)
  }

  private async removeBlock(): Promise<void> {
    const current = this.readHosts()
    const stripped = this.stripBlock(current)
    await this.writeHosts(stripped)
  }
}
