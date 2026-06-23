<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import { Plus, Trash2, Key, LayoutGrid, Star, AlertTriangle } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const dataStore = useDataStore()
const { t } = useI18n()

// State
const datasets = computed(() => Array.from(dataStore.datasets.entries()).map(([name, meta]) => ({ name, meta })))
const relationships = computed(() => dataStore.relationships)

const isModalOpen = ref(false)
const newRel = ref({
  fromTable: '',
  fromColumn: '',
  toTable: '',
  toColumn: '',
  type: '1:N',
  crossFilter: 'single'
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
      newRel.value.toColumn,
      newRel.value.type,
      newRel.value.crossFilter
    )
    isModalOpen.value = false
    newRel.value = { fromTable: '', fromColumn: '', toTable: '', toColumn: '', type: '1:N', crossFilter: 'single' }
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
  const scrollArea = canvasRef.value.querySelector('.canvas-scroll-area')
  if (!scrollArea) return
  const canvasRect = scrollArea.getBoundingClientRect()
  
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

// Drag and drop logic
const draggingTable = ref(null)
const dragOffset = ref({ x: 0, y: 0 })

const onTableMouseDown = (event, dsName) => {
  const ds = dataStore.datasets.get(dsName)
  if (!ds) return
  draggingTable.value = dsName
  
  const currentX = ds.ui?.x || 50
  const currentY = ds.ui?.y || 50
  
  dragOffset.value = {
    x: event.clientX - currentX,
    y: event.clientY - currentY
  }
  
  window.addEventListener('mousemove', onTableMouseMove)
  window.addEventListener('mouseup', onTableMouseUp)
}

const onTableMouseMove = (event) => {
  if (!draggingTable.value) return
  
  const newX = event.clientX - dragOffset.value.x
  const newY = event.clientY - dragOffset.value.y
  
  // Update state immediately for visual feedback
  dataStore.updateDatasetPosition(draggingTable.value, Math.max(0, newX), Math.max(0, newY))
  updateLines()
}

const onTableMouseUp = () => {
  draggingTable.value = null
  window.removeEventListener('mousemove', onTableMouseMove)
  window.removeEventListener('mouseup', onTableMouseUp)
}

// Layout Algorithms
const layoutGrid = () => {
  let x = 50
  let y = 50
  const marginX = 350
  const marginY = 400
  const maxWidth = 1500
  
  datasets.value.forEach((ds) => {
    dataStore.updateDatasetPosition(ds.name, x, y)
    x += marginX
    if (x > maxWidth) {
      x = 50
      y += marginY
    }
  })
  setTimeout(updateLines, 100)
}

const layoutStarSchema = () => {
  if (datasets.value.length === 0) return
  
  const relCount = {}
  datasets.value.forEach(ds => relCount[ds.name] = 0)
  relationships.value.forEach(rel => {
    relCount[rel.fromTable] = (relCount[rel.fromTable] || 0) + 1
    relCount[rel.toTable] = (relCount[rel.toTable] || 0) + 1
  })
  
  let factTable = datasets.value[0].name
  let maxRels = -1
  datasets.value.forEach(ds => {
    if (relCount[ds.name] > maxRels) {
      maxRels = relCount[ds.name]
      factTable = ds.name
    }
  })
  
  const centerX = 800
  const centerY = 600
  dataStore.updateDatasetPosition(factTable, centerX, centerY)
  
  const dimensions = datasets.value.filter(ds => ds.name !== factTable)
  if (dimensions.length > 0) {
    const radius = 450
    const angleStep = (2 * Math.PI) / dimensions.length
    dimensions.forEach((ds, idx) => {
      const angle = idx * angleStep
      const x = Math.max(50, centerX + radius * Math.cos(angle))
      const y = Math.max(50, centerY + radius * Math.sin(angle))
      dataStore.updateDatasetPosition(ds.name, x, y)
    })
  }
  setTimeout(updateLines, 100)
}

let resizeObserver = null

const autoLayout = () => {
  // Detect if multiple tables are at the default position (overlapping at 50,50)
  const defaultPosCount = datasets.value.filter(ds => !ds.meta.ui || (ds.meta.ui.x === 50 && ds.meta.ui.y === 50)).length
  
  if (datasets.value.length > 1 && defaultPosCount > 1) {
    // If there are relationships, Star Schema looks better. Otherwise, Grid.
    if (relationships.value.length > 0) {
      layoutStarSchema()
    } else {
      layoutGrid()
    }
  }
}

onMounted(() => {
  autoLayout()
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
watch(() => datasets.value.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    autoLayout()
  }
  nextTick(() => {
    updateLines()
  })
})
</script>

<template>
  <div class="modeling-view">
    <div class="toolbar">
      <h2>{{ $t('modeling.title') }}</h2>
      <div class="toolbar-actions">
        <BaseButton variant="outline" @click="layoutGrid">
          <template #icon-left><LayoutGrid /></template>
          {{ $t('modeling.autoLayout') }}
        </BaseButton>
        <BaseButton variant="outline" @click="layoutStarSchema">
          <template #icon-left><Star /></template>
          {{ $t('modeling.starSchema') }}
        </BaseButton>
        <BaseButton @click="isModalOpen = true">
          <template #icon-left><Plus /></template>
          {{ $t('modeling.addRelation') }}
        </BaseButton>
      </div>
    </div>

    <div class="modeling-content">
      <!-- The Canvas -->
      <div ref="canvasRef" class="canvas-container" @scroll="updateLines">
        <div class="canvas-scroll-area">
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
        <div 
          v-for="ds in datasets" 
          :id="`table-${ds.name}`" 
          :key="ds.name" 
          class="table-card"
          :class="{ 'is-dragging': draggingTable === ds.name }"
          :style="{ left: `${ds.meta.ui?.x || 50}px`, top: `${ds.meta.ui?.y || 50}px` }"
          @mousedown.stop="onTableMouseDown($event, ds.name)"
        >
          <div class="table-header">
            <h3>{{ ds.meta.originalName }}</h3>
            <span class="badge">{{ ds.meta.rowCount }} rows</span>
          </div>
          <div class="table-columns" @mousedown.stop>
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
    </div>

    <!-- Existing Relationships List (for easy deletion) -->
    <div v-if="relationships.length > 0" class="relations-sidebar">
      <h3>{{ $t('modeling.activeRelations') }}</h3>
      <div v-for="rel in relationships" :key="rel.id" class="rel-item">
        <div class="rel-info">
          <div class="rel-desc">
            <strong>{{ rel.fromTable }}.{{ rel.fromColumn }}</strong>
            <span class="rel-arrow">&rarr;</span>
            <strong>{{ rel.toTable }}.{{ rel.toColumn }}</strong>
          </div>
          <div class="rel-meta">
            <span class="rel-badge">{{ rel.type }}</span>
            <span class="rel-badge rel-badge-filter">Filtro: {{ rel.crossFilter }}</span>
          </div>
        </div>
        <button class="icon-btn" @click="handleDeleteRel(rel.id)">
          <Trash2 size="16" />
        </button>
      </div>
    </div>
    </div>

    <!-- Add Relationship Modal -->
    <BaseModal v-model="isModalOpen" :title="$t('modeling.createRelation')">
      <div class="rel-form">
        <div class="form-row">
          <div class="form-col">
            <label>{{ $t('modeling.sourceTable') }}</label>
            <BaseDropdown v-model="newRel.fromTable" :options="tableOptions" :placeholder="$t('modeling.selectTable')" />
          </div>
          <div class="form-col">
            <label>{{ $t('modeling.sourceColumn') }}</label>
            <BaseDropdown v-model="newRel.fromColumn" :options="fromColumnOptions" :placeholder="$t('modeling.selectColumn')" :disabled="!newRel.fromTable" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <label>{{ $t('modeling.targetTable') }}</label>
            <BaseDropdown v-model="newRel.toTable" :options="tableOptions" :placeholder="$t('modeling.selectTable')" />
          </div>
          <div class="form-col">
            <label>{{ $t('modeling.targetColumn') }}</label>
            <BaseDropdown v-model="newRel.toColumn" :options="toColumnOptions" :placeholder="$t('modeling.selectColumn')" :disabled="!newRel.toTable" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-col">
            <label>{{ $t('modeling.relationType', 'Tipo de Relación') }}</label>
            <BaseDropdown
v-model="newRel.type" :options="[
              { value: '1:1', label: '1:1 (Uno a Uno)' },
              { value: '1:N', label: '1:N (Uno a Muchos)' },
              { value: 'N:M', label: 'N:M (Muchos a Muchos)' }
            ]" />
          </div>
          <div class="form-col">
            <label>{{ $t('modeling.crossFilter', 'Filtro Cruzado') }}</label>
            <BaseDropdown
