<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { Database, Upload, FileSpreadsheet, Plus, CalendarDays, Server, Globe, Box, DatabaseZap, Edit3 } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ImportWizard from '@/modules/data/ImportWizard.vue'
import DatasetList from '@/modules/data/DatasetList.vue'
import DataPreview from '@/modules/data/DataPreview.vue'
import LiveConnectorModal from '@/modules/data/LiveConnectorModal.vue'
import ManualDatasetEditor from '@/modules/data/ManualDatasetEditor.vue'
import PythonConnectorModal from '@/modules/data/PythonConnectorModal.vue'
import DataPreviewModal from '@/modules/data/DataPreviewModal.vue'
import { useUiStore } from '@/stores/uiStore'

const { t } = useI18n()
const dataStore = useDataStore()
const uiStore = useUiStore()
const route = useRoute()
const router = useRouter()

const isImportModalOpen = ref(false)
const isLiveConnectorOpen = ref(false)
const activeConnectorType = ref('postgres')
const isCalendarModalOpen = ref(false)
const isManualModalOpen = ref(false)
const isPythonModalOpen = ref(false)
const calendarStartYear = ref(new Date().getFullYear() - 3)
const calendarEndYear = ref(new Date().getFullYear() + 2)

// Preview state
const isPreviewModalOpen = ref(false)
const previewDatasetName = ref('')
const previewRawData = ref([])
const previewSchema = ref(null)
const previewConnectorConfig = ref(null)
const previewRefreshInterval = ref(0)

const isAddingSource = ref(false)

onMounted(() => {
  if (route.query.action === 'new') {
    isAddingSource.value = true
    router.replace({ path: '/data', query: {} })
  }
})

watch(() => route.query.action, (newAction) => {
  if (newAction === 'new') {
    isAddingSource.value = true
    router.replace({ path: '/data', query: {} })
  }
})
const hasDatasets = computed(() => dataStore.datasetNames.length > 0)
const searchQuery = ref('')

const openImportModal = () => {
  isImportModalOpen.value = true
}

const openLiveConnector = (type) => {
  activeConnectorType.value = type
  isLiveConnectorOpen.value = true
}

const onDatasetImported = (name) => {
  isImportModalOpen.value = false
  isLiveConnectorOpen.value = false
  isPythonModalOpen.value = false
  isAddingSource.value = false
}

const onPreviewRequested = ({ datasetName, parsedData, connectorConfig, refreshInterval }) => {
  previewDatasetName.value = datasetName
  previewRawData.value = parsedData.data
  previewSchema.value = parsedData.schema
  previewConnectorConfig.value = connectorConfig || null
  previewRefreshInterval.value = refreshInterval || 0
  
  // Close the import wizard modal since preview takes over
  isImportModalOpen.value = false
  isLiveConnectorOpen.value = false
  isPythonModalOpen.value = false
  
  // Open the preview modal
  isPreviewModalOpen.value = true
}

const handlePreviewImport = async (filteredResult) => {
  await dataStore.addDataset(
    filteredResult.datasetName, 
    filteredResult.data, 
    filteredResult.schema,
    previewConnectorConfig.value,
    previewRefreshInterval.value
  )
  isPreviewModalOpen.value = false
  onDatasetImported(filteredResult.datasetName)
}

const onManualDatasetSaved = (name) => {
  isManualModalOpen.value = false
  isAddingSource.value = false
}

const openManualModal = () => {
  isManualModalOpen.value = true
}

const loadExampleData = async () => {
  // We can instantiate the component programmatically or just let ImportWizard handle it.
  // The easiest way is to open the modal and let the user click "Load Example".
  openImportModal()
}

const openCalendarModal = () => {
  isCalendarModalOpen.value = true
}

const handleGenerateCalendar = () => {
  if (!isNaN(calendarStartYear.value) && !isNaN(calendarEndYear.value)) {
    dataStore.generateCalendarTable(parseInt(calendarStartYear.value), parseInt(calendarEndYear.value))
    isCalendarModalOpen.value = false
  }
}
</script>

