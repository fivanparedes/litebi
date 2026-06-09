<script setup>
import { ref, computed } from 'vue'
import { Upload, FileSpreadsheet, AlertTriangle, Loader2 } from '@lucide/vue'
import { parseCsv } from './CsvParser'
import { parseXlsx } from './XlsxParser'
import { useDataStore } from '@/stores/dataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
const emit = defineEmits(['imported', 'cancel', 'preview'])

const dataStore = useDataStore()

const isDragging = ref(false)
const isLoading = ref(false)
const isFastImport = ref(false)
const error = ref(null)
const fileInput = ref(null)

const supportedTypes = [
  'text/csv', 
  'application/vnd.ms-excel', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleDragOver = (e) => {
  e.preventDefault()
  isDragging.value = true
}

const handleDragLeave = (e) => {
  e.preventDefault()
  isDragging.value = false
}

const handleDrop = (e) => {
  e.preventDefault()
  isDragging.value = false
  
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    processFiles(Array.from(e.dataTransfer.files))
  }
}

const handleFileSelect = (e) => {
  if (e.target.files && e.target.files.length > 0) {
    processFiles(Array.from(e.target.files))
  }
}

const processFiles = async (files) => {
  if (files.length === 0) return
  
  const forceFastImport = files.length > 1 || isFastImport.value
  
  for (const file of files) {
    await processFile(file, forceFastImport)
  }
  
  if (fileInput.value) fileInput.value.value = ''
}

const processFile = async (file, fastImport) => {
  error.value = null
  
  // Basic validation
  const extension = file.name.split('.').pop().toLowerCase()
  if (!['csv', 'xlsx', 'xls'].includes(extension)) {
    error.value = `El archivo ${file.name} no es soportado.`
    return
  }

  isLoading.value = true
  
  try {
    let parsedData
    
    if (extension === 'csv') {
      parsedData = await parseCsv(file)
    } else {
      parsedData = await parseXlsx(file)
    }
    
    // Clean up filename to use as dataset name
    const datasetName = file.name.replace(/\.[^/.]+$/, "")
    
    if (fastImport) {
      await dataStore.addDataset(datasetName, parsedData.data, parsedData.schema)
      emit('imported', datasetName)
    } else {
      emit('preview', { datasetName, parsedData })
    }
  } catch (err) {
    console.error(`Error procesando archivo ${file.name}:`, err)
    error.value = err.message || `Error desconocido al procesar ${file.name}`
  } finally {
    isLoading.value = false
  }
}

const loadExampleData = async () => {
  isLoading.value = true
  error.value = null
  
  try {
    const response = await fetch('/sample-data/ventas_ejemplo.csv')
    if (!response.ok) throw new Error('No se pudo cargar el archivo de ejemplo')
    
    const blob = await response.blob()
    const file = new File([blob], 'Ventas_Ejemplo.csv', { type: 'text/csv' })
    
    await processFile(file, isFastImport.value)
  } catch (err) {
    error.value = 'Error al cargar los datos de ejemplo: ' + err.message
    isLoading.value = false
  }
}
</script>

<template>
  <div class="import-wizard">
    <div 
      class="drop-zone"
      :class="{ 'drop-zone--dragging': isDragging, 'drop-zone--loading': isLoading }"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="!isLoading && triggerFileInput()"
    >
      <input 
        ref="fileInput" 
        type="file" 
        class="file-input" 
        accept=".csv, .xlsx, .xls"
        multiple
        @change="handleFileSelect"
      >
      
      <div v-if="isLoading" class="drop-zone__content">
        <Loader2 class="drop-zone__icon drop-zone__icon--spin" />
        <h3>Procesando archivo...</h3>
        <p>Por favor espera, esto puede tomar unos segundos.</p>
      </div>
      
      <div v-else class="drop-zone__content">
        <Upload class="drop-zone__icon" />
        <h3>{{ $t('data.dragDrop') }}</h3>
        <p>{{ $t('data.orBrowse') }}</p>
        <span class="drop-zone__hint">{{ $t('data.supportedFormats') }}</span>
      </div>
    </div>
    
    <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-2); margin-top: var(--space-2);">
      <input type="checkbox" id="fast-import" v-model="isFastImport" />
      <label for="fast-import" style="font-size: var(--text-sm); color: var(--color-text-secondary); cursor: pointer;">
        Importación Rápida (Omitir selección de columnas)
      </label>
    </div>

    <div v-if="error" class="error-msg">
      <AlertTriangle class="error-msg__icon" />
      <span>{{ error }}</span>
    </div>
    
    <div class="import-wizard__footer">
      <div class="divider">
        <span>O</span>
      </div>
      <BaseButton variant="secondary" :disabled="isLoading" @click="loadExampleData">
        <template #icon-left><FileSpreadsheet /></template>
        {{ $t('data.loadExample') }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.import-wizard {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.drop-zone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-8) var(--space-4);
  text-align: center;
  cursor: pointer;
  transition: all var(--transition-normal);
  background-color: var(--color-bg-primary);
}

.drop-zone:hover {
  border-color: var(--color-accent);
  background-color: var(--color-accent-light);
}

.drop-zone--dragging {
  border-color: var(--color-accent);
  background-color: var(--color-accent-light);
  transform: scale(1.02);
}

.drop-zone--loading {
  cursor: wait;
  opacity: 0.8;
  pointer-events: none;
}

.file-input {
  display: none;
}

.drop-zone__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.drop-zone__icon {
  width: 48px;
  height: 48px;
  color: var(--color-text-secondary);
  margin-bottom: var(--space-2);
}

.drop-zone__icon--spin {
  animation: spin 1s linear infinite;
  color: var(--color-accent);
}

.drop-zone h3 {
  font-size: var(--text-lg);
  color: var(--color-text-primary);
  margin: 0;
}

.drop-zone p {
  color: var(--color-text-secondary);
  margin: 0;
}

.drop-zone__hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin-top: var(--space-2);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-danger);
  background-color: var(--color-danger-light);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.error-msg__icon {
  width: 16px;
  height: 16px;
}

.import-wizard__footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  width: 100%;
  color: var(--color-text-tertiary);
  font-size: var(--text-xs);
  text-transform: uppercase;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid var(--color-border);
}

.divider::before { margin-right: var(--space-3); }
.divider::after { margin-left: var(--space-3); }

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
