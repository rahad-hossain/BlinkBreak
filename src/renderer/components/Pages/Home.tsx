interface HomeProps {
  onNavigate: (tab: string) => void
}

const highlights = [
  { title: 'Smart pauses', description: 'Breaks adapt to your flow and stay out of the way when you need focus.' },
  { title: 'Gentle reminders', description: 'Hydration and posture prompts help you reset without breaking concentration.' },
  { title: 'Display comfort', description: 'Tune brightness, contrast, and warm lighting to fit your environment.' }
]

const modes = [
  {
    title: 'Hard Mode',
    description: 'Fully pause your screen with a focused lock for deep work.',
    icon: '🔒'
  },
  {
    title: 'Soft Mode',
    description: 'Use a calm popup reminder when you want a lighter nudge.',
    icon: '🔔'
  },
  {
    title: 'Smart Mode',
    description: 'Let BlinkBreak detect active sessions and pause automatically.',
    icon: '⚡'
  }
]

const features = [
  {
    title: '20-20-20 rhythm',
    description: 'A simple wellness loop that helps reduce eye strain throughout the day.',
    icon: '👁️'
  },
  {
    title: 'Warm screen comfort',
    description: 'Create a softer visual environment with blue-light and color controls.',
    icon: '🌙'
  },
  {
    title: 'Hydration & posture',
    description: 'Stay refreshed and aligned with timely, customizable reminders.',
    icon: '💧'
  },
  {
    title: 'Personalized setup',
    description: 'Fine-tune your flow with modern monitor presets and notification sounds.',
    icon: '🎛️'
  }
]

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/15 via-card to-secondary/10 p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <img src="./logo.jpg" alt="BlinkBreak Logo" className="h-14 w-14 rounded-2xl border border-border/70 object-cover shadow-sm" />
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Eye care assistant</p>
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">A calmer way to work.</h1>
              </div>
            </div>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              BlinkBreak helps you protect your focus and comfort with intelligent breaks, wellness reminders, and display controls that feel effortless.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button onClick={() => onNavigate('timer')} className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
                Start your session
              </button>
              <button onClick={() => onNavigate('personalize')} className="rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted">
                Fine-tune display comfort
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[360px]">
            {highlights.map((item) => (
              <div key={item.title} className="rounded-2xl border border-border/60 bg-background/70 p-4 backdrop-blur">
                <h3 className="font-semibold text-foreground">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Choose your rhythm</p>
            <h2 className="text-2xl font-semibold text-foreground">Pick the break style that fits your day</h2>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modes.map((mode) => (
            <div key={mode.title} className="rounded-2xl border border-border/60 bg-background/70 p-6 transition hover:-translate-y-0.5 hover:border-primary/40">
              <div className="text-4xl">{mode.icon}</div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{mode.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-sm sm:p-7">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Why people use BlinkBreak</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">Healthy habits, built into your routine</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border/60 bg-background/70 p-5">
                <div className="text-3xl">{feature.icon}</div>
                <h3 className="mt-3 font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/20 via-card to-secondary/10 p-5 shadow-sm sm:p-7">
          <p className="text-sm font-medium uppercase tracking-[0.25em] text-primary">Ready when you are</p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground">Start fresh in one click</h3>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            Open your timer, choose a mode, and let BlinkBreak guide you through healthier work sessions.
          </p>
          <div className="mt-6 space-y-3">
            <button onClick={() => onNavigate('timer')} className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
              Launch timer
            </button>
            <button onClick={() => onNavigate('settings')} className="flex w-full items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted">
              Open settings
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
