import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useReportStore = defineStore('report', () => {
  const pages = ref([
    { id: 'page_1', layout: [] }
  ])
  
  const activePageId = ref('page_1')

  const addPage = () => {
    const newId = `page_${Date.now()}`
    pages.value.push({ id: newId, layout: [] })
    activePageId.value = newId
  }

  const removePage = (id) => {
    if (pages.value.length <= 1) return
    pages.value = pages.value.filter(p => p.id !== id)
    if (activePageId.value === id) {
      activePageId.value = pages.value[0].id
    }
  }

  const addWidget = (pageId, widgetData) => {
    const page = pages.value.find(p => p.id === pageId)
    if (page) {
      const newWidget = {
        id: `rw_${Date.now()}`,
        x: 0, y: 0, w: 4, h: 4,
        ...widgetData
      }
      page.layout.push(newWidget)
      // trigger reactivity
      page.layout = [...page.layout]
    }
  }

  const updateLayout = (pageId, newLayout) => {
    const page = pages.value.find(p => p.id === pageId)
    if (page) {
      page.layout = newLayout
    }
  }

  const removeWidget = (pageId, widgetId) => {
    const page = pages.value.find(p => p.id === pageId)
    if (page) {
      page.layout = page.layout.filter(w => w.id !== widgetId)
    }
  }

  const updateWidget = (pageId, widgetId, updates) => {
    const page = pages.value.find(p => p.id === pageId)
    if (page) {
      const index = page.layout.findIndex(w => w.id === widgetId)
      if (index !== -1) {
        page.layout[index] = { ...page.layout[index], ...updates }
        page.layout = [...page.layout]
      }
    }
  }

  return {
    pages,
    activePageId,
    addPage,
    removePage,
    addWidget,
    updateLayout,
    removeWidget,
    updateWidget
  }
})
