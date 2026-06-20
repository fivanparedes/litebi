const { contextBridge, ipcRenderer } = require('electron')

// Preload script for Electron.
// Currently we don't expose any specific Node.js APIs because we use
// standard browser Native File System Access API inside Chrome/Electron.
contextBridge.exposeInMainWorld('electronAPI', {
  // Expose IPC channels here if needed
  // Ensure APIs exposed are minimal and validate inputs to prevent security risks.
  getPlatform: () => {
    const validPlatforms = ['aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos', 'win32']
    return validPlatforms.includes(process.platform) ? process.platform : 'unknown'
  },
  appReady: () => ipcRenderer.send('app-ready')
})
