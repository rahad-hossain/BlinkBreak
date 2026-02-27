import { useEffect, useState } from 'react'
import { useStore } from './store/store'
import Sidebar from './components/Layout/Sidebar'
import Content from './components/Layout/Content'
import LoadingScreen from './components/LoadingScreen'
import Home from './components/Pages/Home'
import Timer from './components/Pages/Timer'
import Statistics from './components/Pages/Statistics'
import Personalize from './components/Pages/Personalize'
import Settings from './components/Pages/Settings'

function App() {
  const { theme, loadSettings } = useStore()
  const [activeTab, setActiveTab] = useState('home')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const initApp = async () => {
      await loadSettings()
      // Simulate minimum loading time for smooth experience
      setTimeout(() => {
        setIsLoading(false)
      }, 1500)
    }
    
    initApp()
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
    <div className="flex h-screen">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <Content isTransitioning={isTransitioning}>{renderContent()}</Content>
    </div>
  )
}

export default App
