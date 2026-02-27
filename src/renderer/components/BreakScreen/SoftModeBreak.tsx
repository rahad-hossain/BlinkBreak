interface SoftModeBreakProps {
  duration: number
  onDismiss: () => void
  onTakeBreak: () => void
}

export default function SoftModeBreak({ duration, onDismiss, onTakeBreak }: SoftModeBreakProps) {
  return (
    <div className="fixed bottom-8 right-8 z-50 w-96 bg-card border-2 border-primary rounded-lg shadow-2xl animate-in slide-in-from-bottom">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">👁️</div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-1">Time for a Break!</h3>
            <p className="text-sm text-muted-foreground">
              You've been working for a while. Take a {duration} second break to rest your eyes.
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>• Look at something 20 feet away</p>
          <p>• Blink slowly and relax</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onTakeBreak}
            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 font-medium transition-opacity"
          >
            Take Break
          </button>
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-muted text-muted-foreground rounded-lg hover:bg-muted/80 font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
