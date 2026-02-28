import { useEffect, useState } from 'react'
import { useStore } from './store/store'
import Sidebar from './components/Layout/Sidebar'
import Content from './components/Layout/Content'
import LoadingScreen from './components/LoadingScreen'
import HardModeBreak from './components/BreakScreen/HardModeBreak'
import SoftModeBreak from './components/BreakScreen/SoftModeBreak'
import Home from './components/Pages/Home'
import Timer from './components/Pages/Timer'
import Statistics from './components/Pages/Statistics'
import Personalize from './components/Pages/Personalize'
import Settings from './components/Pages/Settings'
import { BreakMode } from '@shared/types'

function App() {
  const { theme, loadSettings } = useStore()
  const [activeTab, setActiveTab] = useState('home')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [breakActive, setBreakActive] = useState(false)
  const [breakMode, setBreakMode] = useState<BreakMode>('hard')
  const [breakDuration, setBreakDuration] = useState(20)

  useEffect(() => {
    const initApp = async () => {
      await loadSettings()
      // minimum loading time
      setTimeout(() => {
        setIsLoading(false)
      }, 1500)
    }
    
    initApp()

    // Listen for break events
    window.electronAPI.onBreakStart((data) => {
      setBreakMode(data.mode)
      setBreakDuration(data.duration)
      setBreakActive(true)
    })

    window.electronAPI.onBreakEnd(() => {
      setBreakActive(false)
    })

    // Listen for tray pause/resume toggle
    window.electronAPI.onTrayTogglePause(() => {
      window.electronAPI.getTimerStatus().then((status) => {
        if (status.isPaused) {
          window.electronAPI.resumeTimer()
        } else {
          window.electronAPI.pauseTimer()
        }
      })
    })

    // Listen for timer status updates to send to tray
    window.electronAPI.onUpdateTray((status) => {
      window.electronAPI.updateTrayStatus(status)
    })
  }, [])

  useEffect(() => {
    document.documentElement.className = theme
  }, [theme])

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return
    
    setIsTransitioning(true)
    setTimeout(() => {
      setActiveTab(tab)
      setIsTransitioning(false)
    }, 20)
  }

  const handleSkipBreak = () => {
    window.electronAPI.skipBreak()
    setBreakActive(false)
  }

  const handleTakeBreak = () => {
    // soft mode, just close the popup and let the break timer continue
    setBreakActive(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home onNavigate={handleTabChange} />
      case 'timer':
        return <Timer />
      case 'statistics':
        return <Statistics />
      case 'personalize':
        return <Personalize />
      case 'settings':
        return <Settings />
      default:
        return <Home onNavigate={handleTabChange} />
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <>
      <div className="flex h-screen">
        <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
        <Content isTransitioning={isTransitioning}>{renderContent()}</Content>
      </div>
      
      {/* Break Screens */}
      {breakActive && breakMode === 'hard' && (
        <HardModeBreak duration={breakDuration} onComplete={() => setBreakActive(false)} />
      )}
      {breakActive && breakMode === 'soft' && (
        <SoftModeBreak 
          duration={breakDuration} 
          onDismiss={handleSkipBreak}
          onTakeBreak={handleTakeBreak}
        />
      )}
    </>
  )
}

export default App
