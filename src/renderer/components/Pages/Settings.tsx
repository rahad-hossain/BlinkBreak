import { useState, useEffect } from 'react'
import { useStore } from '../../store/store'

export default function Settings() {
  const { theme, setTheme } = useStore()
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [minimizeToTray] = useState(true)
  const [soundNotifications, setSoundNotifications] = useState(false)
  const [postureEnabled, setPostureEnabled] = useState(false)
  const [postureInterval, setPostureInterval] = useState(30)
  const [hydrationEnabled, setHydrationEnabled] = useState(false)
  const [hydrationInterval, setHydrationInterval] = useState(60)

  useEffect(() => {
    window.electronAPI.getAutoLaunchStatus().then((enabled) => setAutoLaunch(enabled))
    window.electronAPI.getSettings().then((settings) => {
      setPostureEnabled(settings.postureReminder.enabled)
      setPostureInterval(settings.postureReminder.interval)
      setHydrationEnabled(settings.hydrationReminder.enabled)
      setHydrationInterval(settings.hydrationReminder.interval)
    })
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

      {/* Advanced Settings */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Advanced</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Smart Mode Detection</div>
              <div className="text-sm text-muted-foreground">Auto-pause during meetings and presentations</div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming in v1.2.0</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Focus Mode</div>
              <div className="text-sm text-muted-foreground">Pomodoro timer with website blocking</div>
            </div>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Coming in v1.2.0</span>
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
