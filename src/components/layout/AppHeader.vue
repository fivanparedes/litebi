<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useProjectStore } from '@/stores/projectStore'
import { Save, SaveAll, FolderOpen, FilePlus, Image, FileText, Pencil } from '@lucide/vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { exportToPNG, exportToPDF } from '@/modules/project/ExportManager'

const { t } = useI18n()
const route = useRoute()
const uiStore = useUiStore()
const dashboardStore = useDashboardStore()
const projectStore = useProjectStore()

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

const handleNewProject = () => {
  if (confirm('¿Estás seguro de crear un nuevo proyecto? Los cambios no guardados se perderán.')) {
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
  reader.onload = (evt) => {
    try {
      // Need imports for fallback, but ideally we rely on Native File System API in Electron/Chrome
      const { deserializeProject } = require('@/modules/project/Serializer')
      const { useDataStore } = require('@/stores/dataStore')
      const { useFormulaStore } = require('@/stores/formulaStore')
      deserializeProject(evt.target.result, useDataStore(), useFormulaStore(), dashboardStore)
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
          v-if="isEditingName"
          ref="nameInputRef"
          v-model="tempName"
          @blur="saveName"
          @keyup.enter="saveName"
          class="project-name-input"
        />
        <div v-else class="project-name-display" @click="startEditingName" title="Renombrar proyecto">
          <h1 class="app-header__title">{{ projectStore.projectName }}</h1>
          <span class="dirty-indicator" v-if="projectStore.isDirty">*</span>
          <Pencil class="edit-icon" size="14" />
        </div>
      </div>
      <div class="view-subtitle" v-if="viewTitle">/ {{ viewTitle }}</div>
    </div>

    <div class="app-header__right">
      <input type="file" accept=".litebi,.json" style="display: none" ref="fileInputRef" @change="handleOpenProject" />
      
      <div class="action-group">
        <BaseButton variant="ghost" size="sm" @click="handleNewProject" title="Nuevo Proyecto">
          <FilePlus />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="triggerOpen" title="Abrir Proyecto (.litebi)">
          <FolderOpen />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="handleSaveProject" title="Guardar Proyecto">
          <Save />
        </BaseButton>
        <BaseButton variant="ghost" size="sm" @click="handleSaveAs" title="Guardar como...">
          <SaveAll />
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
}
</style>
