import { app, BrowserWindow, protocol, session } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Add global error handlers for the main process
process.on('uncaughtException', (error) => {
  console.error('Excepción no capturada (uncaughtException):', error)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Rechazo no manejado (unhandledRejection) en:', promise, 'razón:', reason)
})

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    title: "LiteBI",
    autoHideMenuBar: true
  })

  // Configure Content Security Policy (CSP)
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: http://localhost:*; worker-src 'self' blob:;"
        ]
      }
    })
  })

  // In development, load the Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
