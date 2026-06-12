<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import 'gridstack/dist/gridstack.min.css'
import { GridStack } from 'gridstack'
import { X, Settings, Pause, Play, RefreshCw, Copy, Download } from '@lucide/vue'
import ChartRenderer from '@/modules/visualization/ChartRenderer.vue'
import SlicerRenderer from '@/modules/visualization/SlicerRenderer.vue'
import ParameterRenderer from '@/modules/visualization/ParameterRenderer.vue'
import CollaboratorCursors from '@/components/collaboration/CollaboratorCursors.vue'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useUiStore } from '@/stores/uiStore'
import { useDashboardStore } from '@/stores/dashboardStore'

const props = defineProps({
  layout: {
    type: Array,
    required: true
  },
  tabId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:layout', 'remove-widget', 'edit-widget'])

const collabStore = useCollaborationStore()
const uiStore = useUiStore()
const dashboardStore = useDashboardStore()

const gridElement = ref(null)
const canvasWrapperRef = ref(null)
const renderers = ref([])
let grid = null
let isSyncing = false
const focusedWidgetId = ref(null)

// Initialize GridStack
const initGrid = () => {
  if (grid) grid.destroy(false)
  
  if (gridElement.value) {
    grid = GridStack.init({
      cellHeight: 80,
      margin: 8,
      animate: true,
      float: true, // Allow items to be placed anywhere without packing to top
      resizable: { handles: 'e, se, s, sw, w' },
      handle: '.widget-header',
      staticGrid: uiStore.isViewerMode
    }, gridElement.value)

    // Load initial data
    isSyncing = true
    grid.load(props.layout)
    isSyncing = false

    // Listen to changes (drag, resize)
    grid.on('change', (event, items) => {
      if (isSyncing || !items) return
      
      // Update our Vue state based on GridStack's internal state
      const updatedLayout = grid.engine.nodes.map(node => {
        const widgetId = node.id || node.el?.getAttribute('gs-id') || node.el?.id;
        return {
          id: widgetId,
          x: node.x,
          y: node.y,
          w: node.w,
          h: node.h,
          type: node.type,
          config: props.layout.find(w => w.id === widgetId)?.config || {}
        }
      }).filter(n => n.id) // Prevenir corrupción de estado
      
      emit('update:layout', updatedLayout)
    })
  }
}

const handleOutsideClick = (e) => {
  if (!e.target.closest('.grid-stack-item')) {
    focusedWidgetId.value = null
  }
}

onMounted(() => {
  initGrid()
  document.addEventListener('mousedown', handleOutsideClick)
})

// Watch for tab change or external layout change
watch(() => props.tabId, async () => {
  await nextTick()
  initGrid()
})

watch(() => uiStore.isViewerMode, (newVal) => {
  if (grid) {
    grid.setStatic(newVal)
  }
})

watch(() => props.layout, async (newLayout) => {
  if (isUnmounting || !grid || isSyncing) return
  
  isSyncing = true
  
  // Wait for Vue to render any new DOM elements via v-for
  await nextTick() 
  
  const domItems = gridElement.value.querySelectorAll('.grid-stack-item')
  
  
  // 1. Añadir widgets nuevos al motor de GridStack (aquellos renderizados por Vue pero aún no manejados por GS)
  domItems.forEach(el => {
    if (!el.gridstackNode) {
      grid.makeWidget(el)
    }
  })
  
  // 2. Eliminar widgets del motor que ya fueron removidos del DOM por Vue
  const domSet = new Set(Array.from(domItems))
  const nodesToRemove = grid.engine.nodes.filter(node => !domSet.has(node.el))
  nodesToRemove.forEach(node => {
    grid.removeWidget(node.el, false) // false = no intentes borrar el DOM (Vue ya lo hizo)
  })
  
  syncTimeout = setTimeout(() => {
    if (isUnmounting || !grid) return
    // Force sync the layout back to Vue so Vue's VNode matches GridStack's calculated positions
    const updatedLayout = grid.engine.nodes.map(node => {
      const widgetId = node.id || node.el?.getAttribute('gs-id') || node.el?.id;
      return {
        id: widgetId,
        x: node.x,
        y: node.y,
        w: node.w,
        h: node.h,
        type: node.type,
        config: props.layout.find(w => w.id === widgetId)?.config || {}
      }
    }).filter(n => n.id)
    
    const hasChanges = updatedLayout.length !== props.layout.length || updatedLayout.some(n => {
      const oldNode = props.layout.find(w => w.id === n.id)
      return !oldNode || oldNode.x !== n.x || oldNode.y !== n.y || oldNode.w !== n.w || oldNode.h !== n.h
    })
    
    if (hasChanges && !isUnmounting) {
      emit('update:layout', updatedLayout)
    }
    isSyncing = false
  }, 150)
  
}, { deep: true })

let isUnmounting = false
let syncTimeout = null

onBeforeUnmount(() => {
  isUnmounting = true
  if (syncTimeout) clearTimeout(syncTimeout)
  document.removeEventListener('mousedown', handleOutsideClick)
})

const handleMouseMove = (e) => {
  if (!collabStore.isConnected || !canvasWrapperRef.value) return
  const rect = canvasWrapperRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  collabStore.updateCursor(x, y)
}

const togglePause = (widgetId) => {
  const newLayout = props.layout.map(w => {
    if (w.id === widgetId) {
      return { ...w, config: { ...w.config, isPaused: !w.config.isPaused } }
    }
    return w
  })
  emit('update:layout', newLayout)
}

const refreshWidget = (widgetId) => {
  const newLayout = props.layout.map(w => {
    if (w.id === widgetId) {
      return { ...w, config: { ...w.config, refreshCounter: (w.config.refreshCounter || 0) + 1 } }
    }
    return w
  })
  emit('update:layout', newLayout)
}

const duplicateWidget = (widgetId) => {
  dashboardStore.duplicateWidget(props.tabId, widgetId)
}

const exportCsv = (widgetId) => {
  // Find the renderer instance by widgetId
  // renderers.value is an array of ChartRenderer components
  const targetRenderer = renderers.value.find(r => r.widgetId === widgetId)
  if (targetRenderer && targetRenderer.exportToCSV) {
    targetRenderer.exportToCSV()
  } else {
    uiStore.addToast({ message: 'No se puede exportar este widget', type: 'warning' })
  }
}
</script>

<template>
  <div ref="canvasWrapperRef" class="canvas-wrapper" style="position: relative;" @mousemove="handleMouseMove">
    <CollaboratorCursors />
    <div ref="gridElement" class="grid-stack">
      <!-- GridStack handles DOM generation based on load() -->
      <!-- We render the initial items so they exist in the DOM for GridStack -->
      <div 
        v-for="widget in layout" 
        :key="widget.id"
        class="grid-stack-item"
        :gs-id="widget.id"
        :gs-x="widget.x"
        :gs-y="widget.y"
        :gs-w="widget.w"
        :gs-h="widget.h"
      >
        <div
          class="grid-stack-item-content custom-widget"
          :class="{ 'focused': focusedWidgetId === widget.id }"
          :style="[
            widget.config?.styles?.backgroundColor ? { backgroundColor: widget.config.styles.backgroundColor } : {},
            widget.config?.styles?.borderRadius ? { borderRadius: widget.config.styles.borderRadius + 'px' } : {}
          ]"
          @mousedown="focusedWidgetId = widget.id"
        >
          <div class="widget-header" :style="uiStore.isViewerMode ? { cursor: 'default' } : {}">
            <span class="widget-title">
              {{ widget.config?.title || (widget.config?.type === 'slicer' ? 'Segmentador' : widget.config?.type === 'parameter' ? 'Parámetro' : 'Gráfico') }}
              <span v-if="widget.config?.isPaused" class="paused-badge">(Pausado)</span>
            </span>
            <div v-if="!uiStore.isViewerMode" class="widget-actions">
              <button class="w-btn" title="Refrescar" @click.stop="refreshWidget(widget.id)"><RefreshCw /></button>
              <button class="w-btn" :title="widget.config?.isPaused ? 'Reanudar' : 'Pausar'" @click.stop="togglePause(widget.id)">
                <Play v-if="widget.config?.isPaused" />
                <Pause v-else />
              </button>
              <button class="w-btn" title="Exportar CSV" @click.stop="exportCsv(widget.id)"><Download /></button>
              <button class="w-btn" title="Duplicar" @click.stop="duplicateWidget(widget.id)"><Copy /></button>
              <button class="w-btn" title="Ajustes" @click.stop="emit('edit-widget', widget.id)"><Settings /></button>
              <button class="w-btn w-btn-danger" title="Eliminar" @click.stop="emit('remove-widget', widget.id)"><X /></button>
            </div>
          </div>
          <div class="widget-body">
            <SlicerRenderer v-if="widget.config?.type === 'slicer'" :config="widget.config" />
            <ParameterRenderer v-else-if="widget.config?.type === 'parameter'" :config="widget.config" />
            <ChartRenderer 
              v-else-if="widget.config" 
              ref="renderers"
              :widget-id="widget.id"
              :config="{ ...widget.config, dataset: widget.config?.dataset || 'default' }" 
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.canvas-wrapper {
  flex-grow: 1;
  background-color: transparent;
  overflow-y: auto;
  padding: var(--space-4);
}

.grid-stack {
  min-height: 100%;
}

.custom-widget {
  background-color: var(--background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
}

.custom-widget.focused {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px rgba(var(--color-accent-rgb, 37, 99, 235), 0.2);
}

.widget-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  padding: var(--space-2) var(--space-3);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

:deep(.dark) .widget-title, :deep(.dark) .widget-actions {
  background-color: var(--card);
  border-color: var(--color-border);
}

.custom-widget:hover .widget-header,
.custom-widget.focused .widget-header {
  opacity: 1;
  pointer-events: auto;
  cursor: grab;
}

.widget-header:active {
  cursor: grabbing;
}

.widget-title:active {
  cursor: grabbing;
}

.widget-title {
  font-weight: var(--font-semibold);
  font-size: var(--text-sm);
  color: var(--foreground);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--card);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  pointer-events: auto;
  cursor: grab;
}

.widget-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--card);
  padding: 4px;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  pointer-events: auto;
}

.paused-badge {
  font-size: 10px;
  color: var(--color-warning);
  font-weight: normal;
}

.w-btn {
  background: none;
  border: none;
  color: var(--muted-foreground);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.w-btn:hover { background-color: var(--muted); color: var(--foreground); }
.w-btn-danger:hover { background-color: var(--color-danger-light); color: var(--color-danger); }
.w-btn svg { width: 14px; height: 14px; }

.widget-body {
  flex-grow: 1;
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  text-align: center;
}

/* Hide UI on export */
.is-exporting .widget-header { display: none !important; }
.is-exporting .custom-widget { border: none !important; box-shadow: none !important; background: transparent !important; }
.is-exporting .grid-stack-item { background: transparent !important; }
.is-exporting .widget-body { padding: 0 !important; }
</style>
