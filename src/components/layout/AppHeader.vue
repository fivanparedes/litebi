<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useProjectStore } from '@/stores/projectStore'
import { useDataStore } from '@/stores/dataStore'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useReportStore } from '@/stores/reportStore'
import { Save, SaveAll, Play, Sigma, Filter, Download, FolderOpen, FilePlus, Image, FileText, Pencil, RefreshCw, Share2, LayoutTemplate, LayoutDashboard, Database, FileSpreadsheet, Search, Bell, User } from '@lucide/vue'
import LanguageSwitch from '@/components/ui/LanguageSwitch.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { exportToPNG, exportToPDF } from '@/modules/project/ExportManager'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const uiStore = useUiStore()
const dashboardStore = useDashboardStore()
const projectStore = useProjectStore()
const dataStore = useDataStore()
const collabStore = useCollaborationStore()
const reportStore = useReportStore()

const isEditingName = ref(false)
const tempName = ref('')
const nameInputRef = ref(null)
const searchInputRef = ref(null)

const searchQuery = ref('')
const isSearchFocused = ref(false)

const searchResults = computed(() => {
  if (!searchQuery.value) return []
  const q = searchQuery.value.toLowerCase()
  const results = []
  
  // Navigation
  const navs = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Data', path: '/data', icon: Database },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Formulas', path: '/formulas', icon: Sigma }
  ]
  navs.forEach(nav => {
    if (nav.name.toLowerCase().includes(q)) {
      results.push({ type: 'Nav', title: nav.name, action: () => router.push(nav.path), icon: nav.icon })
    }
  })
  
  // Datasets
  dataStore.datasetList.forEach(ds => {
    if (ds.originalName.toLowerCase().includes(q) || ds.name.toLowerCase().includes(q)) {
      results.push({ type: 'Dataset', title: ds.originalName, subtitle: ds.name, action: () => {
        dataStore.setActiveDataset(ds.name)
        router.push('/data')
      }, icon: Database })
    }
  })
  
  // Dashboard Tabs
  dashboardStore.tabs.forEach(tab => {
    if (tab.name.toLowerCase().includes(q)) {
      results.push({ type: 'Tab', title: tab.name, action: () => {
        dashboardStore.activeTabId = tab.id
        router.push('/dashboard')
      }, icon: LayoutDashboard })
    }
  })
  
  return results.slice(0, 8)
})

const executeSearchItem = (item) => {
  item.action()
  searchQuery.value = ''
  isSearchFocused.value = false
  searchInputRef.value?.blur()
}

import { onMounted, onUnmounted } from 'vue'
const handleKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault()
    searchInputRef.value?.focus()
  }
}
onMounted(() => window.addEventListener('keydown', handleKeydown))
onUnmounted(() => window.removeEventListener('keydown', handleKeydown))

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
  if (confirm(t('header.confirmNewProject'))) {
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
      
      uiStore.addToast({ message: t('header.projectLoaded'), type: 'success' })
      if(fileInputRef.value) fileInputRef.value.value = ''
    } catch(err) {
      uiStore.addToast({ message: err.message || t('header.errorLoading', 'Error'), type: 'error' })
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
    uiStore.addToast({ message: t('header.exportingViewer'), type: 'info' })
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
    uiStore.addToast({ message: t('header.viewerExported'), type: 'success' })
  } catch (e) {
    if (e.name !== 'AbortError') {
      uiStore.addToast({ message: t('header.errorExportingViewer'), type: 'error' })
    }
  }
}

const handleExportReportViewer = async () => {
  try {
    uiStore.addToast({ message: t('header.exportingReportViewer'), type: 'info' })
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
    uiStore.addToast({ message: t('header.reportExported'), type: 'success' })
  } catch (e) {
    if (e.name !== 'AbortError') {
      uiStore.addToast({ message: t('header.errorExportingReportViewer'), type: 'error' })
    }
  }
}

