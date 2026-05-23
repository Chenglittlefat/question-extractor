const path = require('node:path')
const fs = require('node:fs')
const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron')
const { SqliteStore } = require('./sqliteStore.cjs')

const isDev = !app.isPackaged
const appTitle = '抽题助手'
const appIconPath = path.join(__dirname, '..', 'build', 'icon.ico')
let mainWindow = null
let store = null

app.setName(appTitle)

function writeMainLog(error) {
  try {
    const message = error instanceof Error ? `${error.stack || error.message}\n` : `${String(error)}\n`
    fs.appendFileSync(path.join(app.getPath('userData'), 'main.log'), message)
  } catch {
    // Logging must never be the reason startup fails.
  }
}

process.on('uncaughtException', writeMainLog)
process.on('unhandledRejection', writeMainLog)

async function createWindow() {
  store = new SqliteStore(app.getPath('userData'))
  await store.init()

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 1100,
    minHeight: 760,
    title: appTitle,
    icon: appIconPath,
    frame: false,
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

  mainWindow.setTitle(appTitle)
}

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  try {
    await createWindow()
  } catch (error) {
    writeMainLog(error)
    app.quit()
  }
})

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

ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize()
})

ipcMain.handle('window:toggle-maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow.maximize()
  }
})

ipcMain.handle('window:close', () => {
  mainWindow?.close()
})

ipcMain.handle('dialog:show-open', async (_event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options)
  return result
})

ipcMain.handle('dialog:show-save', async (_event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options)
  return result
})
