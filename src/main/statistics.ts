import Store from 'electron-store'
import { Statistics } from '@shared/types'

const defaultStatistics: Statistics = {
  totalBreaksTaken: 0,
  totalBreaksSkipped: 0,
  currentStreak: 0,
  longestStreak: 0,
  lastBreakDate: '',
  dailyStats: [],
  weeklyStats: [],
  monthlyStats: [],
  weekComparison: {
    currentWeek: { breaksTaken: 0, completionRate: 0 },
    previousWeek: { breaksTaken: 0, completionRate: 0 },
    improvement: { breaks: 0, breaksPercent: 0, completionRate: 0 }
  },
  recentActivity: []
}

export class StatisticsManager {
  private store: Store<{ statistics: Statistics; lastSessionEnd: number }>

  constructor() {
    this.store = new Store<{ statistics: Statistics; lastSessionEnd: number }>({
      defaults: {
        statistics: defaultStatistics,
        lastSessionEnd: Date.now()
      }
    })
    
    // Save session end time when app closes
    this.saveSessionEnd()
  }

  private saveSessionEnd(): void {
    // Update last session end time periodically and on app close
    setInterval(() => {
      this.store.set('lastSessionEnd', Date.now())
    }, 60000) // Update every minute
  }

  getStatistics(): Statistics {
    const stats = this.store.get('statistics') as Statistics
    
    // Ensure recentActivity exists (for backward compatibility)
    if (!stats.recentActivity) {
      stats.recentActivity = []
    }
    
    return stats
  }

  private saveStatistics(stats: Statistics): void {
    this.store.set('statistics', stats)
  }

  recordBreakTaken(duration: number): void {
    const stats = this.getStatistics()
    const today = this.getTodayString()

    // Add to recent activity
    stats.recentActivity.unshift({
      timestamp: Date.now(),
      type: 'taken',
      duration
    })
    
    // Keep only last 50 events
    if (stats.recentActivity.length > 50) {
      stats.recentActivity = stats.recentActivity.slice(0, 50)
    }

    // Update totals
    stats.totalBreaksTaken++

    // Update streak
    this.updateStreak(stats, today, true)

    // Update daily stats (no screen time here, tracked separately)
    this.updateDailyStats(stats, today, 'taken', 0)

    // Update weekly stats
    this.updateWeeklyStats(stats)

    // Update monthly stats
    this.updateMonthlyStats(stats)

    // Update week comparison
    this.updateWeekComparison(stats)

    this.saveStatistics(stats)
  }

  recordBreakSkipped(duration: number): void {
    const stats = this.getStatistics()
    const today = this.getTodayString()

    // Add to recent activity
    stats.recentActivity.unshift({
      timestamp: Date.now(),
      type: 'skipped',
      duration
    })
    
    // Keep only last 50 events
    if (stats.recentActivity.length > 50) {
      stats.recentActivity = stats.recentActivity.slice(0, 50)
    }

    // Update totals
    stats.totalBreaksSkipped++

    // Break streak on skip
    this.updateStreak(stats, today, false)

    // Update daily stats (no screen time here, tracked separately)
    this.updateDailyStats(stats, today, 'skipped', 0)

    // Update weekly stats
    this.updateWeeklyStats(stats)

    // Update monthly stats
    this.updateMonthlyStats(stats)

    // Update week comparison
    this.updateWeekComparison(stats)

    this.saveStatistics(stats)
  }

  private updateStreak(stats: Statistics, today: string, breakTaken: boolean): void {
    if (breakTaken) {
      if (stats.lastBreakDate === today) {
        // Same day, continue streak
        return
      } else if (this.isConsecutiveDay(stats.lastBreakDate, today)) {
        // Consecutive day, increment streak
        stats.currentStreak++
        if (stats.currentStreak > stats.longestStreak) {
          stats.longestStreak = stats.currentStreak
        }
      } else {
        // Not consecutive, reset streak
        stats.currentStreak = 1
      }
      stats.lastBreakDate = today
    } else {
      // Break skipped, reset streak
      stats.currentStreak = 0
    }
  }

  private updateDailyStats(stats: Statistics, today: string, type: 'taken' | 'skipped', screenTimeMinutes: number): void {
    let dailyStat = stats.dailyStats.find(s => s.date === today)

    if (!dailyStat) {
      dailyStat = {
        date: today,
        breaksTaken: 0,
        breaksSkipped: 0,
        screenTime: 0,
        completionRate: 0
      }
      stats.dailyStats.push(dailyStat)
    }

    if (type === 'taken') {
      dailyStat.breaksTaken++
    } else {
      dailyStat.breaksSkipped++
    }

    // Add screen time
    dailyStat.screenTime += screenTimeMinutes

    // Calculate completion rate
    const total = dailyStat.breaksTaken + dailyStat.breaksSkipped
    dailyStat.completionRate = total > 0 ? Math.round((dailyStat.breaksTaken / total) * 100) : 0

    // Keep only last 90 days
    if (stats.dailyStats.length > 90) {
      stats.dailyStats = stats.dailyStats.slice(-90)
    }
  }

