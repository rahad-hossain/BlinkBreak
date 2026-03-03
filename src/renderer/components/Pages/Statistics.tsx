import { useState, useEffect } from 'react'
import { Statistics as StatisticsType } from '@shared/types'

export default function Statistics() {
  const [stats, setStats] = useState<StatisticsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Load statistics
    window.electronAPI.getStatistics()
      .then((data) => {
        setStats(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Failed to load statistics:', err)
        setError('Failed to load statistics')
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <div className="text-center text-muted-foreground py-8">Loading statistics...</div>
  }

  if (error) {
    return <div className="text-center text-destructive py-8">{error}</div>
  }

  if (!stats) {
    return <div className="text-center text-muted-foreground py-8">No statistics available</div>
  }

  // Get today's stats
  const today = new Date().toISOString().split('T')[0]
  const todayStats = stats.dailyStats.find(s => s.date === today) || {
    breaksTaken: 0,
    breaksSkipped: 0,
    screenTime: 0,
    completionRate: 0
  }

  // Get yesterday's stats for comparison
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const yesterdayStats = stats.dailyStats.find(s => s.date === yesterday) || {
    breaksTaken: 0,
    breaksSkipped: 0
  }

  // Calculate differences
  const breaksDiff = todayStats.breaksTaken - yesterdayStats.breaksTaken
  const skippedDiff = todayStats.breaksSkipped - yesterdayStats.breaksSkipped

  // Format screen time with ~ prefix
  const formatScreenTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `~${hours}.${Math.floor(mins / 6)}h` : `~${mins}m`
  }

  // Get last 7 days for weekly chart
  const last7Days = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const dateStr = date.toISOString().split('T')[0]
    const dayStat = stats.dailyStats.find(s => s.date === dateStr) || {
      breaksTaken: 0,
      breaksSkipped: 0
    }
    last7Days.push({
      day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()],
      taken: dayStat.breaksTaken,
      skipped: dayStat.breaksSkipped
    })
  }

  // Calculate max for chart scaling
  const maxBreaks = Math.max(...last7Days.map(d => d.taken + d.skipped), 1)

  // Get this month's stats
  const thisMonth = new Date().toISOString().substring(0, 7)
  const monthStats = stats.monthlyStats.find(s => s.month === thisMonth) || {
    breaksTaken: 0,
    breaksSkipped: 0,
    screenTime: 0,
    completionRate: 0
  }

  // Calculate average screen time per day this month
  const daysInMonth = stats.dailyStats.filter(s => s.date.startsWith(thisMonth)).length || 1
  const avgScreenTime = Math.floor(monthStats.screenTime / daysInMonth)

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
          <div className="text-3xl font-bold text-primary">{todayStats.breaksTaken}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {breaksDiff > 0 ? `+${breaksDiff}` : breaksDiff < 0 ? breaksDiff : '='} from yesterday
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Breaks Skipped</div>
          <div className="text-3xl font-bold text-secondary">{todayStats.breaksSkipped}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {skippedDiff > 0 ? `+${skippedDiff}` : skippedDiff < 0 ? skippedDiff : '='} from yesterday
          </div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Screen Time</div>
          <div className="text-3xl font-bold text-foreground">{formatScreenTime(todayStats.screenTime)}</div>
          <div className="text-xs text-muted-foreground mt-1">Today</div>
        </div>
        <div className="bg-card p-6 rounded-lg border border-border">
          <div className="text-sm text-muted-foreground mb-1">Streak</div>
          <div className="text-3xl font-bold text-primary">{stats.currentStreak} days</div>
          <div className="text-xs text-muted-foreground mt-1">
            {stats.currentStreak > 0 ? 'Keep it up!' : 'Start your streak!'}
          </div>
        </div>
      </div>

      {/* Weekly Chart */}
      <div className="bg-card p-6 rounded-lg border border-border">
        <h3 className="text-xl font-semibold text-foreground mb-4">Weekly Overview</h3>
        <div className="h-64 flex items-end justify-between gap-4">
          {last7Days.map((day, index) => {
            const total = day.taken + day.skipped
            const takenPercent = total > 0 ? (day.taken / maxBreaks) * 100 : 0
            const skippedPercent = total > 0 ? (day.skipped / maxBreaks) * 100 : 0
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative h-48">
                  {total > 0 ? (
                    <>
                      <div 
                        className="absolute bottom-0 w-full bg-primary rounded-t-lg"
                        style={{ height: `${takenPercent}%` }}
                      ></div>
                      <div 
                        className="absolute w-full bg-primary/20 rounded-t-lg"
                        style={{ 
                          bottom: `${takenPercent}%`,
                          height: `${skippedPercent}%`
                        }}
                      ></div>
                    </>
                  ) : (
                    <div className="absolute bottom-0 w-full bg-muted/30 rounded-t-lg" style={{ height: '8px' }}></div>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">{day.day}</div>
                <div className="text-sm font-semibold text-foreground">{total}</div>
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
          {stats.recentActivity && stats.recentActivity.length > 0 ? (
            stats.recentActivity.slice(0, 10).map((activity, index) => {
              const date = new Date(activity.timestamp)
              const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
              const action = activity.type === 'taken' ? 'Break completed' : 'Break skipped'
              const duration = activity.type === 'taken' ? `${activity.duration} seconds` : '-'
              
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${activity.type === 'skipped' ? 'bg-secondary' : 'bg-primary'}`}></div>
                    <div>
                      <div className="text-foreground font-medium">{action}</div>
                      <div className="text-sm text-muted-foreground">{time}</div>
                    </div>
                  </div>
                  <div className="text-muted-foreground">{duration}</div>
                </div>
              )
            })
          ) : (
            <div className="text-center text-muted-foreground py-8">
              No recent activity yet. Take your first break!
            </div>
          )}
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card p-6 rounded-lg border border-border">
          <h3 className="text-xl font-semibold text-foreground mb-4">This Month</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Breaks</span>
              <span className="text-foreground font-semibold">{monthStats.breaksTaken}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completion Rate</span>
              <span className="text-primary font-semibold">{monthStats.completionRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Avg Screen Time</span>
              <span className="text-foreground font-semibold">{formatScreenTime(avgScreenTime)}/day</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Best Streak</span>
              <span className="text-foreground font-semibold">{stats.longestStreak} days</span>
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
