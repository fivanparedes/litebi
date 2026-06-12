<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Plus, X, ArrowDownToLine, Presentation, Settings, Monitor, Smartphone } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { useReportStore } from '@/stores/reportStore'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import DashboardCanvas from '@/modules/dashboard/DashboardCanvas.vue'
import WidgetConfigurator from '@/modules/visualization/WidgetConfigurator.vue'
import { exportToPDF, exportToPPTX } from '@/modules/project/ExportManager'
import { useDashboardStore } from '@/stores/dashboardStore'

const { t } = useI18n()
const reportStore = useReportStore()
const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const uiStore = useUiStore()

const editingWidgetId = ref(null)
const editingPageId = ref(null)

const editingWidgetConfig = computed({
  get() {
    if (!editingWidgetId.value || !editingPageId.value) return {}
    const page = reportStore.pages.find(p => p.id === editingPageId.value)
    const w = page?.layout.find(x => x.id === editingWidgetId.value)
    return w?.config || { type: 'bar' }
  },
  set(val) {
    if (!editingWidgetId.value || !editingPageId.value) return
    reportStore.updateWidget(editingPageId.value, editingWidgetId.value, { config: val })
  }
})

const handleAddWidget = (pageId) => {
  const newConfig = { 
    type: 'bar', 
    dataset: dataStore.activeDatasetName 
  }
  reportStore.addWidget(pageId, { config: newConfig })
}

const handleRemoveWidget = (pageId, widgetId) => {
  if (editingWidgetId.value === widgetId) editingWidgetId.value = null
  reportStore.removeWidget(pageId, widgetId)
}

const handleEditWidget = (pageId, widgetId) => {
  editingPageId.value = pageId
  editingWidgetId.value = widgetId
}

const closeEditor = () => {
  editingWidgetId.value = null
  editingPageId.value = null
}

const toggleOrientation = (pageId, currentOrientation) => {
  const newOrientation = currentOrientation === 'portrait' ? 'landscape' : 'portrait'
  reportStore.updatePageOrientation(pageId, newOrientation)
}

const handleExportPDF = () => {
  exportToPDF('report-pages-container', 'litebi-report')
}

const isExportModalOpen = ref(false)
const exportTitle = ref('LiteBI Report')

const handleExportPPTX = () => {
  isExportModalOpen.value = true
}

const confirmExportPPTX = () => {
  if (exportTitle.value) {
    exportToPPTX('report-pages-container', exportTitle.value, 'litebi-presentation')
    isExportModalOpen.value = false
  }
}

const handleExportTemplate = () => {
  const data = JSON.stringify({ pages: reportStore.pages })
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `report-template.litebireport`
  a.click()
  URL.revokeObjectURL(url)
  uiStore.addToast({ message: t('reportView.templateExported'), type: 'success' })
}

const templateInputRef = ref(null)

const handleImportTemplate = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    try {
      const parsed = JSON.parse(evt.target.result)
      if (parsed && parsed.pages && Array.isArray(parsed.pages)) {
        reportStore.pages = parsed.pages
        reportStore.activePageId = parsed.pages[0]?.id || 'page_1'
        uiStore.addToast({ message: t('reportView.templateLoaded'), type: 'success' })
      } else {
        throw new Error('Formato inválido')
      }
    } catch(err) {
      uiStore.addToast({ message: t('reportView.errorLoadingTemplate'), type: 'error' })
    }
  }
  reader.readAsText(file)
  if (templateInputRef.value) templateInputRef.value.value = ''
}
</script>

