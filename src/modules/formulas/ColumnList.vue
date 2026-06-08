<script setup>
import { computed, ref } from 'vue'
import { Database, Calendar, Hash, Type, Table, Calculator, Pencil } from '@lucide/vue'

const props = defineProps({
  datasets: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['insert-column', 'edit-column', 'select-dataset'])


const expandedDatasets = ref({})
const toggleDataset = (name) => {
  expandedDatasets.value[name] = !expandedDatasets.value[name]
  emit('select-dataset', name)
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'number': return Hash
    case 'date': return Calendar
    case 'boolean': return Table
    default: return Type
  }
}
</script>

<template>
  <div class="column-list">
    <div class="column-list__header">
      <h3>Columnas Disponibles</h3>
      <p>Haz clic para insertar en la fórmula</p>
    </div>
    
    <div class="columns-scroll">
      <div v-for="dataset in datasets" :key="dataset.name" class="dataset-group">
        <div class="dataset-group__header" @click="toggleDataset(dataset.name)">
          <span class="dataset-group__icon">
            <svg v-if="!expandedDatasets[dataset.name]" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
          <Database class="dataset-group__db-icon" />
          <span class="dataset-group__name">{{ dataset.originalName }}</span>
        </div>
        
        <div v-if="expandedDatasets[dataset.name]" class="dataset-group__columns">
          <div 
            v-for="col in dataset.schema" 
            :key="col.name"
            class="column-item"
            @click="emit('insert-column', `[${dataset.name}].[${col.name}]`)"
          >
            <div class="column-item__left">
              <div class="column-item__icon-wrapper">
                <Calculator v-if="col.isCalculated" class="calc-icon" />
                <component :is="getTypeIcon(col.type)" class="type-icon" />
              </div>
              <span class="column-item__name">{{ col.name }}</span>
            </div>
            
            <button v-if="col.isCalculated" class="edit-btn" title="Editar Fórmula" @click.stop="emit('edit-column', { ...col, datasetName: dataset.name })">
              <Pencil />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.column-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
}

.column-list__header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.column-list__header h3 {
  margin: 0 0 var(--space-1) 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.column-list__header p {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.columns-scroll {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--space-2);
}

.dataset-group {
  margin-bottom: var(--space-2);
}

.dataset-group__header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
}

.dataset-group__header:hover {
  background-color: var(--color-border);
}

.dataset-group__icon, .dataset-group__db-icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

.dataset-group__columns {
  display: flex;
  flex-direction: column;
  padding-left: var(--space-4);
  margin-top: var(--space-1);
}

.column-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 4px var(--space-2);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
}

.column-item:hover {
  background-color: var(--color-bg-secondary);
}

.column-item__icon-wrapper {
  display: flex;
  align-items: center;
  gap: 2px;
}

.calc-icon {
  width: 12px;
  height: 12px;
  color: var(--color-accent);
}

.type-icon {
  width: 12px;
  height: 12px;
  color: var(--color-text-tertiary);
}

.column-item__name {
  font-size: 13px;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.column-item__left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-grow: 1;
  overflow: hidden;
}

.edit-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  opacity: 0.6;
  transition: opacity var(--transition-fast), background-color var(--transition-fast), color var(--transition-fast);
}

.column-item:hover .edit-btn { opacity: 1; }
.edit-btn:hover { background-color: var(--color-bg-surface); color: var(--color-accent); opacity: 1; }
.edit-btn svg { width: 12px; height: 12px; }
</style>
