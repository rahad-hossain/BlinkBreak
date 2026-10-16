import { useState } from 'react'
import { Home, Settings, BarChart3, Clock, Palette, Puzzle, Info } from 'lucide-react'
import AboutDialog from './AboutDialog'

interface SidebarProps {
  activeTab: string
  onTabChange: (tab: string) => void
}

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [showAbout, setShowAbout] = useState(false)
  const menuItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'timer', label: 'Timer', icon: Clock },
    { id: 'statistics', label: 'Statistics', icon: BarChart3 },
    { id: 'personalize', label: 'Personalize', icon: Palette },
    { id: 'plugin', label: 'Plugin', icon: Puzzle },
    { id: 'settings', label: 'Settings', icon: Settings }
  ]

  return (
    <div className="w-64 h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <img
            src="./logo.jpg"
            alt="BlinkBreak Logo"
            className="w-10 h-10 rounded-lg logo-border"
          />
          <div>
            <h1 className="text-xl font-bold text-primary">BlinkBreak</h1>
            <p className="text-xs text-muted-foreground">Eye Care Assistant</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id

            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 relative overflow-hidden ${isActive
                      ? 'bg-primary text-primary-foreground shadow-lg scale-105'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground hover:scale-102'
                    }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 bg-primary animate-slideIn"></div>
                  )}
                  <Icon size={20} className="relative z-10" />
                  <span className="font-medium relative z-10">{item.label}</span>
                  {isActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary animate-slideIn"></div>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={() => setShowAbout(true)}
          className="group flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition-colors hover:border-primary/50 hover:bg-muted"
          title="About BlinkBreak"
        >
          <span className="flex items-center gap-2">
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">v{__APP_VERSION__}</span>
            <span className="text-xs text-muted-foreground group-hover:text-foreground">About</span>
          </span>
          <Info size={15} className="text-muted-foreground group-hover:text-primary" />
        </button>
      </div>

      {showAbout && <AboutDialog onClose={() => setShowAbout(false)} />}
    </div>
  )
}
