<script setup>
import { computed } from 'vue'
import { Database, Calendar, Hash, Type, Table, Calculator, Pencil } from '@lucide/vue'

const props = defineProps({
  schema: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['insert-column', 'edit-column'])

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
      <div 
        v-for="col in schema" 
        :key="col.name"
        class="column-item"
        @click="emit('insert-column', `[${col.name}]`)"
      >
        <div class="column-item__left">
          <div class="column-item__icon-wrapper">
            <Calculator v-if="col.isCalculated" class="calc-icon" />
            <component :is="getTypeIcon(col.type)" class="type-icon" />
          </div>
          <span class="column-item__name">{{ col.name }}</span>
        </div>
        
        <button v-if="col.isCalculated" class="edit-btn" @click.stop="emit('edit-column', col)" title="Editar Fórmula">
          <Pencil />
        </button>
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

.column-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
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
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
}

.column-item__name {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
}

.column-item__left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-grow: 1;
}

.edit-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.column-item:hover .edit-btn { opacity: 1; }
.edit-btn:hover { background-color: var(--color-bg-surface); color: var(--color-accent); }
.edit-btn svg { width: 14px; height: 14px; }
</style>
