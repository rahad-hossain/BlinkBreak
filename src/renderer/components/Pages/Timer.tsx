import { useState, useEffect } from 'react'
import { BreakMode, TimerStatus } from '@shared/types'

interface SmartModeStatus {
  enabled: boolean
  inMeeting: boolean
  detectedBy: string | null
  manualOverride: boolean
}

export default function Timer() {
  const [timerStatus, setTimerStatus] = useState<TimerStatus>({
    isRunning: false,
    isPaused: false,
    remainingTime: 0,
    interval: 20,
    duration: 20,
    mode: 'hard'
  })
  const [selectedMode, setSelectedMode] = useState<BreakMode>('hard')
  const [breakInterval, setBreakInterval] = useState(20)
  const [breakDuration, setBreakDuration] = useState(20)
  const [smartStatus, setSmartStatus] = useState<SmartModeStatus>({
    enabled: false, inMeeting: false, detectedBy: null, manualOverride: false
  })

  useEffect(() => {
    window.electronAPI.getTimerStatus().then((status) => {
      setTimerStatus(status)
      setSelectedMode(status.mode)
      setBreakInterval(status.interval)
      setBreakDuration(status.duration)
    })

    window.electronAPI.onTimerStatus((status) => {
      setTimerStatus(status)
    })

    window.electronAPI.getSmartModeStatus().then(setSmartStatus)
    window.electronAPI.onSmartModeStatus(setSmartStatus)
  }, [])

  // Auto-restart timer when settings change (only if timer is already running)
  useEffect(() => {
    // Check if settings have changed
    const settingsChanged = 
      selectedMode !== timerStatus.mode ||
      breakInterval !== timerStatus.interval ||
      breakDuration !== timerStatus.duration

    // Only restart if timer is already running and settings changed
    if (settingsChanged && timerStatus.isRunning) {
      window.electronAPI.startTimer(breakInterval, breakDuration, selectedMode)
    }
  }, [selectedMode, breakInterval, breakDuration])

  const modes = [
    { id: 'hard' as BreakMode, name: 'Hard Mode', description: 'Full screen lock' },
    { id: 'soft' as BreakMode, name: 'Soft Mode', description: 'Gentle reminder' },
    { id: 'smart' as BreakMode, name: 'Smart Mode', description: 'Auto-detect' }
  ]

  const presets = [
    { name: '20-20-20 Rule', interval: 20, duration: 20 },
    { name: 'Pomodoro', interval: 25, duration: 300 },
    { name: 'Frequent', interval: 15, duration: 15 }
  ]

  const handleModeSelect = (mode: BreakMode) => {
    setSelectedMode(mode)
    if (mode === 'smart') {
      window.electronAPI.setSmartMode(true)
    } else if (selectedMode === 'smart') {
      window.electronAPI.setSmartMode(false)
    }
  }

  const applyPreset = (preset: typeof presets[0]) => {
    setBreakInterval(preset.interval)
    setBreakDuration(preset.duration)
  }

  const handlePauseResume = () => {
    if (timerStatus.isPaused) {
      window.electronAPI.resumeTimer()
    } else {
      window.electronAPI.pauseTimer()
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
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
          {formatTime(timerStatus.remainingTime)}
        </div>
        <p className="text-muted-foreground mb-6">
          {timerStatus.isPaused ? 'BlinkBreak paused' : 'Next BlinkBreak in'}
        </p>
        <div className="flex gap-4 justify-center">
          <button 
            onClick={handlePauseResume}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-opacity"
          >
            {timerStatus.isPaused ? 'Start BlinkBreak' : 'Pause BlinkBreak'}
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
              onClick={() => handleModeSelect(mode.id)}
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

        {/* Smart Mode Status */}
        {selectedMode === 'smart' && (
          <div className={`mt-4 p-3 rounded-lg border ${
            smartStatus.inMeeting
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-primary/10 border-primary/30'
          }`}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-foreground">
                {smartStatus.inMeeting
                  ? `Meeting detected${smartStatus.detectedBy ? ` via ${smartStatus.detectedBy}` : ''} - breaks paused`
                  : 'Monitoring for meetings...'}
              </p>
              <button
                onClick={() => window.electronAPI.setManualMeeting(!smartStatus.inMeeting)}
                className="text-xs px-3 py-1 bg-muted rounded-md hover:bg-muted/80 transition-colors ml-3 shrink-0"
              >
                {smartStatus.inMeeting ? 'End Meeting' : 'I\'m in a Meeting'}
              </button>
            </div>
          </div>
        )}
        
        {timerStatus.isPaused ? (
          <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
            <p className="text-sm text-foreground">
              ⚠️ BlinkBreak is paused - settings changes will apply when you resume
            </p>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
            <p className="text-sm text-foreground">
              💡 Changing settings will restart BlinkBreak with new configuration
            </p>
          </div>
        )}
      </div>

      {/* Interval Settings */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Interval Settings</h3>
        <div className="space-y-6">
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-foreground font-medium">Break Interval</label>
              <span className="text-primary font-semibold">{breakInterval} {breakInterval === 1 ? 'minute' : 'minutes'}</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="5" 
                max="60" 
                step="5"
                value={breakInterval}
                onChange={(e) => setBreakInterval(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(var(--primary)) 0%, 
                    hsl(var(--primary)) ${((breakInterval - 5) / 55) * 100}%, 
                    hsl(var(--muted)) ${((breakInterval - 5) / 55) * 100}%, 
                    hsl(var(--muted)) 100%)`
                }}
              />
              <div className="flex justify-between mt-2 px-0.5">
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((val) => (
                  <div key={val} className="flex flex-col items-center -ml-1 first:ml-0 last:mr-0">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mb-1"></div>
                    <span className="text-[10px] text-muted-foreground">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-foreground font-medium">Break Duration</label>
              <span className="text-primary font-semibold">{breakDuration} seconds</span>
            </div>
            <div className="relative">
              <input 
                type="range" 
                min="5" 
                max="60" 
                step="5"
                value={breakDuration}
                onChange={(e) => setBreakDuration(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
                style={{
                  background: `linear-gradient(to right, 
                    hsl(var(--primary)) 0%, 
                    hsl(var(--primary)) ${((breakDuration - 5) / 55) * 100}%, 
                    hsl(var(--muted)) ${((breakDuration - 5) / 55) * 100}%, 
                    hsl(var(--muted)) 100%)`
                }}
              />
              <div className="flex justify-between mt-2 px-0.5">
                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((val) => (
                  <div key={val} className="flex flex-col items-center -ml-1 first:ml-0 last:mr-0">
                    <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full mb-1"></div>
                    <span className="text-[10px] text-muted-foreground">{val}</span>
                  </div>
                ))}
              </div>
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
