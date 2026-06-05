<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useProjectStore } from '@/stores/projectStore'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { Save, SaveAll, FolderOpen, FilePlus, Image, FileText, Pencil, RefreshCw, Share2, LayoutTemplate } from '@lucide/vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { exportToPNG, exportToPDF } from '@/modules/project/ExportManager'

const { t } = useI18n()
const route = useRoute()
const uiStore = useUiStore()
const dashboardStore = useDashboardStore()
const projectStore = useProjectStore()
const collabStore = useCollaborationStore()

const isEditingName = ref(false)
const tempName = ref('')
const nameInputRef = ref(null)

const fileInputRef = ref(null)

const isDashboard = computed(() => route.name === 'dashboard')

const viewTitle = computed(() => {
  if (route.meta && route.meta.titleKey) {
    return t(route.meta.titleKey)
  }
  return ''
})

const startEditingName = () => {
  tempName.value = projectStore.projectName
  isEditingName.value = true
  setTimeout(() => nameInputRef.value?.focus(), 50)
}

const saveName = () => {
  if (tempName.value.trim()) {
    projectStore.setProjectName(tempName.value.trim())
  }
  isEditingName.value = false
}

const handleSaveProject = () => {
  projectStore.saveProject()
}

const handleSaveAs = () => {
  projectStore.saveProject(true)
}

const handleNewProject = async () => {
  if (confirm('¿Estás seguro de crear un nuevo proyecto? Los cambios no guardados se perderán.')) {
    await projectStore.clearAutoSave()
    window.location.reload()
  }
}

const handleOpenProject = async (e) => {
  // If the browser supports native picker, we use the button directly
  if ('showOpenFilePicker' in window && !e.target?.files?.length) {
    await projectStore.loadProject()
    return
  }
  
  // Fallback for unsupported browsers using the hidden input
  const file = e.target?.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = async (evt) => {
    try {
      // Need imports for fallback, but ideally we rely on Native File System API in Electron/Chrome
      const { deserializeProject } = await import('@/modules/project/Serializer')
      const { useDataStore } = await import('@/stores/dataStore')
      const { useFormulaStore } = await import('@/stores/formulaStore')
      await deserializeProject(evt.target.result, useDataStore(), useFormulaStore(), dashboardStore)
      
      if (file.name.endsWith('.litebi-template')) {
        projectStore.projectName = "Nuevo desde Plantilla"
        projectStore.isDirty = true
        uiStore.setViewerMode(false)
      } else {
        const isViewer = file.name.endsWith('.litebi-view') || file.name.endsWith('.litebiview')
        uiStore.setViewerMode(isViewer)
      }
      
      uiStore.addToast({ message: 'Proyecto cargado correctamente', type: 'success' })
      if(fileInputRef.value) fileInputRef.value.value = ''
    } catch(err) {
      uiStore.addToast({ message: err.message || 'Error', type: 'error' })
    }
  }
  reader.readAsText(file)
}

const triggerOpen = () => {
  if ('showOpenFilePicker' in window) {
    handleOpenProject({})
  } else {
    fileInputRef.value?.click()
  }
}

const handleExportViewer = async () => {
  try {
    uiStore.addToast({ message: 'Exportando a Visor...', type: 'info' })
    const { serializeProject } = await import('@/modules/project/Serializer')
    const { useDataStore } = await import('@/stores/dataStore')
    const { useFormulaStore } = await import('@/stores/formulaStore')
    const json = await serializeProject(useDataStore(), useFormulaStore(), dashboardStore)
    
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${projectStore.projectName || 'proyecto'}-viewer.litebiview`,
        types: [{
          description: 'Archivo LiteBI Viewer',
          accept: { 'application/json': ['.litebiview'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
    } else {
      // Fallback
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectStore.projectName || 'proyecto'}-viewer.litebiview`
      a.click()
      URL.revokeObjectURL(url)
    }
    uiStore.addToast({ message: 'Proyecto exportado como Visor', type: 'success' })
  } catch (e) {
    if (e.name !== 'AbortError') {
      uiStore.addToast({ message: 'Error exportando a Visor', type: 'error' })
    }
  }
}

const handleExportTemplate = async () => {
  try {
    uiStore.addToast({ message: 'Generando Plantilla...', type: 'info' })
    const { serializeProject } = await import('@/modules/project/Serializer')
    const { useDataStore } = await import('@/stores/dataStore')
    const { useFormulaStore } = await import('@/stores/formulaStore')
    const json = await serializeProject(useDataStore(), useFormulaStore(), dashboardStore)
    
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${projectStore.projectName || 'proyecto'}-template.litebi-template`,
        types: [{
          description: 'Plantilla de Proyecto LiteBI',
          accept: { 'application/json': ['.litebi-template'] },
        }],
      })
      const writable = await handle.createWritable()
      await writable.write(json)
      await writable.close()
    } else {
      // Fallback
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectStore.projectName || 'proyecto'}-template.litebi-template`
      a.click()
      URL.revokeObjectURL(url)
    }
    uiStore.addToast({ message: 'Plantilla exportada exitosamente', type: 'success' })
  } catch (e) {
    if (e.name !== 'AbortError') {
      uiStore.addToast({ message: 'Error exportando Plantilla', type: 'error' })
    }
  }
}

