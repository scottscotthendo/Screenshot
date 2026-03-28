import { app, BrowserWindow, globalShortcut, Tray, Menu, nativeImage, nativeTheme, ipcMain, shell, clipboard, desktopCapturer } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'fs'
import { stat } from 'fs/promises'
import { nanoid } from 'nanoid'
import { is } from '@electron-toolkit/utils'
// Load .env file - check userData first, then project root
for (const envPath of [join(app.getPath('userData'), '.env'), join(process.cwd(), '.env')]) {
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
      const match = line.match(/^\s*([\w]+)\s*=\s*"?([^"]*)"?\s*$/)
      if (match) process.env[match[1]] = match[2]
    }
    break
  }
}

const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
}

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
const capturesDir = join(app.getPath('userData'), 'captures')

// Ensure captures directory exists
function ensureCapturesDir(): void {
  if (!existsSync(capturesDir)) {
    mkdirSync(capturesDir, { recursive: true })
  }
}

// Simple JSON-file based metadata store
const metadataPath = join(app.getPath('userData'), 'captures-metadata.json')

interface CaptureRecord {
  id: string
  type: 'screenshot' | 'recording'
  filename: string
  filepath: string
  thumbnailPath?: string
  width: number
  height: number
  duration?: number
  fileSize: number
  shareUrl?: string
  createdAt: string
  updatedAt: string
}

function loadMetadata(): CaptureRecord[] {
  try {
    if (existsSync(metadataPath)) {
      return JSON.parse(readFileSync(metadataPath, 'utf-8'))
    }
  } catch {
    // corrupted file, start fresh
  }
  return []
}

function saveMetadata(records: CaptureRecord[]): void {
  writeFileSync(metadataPath, JSON.stringify(records, null, 2))
}

function addCapture(record: CaptureRecord): void {
  const records = loadMetadata()
  records.unshift(record)
  saveMetadata(records)
}

function removeCapture(id: string): void {
  const records = loadMetadata()
  const record = records.find(r => r.id === id)
  if (record) {
    try { unlinkSync(record.filepath) } catch {}
    if (record.thumbnailPath) {
      try { unlinkSync(record.thumbnailPath) } catch {}
    }
  }
  saveMetadata(records.filter(r => r.id !== id))
}

function createMainWindow(): BrowserWindow {
  const window = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: nativeTheme.shouldUseDarkColors ? '#0a0a0a' : '#ffffff',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('close', (e) => {
    // Hide instead of close (keep in tray)
    e.preventDefault()
    window.hide()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

function createTray(): Tray {
  // Create a 16x16 tray icon (camera emoji rendered as a template image)
  // On macOS, tray icons should be "template" images (monochrome) for proper dark/light menu bar
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAAXNSR0IArs4c6QAAANhJREFUWEft1rENwjAQBdD/FYyAWIAZmIEFWIIRKNiAERiBkh1YgRkoqBCKZMm6O9uxUqRL4e/7f5YdMYx8cOT8+C+A7m4FYE/gzczuYwBsAJwA7AGcYhWIGiDJAwCLAWBK8ui9DAPo7m4AbAEce2YhVoEuoJsnADMzO/cp0AFcknsl+fQbqaoA0N3dApgDOPcqEFUgCUD3GpOb2aVPASJVNQRgub/5jeTNrxDrAAUgiYnvOlVVRwkA3d0tgBmAS68ChCoQk6DbGiZ39x+FohX4a5/EP8B/Ai/kgF0h5E3DtgAAAABJRU5ErkJggg=='
  )
  icon.setTemplateImage(true) // macOS: adapts to dark/light menu bar
  const newTray = new Tray(icon)

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'McSnapface',
      enabled: false
    },
    { type: 'separator' },
    {
      label: 'Screenshot  ⌘⇧5',
      click: () => triggerScreenshot()
    },
    {
      label: 'Record Screen  ⌘⇧6',
      click: () => triggerRecording()
    },
    { type: 'separator' },
    {
      label: 'Open Library',
      click: () => showMainWindow()
    },
    { type: 'separator' },
    {
      label: 'Quit McSnapface',
      click: () => {
        app.exit(0)
      }
    }
  ])

  newTray.setToolTip('McSnapface')
  newTray.setContextMenu(contextMenu)
  newTray.on('click', () => showMainWindow())

  return newTray
}

function showMainWindow(): void {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function triggerScreenshot(): void {
  if (!mainWindow) {
    mainWindow = createMainWindow()
  }
  mainWindow.hide()
  // Wait for the window to disappear from capture sources, then trigger
  setTimeout(() => {
    mainWindow?.webContents.send('trigger:screenshot')
  }, 300)
}

function triggerRecording(): void {
  showMainWindow()
  mainWindow?.webContents.send('trigger:recording')
}

function registerGlobalShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+5', () => {
    triggerScreenshot()
  })
  globalShortcut.register('CommandOrControl+Shift+6', () => {
    triggerRecording()
  })
}

