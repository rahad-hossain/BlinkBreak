import { create } from 'zustand'
import { Settings, Theme } from '@shared/types'

interface AppState {
  settings: Settings | null
  theme: Theme
  
  loadSettings: () => Promise<void>
  setTheme: (theme: Theme) => void
}

export const useStore = create<AppState>((set) => ({
  settings: null,
  theme: 'dark-neon',

  loadSettings: async () => {
    const settings = await window.electronAPI.getSettings()
    set({ settings, theme: settings.theme })
  },

  setTheme: (theme: Theme) => {
    window.electronAPI.setTheme(theme)
    set({ theme })
  }
}))
