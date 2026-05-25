const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('questionApi', {
  platform: process.platform,
  loadProjects: () => ipcRenderer.invoke('projects:load'),
  saveProjects: (projects) => ipcRenderer.invoke('projects:save', projects),
  getDataPath: () => ipcRenderer.invoke('app:get-data-path'),
  getVersion: () => ipcRenderer.invoke('app:get-version'),
  checkForUpdates: () => ipcRenderer.invoke('app:check-for-updates'),
  openExternal: (url) => ipcRenderer.invoke('app:open-external', url),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximizeWindow: () => ipcRenderer.invoke('window:toggle-maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:show-open', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:show-save', options),
})
