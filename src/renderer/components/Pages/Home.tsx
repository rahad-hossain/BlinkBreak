interface HomeProps {
  onNavigate: (tab: string) => void
}

export default function Home({ onNavigate }: HomeProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="BlinkBreak Logo" 
            className="w-24 h-24 rounded-2xl shadow-lg border-2 border-primary/30"
          />
        </div>
        <h1 className="text-5xl font-bold text-foreground mb-4">BlinkBreak</h1>
        <p className="text-xl text-muted-foreground mb-8">Your Eyes Deserve a Break</p>
        <div className="flex gap-4 justify-center">
          <div className="px-6 py-3 bg-primary/10 text-primary rounded-lg font-medium">
            ⏱️ Smart Break Timer
          </div>
          <div className="px-6 py-3 bg-primary/10 text-primary rounded-lg font-medium">
            📊 Track Progress
          </div>
          <div className="px-6 py-3 bg-primary/10 text-primary rounded-lg font-medium">
            🎨 Personalize
          </div>
        </div>
      </div>

      {/* Break Modes */}
      <div className="bg-card p-8 rounded-lg border border-border">
        <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Choose Your Break Mode</h2>
        <div className="grid grid-cols-3 gap-6">
          <div className="text-center p-6 bg-muted/30 rounded-lg hover:bg-primary/10 transition-all cursor-pointer hover-lift">
            <div className="text-5xl mb-4">🔒</div>
            <div className="text-xl font-bold text-foreground mb-2">Hard Mode</div>
            <div className="text-sm text-muted-foreground">Full screen lock</div>
          </div>
          <div className="text-center p-6 bg-muted/30 rounded-lg hover:bg-primary/10 transition-all cursor-pointer hover-lift">
            <div className="text-5xl mb-4">🔔</div>
            <div className="text-xl font-bold text-foreground mb-2">Soft Mode</div>
            <div className="text-sm text-muted-foreground">Gentle reminder</div>
          </div>
          <div className="text-center p-6 bg-muted/30 rounded-lg hover:bg-primary/10 transition-all cursor-pointer hover-lift">
            <div className="text-5xl mb-4">🤖</div>
            <div className="text-xl font-bold text-foreground mb-2">Smart Mode</div>
            <div className="text-sm text-muted-foreground">Auto-detect</div>
          </div>
        </div>
      </div>

      {/* Stats Preview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-lg border border-border text-center hover-lift">
          <div className="text-4xl mb-2">12</div>
          <div className="text-sm text-muted-foreground">Breaks Today</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border text-center hover-lift">
          <div className="text-4xl mb-2">94%</div>
          <div className="text-sm text-muted-foreground">Completion</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border text-center hover-lift">
          <div className="text-4xl mb-2">7</div>
          <div className="text-sm text-muted-foreground">Day Streak</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border text-center hover-lift">
          <div className="text-4xl mb-2">6.5h</div>
          <div className="text-sm text-muted-foreground">Screen Time</div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl">⏱️</div>
            <div className="text-xl font-bold text-foreground">20-20-20 Rule</div>
          </div>
          <div className="text-muted-foreground">Every 20 minutes, look 20 feet away for 20 seconds</div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl">🌙</div>
            <div className="text-xl font-bold text-foreground">Blue Light Filter</div>
          </div>
          <div className="text-muted-foreground">Reduce eye strain with warm color temperature</div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl">💧</div>
            <div className="text-xl font-bold text-foreground">Stay Hydrated</div>
          </div>
          <div className="text-muted-foreground">Regular reminders to drink water</div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border hover:border-primary/50 transition-all hover-lift">
          <div className="flex items-center gap-4 mb-3">
            <div className="text-4xl">🧘</div>
            <div className="text-xl font-bold text-foreground">Posture Check</div>
          </div>
          <div className="text-muted-foreground">Reminders to maintain good posture</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-primary/20 to-secondary/20 p-8 rounded-lg border border-primary/30">
        <div className="text-center">
          <h3 className="text-2xl font-bold text-foreground mb-4">Ready to Start?</h3>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => onNavigate('timer')}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-all hover:scale-105 active:scale-95"
            >
              Start Timer
            </button>
            <button 
              onClick={() => onNavigate('settings')}
              className="px-8 py-3 bg-card text-foreground rounded-lg hover:bg-muted font-medium transition-all border border-border hover:scale-105 active:scale-95"
            >
              View Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
