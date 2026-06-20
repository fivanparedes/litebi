<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Filter, Check, X, AlertTriangle } from '@lucide/vue'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  datasetName: {
    type: String,
    required: true
  },
  rawData: {
    type: Array,
    default: () => []
  },
  inferredSchema: {
    type: Array,
    default: null
  },
  isFileImport: {
    type: Boolean,
    default: false
  },
  previewRows: {
    type: Array,
    default: () => []
  },
  totalRows: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue', 'import'])

const columns = ref([])
const displayRows = ref([])

const getFallbackSchema = (data) => {
  if (!data || data.length === 0) return []
  return Object.keys(data[0]).map(k => ({ name: k, type: 'string' }))
}

watch(() => props.modelValue, (isOpen) => {
  if (isOpen) {
    let schemaToUse = props.inferredSchema
    
    if (props.isFileImport) {
      if (!schemaToUse || schemaToUse.length === 0) {
        schemaToUse = getFallbackSchema(props.previewRows)
      }
      columns.value = schemaToUse.map(col => ({
        name: col.name,
        type: col.type,
        selected: true
      }))
      displayRows.value = props.previewRows
    } else if (props.rawData && props.rawData.length > 0) {
      if (!schemaToUse || schemaToUse.length === 0) {
        schemaToUse = getFallbackSchema(props.rawData)
      }
      columns.value = schemaToUse.map(col => ({
        name: col.name,
        type: col.type,
        selected: true
      }))
      displayRows.value = props.rawData.slice(0, 50)
    }
  }
})

const toggleAll = (state) => {
  columns.value.forEach(col => { col.selected = state })
}

const handleImport = () => {
  const selectedColNames = columns.value.filter(c => c.selected).map(c => c.name)
  
  if (selectedColNames.length === 0) {
    const uiStore = useUiStore()
    uiStore.addToast({ message: "Debe seleccionar al menos una columna para importar.", type: 'warning' })
    return
  }
  
  let schemaToUse = props.inferredSchema
  
  if (props.isFileImport) {
    if (!schemaToUse || schemaToUse.length === 0) {
      schemaToUse = getFallbackSchema(props.previewRows)
    }
    const filteredSchema = schemaToUse.filter(c => selectedColNames.includes(c.name))
    
    emit('import', {
      datasetName: props.datasetName,
      selectedColumns: selectedColNames,
      schema: filteredSchema
    })
  } else {
    if (!schemaToUse || schemaToUse.length === 0) {
      schemaToUse = getFallbackSchema(props.rawData)
    }
    const filteredSchema = schemaToUse.filter(c => selectedColNames.includes(c.name))
    
    // Filter the data in memory
    const filteredData = props.rawData.map(row => {
      const newRow = {}
      selectedColNames.forEach(col => {
        newRow[col] = row[col]
      })
      return newRow
    })
    
    emit('import', {
      datasetName: props.datasetName,
      data: filteredData,
      schema: filteredSchema
    })
  }
}
</script>

<template>
  <BaseModal 
    :model-value="modelValue" 
    :title="`Previsualizar Importación: ${datasetName}`" 
    size="lg"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="preview-modal">
      <div class="preview-header">
        <div class="preview-stats">
          Total de registros a importar: <strong>{{ isFileImport ? totalRows : rawData.length }}</strong>. Mostrando los primeros 50.
        </div>
        <div class="column-actions">
          <BaseButton variant="ghost" size="sm" @click="toggleAll(true)">Seleccionar Todo</BaseButton>
          <BaseButton variant="ghost" size="sm" @click="toggleAll(false)">Desmarcar Todo</BaseButton>
        </div>
      </div>
      
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="col in columns" :key="col.name" :class="{ 'col-disabled': !col.selected }">
                <div class="th-content">
                  <input v-model="col.selected" type="checkbox" class="col-checkbox" />
                  <div class="col-info">
                    <span class="col-name">{{ col.name }}</span>
                    <span class="col-type">{{ col.type }}</span>
                  </div>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, idx) in displayRows" :key="idx">
              <td v-for="col in columns" :key="col.name" :class="{ 'col-disabled': !col.selected }">
                {{ row[col.name] !== null && row[col.name] !== undefined ? row[col.name] : 'null' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <template #footer>
      <div class="footer-actions">
        <BaseButton variant="ghost" @click="$emit('update:modelValue', false)">Cancelar</BaseButton>
        <BaseButton variant="primary" @click="handleImport">Importar Selección</BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.preview-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  max-height: 60vh;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-2) 0;
}

.preview-stats {
  font-size: var(--text-sm);
  color: var(--muted-foreground);
}

.column-actions {
  display: flex;
  gap: var(--space-2);
}

.table-container {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--card);
  max-height: 400px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.data-table th,
.data-table td {
  padding: 8px 12px;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: opacity var(--transition-fast);
}

.data-table th {
  background-color: var(--muted);
  position: sticky;
  top: 0;
  z-index: 10;
}

.th-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.col-checkbox {
  cursor: pointer;
  accent-color: var(--color-accent);
}

.col-info {
  display: flex;
  flex-direction: column;
}

.col-name {
  font-weight: 600;
  color: var(--foreground);
}

.col-type {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  font-family: var(--font-mono);
}

.col-disabled {
  opacity: 0.3;
  background-color: rgba(0,0,0,0.02);
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  width: 100%;
}
</style>