const handleExportTemplate = async () => {
  try {
    uiStore.addToast({ message: t('header.generatingTemplate'), type: 'info' })
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
    uiStore.addToast({ message: t('header.templateExported'), type: 'success' })
  } catch (e) {
    if (e.name !== 'AbortError') {
      uiStore.addToast({ message: t('header.errorExportingTemplate'), type: 'error' })
    }
  }
}

const handleExportPNG = async () => {
  try {
    uiStore.addToast({ message: t('header.generatingImage'), type: 'info' })
    await exportToPNG('dashboard-export-area', `Dashboard_${dashboardStore.activeTabId}`)
    uiStore.addToast({ message: t('header.imageExported'), type: 'success' })
  } catch(e) {
    uiStore.addToast({ message: t('header.errorGeneratingImage'), type: 'error' })
  }
}

const handleExportPDF = async () => {
  try {
    uiStore.addToast({ message: t('header.generatingPDF'), type: 'info' })
    await exportToPDF('dashboard-export-area', `Dashboard_${dashboardStore.activeTabId}`)
    uiStore.addToast({ message: t('header.pdfExported'), type: 'success' })
  } catch(e) {
    uiStore.addToast({ message: t('header.errorGeneratingPDF'), type: 'error' })
  }
}
</script>

<template>
  <header class="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
    <div class="min-w-0 flex items-center gap-4">
      <div class="flex-1">
        <div class="text-[11px] text-muted-foreground mb-0.5 flex items-center gap-1">
          LiteBI <span class="mx-1">/</span> 
          <template v-if="route.name === 'cleaning'">
            {{ $t('nav.cleaning', 'Transforms') }}
          </template>
          <template v-else-if="route.name === 'formulas'">
            {{ $t('nav.modeling', 'Model') }} <span class="mx-1">/</span> {{ $t('formulas.measures', 'Measures') }}
          </template>
          <template v-else-if="route.name === 'profile'">
            {{ $t('sidebar.nav.profile') }}
          </template>
          <template v-else>
            {{ $t('header.workspace') }} <span v-if="viewTitle" class="mx-1">/</span> {{ viewTitle }}
          </template>
        </div>
        
        <div class="flex items-center gap-2">
          <!-- Normal Title -->
          <template v-if="route.name !== 'cleaning' && route.name !== 'formulas' && route.name !== 'profile'">
            <input 
              v-if="isEditingName && !uiStore.isViewerMode"
              ref="nameInputRef"
              v-model="tempName"
              class="text-base font-semibold tracking-tight truncate bg-muted border border-border px-1 focus:outline-none focus:border-primary rounded"
              @blur="saveName"
              @keyup.enter="saveName"
            />
            <h1
