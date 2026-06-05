<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Plus, Trash2, Key } from '@lucide/vue'

const dataStore = useDataStore()

// State
const datasets = computed(() => Array.from(dataStore.datasets.entries()).map(([name, meta]) => ({ name, meta })))
const relationships = computed(() => dataStore.relationships)

const isModalOpen = ref(false)
const newRel = ref({
  fromTable: '',
  fromColumn: '',
  toTable: '',
  toColumn: ''
})

const canvasRef = ref(null)
const lines = ref([]) // array of { x1, y1, x2, y2, id }

// Modal options
const tableOptions = computed(() => datasets.value.map(d => ({ value: d.name, label: d.meta.originalName })))

const getColumnsForTable = (tableName) => {
  if (!tableName) return []
  const ds = dataStore.datasets.get(tableName)
  if (!ds) return []
  return ds.schema.map(c => ({ value: c.name, label: c.name }))
}

const fromColumnOptions = computed(() => getColumnsForTable(newRel.value.fromTable))
const toColumnOptions = computed(() => getColumnsForTable(newRel.value.toTable))

const handleAddRel = () => {
  if (newRel.value.fromTable && newRel.value.fromColumn && newRel.value.toTable && newRel.value.toColumn) {
    dataStore.addRelationship(
      newRel.value.fromTable, 
      newRel.value.fromColumn, 
      newRel.value.toTable, 
      newRel.value.toColumn
    )
    isModalOpen.value = false
    newRel.value = { fromTable: '', fromColumn: '', toTable: '', toColumn: '' }
    setTimeout(updateLines, 100)
  }
}

const handleDeleteRel = (id) => {
  dataStore.removeRelationship(id)
  setTimeout(updateLines, 100)
}

// Drawing lines
const updateLines = () => {
  if (!canvasRef.value) return
  const canvasRect = canvasRef.value.getBoundingClientRect()
  
  const newLines = []
  
  relationships.value.forEach(rel => {
    const fromEl = document.getElementById(`col-${rel.fromTable}-${rel.fromColumn}`)
    const toEl = document.getElementById(`col-${rel.toTable}-${rel.toColumn}`)
    
    if (fromEl && toEl) {
      const rect1 = fromEl.getBoundingClientRect()
      const rect2 = toEl.getBoundingClientRect()
      
      // Calculate center points relative to the canvas
      newLines.push({
        id: rel.id,
        x1: rect1.left + (rect1.width / 2) - canvasRect.left,
        y1: rect1.top + (rect1.height / 2) - canvasRect.top,
        x2: rect2.left + (rect2.width / 2) - canvasRect.left,
        y2: rect2.top + (rect2.height / 2) - canvasRect.top
      })
    }
  })
  
  lines.value = newLines
}

let resizeObserver = null

