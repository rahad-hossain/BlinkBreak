import { useEffect, useState } from 'react'
import { Clock, SunDim, Settings, ArrowRight } from 'lucide-react'
import { TimerStatus } from '@shared/types'

interface HomeProps {
  onNavigate: (tab: string) => void
}

const modeLabel: Record<string, string> = { hard: 'Hard', soft: 'Soft', smart: 'Smart' }

const formatTime = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

export default function Home({ onNavigate }: HomeProps) {
  const [status, setStatus] = useState<TimerStatus | null>(null)

  useEffect(() => {
    window.electronAPI.getTimerStatus().then(setStatus)
    window.electronAPI.onTimerStatus(setStatus)
  }, [])

  const state = !status?.isRunning ? 'Not running' : status.isPaused ? 'Paused' : 'Next break in'

  const actions = [
    { tab: 'timer', label: 'Timer', hint: 'Interval & break mode', icon: Clock },
    { tab: 'personalize', label: 'Display', hint: 'Brightness, Extra Dim, filters', icon: SunDim },
    { tab: 'settings', label: 'Settings', hint: 'Reminders & sounds', icon: Settings }
  ]

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/15 via-card to-secondary/10 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <img src="./logo.jpg" alt="BlinkBreak Logo" className="h-14 w-14 rounded-2xl border border-border/70 object-cover" />
            <div>
              <h1 className="text-3xl font-semibold text-foreground">BlinkBreak</h1>
              <p className="text-muted-foreground">Rest your eyes, keep your focus.</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate('timer')}
            className="rounded-2xl border border-border/60 bg-background/70 px-6 py-4 text-left transition hover:border-primary/50"
          >
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground">{state}</div>
            <div className="text-4xl font-semibold tabular-nums text-foreground">
              {status?.isRunning ? formatTime(status.remainingTime) : '--:--'}
            </div>
            {status?.isRunning && (
              <div className="text-xs text-primary">
                {modeLabel[status.mode] ?? status.mode} mode · every {status.interval} min
              </div>
            )}
          </button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {actions.map(({ tab, label, hint, icon: Icon }) => (
          <button
            key={tab}
            onClick={() => onNavigate(tab)}
            className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 text-left transition hover:border-primary/50"
          >
            <Icon className="h-6 w-6 text-primary" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">{label}</div>
              <div className="text-sm text-muted-foreground">{hint}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
        ))}
      </section>

      <p className="text-center text-sm text-muted-foreground">
        20-20-20: every 20 minutes, look 20 feet away for 20 seconds.
      </p>
    </div>
  )
}
