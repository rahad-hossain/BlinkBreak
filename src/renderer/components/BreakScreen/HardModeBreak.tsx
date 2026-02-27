import { useState, useEffect } from 'react'

interface HardModeBreakProps {
  duration: number
  onComplete: () => void
}

export default function HardModeBreak({ duration, onComplete }: HardModeBreakProps) {
  const [timeLeft, setTimeLeft] = useState(duration)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          onComplete()
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [duration, onComplete])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="text-center space-y-8 px-8">
        <div className="text-6xl mb-4">👁️</div>
        <h1 className="text-5xl font-bold text-primary">Time for a Break!</h1>
        <p className="text-2xl text-muted-foreground">Rest your eyes and relax</p>
        
        <div className="text-8xl font-mono font-bold text-primary my-12">
          {formatTime(timeLeft)}
        </div>

        <div className="space-y-4 text-lg text-muted-foreground max-w-md mx-auto">
          <p>👀 Look at something 20 feet away</p>
          <p>😌 Blink slowly and relax your eyes</p>
          <p>🧘 Take deep breaths</p>
        </div>

        <div className="mt-8 text-sm text-muted-foreground/50">
          Hard Mode - Screen locked until break completes
        </div>
      </div>
    </div>
  )
}
