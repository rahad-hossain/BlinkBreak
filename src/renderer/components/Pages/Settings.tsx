import { useState, useEffect } from 'react'
import { useStore } from '../../store/store'

export default function Settings() {
  const { theme, setTheme } = useStore()
  const [autoLaunch, setAutoLaunch] = useState(true)
  const [minimizeToTray, setMinimizeToTray] = useState(true)
  const [soundNotifications, setSoundNotifications] = useState(false)
  const [postureReminder, setPostureReminder] = useState(false)
  const [hydrationReminder, setHydrationReminder] = useState(false)
  const [smartMode, setSmartMode] = useState(false)
  const [focusMode, setFocusMode] = useState(false)

  // Load auto-launch status on mount
  useEffect(() => {
    window.electronAPI.getAutoLaunchStatus().then((enabled) => {
      setAutoLaunch(enabled)
    })
  }, [])

  // Handle auto-launch toggle
  const handleAutoLaunchToggle = async () => {
    const newValue = !autoLaunch
    
    if (newValue) {
      const result = await window.electronAPI.enableAutoLaunch()
      if (result.success) {
        setAutoLaunch(true)
      }
    } else {
      const result = await window.electronAPI.disableAutoLaunch()
      if (result.success) {
        setAutoLaunch(false)
      }
    }
  }

  const Toggle = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
    <button 
      onClick={onChange}
      className={`w-12 h-6 rounded-full relative transition-colors ${
        enabled ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <div 
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all ${
          enabled ? 'right-0.5' : 'left-0.5'
        }`}
      ></div>
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
            <Toggle enabled={minimizeToTray} onChange={() => setMinimizeToTray(!minimizeToTray)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Sound notifications</div>
              <div className="text-sm text-muted-foreground">Play sound when break starts</div>
            </div>
            <Toggle enabled={soundNotifications} onChange={() => setSoundNotifications(!soundNotifications)} />
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Posture Reminder</div>
              <div className="text-sm text-muted-foreground">Remind to sit up straight every 30 min</div>
            </div>
            <Toggle enabled={postureReminder} onChange={() => setPostureReminder(!postureReminder)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Hydration Reminder</div>
              <div className="text-sm text-muted-foreground">Remind to drink water every 60 min</div>
            </div>
            <Toggle enabled={hydrationReminder} onChange={() => setHydrationReminder(!hydrationReminder)} />
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
            <Toggle enabled={smartMode} onChange={() => setSmartMode(!smartMode)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-foreground font-medium">Focus Mode</div>
              <div className="text-sm text-muted-foreground">Pomodoro timer with website blocking</div>
            </div>
            <Toggle enabled={focusMode} onChange={() => setFocusMode(!focusMode)} />
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