<template>
  <div class="view-container">
    
    <!-- Connectors Grid (Empty State or Adding Mode) -->
    <div v-if="!hasDatasets || isAddingSource" class="connectors-wrapper">
      <div class="connectors-header">
        <div class="connectors-header-text">
          <h2>{{ $t('data.connectSource') }}</h2>
          <p>{{ $t('data.connectSourceDesc') }}</p>
        </div>
        <BaseButton v-if="hasDatasets" variant="ghost" @click="isAddingSource = false">{{ $t('data.cancel') }}</BaseButton>
      </div>

      <div class="connectors-grid">
        <!-- Local Files -->
        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openImportModal">
          <div class="connector-icon-wrapper"><Upload class="connector-icon" /></div>
          <h3>{{ $t('data.localFiles') }}</h3>
          <p>{{ $t('data.localFilesDesc') }}</p>
        </div>
        
        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openImportModal">
          <div class="connector-icon-wrapper"><FileSpreadsheet class="connector-icon" style="color: var(--color-success)" /></div>
          <h3>{{ $t('data.excelCsv') }}</h3>
          <p>{{ $t('data.excelCsvDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openManualModal">
          <div class="connector-icon-wrapper"><Edit3 class="connector-icon" style="color: var(--color-accent)" /></div>
          <h3>{{ $t('data.manualDataset') }}</h3>
          <p>{{ $t('data.manualDatasetDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="isPythonModalOpen = true">
          <div class="connector-icon-wrapper">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #3776AB;" class="connector-icon"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          </div>
          <h3>{{ $t('data.pythonScript') }}</h3>
          <p>{{ $t('data.pythonScriptDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openLiveConnector('postgres')">
          <div class="connector-icon-wrapper"><DatabaseZap class="connector-icon" style="color: #336791" /></div>
          <h3>{{ $t('data.postgres') }}</h3>
          <p>{{ $t('data.postgresDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openLiveConnector('mysql')">
          <div class="connector-icon-wrapper"><Database class="connector-icon" style="color: #E48E00" /></div>
          <h3>{{ $t('data.mysql') }}</h3>
          <p>{{ $t('data.mysqlDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openLiveConnector('sqlserver')">
          <div class="connector-icon-wrapper"><Server class="connector-icon" style="color: #CC292B" /></div>
          <h3>{{ $t('data.sqlserver') }}</h3>
          <p>{{ $t('data.sqlserverDesc') }}</p>
        </div>

        <!-- APIs -->
        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openLiveConnector('api')">
          <div class="connector-icon-wrapper"><Globe class="connector-icon" style="color: var(--color-success)" /></div>
          <h3>{{ $t('data.apiRest') }}</h3>
          <p>{{ $t('data.apiRestDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openLiveConnector('salesforce')">
          <div class="connector-icon-wrapper"><Box class="connector-icon" style="color: #00A1E0" /></div>
          <h3>{{ $t('data.salesforce') }}</h3>
          <p>{{ $t('data.salesforceDesc') }}</p>
        </div>

        <div v-if="!uiStore.isViewerMode" class="connector-card" @click="openLiveConnector('google-analytics')">
          <div class="connector-icon-wrapper"><Globe class="connector-icon" style="color: #E37400" /></div>
          <h3>{{ $t('data.googleAnalytics') }}</h3>
          <p>{{ $t('data.googleAnalyticsDesc') }}</p>
        </div>
      </div>
    </div>

    <!-- Data Browser Dashboard -->
    <div v-else class="data-browser flex flex-col h-full bg-background overflow-hidden">
      <!-- Top actions bar -->
      <div class="px-6 py-4 flex items-center justify-between shrink-0">
        <div class="text-sm text-muted-foreground">
          {{ $t('data.datasetCountDesc', { count: dataStore.datasetNames.length }) }}
        </div>
        <div class="flex items-center gap-3">
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input v-model="searchQuery" type="text" :placeholder="$t('data.filterDatasets')" class="pl-9 pr-4 py-2 text-sm bg-card border border-border rounded-none focus:outline-none focus:ring-1 focus:ring-primary w-64" />
          </div>
          <BaseButton v-if="!uiStore.isViewerMode" variant="outline" size="sm" @click="openCalendarModal">
            <template #icon-left><CalendarDays /></template>
            {{ $t('data.createCalendar') }}
          </BaseButton>
          <BaseButton v-if="!uiStore.isViewerMode" variant="primary" size="sm" @click="isAddingSource = true">
            <template #icon-left><Plus /></template>
            {{ $t('data.newSource') }}
          </BaseButton>
        </div>
      </div>

      <!-- Main content area -->
      <div class="flex-1 flex flex-col px-6 pb-6 gap-6 overflow-hidden">
        <!-- Datasets Grid (Scrollable) -->
        <div class="overflow-y-auto custom-scrollbar pb-2 pr-2 shrink-0 max-h-[40%]">
          <DatasetList :search-query="searchQuery" />
        </div>

        <!-- Preview Section -->
        <div v-if="dataStore.activeDatasetName" class="flex-1 flex flex-col bg-card border border-border shadow-none rounded-none overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <DataPreview />
        </div>
      </div>
    </div>

    <!-- Import Modal -->
    <BaseModal 
      v-model="isImportModalOpen" 
      :title="$t('data.importFile')"
      size="md"
    >
      <ImportWizard 
        @imported="onDatasetImported" 
        @preview="onPreviewRequested"
        @cancel="isImportModalOpen = false" 
      />
    </BaseModal>

    <!-- Data Preview Modal -->
    <DataPreviewModal
      v-model="isPreviewModalOpen"
      :dataset-name="previewDatasetName"
      :raw-data="previewRawData"
      :inferred-schema="previewSchema"
      @import="handlePreviewImport"
    />

    <!-- Live Connector Modal -->
    <LiveConnectorModal 
      v-model="isLiveConnectorOpen" 
      :connector-type="activeConnectorType"
      @imported="onDatasetImported"
      @preview="onPreviewRequested"
    />

    <!-- Manual Dataset Modal -->
    <BaseModal
      v-model="isManualModalOpen"
      :title="$t('data.createManualDataset')"
      size="lg"
    >
      <ManualDatasetEditor @saved="onManualDatasetSaved" @cancel="isManualModalOpen = false" />
    </BaseModal>

    <!-- Python Script Modal -->
    <PythonConnectorModal
      v-model="isPythonModalOpen"
      @preview="onPreviewRequested"
    />

    <!-- Calendar Modal -->
    <BaseModal 
      v-model="isCalendarModalOpen" 
      :title="$t('data.generateCalendarTitle')"
      size="sm"
    >
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 8px 0;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px;">{{ $t('data.startYear') }}</label>
          <BaseInput v-model="calendarStartYear" type="number" />
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px;">{{ $t('data.endYear') }}</label>
          <BaseInput v-model="calendarEndYear" type="number" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <BaseButton variant="ghost" @click="isCalendarModalOpen = false">{{ $t('data.cancel') }}</BaseButton>
          <BaseButton variant="primary" @click="handleGenerateCalendar">{{ $t('data.generate') }}</BaseButton>
        </div>
      </div>
    </BaseModal>

  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* Connectors Grid Styles */
.connectors-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-8);
  gap: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.connectors-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.connectors-header h2 {
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--foreground);
  margin-bottom: var(--space-1);
}

.connectors-header p {
  color: var(--muted-foreground);
  margin: 0;
}

.connectors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  animation: slideUpFade 0.4s ease-out forwards;
}

.connector-card {
  background-color: var(--background);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  transition: all 0.2s ease;
}

.connector-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-border-focus);
}

.connector-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 0;
  background-color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.connector-icon {
  width: 24px;
  height: 24px;
  color: var(--foreground);
}

.connector-card h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--foreground);
  margin: 0 0 var(--space-1) 0;
}

.connector-card p {
  font-size: var(--text-sm);
  color: var(--muted-foreground);
  margin: 0;
  line-height: 1.4;
}

/* Dashboard Styles */
.data-dashboard {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  gap: var(--space-4);
  height: 100%;
  overflow: hidden;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.dashboard-header h2 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--foreground);
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  flex-grow: 1;
  overflow: hidden;
}

.datasets-section {
  flex-shrink: 0;
  max-height: 45%;
  overflow-y: auto;
  padding-bottom: 8px; /* give some room for expansion */
}

.preview-section {
  flex-grow: 1;
  overflow: hidden;
  min-height: 200px;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
