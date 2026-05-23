const path = require('node:path')
const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const { SqliteStore } = require('./sqliteStore.cjs')

const isDev = !app.isPackaged
let mainWindow = null
let store = null

async function createWindow() {
  store = new SqliteStore(app.getPath('userData'))
  await store.init()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 760,
    title: '抽题助手',
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    await mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || 'http://127.0.0.1:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    await mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow()
})

ipcMain.handle('projects:load', () => {
  return store.getJson('projects', [])
})

ipcMain.handle('projects:save', (_event, projects) => {
  store.setJson('projects', projects)
  return { ok: true }
})

ipcMain.handle('app:get-data-path', () => app.getPath('userData'))

ipcMain.handle('dialog:show-open', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('dialog:show-save', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})
