import { useState } from 'react'

export default function Timer() {
  const [isRunning, setIsRunning] = useState(false)
  const [selectedMode, setSelectedMode] = useState('hard')
  const [breakInterval, setBreakInterval] = useState(20)
  const [breakDuration, setBreakDuration] = useState(20)

  const modes = [
    { id: 'hard', name: 'Hard Mode', description: 'Full screen lock' },
    { id: 'soft', name: 'Soft Mode', description: 'Gentle reminder' },
    { id: 'smart', name: 'Smart Mode', description: 'Auto-detect' }
  ]

  const presets = [
    { name: '20-20-20 Rule', interval: 20, duration: 20 },
    { name: 'Pomodoro', interval: 25, duration: 300 },
    { name: 'Frequent', interval: 15, duration: 15 }
  ]

  const applyPreset = (preset: typeof presets[0]) => {
    setBreakInterval(preset.interval)
    setBreakDuration(preset.duration)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Timer</h2>
        <p className="text-muted-foreground">Configure your break schedule</p>
      </div>

      {/* Timer Display */}
      <div className="bg-card p-8 rounded-lg border border-border text-center">
        <div className="text-6xl font-mono font-bold text-primary mb-4">
          {String(breakInterval).padStart(2, '0')}:00
        </div>
        <p className="text-muted-foreground mb-6">Next break in</p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => setIsRunning(!isRunning)}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-opacity"
          >
            {isRunning ? 'Stop Timer' : 'Start Timer'}
          </button>
          <button 
            disabled={!isRunning}
            className="px-8 py-3 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Pause
          </button>
        </div>
      </div>

      {/* Break Mode Selection */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Break Mode</h3>
        <div className="grid grid-cols-3 gap-4">
          {modes.map((mode) => (
            <button
              key={mode.id}
              onClick={() => setSelectedMode(mode.id)}
              className={`p-4 border-2 rounded-lg text-left transition-all ${
                selectedMode === mode.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold text-foreground mb-1">{mode.name}</div>
              <div className="text-sm text-muted-foreground">{mode.description}</div>
            </button>
          ))}
        </div>
        
        {/* Mode Descriptions */}
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          {selectedMode === 'hard' && (
            <div>
              <div className="font-medium text-foreground mb-1">🔒 Hard Mode</div>
              <div className="text-sm text-muted-foreground">
                Full screen lock with countdown timer. Screen goes black, forcing you to take a break. Cannot be skipped.
              </div>
            </div>
          )}
          {selectedMode === 'soft' && (
            <div>
              <div className="font-medium text-foreground mb-1">🔔 Soft Mode</div>
              <div className="text-sm text-muted-foreground">
                Gentle notification popup with alert sound. Doesn't interrupt your work. You can dismiss or take the break.
              </div>
            </div>
          )}
          {selectedMode === 'smart' && (
            <div>
              <div className="font-medium text-foreground mb-1">🤖 Smart Mode</div>
              <div className="text-sm text-muted-foreground">
                Auto-detects meetings and presentations. Pauses breaks during screen sharing or video calls.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Interval Settings */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Interval Settings</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-foreground font-medium">Break Interval</label>
              <span className="text-primary font-semibold">{breakInterval} minutes</span>
            </div>
            <input 
              type="range" 
              min="5" 
              max="60" 
              value={breakInterval}
              onChange={(e) => setBreakInterval(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>5 min</span>
              <span>60 min</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-foreground font-medium">Break Duration</label>
              <span className="text-primary font-semibold">{breakDuration} seconds</span>
            </div>
            <input 
              type="range" 
              min="10" 
              max="60" 
              value={breakDuration}
              onChange={(e) => setBreakDuration(Number(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>10 sec</span>
              <span>60 sec</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Quick Presets</h3>
        <div className="grid grid-cols-3 gap-4">
          {presets.map((preset) => (
            <button
              key={preset.name}
              onClick={() => applyPreset(preset)}
              className="p-4 bg-muted rounded-lg hover:bg-muted/80 text-left transition-colors"
            >
              <div className="font-semibold text-foreground">{preset.name}</div>
              <div className="text-sm text-muted-foreground mt-1">
                {preset.interval} min / {preset.duration > 60 ? `${preset.duration / 60} min` : `${preset.duration} sec`}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
