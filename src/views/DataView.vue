<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Database, Upload, FileSpreadsheet, Plus, CalendarDays, Server, Globe, Box, DatabaseZap } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ImportWizard from '@/modules/data/ImportWizard.vue'
import DatasetList from '@/modules/data/DatasetList.vue'
import DataPreview from '@/modules/data/DataPreview.vue'
import LiveConnectorModal from '@/modules/data/LiveConnectorModal.vue'

const { t } = useI18n()
const dataStore = useDataStore()

const isImportModalOpen = ref(false)
const isLiveConnectorOpen = ref(false)
const activeConnectorType = ref('postgres')
const isAddingSource = ref(false)
const isCalendarModalOpen = ref(false)
const calendarStartYear = ref(new Date().getFullYear() - 3)
const calendarEndYear = ref(new Date().getFullYear() + 2)

const hasDatasets = computed(() => dataStore.datasetNames.length > 0)

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
  isAddingSource.value = false
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
          <h2>Conectar Origen de Datos</h2>
          <p>Seleccione el tipo de fuente de datos que desea importar.</p>
        </div>
        <BaseButton v-if="hasDatasets" variant="ghost" @click="isAddingSource = false">Cancelar</BaseButton>
      </div>

      <div class="connectors-grid">
        <!-- Local Files -->
        <div class="connector-card" @click="openImportModal">
          <div class="connector-icon-wrapper"><Upload class="connector-icon" /></div>
          <h3>Archivos Locales</h3>
          <p>Importar CSV o Excel (XLSX)</p>
        </div>
        
        <div class="connector-card" @click="loadExampleData">
          <div class="connector-icon-wrapper"><FileSpreadsheet class="connector-icon" /></div>
          <h3>Datos de Ejemplo</h3>
          <p>Cargar dataset de prueba</p>
        </div>

        <!-- SQL Databases -->
        <div class="connector-card" @click="openLiveConnector('postgres')">
          <div class="connector-icon-wrapper"><Database class="connector-icon" style="color: #336791" /></div>
          <h3>PostgreSQL</h3>
          <p>Conexión a servidor remoto</p>
        </div>

        <div class="connector-card" @click="openLiveConnector('mysql')">
          <div class="connector-icon-wrapper"><DatabaseZap class="connector-icon" style="color: #E48E00" /></div>
          <h3>MySQL</h3>
          <p>Conexión a base de datos MySQL</p>
        </div>

        <div class="connector-card" @click="openLiveConnector('sqlserver')">
          <div class="connector-icon-wrapper"><Server class="connector-icon" style="color: #CC292B" /></div>
          <h3>SQL Server</h3>
          <p>Microsoft SQL Server</p>
        </div>

        <!-- APIs -->
        <div class="connector-card" @click="openLiveConnector('api')">
          <div class="connector-icon-wrapper"><Globe class="connector-icon" style="color: var(--color-success)" /></div>
          <h3>API REST</h3>
          <p>Extraer desde endpoint JSON</p>
        </div>

        <div class="connector-card" @click="openLiveConnector('salesforce')">
          <div class="connector-icon-wrapper"><Box class="connector-icon" style="color: #00A1E0" /></div>
          <h3>Salesforce</h3>
          <p>Importar CRM empresarial</p>
        </div>

        <div class="connector-card" @click="openLiveConnector('google-analytics')">
          <div class="connector-icon-wrapper"><Globe class="connector-icon" style="color: #E37400" /></div>
          <h3>Google Analytics</h3>
          <p>Métricas de tráfico web</p>
        </div>
      </div>
    </div>

    <!-- Data Dashboard -->
    <div v-else class="data-dashboard">
      <div class="dashboard-header">
        <div class="header-left">
          <h2>{{ $t('data.datasets') }}</h2>
        </div>
        <div class="header-right">
          <BaseButton variant="secondary" size="sm" @click="openCalendarModal" style="margin-right: 8px;">
            <template #icon-left><CalendarDays /></template>
            Crear Calendario
          </BaseButton>
          <BaseButton variant="primary" size="sm" @click="isAddingSource = true">
            <template #icon-left><Plus /></template>
            Nuevo Origen
          </BaseButton>
        </div>
      </div>

      <div class="dashboard-content">
        <div class="datasets-section">
          <DatasetList />
        </div>
        <div class="preview-section">
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
      <ImportWizard @imported="onDatasetImported" />
    </BaseModal>

    <!-- Live Connector Modal -->
    <LiveConnectorModal 
      v-model="isLiveConnectorOpen"
      :connector-type="activeConnectorType"
      @imported="onDatasetImported"
    />

    <!-- Calendar Modal -->
    <BaseModal 
      v-model="isCalendarModalOpen" 
      title="Generar Tabla Calendario"
      size="sm"
    >
      <div style="display: flex; flex-direction: column; gap: 16px; padding: 8px 0;">
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px;">Año de inicio:</label>
          <BaseInput type="number" v-model="calendarStartYear" />
        </div>
        <div>
          <label style="display: block; margin-bottom: 4px; font-size: 14px;">Año de fin:</label>
          <BaseInput type="number" v-model="calendarEndYear" />
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px;">
          <BaseButton variant="ghost" @click="isCalendarModalOpen = false">Cancelar</BaseButton>
          <BaseButton variant="primary" @click="handleGenerateCalendar">Generar</BaseButton>
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
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.connectors-header p {
  color: var(--color-text-secondary);
  margin: 0;
}

.connectors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
  animation: slideUpFade 0.4s ease-out forwards;
}

.connector-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  cursor: pointer;
  transition: all 0.2s ease;
}

.connector-card:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  box-shadow: var(--shadow-md);
}

.connector-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.connector-icon {
  width: 24px;
  height: 24px;
  color: var(--color-text-primary);
}

.connector-card h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0 0 var(--space-1) 0;
}

.connector-card p {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
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
  color: var(--color-text-primary);
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
  max-height: 250px;
  overflow-y: auto;
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
