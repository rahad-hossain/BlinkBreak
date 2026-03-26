import { useState, useEffect } from 'react'
import { useStore } from '../../store/store'

export default function Settings() {
  const { theme, setTheme } = useStore()
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [minimizeToTray] = useState(true)
  const [postureEnabled, setPostureEnabled] = useState(false)
  const [postureInterval, setPostureInterval] = useState(30)
  const [hydrationEnabled, setHydrationEnabled] = useState(false)
  const [hydrationInterval, setHydrationInterval] = useState(60)
  const [whitelist, setWhitelist] = useState<string[]>([])
  const [whitelistInput, setWhitelistInput] = useState('')
  const [focusEnabled, setFocusEnabled] = useState(false)
  const [blockedDomains, setBlockedDomains] = useState<string[]>([])
  const [domainInput, setDomainInput] = useState('')
  const [focusLoading, setFocusLoading] = useState(false)
  const [focusError, setFocusError] = useState<string | null>(null)
  const [showElevationNotice, setShowElevationNotice] = useState(false)

  useEffect(() => {
    window.electronAPI.getAutoLaunchStatus().then((enabled) => setAutoLaunch(enabled))
    window.electronAPI.getSettings().then((settings) => {
      setPostureEnabled(settings.postureReminder.enabled)
      setPostureInterval(settings.postureReminder.interval)
      setHydrationEnabled(settings.hydrationReminder.enabled)
      setHydrationInterval(settings.hydrationReminder.interval)
    })
    window.electronAPI.getSmartModeWhitelist().then(setWhitelist)
    window.electronAPI.getBlockedDomains().then(setBlockedDomains)
    window.electronAPI.getFocusModeStatus().then(setFocusEnabled)
  }, [])

  const handleAutoLaunchToggle = async () => {
    const newValue = !autoLaunch
    const result = newValue
      ? await window.electronAPI.enableAutoLaunch()
      : await window.electronAPI.disableAutoLaunch()
    if (result.success) setAutoLaunch(newValue)
  }

  const handlePostureToggle = () => {
    const newValue = !postureEnabled
    setPostureEnabled(newValue)
    window.electronAPI.setReminderConfig('posture', newValue, postureInterval)
  }

  const handleHydrationToggle = () => {
    const newValue = !hydrationEnabled
    setHydrationEnabled(newValue)
    window.electronAPI.setReminderConfig('hydration', newValue, hydrationInterval)
  }

  const handlePostureInterval = (value: number) => {
    setPostureInterval(value)
    window.electronAPI.setReminderConfig('posture', postureEnabled, value)
  }

  const handleHydrationInterval = (value: number) => {
    setHydrationInterval(value)
    window.electronAPI.setReminderConfig('hydration', hydrationEnabled, value)
  }

  const addToWhitelist = () => {
    const entry = whitelistInput.trim().toLowerCase()
    if (!entry || whitelist.includes(entry)) return
    const updated = [...whitelist, entry]
    setWhitelist(updated)
    setWhitelistInput('')
    window.electronAPI.setSmartModeWhitelist(updated)
  }

  const removeFromWhitelist = (entry: string) => {
    const updated = whitelist.filter(p => p !== entry)
    setWhitelist(updated)
    window.electronAPI.setSmartModeWhitelist(updated)
  }

  const handleFocusToggle = async () => {
    setFocusError(null)
    const newValue = !focusEnabled

    if (newValue) {
      /* Check if we need elevation before proceeding. */
      const hasAccess = await window.electronAPI.getHostsWriteAccess()
      if (!hasAccess) {
        setShowElevationNotice(true)
        return
      }
    }

    await applyFocusMode(newValue)
  }

  const applyFocusMode = async (newValue: boolean) => {
    setFocusLoading(true)
    setShowElevationNotice(false)
    const result = await window.electronAPI.setFocusMode(newValue)
    if (result.success) {
      setFocusEnabled(newValue)
    } else {
      setFocusError(result.error ?? 'Failed to update hosts file.')
    }
    setFocusLoading(false)
  }

  const addDomain = async () => {
    const entry = domainInput.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!entry || blockedDomains.includes(entry)) return
    const updated = [...blockedDomains, entry]
    setBlockedDomains(updated)
    setDomainInput('')
    await window.electronAPI.setBlockedDomains(updated)
  }

  const removeDomain = async (domain: string) => {
    const updated = blockedDomains.filter(d => d !== domain)
    setBlockedDomains(updated)
    await window.electronAPI.setBlockedDomains(updated)
  }

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative transition-colors ${enabled ? 'bg-primary' : 'bg-muted'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Settings</h2>
        <p className="text-muted-foreground">Customize your BlinkBreak experience</p>
      </div>

      {/* General Settings */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">General</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Auto-launch on startup</div>
              <div className="text-sm text-muted-foreground">Start BlinkBreak when you log in</div>
            </div>
            <Toggle enabled={autoLaunch} onChange={handleAutoLaunchToggle} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Minimize to system tray</div>
              <div className="text-sm text-muted-foreground">Keep running in background</div>
            </div>
            <Toggle enabled={minimizeToTray} onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Appearance</h3>
        <div className="space-y-4">
          <div>
            <label className="text-foreground font-medium mb-3 block">Theme</label>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => setTheme('dark-neon')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  theme === 'dark-neon'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold text-foreground">Dark Neon</div>
                <div className="text-sm text-muted-foreground mt-1">Eye-friendly dark theme</div>
              </button>
              <button 
                onClick={() => setTheme('white')}
                className={`p-4 border-2 rounded-lg text-left transition-all ${
                  theme === 'white'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="font-semibold text-foreground">White</div>
                <div className="text-sm text-muted-foreground mt-1">Clean light theme</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Health Features */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Health Features</h3>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-foreground font-medium">Posture Reminder</div>
                <div className="text-sm text-muted-foreground">Remind to sit up straight</div>
              </div>
              <Toggle enabled={postureEnabled} onChange={handlePostureToggle} />
            </div>
            {postureEnabled && (
              <div className="pl-0 pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Interval</span>
                  <span className="text-sm text-primary font-medium">{postureInterval} min</span>
                </div>
                <input
                  type="range" min="10" max="120" step="5"
                  value={postureInterval}
                  onChange={(e) => handlePostureInterval(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-foreground font-medium">Hydration Reminder</div>
                <div className="text-sm text-muted-foreground">Remind to drink water</div>
              </div>
              <Toggle enabled={hydrationEnabled} onChange={handleHydrationToggle} />
            </div>
            {hydrationEnabled && (
              <div className="pl-0 pt-1">
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Interval</span>
                  <span className="text-sm text-primary font-medium">{hydrationInterval} min</span>
                </div>
                <input
                  type="range" min="15" max="180" step="15"
                  value={hydrationInterval}
                  onChange={(e) => handleHydrationInterval(Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Smart Mode Whitelist */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-1">Smart Mode Whitelist</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Breaks pause automatically when any of these processes are running (e.g. figma.exe, obs64.exe).
        </p>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={whitelistInput}
            onChange={(e) => setWhitelistInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addToWhitelist()}
            placeholder="e.g. figma.exe"
            className="flex-1 px-3 py-2 bg-muted rounded-lg text-foreground text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addToWhitelist}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
        {whitelist.length === 0 ? (
          <p className="text-sm text-muted-foreground">No processes added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {whitelist.map((entry) => (
              <span
                key={entry}
                className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-sm text-foreground"
              >
                {entry}
                <button
                  onClick={() => removeFromWhitelist(entry)}
                  className="text-muted-foreground hover:text-destructive transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Focus Mode */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xl font-semibold text-foreground">Focus Mode</h3>
          <Toggle enabled={focusEnabled} onChange={handleFocusToggle} />
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {focusEnabled
            ? 'Blocking active — listed websites are inaccessible in all browsers.'
            : 'Enable to block distracting websites system-wide while you work.'}
        </p>

        {/* One-time elevation notice */}
        {showElevationNotice && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="text-foreground font-medium mb-1">Administrator access required</div>
            <div className="text-sm text-muted-foreground mb-3">
              Focus Mode edits the system hosts file to block websites in all browsers.
              You will see a one-time permission prompt from Windows. This only happens once per session.
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => applyFocusMode(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Continue
              </button>
              <button
                onClick={() => setShowElevationNotice(false)}
                className="px-4 py-2 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {focusLoading && (
          <p className="text-sm text-primary mb-3">Applying changes...</p>
        )}

        {focusError && (
          <p className="text-sm text-destructive mb-3">{focusError}</p>
        )}

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addDomain()}
            placeholder="e.g. reddit.com"
            className="flex-1 px-3 py-2 bg-muted rounded-lg text-foreground text-sm outline-none focus:ring-1 focus:ring-primary"
          />
          <button
            onClick={addDomain}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>

        {blockedDomains.length === 0 ? (
          <p className="text-sm text-muted-foreground">No domains added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {blockedDomains.map((domain) => (
              <span
                key={domain}
                className="flex items-center gap-1.5 px-3 py-1 bg-muted rounded-full text-sm text-foreground"
              >
                {domain}
                <button
                  onClick={() => removeDomain(domain)}
                  className="text-muted-foreground hover:text-destructive transition-colors leading-none"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-4">
          A one-time permission prompt appears when enabling. Changes take effect immediately in all browsers.
        </p>
      </div>

      {/* Advanced Settings */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Advanced</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Smart Mode Detection</div>
              <div className="text-sm text-muted-foreground">Auto-pause during meetings and presentations</div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">v1.2.0</span>
          </div>
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Data & Privacy</h3>
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-foreground font-medium mb-1">All data is stored locally</div>
            <div className="text-sm text-muted-foreground">
              BlinkBreak respects your privacy. No data is sent to external servers.
            </div>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors">
              Export Data
            </button>
            <button className="px-6 py-2 bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 font-medium transition-colors">
              Clear All Data
            </button>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">About</h3>
        <div className="space-y-2 text-muted-foreground">
          <div className="flex justify-between">
            <span>Version</span>
            <span className="text-foreground">1.0.0</span>
          </div>
          <div className="flex justify-between">
            <span>Platform</span>
            <span className="text-foreground">Windows</span>
          </div>
          <div className="flex justify-between">
            <span>License</span>
            <span className="text-foreground">MIT</span>
          </div>
        </div>
      </div>
    </div>
  )
}
