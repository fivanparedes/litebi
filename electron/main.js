import { app, BrowserWindow, protocol, session, ipcMain } from 'electron'
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

let splashWindow
let mainWindow

const createWindow = () => {
  // Create splash screen
  splashWindow = new BrowserWindow({
    width: 400,
    height: 400,
    transparent: true,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  
  splashWindow.loadFile(path.join(__dirname, 'splash.html'))
  
  // Create main window (hidden initially)
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false, // Don't show until ready
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
    // Only open dev tools if required, otherwise it could mess with the splash experience
    // mainWindow.webContents.openDevTools()
  } else {
    // In production, load the built index.html
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Failsafe: Si el IPC app-ready nunca llega (por crash del renderizador), forzamos mostrar la app a los 5 segundos
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close()
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.show()
    }
  }, 6000)
}

// When Vue app says it's ready, hide splash and show main
ipcMain.on('app-ready', () => {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show()
    // Open devtools after showing if in dev mode
    if (process.env.VITE_DEV_SERVER_URL) {
      mainWindow.webContents.openDevTools()
    }
  }
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
