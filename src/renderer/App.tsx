import { useEffect } from 'react'
import { useStore } from './store/store'

function App() {
  const { theme, loadSettings } = useStore()

  useEffect(() => {
    loadSettings()
  }, [])

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-primary">BlinkBreak</h1>
        <p className="text-2xl text-muted-foreground">Your Eyes Deserve a Break</p>
        <p className="text-lg text-muted-foreground">Coming Soon...</p>
      </div>
    </div>
  )
}

export default App