<template>
  <div class="view-container">
    <div class="report-workspace">
      <!-- Toolbar -->
      <div class="report-toolbar">
        <div class="toolbar-left">
          <h2>{{ $t('reportView.title') }}</h2>
          <BaseButton v-if="!uiStore.isViewerMode" variant="outline" size="sm" @click="reportStore.addPage()">
            <template #icon-left><Plus /></template>
            {{ $t('reportView.newPage') }}
          </BaseButton>

          <!-- Active Filters Bar -->
          <div v-if="dashboardStore.globalFilters.length > 0" class="active-filters">
            <span class="filter-label">{{ $t('reportView.crossFilters') }}</span>
            <div 
              v-for="f in dashboardStore.globalFilters" 
              :key="f.id"
              class="filter-chip"
            >
              <span class="filter-chip-text">{{ f.label }}</span>
              <button class="filter-chip-close" @click="dashboardStore.removeFilter(f.id)">
                <X size="12" />
              </button>
            </div>
            <button class="clear-filters-btn" @click="dashboardStore.clearFilters()">{{ $t('reportView.clear') }}</button>
          </div>
        </div>
        <div class="toolbar-right">
          <input ref="templateInputRef" type="file" accept=".litebireport" style="display: none" @change="handleImportTemplate" />
          <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Importar Diseño (.litebireport)" @click="templateInputRef.click()">
            <template #icon-left><ArrowDownToLine style="transform: rotate(180deg);" /></template>
            {{ $t('reportView.import') }}
          </BaseButton>
          <BaseButton v-if="!uiStore.isViewerMode" variant="ghost" size="sm" title="Exportar Diseño (.litebireport)" @click="handleExportTemplate">
            <template #icon-left><ArrowDownToLine /></template>
            {{ $t('reportView.export') }}
          </BaseButton>
          <div class="divider" style="width: 1px; height: 24px; background-color: var(--color-border); margin: 0 var(--space-2);"></div>
          <BaseButton variant="outline" size="sm" @click="handleExportPPTX">
            <template #icon-left><Presentation /></template>
            {{ $t('reportView.exportPPTX') }}
          </BaseButton>
          <BaseButton variant="primary" size="sm" @click="handleExportPDF">
            <template #icon-left><ArrowDownToLine /></template>
            {{ $t('reportView.exportPDF') }}
          </BaseButton>
        </div>
      </div>
      
      <!-- Pages Area -->
      <div class="report-body">
        <div id="report-pages-container" class="pages-scroll-area">
          <div 
            v-for="(page, index) in reportStore.pages" 
            :key="page.id"
            class="report-page-wrapper custom-widget"
          >
            <div class="page-header is-export-hidden">
              <span>{{ $t('reportView.page', { num: index + 1 }) }}</span>
              <div v-if="!uiStore.isViewerMode" class="page-actions">
                <button class="w-btn" :title="page.orientation === 'landscape' ? $t('reportView.toPortrait') : $t('reportView.toLandscape')" @click="toggleOrientation(page.id, page.orientation)">
                  <Monitor v-if="page.orientation === 'landscape'" />
                  <Smartphone v-else />
                </button>
                <button class="w-btn" :title="$t('reportView.addChart')" @click="handleAddWidget(page.id)"><Plus /></button>
                <button v-if="reportStore.pages.length > 1" class="w-btn w-btn-danger" :title="$t('reportView.deletePage')" @click="reportStore.removePage(page.id)"><X /></button>
              </div>
            </div>
            <div class="report-page-a4" :class="{ 'landscape': page.orientation === 'landscape' }">
              <DashboardCanvas 
                :layout="page.layout"
                :tab-id="page.id"
                @update:layout="l => reportStore.updateLayout(page.id, l)"
                @remove-widget="wId => handleRemoveWidget(page.id, wId)"
                @edit-widget="wId => handleEditWidget(page.id, wId)"
              />
            </div>
          </div>
        </div>
        
        <!-- Configurator Sidebar -->
        <div v-if="editingWidgetId" class="configurator-sidebar">
          <div class="sidebar-header">
            <h3>{{ $t('reportView.configureWidget') }}</h3>
            <button class="close-btn" @click="closeEditor"><X size="18" /></button>
          </div>
          <WidgetConfigurator v-model:config="editingWidgetConfig" @close="closeEditor" />
        </div>
      </div>
    </div>

    <!-- Export PPTX Modal -->
    <BaseModal 
      v-model="isExportModalOpen" 
      :title="$t('reportView.exportToPowerPoint')"
      size="sm"
    >
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 8px 0;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px;">{{ $t('reportView.presentationTitle') }}</label>
          <BaseInput v-model="exportTitle" placeholder="Ej: Reporte Trimestral" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <BaseButton variant="ghost" @click="isExportModalOpen = false">{{ $t('reportView.cancel') }}</BaseButton>
          <BaseButton variant="primary" @click="confirmExportPPTX">{{ $t('reportView.export') }}</BaseButton>
        </div>
      </div>
    </BaseModal>
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.report-workspace {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--card);
}

.report-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background-color: var(--background);
  border-bottom: 1px solid var(--color-border);
}

.toolbar-left, .toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.toolbar-left h2 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  margin: 0;
  color: var(--foreground);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-left: var(--space-4);
}

.filter-label {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  font-weight: var(--font-medium);
}

.filter-chip {
  display: flex;
  align-items: center;
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.filter-chip-close {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: 4px;
  opacity: 0.7;
}

.filter-chip-close:hover {
  opacity: 1;
}

.clear-filters-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--text-xs);
  cursor: pointer;
}

.clear-filters-btn:hover {
  text-decoration: underline;
}

.report-body {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

.pages-scroll-area {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--space-8);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-8);
  background-color: var(--muted);
}

/* A4 Proportions */
.report-page-wrapper {
  display: flex;
  flex-direction: column;
  background-color: white;
  width: max-content;
  box-shadow: var(--shadow-md);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: width 0.3s ease;
}

.report-page-a4 {
  width: 210mm;
  height: 297mm;
  background-color: white;
  margin: 0 auto;
  box-shadow: var(--shadow-md);
  position: relative;
  overflow: hidden;
  transition: width 0.3s ease, height 0.3s ease;
}

.report-page-a4.landscape {
  width: 297mm;
  height: 210mm;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-bg-sidebar);
  color: white;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.page-actions {
  display: flex;
  gap: var(--space-2);
}

.w-btn {
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}
.w-btn:hover { background-color: rgba(255,255,255,0.1); }
.w-btn-danger:hover { background-color: var(--color-danger); }

.report-page-a4 {
  flex-grow: 1;
  position: relative;
  padding: var(--space-4);
}

/* Sidebar */
.configurator-sidebar {
  width: 320px;
  background-color: var(--background);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.sidebar-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--foreground);
}

.close-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background-color: var(--muted);
  color: var(--foreground);
}

/* Hide UI on export */
.is-exporting .is-export-hidden { display: none !important; }
.is-exporting .report-page-wrapper { box-shadow: none !important; border-radius: 0 !important; margin: 0 !important; }
.is-exporting .pages-scroll-area { padding: 0 !important; gap: 0 !important; background-color: white !important; }
</style>
