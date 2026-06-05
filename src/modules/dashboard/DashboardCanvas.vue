<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import 'gridstack/dist/gridstack.min.css'
import { GridStack } from 'gridstack'
import { X, Settings } from '@lucide/vue'
import ChartRenderer from '@/modules/visualization/ChartRenderer.vue'
import SlicerRenderer from '@/modules/visualization/SlicerRenderer.vue'
import CollaboratorCursors from '@/components/collaboration/CollaboratorCursors.vue'
import { useCollaborationStore } from '@/stores/collaborationStore'
import { useUiStore } from '@/stores/uiStore'

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

const gridElement = ref(null)
const canvasWrapperRef = ref(null)
let grid = null
let isSyncing = false

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

onMounted(() => {
  initGrid()
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
  if (!grid) return
  
  // Wait for Vue to render any new DOM elements via v-for
  await nextTick() 
  
  const domItems = gridElement.value.querySelectorAll('.grid-stack-item')
  
  isSyncing = true
  
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
  
  // Damos un margen a que las animaciones terminen para evitar eventos `change` rezagados
  setTimeout(() => {
    if (!grid) return
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
    
    if (hasChanges) {
      emit('update:layout', updatedLayout)
    }
    isSyncing = false
  }, 150)
  
}, { deep: true })

onUnmounted(() => {
  if (grid) {
    grid.destroy(false)
    grid = null
  }
})

const handleMouseMove = (e) => {
  if (!collabStore.isConnected || !canvasWrapperRef.value) return
  const rect = canvasWrapperRef.value.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top
  collabStore.updateCursor(x, y)
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
class="grid-stack-item-content custom-widget" :style="[
          widget.config?.styles?.backgroundColor ? { backgroundColor: widget.config.styles.backgroundColor } : {},
          widget.config?.styles?.borderRadius ? { borderRadius: widget.config.styles.borderRadius + 'px' } : {}
        ]">
          <div class="widget-header" :style="uiStore.isViewerMode ? { cursor: 'default' } : {}">
            <span class="widget-title">{{ widget.config?.title || (widget.config?.type === 'slicer' ? 'Segmentador' : 'Gráfico') }}</span>
            <div v-if="!uiStore.isViewerMode" class="widget-actions">
              <button class="w-btn" @click.stop="emit('edit-widget', widget.id)"><Settings /></button>
              <button class="w-btn w-btn-danger" @click.stop="emit('remove-widget', widget.id)"><X /></button>
            </div>
          </div>
          <div class="widget-body">
            <SlicerRenderer v-if="widget.config?.type === 'slicer'" :config="widget.config" />
            <!-- FIX: Cambiado de v-else + v-if (inválido, causa doble renderizado) a v-else-if -->
            <ChartRenderer v-else-if="widget.config" :config="{ ...widget.config, dataset: widget.config?.dataset || 'default' }" />
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
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.widget-header {
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-surface);
  cursor: grab;
}

.widget-header:active {
  cursor: grabbing;
}

.widget-title {
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.widget-actions {
  display: flex;
  gap: var(--space-1);
}

.w-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
}

.w-btn:hover { background-color: var(--color-bg-secondary); color: var(--color-text-primary); }
.w-btn-danger:hover { background-color: var(--color-danger-light); color: var(--color-danger); }
.w-btn svg { width: 14px; height: 14px; }

.widget-body {
  flex-grow: 1;
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  text-align: center;
  font-style: italic;
}

/* Hide UI on export */
.is-exporting .widget-header { display: none !important; }
.is-exporting .custom-widget { border: none !important; box-shadow: none !important; background: transparent !important; }
.is-exporting .grid-stack-item { background: transparent !important; }
.is-exporting .widget-body { padding: 0 !important; }
</style>
