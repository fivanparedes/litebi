import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useCollaborationStore } from './collaborationStore'
import { generateId } from '@/utils/generateId'

export const useDashboardStore = defineStore('dashboard', () => {
  // Pestañas (Tabs)
  const tabs = ref([
    { id: 'tab_1', name: 'Dashboard Principal', settings: {} }
  ])
  const activeTabId = ref('tab_1')
  
  // Layouts por Pestaña
  // Format: { 'tab_1': [ { id: 'w_1', x: 0, y: 0, w: 4, h: 4, type: 'chart', content: '...' } ] }
  const layouts = ref({
    'tab_1': []
  })

  // Filtros globales interactivos
  const globalFilters = ref([])

  // Getters
  const activeLayout = computed(() => layouts.value[activeTabId.value] || [])

  // Actions - Tabs
  const addTab = () => {
    const newId = generateId('tab')
    tabs.value.push({ id: newId, name: `Dashboard ${tabs.value.length + 1}`, settings: {} })
    layouts.value[newId] = []
    activeTabId.value = newId
  }

  const removeTab = (id) => {
    if (tabs.value.length <= 1) return // Keep at least one
    
    tabs.value = tabs.value.filter(t => t.id !== id)
    delete layouts.value[id]
    
    if (activeTabId.value === id) {
      activeTabId.value = tabs.value[0].id
    }
  }

  const renameTab = (id, newName) => {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) tab.name = newName
  }

  const setActiveTab = (id) => {
    activeTabId.value = id
  }

  const updateTabSettings = (id, settings) => {
    const tab = tabs.value.find(t => t.id === id)
    if (tab) {
      tab.settings = { ...tab.settings, ...settings }
    }
  }

  // Actions - Widgets
  const updateLayout = (tabId, newLayout) => {
    layouts.value[tabId] = newLayout
  }

  const addWidget = (tabId, widgetConfig) => {
    try {
      if (!layouts.value[tabId]) layouts.value[tabId] = []
      
      // Find an empty spot or just push to bottom
      const newWidget = {
        id: generateId('w'),
        x: 0, 
        y: 0, 
        w: 4, 
        h: 4,
        ...widgetConfig
      }
      
      layouts.value[tabId].push(newWidget)
      // We return a completely new array reference to trigger Vue watch effectively
      layouts.value[tabId] = [...layouts.value[tabId]]
    } catch (e) {
      console.error('[DashboardStore] Error adding widget:', e.message)
    }
  }

  const removeWidget = (tabId, widgetId) => {
    try {
      if (layouts.value[tabId]) {
        layouts.value[tabId] = layouts.value[tabId].filter(w => w.id !== widgetId)
      }
    } catch (e) {
      console.error('[DashboardStore] Error removing widget:', e.message)
    }
  }

  const editMode = ref(false)

  const updateWidget = (tabId, widgetId, updates) => {
    // Validate that tabId exists in layouts
    const layout = layouts.value[tabId]
    if (!layout) {
      console.warn(`[DashboardStore] updateWidget: tab '${tabId}' not found in layouts`)
      return
    }
    // Validate that widgetId exists in the layout
    const index = layout.findIndex(w => w.id === widgetId)
    if (index === -1) {
      console.warn(`[DashboardStore] updateWidget: widget '${widgetId}' not found in tab '${tabId}'`)
      return
    }
    layout[index] = { ...layout[index], ...updates }
    layouts.value[tabId] = [...layout]
  }

  const duplicateWidget = (tabId, widgetId) => {
    const layout = layouts.value[tabId]
    const widget = layout.find(w => w.id === widgetId)
    if (widget) {
      // Fix: deep clone to avoid shared references between original and duplicate
      const newWidget = JSON.parse(JSON.stringify(widget))
      newWidget.id = generateId('w')
      newWidget.x = widget.x + 1
      newWidget.y = widget.y + 1
      layout.push(newWidget)
      layouts.value[tabId] = [...layout]
    }
  }

  const setEditMode = (mode) => {
    editMode.value = mode
  }

  // Actions - Filters
  const addFilter = (dataset, column, value, label, operator = '=', value2 = null) => {
    // Si ya existe un filtro para esta columna, lo reemplazamos o ignoramos?
    // En este caso, lo reemplazamos para simplificar
    const existingIdx = globalFilters.value.findIndex(f => f.column === column)
    if (existingIdx !== -1) {
      globalFilters.value.splice(existingIdx, 1)
    }
    
    globalFilters.value.push({
      id: generateId('filter'),
      dataset,
      column,
      value,
      value2,
      operator,
      label
    })
  }

  const removeFilter = (id) => {
    globalFilters.value = globalFilters.value.filter(f => f.id !== id)
  }

  const clearFilters = () => {
    globalFilters.value = []
  }

  // --- WebRTC Collaboration Sync ---
  let isSyncingFromRemote = false

  const initCollaborationSync = () => {
    const collabStore = useCollaborationStore()
    const yLayouts = collabStore.ydoc.getMap('layouts')
    const yFilters = collabStore.ydoc.getArray('filters')

    // Local -> Remote (Layouts)
    watch(() => layouts.value, (newVal) => {
      if (isSyncingFromRemote) return
      Object.keys(newVal).forEach(tabId => {
        yLayouts.set(tabId, newVal[tabId])
      })
    }, { deep: true })

    // Remote -> Local (Layouts)
    yLayouts.observe(event => {
      isSyncingFromRemote = true
      event.keysChanged.forEach(tabId => {
        layouts.value[tabId] = yLayouts.get(tabId)
      })
      setTimeout(() => { isSyncingFromRemote = false }, 50)
    })

    // Local -> Remote (Filters)
    watch(() => globalFilters.value, (newVal) => {
      if (isSyncingFromRemote) return
      yFilters.delete(0, yFilters.length)
      yFilters.insert(0, newVal)
    }, { deep: true })

    // Remote -> Local (Filters)
    yFilters.observe(event => {
      isSyncingFromRemote = true
      globalFilters.value = yFilters.toArray()
      setTimeout(() => { isSyncingFromRemote = false }, 50)
    })
  }

  // Initialize sync immediately
  try {
    initCollaborationSync()
  } catch (e) {
    console.warn('[DashboardStore] Collaboration sync init failed:', e.message)
  }

  return {
    tabs,
    activeTabId,
    layouts,
    editMode,
    globalFilters,
    activeLayout,
    addTab,
    removeTab,
    renameTab,
    setActiveTab,
    updateTabSettings,
    updateLayout,
    addWidget,
    removeWidget,
    updateWidget,
    duplicateWidget,
    setEditMode,
    addFilter,
    removeFilter,
    clearFilters
  }
})
