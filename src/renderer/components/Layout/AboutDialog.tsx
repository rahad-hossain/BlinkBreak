import { useEffect } from 'react'
import { X, Github, ShieldCheck, Eye, Monitor, Puzzle, ExternalLink } from 'lucide-react'

const REPO_URL = 'https://github.com/rahad-hossain/BlinkBreak'
const PROFILE_URL = 'https://github.com/rahad-hossain'

const FEATURES = [
  { icon: Eye, title: 'Healthy breaks', text: '20-20-20 reminders in hard, soft or smart mode' },
  { icon: Monitor, title: 'Display comfort', text: 'Brightness, extra dim, blue light filter and colour mask' },
  { icon: Puzzle, title: 'Plugins', text: 'Restyled taskbar and a GitHub desktop widget' },
  { icon: ShieldCheck, title: 'Private by design', text: 'No telemetry; your data stays on this PC' }
]

const open = (url: string) => window.electronAPI.openWidgetLink(url)

export default function AboutDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label="About BlinkBreak"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <button onClick={onClose} className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" title="Close">
          <X size={18} />
        </button>

        <div className="bg-gradient-to-br from-primary/20 via-card to-card px-6 pb-5 pt-6">
          <div className="flex items-center gap-4">
            <img src="./logo.jpg" alt="BlinkBreak" className="h-14 w-14 rounded-2xl border border-border object-cover shadow" />
            <div>
              <h2 className="text-2xl font-bold text-foreground">BlinkBreak</h2>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">v{__APP_VERSION__}</span>
                <span className="text-xs text-muted-foreground">Eye care assistant for Windows</span>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            BlinkBreak reduces eye strain with timely breaks and display comfort tools, and adds a few desktop
            touches to make your workspace calmer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex gap-3 rounded-lg bg-muted/50 p-3">
              <Icon size={18} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <div className="text-sm font-semibold text-foreground">{title}</div>
                <div className="text-xs text-muted-foreground">{text}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mx-6 flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <button onClick={() => open(PROFILE_URL)} className="font-semibold text-primary hover:underline">
            @rahad-hossain
          </button>
          <button
            onClick={() => open(REPO_URL)}
            className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Github size={16} /> Source code <ExternalLink size={14} />
          </button>
        </div>

        <div className="h-6" />
      </div>
    </div>
  )
}
