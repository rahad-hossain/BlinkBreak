export default function Statistics() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground mb-2">Statistics</h2>
        <p className="text-muted-foreground">Track your break history and screen time</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Today's Breaks</div>
          <div className="text-3xl font-bold text-primary">12</div>
          <div className="text-xs text-muted-foreground mt-1">+3 from yesterday</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Breaks Skipped</div>
          <div className="text-3xl font-bold text-secondary">2</div>
          <div className="text-xs text-muted-foreground mt-1">-1 from yesterday</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Screen Time</div>
          <div className="text-3xl font-bold text-foreground">6.5h</div>
          <div className="text-xs text-muted-foreground mt-1">Today</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Streak</div>
          <div className="text-3xl font-bold text-primary">7 days</div>
          <div className="text-xs text-muted-foreground mt-1">Keep it up!</div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Weekly Overview</h3>
        <div className="h-64 flex items-end justify-between gap-4">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const heights = [60, 75, 80, 70, 85, 65, 90]
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-primary/20 rounded-t-lg relative" style={{ height: `${heights[index]}%` }}>
                  <div className="absolute inset-0 bg-primary rounded-t-lg" style={{ height: '70%' }}></div>
                </div>
                <div className="text-sm text-muted-foreground">{day}</div>
              </div>
            )
          })}
        </div>
        <div className="flex justify-center gap-6 mt-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary rounded"></div>
            <span className="text-sm text-muted-foreground">Breaks Taken</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-primary/20 rounded"></div>
            <span className="text-sm text-muted-foreground">Breaks Skipped</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { time: '2:45 PM', action: 'Break completed', duration: '20 seconds' },
            { time: '2:25 PM', action: 'Break completed', duration: '20 seconds' },
            { time: '2:05 PM', action: 'Break skipped', duration: '-' },
            { time: '1:45 PM', action: 'Break completed', duration: '20 seconds' },
            { time: '1:25 PM', action: 'Break completed', duration: '20 seconds' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${activity.action === 'Break skipped' ? 'bg-secondary' : 'bg-primary'}`}></div>
                <div>
                  <div className="text-foreground font-medium">{activity.action}</div>
                  <div className="text-sm text-muted-foreground">{activity.time}</div>
                </div>
              </div>
              <div className="text-muted-foreground">{activity.duration}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4">This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Breaks</span>
              <span className="text-foreground font-semibold">342</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="text-primary font-semibold">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Screen Time</span>
              <span className="text-foreground font-semibold">6.2h/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best Streak</span>
              <span className="text-foreground font-semibold">12 days</span>
            </div>
          </div>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4">Goals</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Daily Break Goal</span>
                <span className="text-foreground font-semibold">12/15</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-muted-foreground">Weekly Streak</span>
                <span className="text-foreground font-semibold">7/7 days</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
