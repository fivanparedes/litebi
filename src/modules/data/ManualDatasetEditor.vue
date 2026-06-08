<script setup>
import { ref } from 'vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { Plus, Trash, Save } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'

const emit = defineEmits(['saved', 'cancel'])

const dataStore = useDataStore()

const datasetName = ref('Nuevo Dataset')
const columns = ref([
  { id: 1, name: 'Columna1', type: 'string' },
  { id: 2, name: 'Columna2', type: 'number' }
])
const rows = ref([
  { id: 1, Columna1: '', Columna2: '' }
])

let colIdCounter = 3
let rowIdCounter = 2

const addColumn = () => {
  const newColName = `Columna${colIdCounter}`
  columns.value.push({ id: colIdCounter++, name: newColName, type: 'string' })
  rows.value.forEach(row => {
    row[newColName] = ''
  })
}

const addRow = () => {
  const newRow = { id: rowIdCounter++ }
  columns.value.forEach(col => {
    newRow[col.name] = ''
  })
  rows.value.push(newRow)
}

const removeColumn = (index) => {
  const colName = columns.value[index].name
  columns.value.splice(index, 1)
  rows.value.forEach(row => {
    delete row[colName]
  })
}

const removeRow = (index) => {
  rows.value.splice(index, 1)
}

const saveDataset = async () => {
  // Convert rows to data array
  const data = rows.value.map(row => {
    const newRow = {}
    columns.value.forEach(col => {
      let val = row[col.name]
      if (col.type === 'number') val = val !== '' ? Number(val) : null
      if (col.type === 'boolean') val = val === 'true' || val === true
      newRow[col.name] = val
    })
    return newRow
  })
  
  const schema = columns.value.map(col => ({
    name: col.name,
    type: col.type
  }))

  try {
    const safeName = await dataStore.saveManualDataset(datasetName.value, data, schema)
    emit('saved', safeName)
  } catch (err) {
    console.error('Failed to save manual dataset:', err)
  }
}
</script>

<template>
  <div class="manual-editor">
    <div class="editor-header">
      <div class="header-left">
        <label>Nombre del dataset</label>
        <BaseInput v-model="datasetName" placeholder="Ej. Ventas Mensuales" />
      </div>
      <div class="header-right">
        <BaseButton variant="ghost" @click="emit('cancel')">Cancelar</BaseButton>
        <BaseButton variant="primary" @click="saveDataset">
          <template #icon-left><Save size="16" /></template>
          Guardar Dataset
        </BaseButton>
      </div>
    </div>
    
    <div class="editor-actions">
      <BaseButton variant="secondary" size="sm" @click="addColumn">
        <template #icon-left><Plus size="16" /></template>
        Añadir Columna
      </BaseButton>
      <BaseButton variant="secondary" size="sm" @click="addRow">
        <template #icon-left><Plus size="16" /></template>
        Añadir Fila
      </BaseButton>
    </div>

    <div class="editor-grid-container">
      <table class="editor-grid">
        <thead>
          <tr>
            <th class="action-cell"></th>
            <th v-for="(col, idx) in columns" :key="col.id">
              <div class="col-header">
                <input v-model="col.name" class="col-name-input" placeholder="Nombre" />
                <select v-model="col.type" class="col-type-select">
                  <option value="string">Texto</option>
                  <option value="number">Número</option>
                  <option value="boolean">Booleano</option>
                  <option value="date">Fecha</option>
                </select>
                <button class="remove-btn" @click="removeColumn(idx)" title="Eliminar columna">
                  <Trash size="14"/>
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rIdx) in rows" :key="row.id">
            <td class="action-cell">
              <button class="remove-btn" @click="removeRow(rIdx)" title="Eliminar fila">
                <Trash size="14"/>
              </button>
            </td>
            <td v-for="col in columns" :key="col.id">
              <input v-model="row[col.name]" class="cell-input" :placeholder="col.type" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.manual-editor {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  height: 100%;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--space-4);
  background-color: var(--color-bg-surface);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex-grow: 1;
  max-width: 300px;
}

.header-left label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.header-right {
  display: flex;
  gap: var(--space-2);
}

.editor-actions {
  display: flex;
  gap: var(--space-2);
}

.editor-grid-container {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-surface);
}

.editor-grid {
  width: 100%;
  border-collapse: collapse;
}

.editor-grid th,
.editor-grid td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
}

.editor-grid th {
  background-color: var(--color-bg-primary);
  position: sticky;
  top: 0;
  z-index: 10;
  min-width: 150px;
}

.editor-grid th:last-child,
.editor-grid td:last-child {
  border-right: none;
}

.action-cell {
  width: 40px;
  min-width: 40px !important;
  text-align: center;
  background-color: var(--color-bg-primary);
}

.col-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.col-name-input {
  flex-grow: 1;
  border: 1px solid transparent;
  background: transparent;
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  width: 100%;
}

.col-name-input:focus {
  border-color: var(--color-accent);
  outline: none;
}

.col-type-select {
  border: 1px solid var(--color-border);
  background-color: var(--color-bg-surface);
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
  font-size: var(--text-xs);
}

.cell-input {
  width: 100%;
  border: 1px solid transparent;
  background: transparent;
  padding: var(--space-2);
  color: var(--color-text-primary);
}

.cell-input:focus {
  border-color: var(--color-accent);
  outline: none;
  background-color: var(--color-bg-primary);
  border-radius: var(--radius-sm);
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.remove-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-error);
}
</style>