v-model="newRel.crossFilter" :options="[
              { value: 'single', label: 'Única (Single)' },
              { value: 'both', label: 'Ambas (Both)' },
              { value: 'none', label: 'Ninguna (None)' }
            ]" />
          </div>
        </div>
        
        <div v-if="newRel.type === 'N:M'" class="alert-warning">
          <AlertTriangle class="alert-icon" />
          <span>Atención: Las relaciones Muchos-a-Muchos pueden generar productos cartesianos y afectar el rendimiento si no se manejan con cuidado.</span>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="ghost" @click="isModalOpen = false">{{ $t('common.cancel') }}</BaseButton>
        <BaseButton :disabled="!newRel.fromTable || !newRel.fromColumn || !newRel.toTable || !newRel.toColumn" @click="handleAddRel">{{ $t('modeling.createRelation') }}</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<style scoped>
.modeling-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-background);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--color-card);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.toolbar h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-foreground);
}

.canvas-container {
  flex-grow: 1;
  position: relative;
  overflow: auto;
  background-image: radial-gradient(var(--color-border) 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-scroll-area {
  width: 4000px;
  height: 4000px;
  position: relative;
}

.connections-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 1;
}

.connection-line {
  stroke: var(--color-primary);
  stroke-dasharray: 10;
  animation: dash 30s linear infinite;
  opacity: 0.7;
}

@keyframes dash {
  to {
    stroke-dashoffset: -1000;
  }
}

.tables-layer {
  width: 100%;
  height: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
}

.table-card {
  width: 250px;
  background-color: var(--color-card);
  border: 1px solid var(--color-border);
  border-radius: 0;
  box-shadow: none;
  overflow: hidden;
  position: absolute;
  cursor: grab;
  user-select: none;
  transition: border-color 0.2s;
}

.table-card:hover {
  border-color: var(--color-primary);
}

.table-card.is-dragging {
  cursor: grabbing;
  z-index: 100;
  border-color: var(--color-primary);
  opacity: 0.95;
}

.table-header {
  background-color: var(--color-sidebar);
  color: var(--color-sidebar-foreground);
  padding: 10px 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-header h3 {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
}

.badge {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 0;
  font-size: 10px;
}

.table-columns {
  padding: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.column-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  border-radius: 0;
  font-size: 12px;
  color: var(--color-muted-foreground);
  position: relative;
}

.column-item:hover {
  background-color: var(--color-muted);
}

.col-type-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--color-muted-foreground);
}