v-else 
                class="text-base font-semibold tracking-tight truncate cursor-pointer hover:bg-muted/50 px-1 -mx-1 rounded transition-colors" 
                :title="$t('header.renameProject')" 
                @click="!uiStore.isViewerMode && startEditingName()">
              {{ projectStore.projectName }}
              <span v-if="uiStore.isViewerMode" class="text-xs bg-secondary px-1.5 py-0.5 rounded ml-2 font-normal">{{ $t('header.viewer') }}</span>
            </h1>
          </template>
          <!-- Transform Title -->
          <template v-else-if="route.name === 'cleaning'">
            <h1 class="text-base font-semibold tracking-tight truncate px-1 -mx-1">
              Transform
            </h1>
          </template>
          <!-- Formulas Title -->
          <template v-else-if="route.name === 'formulas'">
            <h1 class="text-base font-semibold tracking-tight truncate px-1 -mx-1">
              Formula Editor
            </h1>
          </template>
          <!-- Profile Title -->
          <template v-else-if="route.name === 'profile'">
            <h1 class="text-base font-semibold tracking-tight truncate px-1 -mx-1">
              Data Profile
            </h1>
          </template>
          
          <span v-if="projectStore.isSaving" class="text-muted-foreground flex items-center" :title="$t('header.saving')">
            <RefreshCw class="w-3.5 h-3.5 animate-spin" />
          </span>
          <span v-else-if="projectStore.isDirty" class="text-warning font-bold">*</span>
        </div>
      </div>

      <!-- Viewer Mode Navigation -->
      <div v-if="uiStore.isViewerMode" class="flex gap-2 pl-4 border-l border-border">
        <BaseButton v-if="uiStore.viewerType !== 'report'" :variant="route.name === 'dashboard' ? 'primary' : 'ghost'" size="sm" @click="router.push('/dashboard')">
          <LayoutDashboard class="w-4 h-4 mr-1"/> {{ $t('header.dashboards') }}
        </BaseButton>
        <BaseButton :variant="route.name === 'reports' ? 'primary' : 'ghost'" size="sm" @click="router.push('/reports')">
          <FileText class="w-4 h-4 mr-1"/> {{ $t('header.reportsA4') }}
        </BaseButton>
        <BaseButton v-if="uiStore.viewerType !== 'report'" :variant="route.name === 'data' ? 'primary' : 'ghost'" size="sm" @click="router.push('/data')">
          <Database class="w-4 h-4 mr-1"/> {{ $t('header.data') }}
        </BaseButton>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <input ref="fileInputRef" type="file" accept=".litebi,.litebiview,.litebitemplate,.json" class="hidden" @change="handleOpenProject" />
      
      <div class="relative hidden md:block">
        <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input 
          type="text"
          :placeholder="`${$t('header.search')} (Ctrl+K)`"
          class="h-8 pl-8 pr-3 text-xs bg-muted border border-border rounded-md focus:outline-none focus:border-primary w-48 lg:w-64 transition-all cursor-pointer" 
          readonly
          @click="uiStore.toggleCommandPalette(true)"
        />
      </div>

      <div class="flex items-center gap-2 pl-3 border-l border-border">
        <!-- File Actions (Always visible unless Viewer Mode) -->
        <template v-if="!uiStore.isViewerMode">
          <BaseButton variant="outline" size="sm" :title="$t('header.newProject')" @click="handleNewProject">
            <template #icon-left><FilePlus class="w-3.5 h-3.5" /></template>
            {{ $t('header.newProject') }}
          </BaseButton>
          <BaseButton variant="outline" size="sm" :title="$t('header.openProject')" @click="triggerOpen">
            <template #icon-left><FolderOpen class="w-3.5 h-3.5" /></template>
            {{ $t('header.openProject') }}
          </BaseButton>
          <BaseButton variant="outline" size="sm" :title="$t('header.save')" @click="handleSaveProject">
            <template #icon-left><Save class="w-3.5 h-3.5" /></template>
            {{ $t('header.save') }}
          </BaseButton>
          <BaseButton variant="outline" size="sm" :title="$t('header.saveAs')" @click="handleSaveAs">
            <template #icon-left><SaveAll class="w-3.5 h-3.5" /></template>
            {{ $t('header.saveAs') }}
          </BaseButton>
        </template>
        
        <!-- Transform Actions -->
        <template v-if="route.name === 'cleaning'">
          <BaseButton variant="primary" size="sm" @click="uiStore.triggerRunPipeline()">
            <template #icon-left><Play class="w-3.5 h-3.5" /></template>
            {{ $t('header.runPipeline') }}
          </BaseButton>
        </template>


        
        <!-- Viewer Export Action -->
        <BaseButton v-if="uiStore.isViewerMode && isDashboard" variant="primary" size="sm" @click="exportToPNG('dashboard-export-area', 'dashboard.png')">
          <template #icon-left><Image /></template>
          {{ $t('header.exportPNG') }}
        </BaseButton>
        <BaseButton v-if="uiStore.isViewerMode && route.name === 'reports'" variant="primary" size="sm" @click="exportToPDF('report-export-area', 'reporte.pdf')">
          <template #icon-left><FileText /></template>
          {{ $t('header.exportPDF') }}
        </BaseButton>
      </div>

      <div class="flex items-center gap-2 pl-3 border-l border-border">
        <LanguageSwitch />
        <button class="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-medium hover:bg-muted/80 transition-colors">
          <User class="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  </header>
</template>

<style scoped>
/* Estilos adicionales si fueran necesarios, pero Tailwind maneja la mayoría */
</style>
