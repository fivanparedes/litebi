import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useUiStore } from './uiStore'
import { useDataStore } from './dataStore'
import { useFormulaStore } from './formulaStore'
import { useDashboardStore } from './dashboardStore'
import { serializeProject, deserializeProject } from '@/modules/project/Serializer'

export const useProjectStore = defineStore('project', () => {
  const uiStore = useUiStore()
  const dataStore = useDataStore()
  const formulaStore = useFormulaStore()
  const dashboardStore = useDashboardStore()
  
  const projectName = ref('Proyecto sin título')
  const fileHandle = ref(null)
  const isDirty = ref(false)

  const setProjectName = (name) => {
    projectName.value = name || 'Proyecto sin título'
    isDirty.value = true
  }

  const markDirty = () => {
    isDirty.value = true
  }

  const saveProject = async (saveAs = false) => {
    try {
      const json = serializeProject(dataStore, formulaStore, dashboardStore)
      
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
            accept: { 'application/json': ['.litebi', '.json'] },
          }],
        })
        
        const file = await handle.getFile()
        const content = await file.text()
        
        deserializeProject(content, dataStore, formulaStore, dashboardStore)
        
        fileHandle.value = handle
        const nameMatch = handle.name.match(/(.*)\.litebi$/i)
        projectName.value = nameMatch ? nameMatch[1] : handle.name
        isDirty.value = false
        
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

  return {
    projectName,
    fileHandle,
    isDirty,
    setProjectName,
    markDirty,
    saveProject,
    loadProject
  }
})