const handleExportPNG = async () => {
  try {
    uiStore.addToast({ message: 'Generando imagen...', type: 'info' })
    await exportToPNG('dashboard-export-area', `Dashboard_${dashboardStore.activeTabId}`)
    uiStore.addToast({ message: 'Imagen exportada', type: 'success' })
  } catch(e) {
    uiStore.addToast({ message: 'No se pudo exportar a PNG', type: 'error' })
  }
}

const handleExportPDF = async () => {
  try {
    uiStore.addToast({ message: 'Generando PDF...', type: 'info' })
    await exportToPDF('dashboard-export-area', `Dashboard_${dashboardStore.activeTabId}`)
    uiStore.addToast({ message: 'PDF exportado', type: 'success' })
  } catch(e) {
    uiStore.addToast({ message: 'No se pudo exportar a PDF', type: 'error' })
  }
}
</script>

<template>
  <header class="app-header">
    <div class="app-header__left">
      <div class="project-name-container">
        <input 
          v-if="isEditingName && !uiStore.isViewerMode"
          ref="nameInputRef"
          v-model="tempName"
          @blur="saveName"
          @keyup.enter="saveName"
          class="project-name-input"
        />
        <div v-else class="project-name-display" @click="!uiStore.isViewerMode && startEditingName()" title="Renombrar proyecto">
          <h1 class="app-header__title">{{ projectStore.projectName }} <span v-if="uiStore.isViewerMode" style="font-size: 0.8rem; background: var(--color-bg-secondary); padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Visor</span></h1>
          <span class="saving-indicator" v-if="projectStore.isSaving" title="Guardando..."><RefreshCw class="spin-icon" size="14" /></span>
          <span class="dirty-indicator" v-else-if="projectStore.isDirty">*</span>
          <Pencil v-if="!uiStore.isViewerMode" class="edit-icon" size="14" />
        </div>
      </div>
      <div class="view-subtitle" v-if="viewTitle">/ {{ viewTitle }}</div>
    </div>

    <div class="app-header__right">
      <input type="file" accept=".litebi,.litebiview,.litebitemplate,.json" style="display: none" ref="fileInputRef" @change="handleOpenProject" />
      
      <div class="action-group">
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" @click="handleNewProject" title="Nuevo Proyecto">
          <FilePlus />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="triggerOpen" title="Abrir Proyecto (.litebi)">
          <FolderOpen />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" @click="handleSaveProject" title="Guardar Proyecto">
          <Save />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" @click="handleSaveAs" title="Guardar como...">
          <SaveAll />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" @click="handleExportViewer" title="Compartir a Visor">
          <Share2 />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" @click="handleExportTemplate" title="Guardar como Plantilla">
          <LayoutTemplate />
        </BaseButton>
      </div>
      
      <div class="action-group" v-if="isDashboard">
        <BaseButton variant="ghost" size="sm" @click="handleExportPNG" title="Exportar a PNG">
          <Image />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="handleExportPDF" title="Exportar a PDF">
          <FileText />
        </BaseButton>
      </div>

      <div class="divider"></div>
      
      <!-- Collaboration Avatars -->
      <div class="collab-avatars" v-if="collabStore.isConnected">
        <div 
          class="avatar local-avatar" 
          :style="{ backgroundColor: collabStore.userColor }"
          :title="collabStore.username + ' (Tú)'"
        >
          {{ collabStore.username?.charAt(0).toUpperCase() || 'U' }}
        </div>
        <div 
          v-for="[id, user] in collabStore.collaborators" 
          :key="id"
          class="avatar remote-avatar"
          :style="{ backgroundColor: user.color }"
          :title="user.name"
        >
          {{ user.name?.charAt(0).toUpperCase() || '?' }}
        </div>
      </div>

      <div class="divider"></div>

      <LanguageSwitch />
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: var(--header-height);
  background-color: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  box-shadow: var(--shadow-xs);
  z-index: 10;
}

.app-header__left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.project-name-container {
  display: flex;
  align-items: center;
}

.project-name-display {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-md);
  transition: background-color var(--transition-fast);
}

.project-name-display:hover {
  background-color: var(--color-bg-secondary);
}

.edit-icon {
  color: var(--color-text-secondary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.project-name-display:hover .edit-icon {
  opacity: 1;
}

.project-name-input {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  padding: var(--space-1) var(--space-2);
  outline: none;
  background: var(--color-bg-surface);
  width: 250px;
}

.dirty-indicator {
  color: var(--color-warning);
  font-weight: bold;
}

.saving-indicator {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
}

.spin-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.edit-icon {
  font-size: 1.2rem;
}

.view-subtitle {
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.app-header__title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.action-group {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.divider {
  width: 1px;
  height: 24px;
  background-color: var(--color-border);
  margin: 0 var(--space-2);
}

.collab-avatars {
  display: flex;
  align-items: center;
  gap: -8px; /* overlap */
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 14px;
  border: 2px solid var(--color-bg-surface);
  margin-left: -8px; /* overlapping effect */
  box-shadow: var(--shadow-xs);
  cursor: help;
  transition: transform var(--transition-fast);
}

.avatar:hover {
  transform: translateY(-2px);
  z-index: 10;
}

.local-avatar {
  margin-left: 0;
  z-index: 5;
}

.remote-avatar {
  z-index: 4;
}
</style>