  private updateWeeklyStats(stats: Statistics): void {
    const weekStart = this.getWeekStart()
    let weeklyStat = stats.weeklyStats.find(s => s.weekStart === weekStart)

    if (!weeklyStat) {
      weeklyStat = {
        weekStart,
        breaksTaken: 0,
        breaksSkipped: 0,
        screenTime: 0,
        completionRate: 0
      }
      stats.weeklyStats.push(weeklyStat)
    }

    // Aggregate from daily stats for this week
    const weekDays = this.getWeekDays(weekStart)
    const weekDailyStats = stats.dailyStats.filter(s => weekDays.includes(s.date))

    weeklyStat.breaksTaken = weekDailyStats.reduce((sum, s) => sum + s.breaksTaken, 0)
    weeklyStat.breaksSkipped = weekDailyStats.reduce((sum, s) => sum + s.breaksSkipped, 0)
    weeklyStat.screenTime = weekDailyStats.reduce((sum, s) => sum + s.screenTime, 0)

    const total = weeklyStat.breaksTaken + weeklyStat.breaksSkipped
    weeklyStat.completionRate = total > 0 ? Math.round((weeklyStat.breaksTaken / total) * 100) : 0

    // Keep only last 12 weeks
    if (stats.weeklyStats.length > 12) {
      stats.weeklyStats = stats.weeklyStats.slice(-12)
    }
  }

  private updateMonthlyStats(stats: Statistics): void {
    const month = this.getMonthString()
    let monthlyStat = stats.monthlyStats.find(s => s.month === month)

    if (!monthlyStat) {
      monthlyStat = {
        month,
        breaksTaken: 0,
        breaksSkipped: 0,
        screenTime: 0,
        completionRate: 0
      }
      stats.monthlyStats.push(monthlyStat)
    }

    // Aggregate from daily stats for this month
    const monthDailyStats = stats.dailyStats.filter(s => s.date.startsWith(month))

    monthlyStat.breaksTaken = monthDailyStats.reduce((sum, s) => sum + s.breaksTaken, 0)
    monthlyStat.breaksSkipped = monthDailyStats.reduce((sum, s) => sum + s.breaksSkipped, 0)
    monthlyStat.screenTime = monthDailyStats.reduce((sum, s) => sum + s.screenTime, 0)

    const total = monthlyStat.breaksTaken + monthlyStat.breaksSkipped
    monthlyStat.completionRate = total > 0 ? Math.round((monthlyStat.breaksTaken / total) * 100) : 0

    // Keep only last 12 months
    if (stats.monthlyStats.length > 12) {
      stats.monthlyStats = stats.monthlyStats.slice(-12)
    }
  }

  private getTodayString(): string {
    const now = new Date()
    return now.toISOString().split('T')[0] // YYYY-MM-DD
  }

  private getMonthString(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}` // YYYY-MM
  }

  private getWeekStart(): string {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) // Adjust to Monday
    const monday = new Date(now.setDate(diff))
    return monday.toISOString().split('T')[0]
  }

  private getWeekDays(weekStart: string): string[] {
    const days: string[] = []
    const start = new Date(weekStart)
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      days.push(day.toISOString().split('T')[0])
    }
    
    return days
  }

  private isConsecutiveDay(lastDate: string, currentDate: string): boolean {
    if (!lastDate) return false
    
    const last = new Date(lastDate)
    const current = new Date(currentDate)
    const diffTime = current.getTime() - last.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    return diffDays === 1
  }

  private updateWeekComparison(stats: Statistics): void {
    const currentWeekStart = this.getWeekStart()
    const previousWeekStart = this.getPreviousWeekStart()

    // Get current week stats
    const currentWeek = stats.weeklyStats.find(s => s.weekStart === currentWeekStart)
    const previousWeek = stats.weeklyStats.find(s => s.weekStart === previousWeekStart)

    stats.weekComparison.currentWeek = {
      breaksTaken: currentWeek?.breaksTaken || 0,
      completionRate: currentWeek?.completionRate || 0
    }

    stats.weekComparison.previousWeek = {
      breaksTaken: previousWeek?.breaksTaken || 0,
      completionRate: previousWeek?.completionRate || 0
    }

    // Calculate improvement
    const breaksDiff = stats.weekComparison.currentWeek.breaksTaken - stats.weekComparison.previousWeek.breaksTaken
    const breaksPercent = stats.weekComparison.previousWeek.breaksTaken > 0
      ? Math.round((breaksDiff / stats.weekComparison.previousWeek.breaksTaken) * 100)
      : 0

    const completionDiff = stats.weekComparison.currentWeek.completionRate - stats.weekComparison.previousWeek.completionRate

    stats.weekComparison.improvement = {
      breaks: breaksDiff,
      breaksPercent,
      completionRate: Math.round(completionDiff)
    }
  }

  private getPreviousWeekStart(): string {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 7 // Go back 7 days from current week Monday
    const previousMonday = new Date(now.setDate(diff))
    return previousMonday.toISOString().split('T')[0]
  }

  // Call this when app is closing to save final session time
  onAppClose(): void {
    this.store.set('lastSessionEnd', Date.now())
  }

  // Add screen time minutes (called every 5 minutes)
  addScreenTime(minutes: number): void {
    if (minutes <= 0) return
    
    const stats = this.getStatistics()
    const today = this.getTodayString()
    
    // Find or create today's stats
    let dailyStat = stats.dailyStats.find(s => s.date === today)
    
    if (!dailyStat) {
      dailyStat = {
        date: today,
        breaksTaken: 0,
        breaksSkipped: 0,
        screenTime: 0,
        completionRate: 0
      }
      stats.dailyStats.push(dailyStat)
    }
    
    // Add screen time
    dailyStat.screenTime += minutes
    
    // Update weekly and monthly stats
    this.updateWeeklyStats(stats)
    this.updateMonthlyStats(stats)
    
    this.saveStatistics(stats)
  }
}
