const path = require('node:path')
const fs = require('node:fs')
const https = require('node:https')
const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')
const { SqliteStore } = require('./sqliteStore.cjs')

const isDev = !app.isPackaged
const isMac = process.platform === 'darwin'
const appTitle = '抽题助手'
const appIconPath = path.join(__dirname, '..', 'build', 'icon.ico')
const latestReleaseApiUrl = 'https://api.github.com/repos/Chenglittlefat/question-extractor/releases/latest'
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

function requestJson(url) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          'User-Agent': 'question-extractor-update-checker',
        },
      },
      (response) => {
        if ([301, 302, 307, 308].includes(response.statusCode) && response.headers.location) {
          response.resume()
          requestJson(response.headers.location).then(resolve, reject)
          return
        }

        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(new Error(`GitHub responded with status ${response.statusCode || 'unknown'}`))
            return
          }

          try {
            resolve(JSON.parse(body))
          } catch (error) {
            reject(error)
          }
        })
      },
    )
    request.setTimeout(12000, () => {
      request.destroy(new Error('Update check timed out'))
    })
    request.on('error', reject)
  })
}

function parseVersion(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/^v/i, '')
  const [mainPart = '', prereleasePart = ''] = normalized.split('-', 2)
  const numbers = mainPart.split('.').map((item) => {
    const parsed = Number.parseInt(item, 10)
    return Number.isFinite(parsed) ? parsed : 0
  })
  while (numbers.length < 3) numbers.push(0)
  return {
    numbers: numbers.slice(0, 3),
    prerelease: prereleasePart ? prereleasePart.split('.') : [],
  }
}

function compareIdentifiers(left, right) {
  const leftNumber = /^\d+$/.test(left) ? Number.parseInt(left, 10) : null
  const rightNumber = /^\d+$/.test(right) ? Number.parseInt(right, 10) : null

  if (leftNumber !== null && rightNumber !== null) return leftNumber - rightNumber
  if (leftNumber !== null) return -1
  if (rightNumber !== null) return 1
  return left.localeCompare(right)
}

function compareVersions(left, right) {
  const leftVersion = parseVersion(left)
  const rightVersion = parseVersion(right)

  for (let index = 0; index < 3; index += 1) {
    const difference = leftVersion.numbers[index] - rightVersion.numbers[index]
    if (difference !== 0) return difference
  }

  if (!leftVersion.prerelease.length && rightVersion.prerelease.length) return 1
  if (leftVersion.prerelease.length && !rightVersion.prerelease.length) return -1

  const maxLength = Math.max(leftVersion.prerelease.length, rightVersion.prerelease.length)
  for (let index = 0; index < maxLength; index += 1) {
    const leftIdentifier = leftVersion.prerelease[index]
    const rightIdentifier = rightVersion.prerelease[index]
    if (leftIdentifier === undefined && rightIdentifier === undefined) return 0
    if (leftIdentifier === undefined) return -1
    if (rightIdentifier === undefined) return 1
    const difference = compareIdentifiers(leftIdentifier, rightIdentifier)
    if (difference !== 0) return difference
  }

  return 0
}

function selectDownloadUrl(release) {
  if (!Array.isArray(release.assets)) return release.html_url || ''
  const platform = process.platform
  const asset = release.assets.find((item) => {
    const name = String(item.name || '').toLowerCase()
    if (platform === 'win32') return name.includes('windows') || name.endsWith('.exe')
    if (platform === 'darwin') return name.includes('macos') || name.endsWith('.dmg') || name.endsWith('.zip')
    if (platform === 'linux') return name.includes('linux') || name.endsWith('.appimage')
    return false
  })
  return asset?.browser_download_url || release.html_url || ''
}

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
    frame: isMac,
    titleBarStyle: isMac ? 'hiddenInset' : undefined,
    trafficLightPosition: isMac ? { x: 16, y: 16 } : undefined,
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

ipcMain.handle('app:get-version', () => app.getVersion())

ipcMain.handle('app:check-for-updates', async () => {
  const release = await requestJson(latestReleaseApiUrl)
  const currentVersion = app.getVersion()
  const latestVersion = String(release.tag_name || release.name || '').replace(/^v/i, '')

  if (!latestVersion) {
    throw new Error('Latest release version was not found')
  }

  return {
    currentVersion,
    latestVersion,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
    releaseUrl: release.html_url || '',
    downloadUrl: selectDownloadUrl(release),
    releaseName: release.name || release.tag_name || latestVersion,
  }
})

ipcMain.handle('app:open-external', async (_event, url) => {
  const parsedUrl = new URL(String(url))
  if (!['https:', 'http:'].includes(parsedUrl.protocol)) return false
  await shell.openExternal(parsedUrl.toString())
  return true
})

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