// IPC Handlers
function setupIPC(): void {
  // Show window (called from renderer when it needs to be visible)
  ipcMain.on('window:show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  // Get screen sources
  ipcMain.handle('capture:getSources', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen', 'window'],
      thumbnailSize: { width: 320, height: 180 }
    })
    return sources.map(s => ({
      id: s.id,
      name: s.name,
      thumbnailDataUrl: s.thumbnail.toDataURL(),
      displayId: s.display_id,
      appIcon: s.appIcon?.toDataURL() || undefined
    }))
  })

  // Capture full screen (actual capture happens in renderer via getUserMedia + desktopCapturer)
  ipcMain.handle('capture:screen', async (_event, sourceId: string) => {
    return { sourceId }
  })

  // Capture region (actual region selection + crop happens in renderer)
  ipcMain.handle('capture:region', async (_event, sourceId: string, region: { x: number; y: number; width: number; height: number }) => {
    return { sourceId, region }
  })

  // Recording lifecycle — recording is managed in the renderer via MediaRecorder.
  // These handlers are stubs that coordinate state; the renderer does the heavy lifting.
  ipcMain.handle('recording:start', async () => {
    // Nothing needed in main process — renderer handles MediaRecorder
    return { status: 'started' }
  })

  ipcMain.handle('recording:stop', async () => {
    return { status: 'stopped' }
  })

  ipcMain.handle('recording:pause', async () => {
    return { status: 'paused' }
  })

  ipcMain.handle('recording:resume', async () => {
    return { status: 'resumed' }
  })

  // Video trim — uses ffmpeg if available, otherwise returns original
  ipcMain.handle('video:trim', async (_event, filepath: string, startTime: number, endTime: number) => {
    // For now, return original path. FFmpeg binary integration is a future enhancement.
    // To enable: install ffmpeg on the system and use child_process.execFile
    const id = nanoid(10)
    const outputPath = join(capturesDir, `trimmed-${id}.webm`)

    try {
      const { execFile } = await import('child_process')
      const { promisify } = await import('util')
      const execFileAsync = promisify(execFile)

      await execFileAsync('ffmpeg', [
        '-i', filepath,
        '-ss', startTime.toString(),
        '-to', endTime.toString(),
        '-c', 'copy',
        outputPath
      ])
      return outputPath
    } catch {
      // FFmpeg not installed — copy the original file as fallback
      const buffer = readFileSync(filepath)
      writeFileSync(outputPath, buffer)
      return outputPath
    }
  })

  // Save annotated image
  ipcMain.handle('file:saveAnnotated', async (_event, dataUrl: string, originalId?: string) => {
    ensureCapturesDir()
    const id = nanoid(10)
    const filename = `screenshot-${id}.png`
    const filepath = join(capturesDir, filename)

    // Convert data URL to buffer and save
    const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    writeFileSync(filepath, buffer)

    const stats = await stat(filepath)

    // Get image dimensions from the data URL
    const record: CaptureRecord = {
      id,
      type: 'screenshot',
      filename,
      filepath,
      width: 0, // Will be set by renderer
      height: 0,
      fileSize: stats.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    addCapture(record)
    return record
  })

  // Library operations
  ipcMain.handle('library:getAll', async () => {
    return loadMetadata()
  })

  ipcMain.handle('library:delete', async (_event, id: string) => {
    removeCapture(id)
  })

  // File operations
  ipcMain.handle('file:readAsDataUrl', async (_event, filepath: string) => {
    const buffer = readFileSync(filepath)
    const ext = filepath.split('.').pop()?.toLowerCase()
    const mimeType = ext === 'png' ? 'image/png' :
                     ext === 'webm' ? 'video/webm' :
                     ext === 'mp4' ? 'video/mp4' : 'application/octet-stream'
    return `data:${mimeType};base64,${buffer.toString('base64')}`
  })

  ipcMain.on('file:showInFolder', (_event, filepath: string) => {
    shell.showItemInFolder(filepath)
  })

  // Clipboard
  ipcMain.handle('clipboard:copyImage', async (_event, filepath: string) => {
    const image = nativeImage.createFromPath(filepath)
    clipboard.writeImage(image)
  })

  ipcMain.handle('clipboard:copyText', async (_event, text: string) => {
    clipboard.writeText(text)
  })

  // Share/Upload - uploads file to Vercel Blob
  ipcMain.handle('share:upload', async (_event, id: string) => {
    const records = loadMetadata()
    const record = records.find(r => r.id === id)
    if (!record) throw new Error('Capture not found')

    const token = process.env.BLOB_READ_WRITE_TOKEN
    if (!token) {
      throw new Error('BLOB_READ_WRITE_TOKEN not set. Add it to your environment to enable sharing.')
    }

    const buffer = readFileSync(record.filepath)
    const ext = record.filepath.split('.').pop()
    const contentType = ext === 'png' ? 'image/png' : ext === 'webm' ? 'video/webm' : 'application/octet-stream'

    // Dynamic import of @vercel/blob
    const { put } = await import('@vercel/blob')
    const blob = await put(`mcSnapface/${record.filename}`, buffer, {
      access: 'public',
      contentType,
      token
    })

    // Update metadata with share URL
    record.shareUrl = blob.url
    record.updatedAt = new Date().toISOString()
    saveMetadata(records)

    return blob.url
  })

  // Recording - save video blob from renderer
  ipcMain.handle('recording:save', async (_event, arrayBuffer: ArrayBuffer, duration: number) => {
    ensureCapturesDir()
    const id = nanoid(10)
    const filename = `recording-${id}.webm`
    const filepath = join(capturesDir, filename)

    const buffer = Buffer.from(arrayBuffer)
    writeFileSync(filepath, buffer)

    const stats = await stat(filepath)

    const record: CaptureRecord = {
      id,
      type: 'recording',
      filename,
      filepath,
      width: 0,
      height: 0,
      duration,
      fileSize: stats.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    addCapture(record)
    return record
  })
}

// App lifecycle
app.whenReady().then(() => {
  ensureCapturesDir()
  setupIPC()
  tray = createTray()
  mainWindow = createMainWindow()
  registerGlobalShortcuts()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  // Don't quit on macOS - stay in tray
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  showMainWindow()
})
