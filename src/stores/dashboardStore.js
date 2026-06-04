import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useDashboardStore = defineStore('dashboard', () => {
  // Pestañas (Tabs)
  const tabs = ref([
    { id: 'tab_1', name: 'Dashboard Principal' }
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
    const newId = `tab_${Date.now()}`
    tabs.value.push({ id: newId, name: `Dashboard ${tabs.value.length + 1}` })
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

  // Actions - Widgets
  const updateLayout = (tabId, newLayout) => {
    layouts.value[tabId] = newLayout
  }

  const addWidget = (tabId, widgetConfig) => {
    if (!layouts.value[tabId]) layouts.value[tabId] = []
    
    // Find an empty spot or just push to bottom
    const newWidget = {
      id: `w_${Date.now()}`,
      x: 0, 
      y: 0, 
      w: 4, 
      h: 4,
      ...widgetConfig
    }
    
    layouts.value[tabId].push(newWidget)
    // We return a completely new array reference to trigger Vue watch effectively
    layouts.value[tabId] = [...layouts.value[tabId]]
  }

  const removeWidget = (tabId, widgetId) => {
    if (layouts.value[tabId]) {
      layouts.value[tabId] = layouts.value[tabId].filter(w => w.id !== widgetId)
    }
  }

  const editMode = ref(false)

  const updateWidget = (tabId, widgetId, updates) => {
    const layout = layouts.value[tabId]
    const index = layout.findIndex(w => w.id === widgetId)
    if (index !== -1) {
      layout[index] = { ...layout[index], ...updates }
      layouts.value[tabId] = [...layout]
    }
  }

  const duplicateWidget = (tabId, widgetId) => {
    const layout = layouts.value[tabId]
    const widget = layout.find(w => w.id === widgetId)
    if (widget) {
      const newWidget = { ...widget, id: `w_${Date.now()}`, x: widget.x + 1, y: widget.y + 1 }
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
      id: `filter_${Date.now()}`,
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
