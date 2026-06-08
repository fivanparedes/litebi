<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useProjectStore } from '@/stores/projectStore'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useReportStore } from '@/stores/reportStore'
import { Save, SaveAll, FolderOpen, FilePlus, Image, FileText, Pencil, RefreshCw, Share2, LayoutTemplate, LayoutDashboard, Database, FileSpreadsheet } from '@lucide/vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { exportToPNG, exportToPDF } from '@/modules/project/ExportManager'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const dashboardStore = useDashboardStore()
const projectStore = useProjectStore()
const collabStore = useCollaborationStore()
const reportStore = useReportStore()

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
    const success = await projectStore.loadProject()
    if (success && uiStore.isViewerMode) {
      if (uiStore.viewerType === 'report') {
        router.push('/reports')
      } else {
        router.push('/dashboard')
      }
    }
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
      await deserializeProject(evt.target.result, useDataStore(), useFormulaStore(), dashboardStore, reportStore)
      
      if (file.name.endsWith('.litebi-template')) {
        projectStore.projectName = "Nuevo desde Plantilla"
        projectStore.isDirty = true
        uiStore.setViewerMode(false)
        uiStore.viewerType = null
      } else {
        const isViewer = file.name.endsWith('.litebi-view') || file.name.endsWith('.litebiview') || file.name.endsWith('.litebireportview')
        uiStore.setViewerMode(isViewer)
        
        if (file.name.endsWith('.litebireportview')) {
          uiStore.viewerType = 'report'
        } else {
          uiStore.viewerType = 'dashboard'
        }

        if (isViewer) {
          if (uiStore.viewerType === 'report') {
            router.push('/reports')
          } else {
            router.push('/dashboard')
          }
        }
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
    const json = await serializeProject(useDataStore(), useFormulaStore(), dashboardStore, reportStore)
    
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

const handleExportReportViewer = async () => {
  try {
    uiStore.addToast({ message: 'Exportando a Visor de Reporte...', type: 'info' })
    const { serializeProject } = await import('@/modules/project/Serializer')
    const { useDataStore } = await import('@/stores/dataStore')
    const { useFormulaStore } = await import('@/stores/formulaStore')
    const json = await serializeProject(useDataStore(), useFormulaStore(), dashboardStore, reportStore)
    
    if ('showSaveFilePicker' in window) {
      const handle = await window.showSaveFilePicker({
        suggestedName: `${projectStore.projectName || 'proyecto'}-viewer.litebireportview`,
        types: [{
          description: 'Visor de Reporte LiteBI',
          accept: { 'application/json': ['.litebireportview'] },
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
      a.download = `${projectStore.projectName || 'proyecto'}-viewer.litebireportview`
      a.click()
      URL.revokeObjectURL(url)
    }
    uiStore.addToast({ message: 'Reporte exportado como Visor', type: 'success' })
  } catch (e) {
    if (e.name !== 'AbortError') {
      uiStore.addToast({ message: 'Error exportando a Visor de Reporte', type: 'error' })
    }
  }
}

const handleExportTemplate = async () => {
  try {
    uiStore.addToast({ message: 'Generando Plantilla...', type: 'info' })
    const { serializeProject } = await import('@/modules/project/Serializer')
    const { useDataStore } = await import('@/stores/dataStore')
    const { useFormulaStore } = await import('@/stores/formulaStore')
    const json = await serializeProject(useDataStore(), useFormulaStore(), dashboardStore, reportStore)
    
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
          class="project-name-input"
          @blur="saveName"
          @keyup.enter="saveName"
        />
        <div v-else class="project-name-display" title="Renombrar proyecto" @click="!uiStore.isViewerMode && startEditingName()">
          <h1 class="app-header__title">{{ projectStore.projectName }} <span v-if="uiStore.isViewerMode" style="font-size: 0.8rem; background: var(--color-bg-secondary); padding: 2px 6px; border-radius: 4px; margin-left: 8px;">Visor</span></h1>
          <span v-if="projectStore.isSaving" class="saving-indicator" title="Guardando..."><RefreshCw class="spin-icon" size="14" /></span>
          <span v-else-if="projectStore.isDirty" class="dirty-indicator">*</span>
          <Pencil v-if="!uiStore.isViewerMode" class="edit-icon" size="14" />
        </div>
      </div>
      <div v-if="viewTitle && !uiStore.isViewerMode" class="view-subtitle">/ {{ viewTitle }}</div>
      
      <!-- Viewer Mode Navigation -->
      <div v-if="uiStore.isViewerMode" class="viewer-nav">
        <BaseButton v-if="uiStore.viewerType !== 'report'" :variant="route.name === 'dashboard' ? 'primary' : 'ghost'" size="sm" @click="router.push('/dashboard')">
          <LayoutDashboard /> Dashboards
        </BaseButton>
        <BaseButton :variant="route.name === 'reports' ? 'primary' : 'ghost'" size="sm" @click="router.push('/reports')">
          <FileText /> Reportes A4
        </BaseButton>
        <BaseButton v-if="uiStore.viewerType !== 'report'" :variant="route.name === 'data' ? 'primary' : 'ghost'" size="sm" @click="router.push('/data')">
          <Database /> Datos
        </BaseButton>
      </div>
    </div>

    <div class="app-header__right">
      <input ref="fileInputRef" type="file" accept=".litebi,.litebiview,.litebitemplate,.json" style="display: none" @change="handleOpenProject" />
      
      <div class="action-group">
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Nuevo Proyecto" @click="handleNewProject">
          <FilePlus />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" title="Abrir Proyecto (.litebi)" @click="triggerOpen">
          <FolderOpen />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Guardar Proyecto" @click="handleSaveProject">
          <Save />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Guardar como..." @click="handleSaveAs">
          <SaveAll />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Compartir a Visor Total" @click="handleExportViewer">
          <Share2 />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Exportar como Visor de Reporte" @click="handleExportReportViewer">
          <FileSpreadsheet />
        </BaseButton>
        <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Guardar como Plantilla" @click="handleExportTemplate">
          <LayoutTemplate />
        </BaseButton>
      </div>
      
      <div v-if="isDashboard" class="action-group">
        <BaseButton variant="ghost" size="sm" title="Exportar a PNG" @click="handleExportPNG">
          <Image />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" title="Exportar a PDF" @click="handleExportPDF">
          <FileText />
        </BaseButton>
      </div>

      <div class="divider"></div>
      
      <!-- Collaboration Avatars -->
      <div v-if="collabStore.isConnected" class="collab-avatars">
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
  gap: var(--space-4);
}

.viewer-nav {
  display: flex;
  gap: var(--space-2);
  margin-left: var(--space-4);
  padding-left: var(--space-4);
  border-left: 1px solid var(--color-border);
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
