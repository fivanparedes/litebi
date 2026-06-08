<script setup>
import { computed, ref } from 'vue'
import { Database, Table, Calendar, CalendarClock, Hash, Type, Trash2, Edit2 } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseTooltip from '@/components/ui/BaseTooltip.vue'

const dataStore = useDataStore()
const uiStore = useUiStore()

const expandedCards = ref({})

const toggleExpand = (name) => {
  expandedCards.value[name] = !expandedCards.value[name]
}

const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num)
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return new Intl.DateTimeFormat('default', { 
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(d)
}

const getTypeIcon = (type) => {
  switch (type) {
    case 'number': return Hash
    case 'date': return Calendar
    case 'boolean': return Table // Checkbox icon would be better
    default: return Type
  }
}
</script>

<template>
  <div class="dataset-list">
    <div 
      v-for="dataset in dataStore.datasetList" 
      :key="dataset.name"
      class="dataset-card"
      :class="{ 'dataset-card--active': dataStore.activeDatasetName === dataset.name }"
      @click="dataStore.setActiveDataset(dataset.name)"
    >
      <div class="dataset-card__header">
        <div class="dataset-card__title">
          <Database class="dataset-card__icon" />
          <h3>{{ dataset.originalName }}</h3>
        </div>
        
        <div class="dataset-card__actions" :class="{ 'always-visible': true }">
          <BaseTooltip :text="expandedCards[dataset.name] ? 'Colapsar Detalles' : 'Expandir Detalles'" position="top">
            <button class="action-btn" @click.stop="toggleExpand(dataset.name)">
              <svg v-if="!expandedCards[dataset.name]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
            </button>
          </BaseTooltip>
          <BaseTooltip v-if="!uiStore.isViewerMode" :text="$t('data.delete')" position="top">
            <button class="action-btn action-btn--danger" @click.stop="dataStore.removeDataset(dataset.name)">
              <Trash2 />
            </button>
          </BaseTooltip>
        </div>
      </div>
      
      <div v-if="expandedCards[dataset.name]" class="dataset-card__body">
        <div class="dataset-card__stats">
          <div class="stat">
            <span class="stat__value">{{ formatNumber(dataset.rowCount) }}</span>
            <span class="stat__label">{{ $t('data.rows') }}</span>
          </div>
          <div class="stat">
            <span class="stat__value">{{ dataset.colCount }}</span>
            <span class="stat__label">{{ $t('data.columns') }}</span>
          </div>
        </div>
        
        <div class="dataset-card__schema">
          <div 
            v-for="col in dataset.schema.slice(0, 5)" 
            :key="col.name"
            class="schema-col"
          >
            <component :is="getTypeIcon(col.type)" class="schema-col__icon" />
            <span class="schema-col__name">{{ col.name }}</span>
          </div>
          <div v-if="dataset.schema.length > 5" class="schema-col schema-col--more">
            + {{ dataset.schema.length - 5 }} más
          </div>
        </div>
        
        <div class="dataset-card__footer">
          <CalendarClock class="footer-icon" />
          <span>Importado el {{ formatDate(dataset.importedAt) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dataset-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
  padding: var(--space-4) 0;
}

.dataset-card {
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.dataset-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.dataset-card--active {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 1px var(--color-accent);
}

.dataset-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.dataset-card__title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
}

.dataset-card__icon {
  width: 20px;
  height: 20px;
  color: var(--color-accent);
  flex-shrink: 0;
}

.dataset-card__title h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dataset-card__actions {
  display: flex;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.dataset-card:hover .dataset-card__actions {
  opacity: 1;
}

.dataset-card__actions.always-visible {
  opacity: 1;
}

.dataset-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.action-btn {
  background: none;
  border: none;
  padding: var(--space-1);
  cursor: pointer;
  border-radius: var(--radius-sm);
  color: var(--color-text-tertiary);
}

.action-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.action-btn--danger:hover {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.action-btn :deep(svg) {
  width: 16px;
  height: 16px;
}

.dataset-card__stats {
  display: flex;
  gap: var(--space-4);
  background-color: var(--color-bg-primary);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}

.stat {
  display: flex;
  flex-direction: column;
}

.stat__value {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
}

.stat__label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dataset-card__schema {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.schema-col {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  background-color: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.schema-col__icon {
  width: 12px;
  height: 12px;
}

.schema-col__name {
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.schema-col--more {
  background-color: transparent;
  font-weight: var(--font-medium);
}

.dataset-card__footer {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: auto;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-3);
}

.footer-icon {
  width: 14px;
  height: 14px;
}
</style>
