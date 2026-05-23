const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('questionApi', {
  loadProjects: () => ipcRenderer.invoke('projects:load'),
  saveProjects: (projects) => ipcRenderer.invoke('projects:save', projects),
  getDataPath: () => ipcRenderer.invoke('app:get-data-path'),
  showOpenDialog: (options) => ipcRenderer.invoke('dialog:show-open', options),
  showSaveDialog: (options) => ipcRenderer.invoke('dialog:show-save', options),
})
