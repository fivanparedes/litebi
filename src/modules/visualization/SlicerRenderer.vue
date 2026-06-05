<script setup>
import { computed, ref, watch } from 'vue'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { Check, Filter, Loader } from '@lucide/vue'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const dataStore = useDataStore()
const dashboardStore = useDashboardStore()

const items = ref([])
const rangeBounds = ref({ min: 0, max: 100 })
const isLoading = ref(false)

watch(() => [props.config, dataStore.dataVersion], async () => {
  const config = props.config
  if (!config.dataset || !config.xAxis) {
    items.value = []
    rangeBounds.value = { min: 0, max: 100 }
    return
  }
  
  isLoading.value = true
  
  const dsName = config.dataset
  const rawX = config.xAxis
  
  const parseCol = (colStr) => colStr.includes('].[') ? colStr : `[${dsName}].[${colStr}]`
  const extractTable = (colStr) => colStr.includes('].[') ? colStr.split('].[')[0].replace('[', '') : dsName

  try {
    const xSafe = parseCol(rawX)
    const requiredTables = [...new Set([dsName, extractTable(rawX)])]
    const fromClause = dataStore.buildJoinQuery(dsName, requiredTables)
    
    if (config.slicerType !== 'slider') {
      const q = `SELECT DISTINCT ${xSafe} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL ORDER BY [value] ASC LIMIT 500`
      const res = await sqlClient.query(q)
      items.value = res.map(r => r.value)
    } else {
      const q = `SELECT MIN(${xSafe}) as [minVal], MAX(${xSafe}) as [maxVal] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL`
      const res = await sqlClient.query(q)
      if (res && res.length > 0) {
        rangeBounds.value = { 
          min: typeof res[0].minVal === 'number' ? res[0].minVal : 0, 
          max: typeof res[0].maxVal === 'number' ? res[0].maxVal : 100 
        }
      }
    }
  } catch (e) {
    console.error("Error generating slicer data:", e)
  }
  
  isLoading.value = false
}, { immediate: true, deep: true })

const dsName = computed(() => props.config.dataset)
const rawX = computed(() => props.config.xAxis)
const isSlider = computed(() => props.config.slicerType === 'slider')

const colNameForFilter = computed(() => {
  if (!rawX.value) return ''
  return rawX.value.includes('].[') ? rawX.value : `[${dsName.value}].[${rawX.value}]`
})

const activeFilter = computed(() => {
  return dashboardStore.globalFilters.find(f => f.column === colNameForFilter.value)
})

const sliderRange = ref({ min: 0, max: 100 })

watch(rangeBounds, (newBounds) => {
  if (isSlider.value && !activeFilter.value) {
    sliderRange.value = { min: newBounds.min, max: newBounds.max }
  }
}, { immediate: true })

const toggleFilter = (val) => {
  if (activeFilter.value && activeFilter.value.value === val && activeFilter.value.operator !== 'BETWEEN') {
    dashboardStore.removeFilter(activeFilter.value.id)
  } else {
    dashboardStore.addFilter(dsName.value, colNameForFilter.value, val, `${rawX.value}: ${val}`)
  }
}

const applyRangeFilter = () => {
  const { min, max } = sliderRange.value
  const label = `${rawX.value}: ${min} - ${max}`
  dashboardStore.addFilter(dsName.value, colNameForFilter.value, min, label, 'BETWEEN', max)
}

const clearFilter = () => {
  if (activeFilter.value) {
    dashboardStore.removeFilter(activeFilter.value.id)
    if (isSlider.value) {
      sliderRange.value = { min: rangeBounds.value.min, max: rangeBounds.value.max }
    }
  }
}
</script>

<template>
  <div class="slicer-wrapper">
    <div v-if="!config.xAxis" class="slicer-empty">
      <p>Configura la Dimensión para este segmentador.</p>
    </div>
    
    <div v-else class="slicer-content">
      <div class="slicer-header">
        <h4 class="slicer-title">{{ config.title || config.xAxis }}</h4>
        <div class="header-actions">
          <Loader v-if="isLoading" class="spin-icon" size="14" />
          <button v-if="activeFilter && !isLoading" class="clear-btn" title="Limpiar Filtro" @click="clearFilter">
            <Filter size="14" />
          </button>
        </div>
      </div>

      <!-- Modo Slider -->
      <div v-if="isSlider" class="slicer-slider-mode">
        <div class="slider-inputs">
          <div class="slider-input-group">
            <label>Desde:</label>
            <input v-model.number="sliderRange.min" type="number" :min="rangeBounds.min" :max="sliderRange.max" />
          </div>
          <div class="slider-input-group">
            <label>Hasta:</label>
            <input v-model.number="sliderRange.max" type="number" :min="sliderRange.min" :max="rangeBounds.max" />
          </div>
        </div>
        <button class="apply-range-btn" @click="applyRangeFilter">Aplicar Rango</button>
      </div>

      <!-- Modo Lista -->
      <div v-else class="slicer-items">
        <button 
          v-for="item in items" 
          :key="item"
          class="slicer-btn"
          role="checkbox"
          :aria-checked="activeFilter && activeFilter.value === item ? 'true' : 'false'"
          :class="{ 'active': activeFilter && activeFilter.value === item }"
          @click="toggleFilter(item)"
        >
          <div class="checkbox">
            <Check v-if="activeFilter && activeFilter.value === item" size="14" />
          </div>
          <span class="item-label">{{ item }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slicer-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-bg-surface);
}

.slicer-empty {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
}

.slicer-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: var(--space-3);
}

.slicer-title {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

.slicer-items {
  flex-grow: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.slicer-btn {
  display: flex;
  align-items: center;
  width: 100%;
  padding: var(--space-2);
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition: background-color 0.2s;
}

.slicer-btn:hover {
  background-color: var(--color-bg-secondary);
}

.slicer-btn.active {
  background-color: var(--color-accent-light);
}

.checkbox {
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-border-hover);
  border-radius: 4px;
  margin-right: var(--space-2);
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-surface);
  color: var(--color-accent);
  flex-shrink: 0;
}

.slicer-btn.active .checkbox {
  border-color: var(--color-accent);
}

.item-label {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.slicer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.clear-btn {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.spin-icon {
  color: var(--color-text-tertiary);
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.clear-btn:hover {
  background: var(--color-bg-secondary);
  color: var(--color-danger);
}

.slicer-slider-mode {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding-top: var(--space-2);
}

.slider-inputs {
  display: flex;
  gap: var(--space-2);
}

.slider-input-group {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
}

.slider-input-group label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.slider-input-group input {
  width: 100%;
  padding: 4px;
  font-size: var(--text-sm);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
}

.apply-range-btn {
  background: var(--color-accent);
  color: white;
  border: none;
  padding: 6px;
  border-radius: var(--radius-md);
  font-size: var(--text-xs);
  cursor: pointer;
  transition: opacity 0.2s;
}

.apply-range-btn:hover {
  opacity: 0.9;
}
</style>
