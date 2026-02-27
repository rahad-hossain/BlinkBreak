import { contextBridge, ipcRenderer } from 'electron'
import { ElectronAPI } from '@shared/types'

const electronAPI: ElectronAPI = {
  getSettings: () => ipcRenderer.invoke('get-settings'),
  setTheme: (theme) => ipcRenderer.send('set-theme', theme)
}

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
