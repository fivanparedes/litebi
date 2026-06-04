<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Database, Upload, FileSpreadsheet, Plus, CalendarDays } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import ImportWizard from '@/modules/data/ImportWizard.vue'
import DatasetList from '@/modules/data/DatasetList.vue'
import DataPreview from '@/modules/data/DataPreview.vue'

const { t } = useI18n()
const dataStore = useDataStore()

const isImportModalOpen = ref(false)
const isCalendarModalOpen = ref(false)
const calendarStartYear = ref(new Date().getFullYear() - 3)
const calendarEndYear = ref(new Date().getFullYear() + 2)

const hasDatasets = computed(() => dataStore.datasetNames.length > 0)

const openImportModal = () => {
  isImportModalOpen.value = true
}

const onDatasetImported = (name) => {
  isImportModalOpen.value = false
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
    
    <!-- Empty State -->
    <div v-if="!hasDatasets" class="empty-state-wrapper">
      <div class="empty-state">
        <div class="empty-state__icon-wrapper">
          <Database class="empty-state__icon" />
        </div>
        <h2 class="empty-state__title">{{ $t('data.noDatasets') }}</h2>
        <p class="empty-state__desc">{{ $t('data.noDataDesc') }}</p>
        
        <div class="empty-state__actions">
          <BaseButton variant="primary" @click="openImportModal">
            <template #icon-left><Upload /></template>
            {{ $t('data.importFile') }}
          </BaseButton>
          <BaseButton variant="ghost" @click="loadExampleData">
            <template #icon-left><FileSpreadsheet /></template>
            {{ $t('data.loadExample') }}
          </BaseButton>
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
          <BaseButton variant="primary" size="sm" @click="openImportModal">
            <template #icon-left><Plus /></template>
            {{ $t('data.importFile') }}
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

/* Empty State Styles */
.empty-state-wrapper {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.empty-state {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: slideUpFade 0.5s ease-out forwards;
}

.empty-state__icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: var(--color-accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
}

.empty-state__icon {
  width: 40px;
  height: 40px;
  color: var(--color-accent);
}

.empty-state__title {
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-3);
}

.empty-state__desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--space-8);
  line-height: var(--leading-relaxed);
}

.empty-state__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  width: 100%;
  max-width: 240px;
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
