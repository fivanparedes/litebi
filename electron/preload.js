import { contextBridge } from 'electron'

// Preload script for Electron.
// Currently we don't expose any specific Node.js APIs because we use
// standard browser Native File System Access API inside Chrome/Electron.
contextBridge.exposeInMainWorld('electronAPI', {
  // Expose IPC channels here if needed
})