.col-type-indicator.type-number { background-color: var(--color-primary); }
.col-type-indicator.type-string { background-color: var(--color-success, oklch(0.62 0.15 155)); }
.col-type-indicator.type-date { background-color: var(--warning, oklch(0.72 0.16 75)); }

.key-icon {
  position: absolute;
  right: 8px;
  color: var(--warning, oklch(0.72 0.16 75));
  width: 14px;
  height: 14px;
}

.modeling-content {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

.relations-sidebar {
  width: 300px;
  border-left: 1px solid var(--color-border);
  padding: 16px;
  background-color: var(--color-card);
  overflow-y: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.relations-sidebar h3 {
  margin: 0 0 16px 0;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-muted-foreground);
}

.rel-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  font-size: 12px;
  color: var(--color-foreground);
}

.rel-item:last-child {
  border-bottom: none;
}

.rel-desc {
  display: flex;
  align-items: center;
  gap: 10px;
}

.rel-arrow {
  color: var(--color-primary);
  font-weight: bold;
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-destructive);
  cursor: pointer;
  padding: 4px;
  border-radius: 0;
}
.icon-btn:hover {
  background-color: var(--color-danger-light);
}

.rel-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 8px 0;
}

.form-row {
  display: flex;
  gap: 16px;
}

.form-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-col label {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-foreground);
}

.rel-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rel-meta {
  display: flex;
  gap: 6px;
}
.rel-badge {
  background-color: var(--color-muted);
  color: var(--color-muted-foreground);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
}
.rel-badge-filter {
  background-color: var(--color-primary-light, rgba(0, 120, 212, 0.1));
  color: var(--color-primary);
}
.alert-warning {
  display: flex;
  gap: 8px;
  padding: 12px;
  background-color: var(--color-warning-light, rgba(255, 170, 0, 0.1));
  color: var(--color-warning, #d97706);
  border-radius: 4px;
  font-size: 12px;
  align-items: flex-start;
  margin-top: 8px;
}
.alert-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-top: 2px;
}
</style>
