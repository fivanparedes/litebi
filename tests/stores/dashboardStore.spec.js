import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDashboardStore } from '../../src/stores/dashboardStore'
import { useCollaborationStore } from '../../src/stores/collaborationStore'

// Mock collaboration store to avoid Yjs complexity
vi.mock('../../src/stores/collaborationStore', () => {
  return {
    useCollaborationStore: vi.fn().mockReturnValue({
      ydoc: {
        getMap: vi.fn().mockReturnValue({
          set: vi.fn(),
          get: vi.fn(),
          observe: vi.fn()
        }),
        getArray: vi.fn().mockReturnValue({
          delete: vi.fn(),
          insert: vi.fn(),
          observe: vi.fn(),
          toArray: vi.fn().mockReturnValue([])
        })
      }
    })
  }
})

describe('dashboardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with default values', () => {
    const store = useDashboardStore()
    expect(store.tabs.length).toBe(1)
    expect(store.tabs[0].id).toBe('tab_1')
    expect(store.activeTabId).toBe('tab_1')
    expect(store.layouts['tab_1']).toEqual([])
    expect(store.editMode).toBe(false)
  })

  it('adds and removes tabs', () => {
    const store = useDashboardStore()
    store.addTab()
    
    expect(store.tabs.length).toBe(2)
    const newTabId = store.activeTabId
    expect(store.layouts[newTabId]).toEqual([])

    store.removeTab(newTabId)
    expect(store.tabs.length).toBe(1)
    expect(store.activeTabId).toBe('tab_1')
  })

  it('prevents removing the last tab', () => {
    const store = useDashboardStore()
    store.removeTab('tab_1')
    expect(store.tabs.length).toBe(1) // Should still be 1
  })

  it('renames a tab', () => {
    const store = useDashboardStore()
    store.renameTab('tab_1', 'New Name')
    expect(store.tabs[0].name).toBe('New Name')
  })

  it('adds, updates, duplicates, and removes widgets', () => {
    const store = useDashboardStore()
    
    store.addWidget('tab_1', { type: 'chart' })
    const layout = store.layouts['tab_1']
    expect(layout.length).toBe(1)
    expect(layout[0].type).toBe('chart')
    
    const widgetId = layout[0].id
    
    store.updateWidget('tab_1', widgetId, { w: 8 })
    expect(store.layouts['tab_1'][0].w).toBe(8)
    
    store.duplicateWidget('tab_1', widgetId)
    expect(store.layouts['tab_1'].length).toBe(2)
    expect(store.layouts['tab_1'][1].w).toBe(8)
    expect(store.layouts['tab_1'][1].id).not.toBe(widgetId)
    
    store.removeWidget('tab_1', widgetId)
    expect(store.layouts['tab_1'].length).toBe(1)
  })

  it('manages global filters', () => {
    const store = useDashboardStore()
    
    store.addFilter('dataset1', 'col1', 'val1', 'Label 1')
    expect(store.globalFilters.length).toBe(1)
    expect(store.globalFilters[0].column).toBe('col1')
    // Adding same column overwrites
    store.addFilter('dataset1', 'col1', 'val2', 'Label 2')
    expect(store.globalFilters.length).toBe(1)
    expect(store.globalFilters[0].value).toBe('val2')
    
    const filterId = store.globalFilters[0].id
    store.removeFilter(filterId)
    expect(store.globalFilters.length).toBe(0)
  })

  it('updates layout array completely', () => {
    const store = useDashboardStore()
    const newLayout = [{ id: 'w1', type: 'chart' }, { id: 'w2', type: 'kpi' }]
    store.updateLayout('tab_1', newLayout)
    expect(store.layouts['tab_1']).toEqual(newLayout)
  })

  it('manages global parameters', () => {
    const store = useDashboardStore()
    store.setParameter('param1', 'value1')
    expect(store.globalParameters['param1']).toBe('value1')
  })
})
