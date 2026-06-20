import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useProjectStore } from '../../src/stores/projectStore'
import { useUiStore } from '../../src/stores/uiStore'

// Mock dependencies
vi.mock('localforage', () => ({
  default: {
    setItem: vi.fn(),
    getItem: () => Promise.resolve({ data: '{}', projectName: 'Autosaved Project' }),
    removeItem: vi.fn()
  }
}))

vi.mock('@/modules/project/Serializer', () => ({
  serializeProject: () => Promise.resolve('{}'),
  deserializeProject: () => Promise.resolve(true)
}))

vi.mock('@/modules/data/SqlWorkerClient', () => {
  return {
    sqlClient: {
      query: vi.fn(),
      createTable: vi.fn(),
      dropTable: vi.fn()
    }
  }
})

vi.mock('../../src/stores/dataStore', () => ({
  useDataStore: () => ({
    datasets: [],
    tables: [],
    addDataset: vi.fn(),
    buildRelationship: vi.fn()
  })
}))

vi.mock('../../src/stores/formulaStore', () => ({ useFormulaStore: () => ({}) }))
vi.mock('../../src/stores/dashboardStore', () => ({ useDashboardStore: () => ({}) }))
vi.mock('../../src/stores/reportStore', () => ({ useReportStore: () => ({}) }))

global.Worker = class {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = () => {};
  }
  postMessage(msg) {
    this.onmessage(msg);
  }
}

describe('projectStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('initializes with default values', () => {
    const store = useProjectStore()
    expect(store.projectName).toBe('Proyecto sin título')
    expect(store.isDirty).toBe(false)
    expect(store.isSaving).toBe(false)
  })

  it('sets project name and marks as dirty', () => {
    const store = useProjectStore()
    store.setProjectName('New Analytics')
    
    expect(store.projectName).toBe('New Analytics')
    expect(store.isDirty).toBe(true)
  })

  it('marks project as dirty', () => {
    const store = useProjectStore()
    store.markDirty()
    
    expect(store.isDirty).toBe(true)
  })

  it('handles autoLoad successfully', async () => {
    const store = useProjectStore()
    const result = await store.autoLoad()
    
    expect(result).toBe(true)
    expect(store.projectName).toBe('Autosaved Project')
    expect(store.isDirty).toBe(false)
  })

  it('clears autosave', async () => {
    const localforage = await import('localforage')
    const store = useProjectStore()
    
    await store.clearAutoSave()
    expect(localforage.default.removeItem).toHaveBeenCalledWith('litebi_autosave')
  })

  it('simulates fallback download on save without handle', async () => {
    const store = useProjectStore()
    const uiStore = useUiStore()
    const toastSpy = vi.spyOn(uiStore, 'addToast')

    // Mock URL and document methods for fallback
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:url')
    global.URL.revokeObjectURL = vi.fn()
    const mockAnchor = { click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor)

    await store.saveProject()

    expect(mockAnchor.download).toBe('Proyecto sin título.litebi')
    expect(mockAnchor.click).toHaveBeenCalled()
    expect(store.isDirty).toBe(false)
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
  })
})
