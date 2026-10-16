import { useEffect, useRef, useState } from 'react'
import { TaskbarMode, TaskbarSettings } from '@shared/types'

const MODES: { id: TaskbarMode; name: string; hint: string }[] = [
  { id: 'default', name: 'Default', hint: 'Normal Windows look' },
  { id: 'clear', name: 'Clear', hint: 'Fully transparent' },
  { id: 'blur', name: 'Blur', hint: 'Blurred desktop' },
  { id: 'acrylic', name: 'Acrylic', hint: 'Blur + tint' },
  { id: 'solid', name: 'Solid', hint: 'Colour only' }
]

const COLORS = ['#000000', '#1e1e2e', '#ffffff', '#4db8a8', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b']

function Slider({ label, value, min, max, unit, onChange }: {
  label: string; value: number; min: number; max: number; unit: string; onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-foreground font-medium">{label}</label>
        <span className="text-primary font-semibold">{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
      />
    </div>
  )
}

function TaskbarPanel() {
  const [style, setStyle] = useState<TaskbarSettings>({ mode: 'default', color: '#000000', opacity: 25, blur: 16 })
  const [available, setAvailable] = useState(true)
  const [failed, setFailed] = useState(false)
  const pending = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    window.electronAPI.getTaskbarSettings().then(({ settings, available }) => {
      setStyle(settings)
      setAvailable(available)
    })
  }, [])

  // Debounce slider input so the taskbar is updated at most every 120 ms.
  const update = (patch: Partial<TaskbarSettings>) => {
    const next = { ...style, ...patch }
    setStyle(next)
    clearTimeout(pending.current)
    pending.current = setTimeout(async () => {
      setFailed(!(await window.electronAPI.setTaskbarStyle(next)))
    }, 120)
  }

  const showTint = style.mode === 'acrylic' || style.mode === 'solid'
  const showBlur = style.mode === 'blur' || style.mode === 'acrylic'

  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <h3 className="text-xl font-semibold text-foreground mb-1">Taskbar Customization</h3>
      <p className="text-sm text-muted-foreground mb-4">Restyles the real Windows taskbar. Changes apply instantly.</p>

      {!available && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-500">
          Taskbar engine (BlinkTaskbar.dll) could not be loaded. Taskbar styling is Windows 11 only.
        </div>
      )}

      <div className="space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              disabled={!available}
              onClick={() => update({ mode: m.id })}
              className={`p-3 rounded-lg border-2 text-left transition-all disabled:opacity-50 ${
                style.mode === m.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="font-semibold text-foreground text-sm">{m.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.hint}</div>
            </button>
          ))}
        </div>

        {showTint && (
          <div>
            <label className="text-foreground font-medium mb-3 block">{style.mode === 'solid' ? 'Colour' : 'Tint colour'}</label>
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => update({ color: c })}
                  style={{ backgroundColor: c }}
                  className={`h-8 w-8 rounded-full border-2 transition ${
                    style.color.toLowerCase() === c ? 'border-primary scale-110' : 'border-border'
                  }`}
                  title={c}
                />
              ))}
              <label className="relative h-8 w-8 cursor-pointer overflow-hidden rounded-full border-2 border-dashed border-border" title="Custom colour">
                <input
                  type="color" value={style.color}
                  onChange={(e) => update({ color: e.target.value })}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                <span className="flex h-full items-center justify-center text-xs text-muted-foreground">+</span>
              </label>
            </div>
          </div>
        )}

        {showTint && (
          <Slider
            label={style.mode === 'solid' ? 'Opacity' : 'Tint strength'}
            value={style.opacity} min={0} max={100} unit="%"
            onChange={(opacity) => update({ opacity })}
          />
        )}

        {showBlur && (
          <Slider label="Blur strength" value={style.blur} min={0} max={60} unit="" onChange={(blur) => update({ blur })} />
        )}

        {failed && (
          <div className="text-sm text-amber-500">
            Could not attach to the taskbar yet. BlinkBreak keeps retrying in the background.
          </div>
        )}
      </div>
    </div>
  )
}

export default function Plugin() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Plugin</h2>
        <p className="text-muted-foreground">Desktop and taskbar add-ons</p>
      </div>

      {/* Dynamic Desktop - Coming Soon */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Dynamic Desktop</h3>
        <div className="p-8 bg-muted/30 rounded-lg border-2 border-dashed border-muted text-center">
          <div className="text-4xl mb-3">🖼️</div>
          <div className="text-foreground font-medium mb-2">Smart Wallpaper System</div>
          <div className="text-sm text-muted-foreground mb-3">
            Create dynamic wallpapers with live data integration
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground max-w-md mx-auto">
            <div className="p-2 bg-background/50 rounded">📧 Email widgets</div>
            <div className="p-2 bg-background/50 rounded">💻 GitHub stats</div>
            <div className="p-2 bg-background/50 rounded">🌐 Web data feeds</div>
            <div className="p-2 bg-background/50 rounded">📊 Custom APIs</div>
          </div>
          <div className="text-xs text-muted-foreground mt-3 opacity-70">Coming Soon</div>
        </div>
      </div>

      <TaskbarPanel />
    </div>
  )
}
