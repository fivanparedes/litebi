import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUiStore } from './uiStore'
import { useDataStore } from './dataStore'
import { useFormulaStore } from './formulaStore'
import { useDashboardStore } from './dashboardStore'
import { useReportStore } from './reportStore'
import { serializeProject, deserializeProject } from '@/modules/project/Serializer'
import { HistoryManager } from '@/modules/project/HistoryManager'
import localforage from 'localforage'
import { Logger } from '@/utils/Logger'
export const useProjectStore = defineStore('project', () => {
  const uiStore = useUiStore()
  const dataStore = useDataStore()
  const formulaStore = useFormulaStore()
  const dashboardStore = useDashboardStore()
  const reportStore = useReportStore()
  
  const projectName = ref('Proyecto sin título')
  const fileHandle = ref(null)
  const isDirty = ref(false)
  const isSaving = ref(false)

  let autosaveTimer = null
  let diskAutoSaveTimer = null
  let historyTimer = null
  let isRestoringHistory = false
  
  const historyManager = new HistoryManager(20)

  const pushToHistory = async () => {
    if (isRestoringHistory) return
    try {
      const json = await serializeProject(dataStore, formulaStore, dashboardStore, reportStore, { includeData: false })
      historyManager.pushState(json)
    } catch (e) {
      console.error("Error saving history state:", e)
    }
  }

  const debouncedPushToHistory = () => {
    if (historyTimer) clearTimeout(historyTimer)
    historyTimer = setTimeout(() => {
      pushToHistory()
    }, 500) // Debounce history push to avoid performance hits and filling stack during rapid actions
  }

  const setProjectName = (name) => {
    projectName.value = name || 'Proyecto sin título'
    isDirty.value = true
    triggerAutoSave()
  }

  const markDirty = () => {
    isDirty.value = true
    triggerAutoSave()
    debouncedPushToHistory()
  }

  const triggerAutoSave = () => {
    if (autosaveTimer) clearTimeout(autosaveTimer)
    // Wait 2 seconds of inactivity before saving to avoid blocking UI
    autosaveTimer = setTimeout(() => {
      autoSave()
    }, 2000)
  }

  const autoSave = async () => {
    try {
      isSaving.value = true
      const json = await serializeProject(dataStore, formulaStore, dashboardStore, reportStore)
      await localforage.setItem('litebi_autosave', {
        projectName: projectName.value,
        data: json
      })
    } catch (e) {
      console.error("Error autosaving project:", e)
    } finally {
      setTimeout(() => { isSaving.value = false }, 500)
    }
  }

  const debouncedAutoSave = () => {
    if (diskAutoSaveTimer) clearTimeout(diskAutoSaveTimer)
    diskAutoSaveTimer = setTimeout(() => {
      // Only auto save to disk if we already have a file handle
      if (fileHandle.value) {
        saveProject()
      }
    }, 5000)
  }

  const autoLoad = async () => {
    try {
      // Usar Promise.race para evitar que localforage se quede colgado eternamente por bloqueos en LevelDB (muy común en AppImages/Electron Linux)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('IndexedDB timeout lock')), 2500)
      )
      const saved = await Promise.race([
        localforage.getItem('litebi_autosave'),
        timeoutPromise
      ])
      
      if (saved && saved.data) {
        await deserializeProject(saved.data, dataStore, formulaStore, dashboardStore, reportStore)
        projectName.value = saved.projectName || 'Proyecto sin título'
        isDirty.value = false
        Logger.info('ProjectStore', "Sesión recuperada desde IndexedDB.")
        return true
      }
    } catch (e) {
      Logger.error('ProjectStore', "Error autoloading project:", e)
    }
    return false
  }

  const clearAutoSave = async () => {
    try {
      await localforage.removeItem('litebi_autosave')
    } catch (e) {
      console.error("Error clearing autosave:", e)
    }
  }

  const saveProject = async (saveAs = false) => {
    try {
      const json = await serializeProject(dataStore, formulaStore, dashboardStore, reportStore)
      
      // If we don't have a handle yet, or user requested Save As, prompt for location
      if (!fileHandle.value || saveAs) {
        if ('showSaveFilePicker' in window) {
          const handle = await window.showSaveFilePicker({
            suggestedName: `${projectName.value}.litebi`,
            types: [{
              description: 'Archivo de Proyecto LiteBI',
              accept: { 'application/json': ['.litebi'] },
            }],
          })
          fileHandle.value = handle
          // Extract name without extension if possible
          const nameMatch = handle.name.match(/(.*)\.litebi$/i)
          if (nameMatch) {
            projectName.value = nameMatch[1]
          } else {
            projectName.value = handle.name
          }
        } else {
          // Fallback to basic download for unsupported browsers
          fallbackDownload(json)
          return
        }
      }
      
      // We have a handle, write to it
      const writable = await fileHandle.value.createWritable()
      await writable.write(json)
      await writable.close()
      
      isDirty.value = false
      uiStore.addToast({ message: 'Proyecto guardado correctamente', type: 'success' })
      return true
    } catch (e) {
      if (e.name !== 'AbortError') { // AbortError means user cancelled the dialog
        console.error("Error saving project:", e)
        uiStore.addToast({ message: 'Error al guardar el proyecto', type: 'error' })
      }
      return false
    }
  }

  const loadProject = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'Archivo de Proyecto LiteBI',
            accept: { 'application/json': ['.litebi', '.litebiview', '.json'] },
          }],
        })
        
        const file = await handle.getFile()
        const content = await file.text()
        
        await deserializeProject(content, dataStore, formulaStore, dashboardStore, reportStore)
        
        if (handle.name.endsWith('.litebi-template') || handle.name.endsWith('.litebitemplate')) {
          projectName.value = "Nuevo desde Plantilla"
          fileHandle.value = null
          isDirty.value = true
          uiStore.setViewerMode(false)
        } else {
          fileHandle.value = handle
          const nameMatch = handle.name.match(/(.*)\.litebi(?:-view|view)?$/i)
          if (nameMatch) {
            projectName.value = nameMatch[1]
          } else {
            projectName.value = handle.name
          }
          isDirty.value = false
          uiStore.setViewerMode(handle.name.endsWith('.litebi-view') || handle.name.endsWith('.litebiview'))
        }
        
        uiStore.addToast({ message: 'Proyecto cargado correctamente', type: 'success' })
        return true
      } else {
        // Fallback for unsupported browsers must be handled via <input type="file"> in components
        throw new Error("Su navegador no soporta File System Access API nativa.")
      }
    } catch (e) {
      if (e.name !== 'AbortError') {
        console.error("Error loading project:", e)
        uiStore.addToast({ message: e.message || 'Error al cargar el proyecto', type: 'error' })
      }
      return false
    }
  }
  
  const fallbackDownload = (json) => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${projectName.value}.litebi`
    a.click()
    URL.revokeObjectURL(url)
    isDirty.value = false
    uiStore.addToast({ message: 'Proyecto descargado correctamente', type: 'success' })
  }

  const undo = async () => {
    if (!historyManager.canUndo()) return
    isRestoringHistory = true
    try {
      const currentState = await serializeProject(dataStore, formulaStore, dashboardStore, reportStore, { includeData: false })
      const previousState = historyManager.undo(currentState)
      if (previousState) {
        await deserializeProject(previousState, dataStore, formulaStore, dashboardStore, reportStore, { includeData: false })
      }
    } catch (e) {
      console.error("Error undoing:", e)
    } finally {
      isRestoringHistory = false
    }
  }

  const redo = async () => {
    if (!historyManager.canRedo()) return
    isRestoringHistory = true
    try {
      const currentState = await serializeProject(dataStore, formulaStore, dashboardStore, reportStore, { includeData: false })
      const nextState = historyManager.redo(currentState)
      if (nextState) {
        await deserializeProject(nextState, dataStore, formulaStore, dashboardStore, reportStore, { includeData: false })
      }
    } catch (e) {
      console.error("Error redoing:", e)
    } finally {
      isRestoringHistory = false
    }
  }

  return {
    projectName,
    fileHandle,
    isDirty,
    isSaving,
    setProjectName,
    markDirty,
    saveProject,
    loadProject,
    autoLoad,
    clearAutoSave,
    debouncedAutoSave,
    pushToHistory,
    undo,
    redo
  }
})
