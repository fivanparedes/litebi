<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { FileText, FileSpreadsheet } from '@lucide/vue'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import BaseButton from '@/components/ui/BaseButton.vue'

const dataStore = useDataStore()

const activeDataset = computed(() => dataStore.activeDatasetMeta)
const previewData = ref([])
const isExporting = ref(false)

watchEffect(async () => {
  if (!activeDataset.value) {
    previewData.value = []
    return
  }
  previewData.value = await dataStore.getPreviewData(activeDataset.value.name, 100)
})

const formatValue = (val) => {
  if (val === null || val === undefined) return '<span class="cell-null">null</span>'
  if (typeof val === 'boolean') return `<span class="cell-bool">${val}</span>`
  return val
}

const exportCSV = async () => {
  if (!activeDataset.value) return
  try {
    isExporting.value = true
    const allData = await dataStore.getAllData(activeDataset.value.name)
    if (!allData || !allData.length) return
    
    const csv = Papa.unparse(allData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${activeDataset.value.name}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error('Error exporting CSV:', error)
  } finally {
    isExporting.value = false
  }
}

const exportExcel = async () => {
  if (!activeDataset.value) return
  try {
    isExporting.value = true
    const allData = await dataStore.getAllData(activeDataset.value.name)
    if (!allData || !allData.length) return

    const ws = XLSX.utils.json_to_sheet(allData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Datos')
    XLSX.writeFile(wb, `${activeDataset.value.name}.xlsx`)
  } catch (error) {
    console.error('Error exporting Excel:', error)
  } finally {
    isExporting.value = false
  }
}
</script>

<template>
  <div v-if="activeDataset" class="data-preview">
    <div class="preview-header">
      <div class="preview-title">
        <h3>{{ $t('data.preview') }}: {{ activeDataset.originalName }}</h3>
        <span class="badge">Top 100 filas</span>
      </div>
      <div class="preview-actions">
        <BaseButton variant="secondary" size="sm" @click="exportCSV" :disabled="isExporting">
          <template #icon-left><FileText size="14" /></template>
          Exportar a CSV
        </BaseButton>
        <BaseButton variant="secondary" size="sm" @click="exportExcel" :disabled="isExporting">
          <template #icon-left><FileSpreadsheet size="14" /></template>
          Exportar a Excel
        </BaseButton>
      </div>
    </div>
    
    <div class="table-container">
      <table class="preview-table">
        <thead>
          <tr>
            <th class="row-num">#</th>
            <th v-for="col in activeDataset.schema" :key="col.name">
              <div class="th-content">
                <span class="col-name">{{ col.name }}</span>
                <span class="col-type">{{ col.type }}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in previewData" :key="idx">
            <td class="row-num">{{ idx + 1 }}</td>
            <td 
              v-for="col in activeDataset.schema" 
              :key="col.name"
              :class="{ 'text-right': col.type === 'number' }"
            >
              <span v-html="formatValue(row[col.name])"></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.data-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.preview-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-bg-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-actions {
  display: flex;
  gap: var(--space-2);
}

.preview-title {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.preview-title h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.badge {
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  font-size: var(--text-xs);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-weight: var(--font-medium);
}

.table-container {
  flex-grow: 1;
  overflow: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.preview-table th,
.preview-table td {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  white-space: nowrap;
}

.preview-table th {
  background-color: var(--color-bg-primary);
  position: sticky;
  top: 0;
  z-index: 10;
  text-align: left;
  box-shadow: 0 1px 0 var(--color-border);
}

.preview-table td {
  color: var(--color-text-primary);
}

.preview-table tbody tr:hover {
  background-color: var(--color-bg-secondary);
}

.row-num {
  background-color: var(--color-bg-primary);
  color: var(--color-text-tertiary) !important;
  font-variant-numeric: tabular-nums;
  text-align: right;
  width: 40px;
  position: sticky;
  left: 0;
  z-index: 5;
}

.preview-table th.row-num {
  z-index: 15;
}

.th-content {
  display: flex;
  flex-direction: column;
}

.col-name {
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.col-type {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-normal);
}

.text-right {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

:deep(.cell-null) {
  color: var(--color-text-tertiary);
  font-style: italic;
}

:deep(.cell-bool) {
  color: var(--color-accent);
  font-family: var(--font-mono);
}
</style>