onMounted(() => {
  updateLines()
  window.addEventListener('resize', updateLines)
  
  if (canvasRef.value) {
    resizeObserver = new ResizeObserver(() => updateLines())
    resizeObserver.observe(canvasRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', updateLines)
  if (resizeObserver) resizeObserver.disconnect()
})

// Update lines when dataset count changes
watch(() => datasets.value.length, () => {
  nextTick(() => setTimeout(updateLines, 100))
})
</script>

<template>
  <div class="modeling-view">
    <div class="toolbar">
      <h2>Modelado de Datos</h2>
      <BaseButton @click="isModalOpen = true">
        <template #icon-left><Plus /></template>
        Añadir Relación
      </BaseButton>
    </div>

    <!-- The Canvas -->
    <div ref="canvasRef" class="canvas-container">
      <!-- SVG Layer for Connections -->
      <svg class="connections-layer" width="100%" height="100%">
        <path 
          v-for="line in lines" 
          :key="line.id"
          :d="`M ${line.x1} ${line.y1} C ${(line.x1 + line.x2) / 2} ${line.y1}, ${(line.x1 + line.x2) / 2} ${line.y2}, ${line.x2} ${line.y2}`"
          fill="none" 
          stroke="var(--color-accent)" 
          stroke-width="3" 
          class="connection-line"
        />
      </svg>

      <!-- Tables Layer -->
      <div class="tables-layer">
        <div v-for="ds in datasets" :id="`table-${ds.name}`" :key="ds.name" class="table-card">
          <div class="table-header">
            <h3>{{ ds.meta.originalName }}</h3>
            <span class="badge">{{ ds.meta.rowCount }} rows</span>
          </div>
          <div class="table-columns">
            <div 
              v-for="col in ds.meta.schema" 
              :id="`col-${ds.name}-${col.name}`"
              :key="col.name"
              class="column-item"
            >
              <Key v-if="relationships.some(r => (r.fromTable === ds.name && r.fromColumn === col.name) || (r.toTable === ds.name && r.toColumn === col.name))" class="key-icon" />
              <div class="col-type-indicator" :class="`type-${col.type}`"></div>
              <span>{{ col.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Existing Relationships List (for easy deletion) -->
    <div v-if="relationships.length > 0" class="relations-list">
      <h3>Relaciones Activas</h3>
      <div v-for="rel in relationships" :key="rel.id" class="rel-item">
        <div class="rel-desc">
          <strong>{{ rel.fromTable }}.{{ rel.fromColumn }}</strong>
          <span class="rel-arrow">&rarr;</span>
          <strong>{{ rel.toTable }}.{{ rel.toColumn }}</strong>
        </div>
        <button class="icon-btn" @click="handleDeleteRel(rel.id)">
          <Trash2 size="16" />
        </button>
      </div>
    </div>

    <!-- Add Relationship Modal -->
    <BaseModal v-model="isModalOpen" title="Crear Relación">
      <div class="rel-form">
        <div class="form-row">
          <div class="form-col">
            <label>Tabla Origen</label>
            <BaseDropdown v-model="newRel.fromTable" :options="tableOptions" placeholder="Seleccionar tabla" />
          </div>
          <div class="form-col">
            <label>Columna Origen</label>
            <BaseDropdown v-model="newRel.fromColumn" :options="fromColumnOptions" placeholder="Seleccionar columna" :disabled="!newRel.fromTable" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <label>Tabla Destino</label>
            <BaseDropdown v-model="newRel.toTable" :options="tableOptions" placeholder="Seleccionar tabla" />
          </div>
          <div class="form-col">
            <label>Columna Destino</label>
            <BaseDropdown v-model="newRel.toColumn" :options="toColumnOptions" placeholder="Seleccionar columna" :disabled="!newRel.toTable" />
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="ghost" @click="isModalOpen = false">Cancelar</BaseButton>
        <BaseButton :disabled="!newRel.fromTable || !newRel.fromColumn || !newRel.toTable || !newRel.toColumn" @click="handleAddRel">Crear Relación</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.modeling-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-primary);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  background-color: var(--color-bg-surface);
  border-bottom: 1px solid var(--color-border);
}

.toolbar h2 {
  margin: 0;
  font-size: var(--text-lg);
  color: var(--color-text-primary);
}

.canvas-container {
  flex-grow: 1;
  position: relative;
  overflow: auto;
  padding: var(--space-8);
  background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 20px 20px;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.connection-line {
  stroke-dasharray: 10;
  animation: dash 30s linear infinite;
  opacity: 0.6;
}

@keyframes dash {
  to {
    stroke-dashoffset: -1000;
  }
}

.tables-layer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-8);
  position: relative;
  z-index: 2;
  align-items: flex-start;
}

.table-card {
  width: 250px;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.table-header {
  background-color: var(--color-bg-sidebar);
  color: white;
  padding: var(--space-3) var(--space-4);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header h3 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.badge {
  background-color: rgba(255,255,255,0.2);
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 10px;
}

.table-columns {
  padding: var(--space-2);
  max-height: 300px;
  overflow-y: auto;
}

.column-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  position: relative;
}

.column-item:hover {
  background-color: var(--color-bg-secondary);
}

.col-type-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-text-tertiary);
}

.col-type-indicator.type-number { background-color: var(--color-accent); }
.col-type-indicator.type-string { background-color: var(--color-success); }
.col-type-indicator.type-date { background-color: var(--color-warning); }

.key-icon {
  position: absolute;
  right: var(--space-2);
  color: var(--color-warning);
  width: 14px;
  height: 14px;
}

.relations-list {
  border-top: 1px solid var(--color-border);
  padding: var(--space-4) var(--space-6);
  background-color: var(--color-bg-surface);
  max-height: 200px;
  overflow-y: auto;
}

.rel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

.rel-desc {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.rel-arrow {
  color: var(--color-accent);
  font-weight: bold;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
}
.icon-btn:hover {
  background-color: var(--color-danger-light);
}

.rel-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-4) 0;
}

.form-row {
  display: flex;
  gap: var(--space-4);
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-col label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}
</style>
