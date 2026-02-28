export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center space-y-6">
        <div className="flex justify-center mb-6">
          <img 
            src="/logo.jpg" 
            alt="BlinkBreak Logo" 
            className="w-32 h-32 rounded-2xl shadow-2xl animate-pulse logo-border"
          />
        </div>
        <h1 className="text-4xl font-bold text-primary">BlinkBreak</h1>
        <p className="text-muted-foreground">Loading your eye care assistant...</p>
        <div className="flex justify-center gap-2 mt-4">
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  )
}
