import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useDataStore } from '../../src/stores/dataStore'
import { sqlClient } from '../../src/modules/data/SqlWorkerClient'
import { useUiStore } from '../../src/stores/uiStore'

vi.mock('../../src/modules/data/SqlWorkerClient', () => ({
  sqlClient: {
    createTable: vi.fn(),
    dropTable: vi.fn().mockResolvedValue(),
    getTableSchema: vi.fn().mockResolvedValue([{ name: 'id', type: 'number' }]),
    query: vi.fn().mockImplementation(() => Promise.resolve([{ count: 10 }])),
    createTableFromFile: vi.fn().mockResolvedValue(),
    createTableFromRegisteredFile: vi.fn(),
    cleanupFile: vi.fn(),
    autoStandardizeDates: vi.fn(),
  }
}))

vi.mock('../../src/utils/Logger', () => ({
  Logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn()
  }
}))


describe('dataStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    sqlClient.query.mockResolvedValue([{ count: 10 }])
    sqlClient.getTableSchema.mockResolvedValue([{ name: 'id', type: 'number' }])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds a dataset successfully', async () => {
    const store = useDataStore()
    const uiStore = useUiStore()
    const toastSpy = vi.spyOn(uiStore, 'addToast')

    const data = [{ id: 1, name: 'Test' }]
    const schema = [{ name: 'id', type: 'number' }, { name: 'name', type: 'string' }]
    
    vi.mocked(sqlClient.getTableSchema).mockResolvedValueOnce(schema)
    vi.mocked(sqlClient.query).mockResolvedValueOnce([{ count: 1 }])

    const safeName = await store.addDataset('Test Dataset', data, schema)
    
    expect(safeName).toBe('test_dataset')
    expect(sqlClient.createTable).toHaveBeenCalledWith('test_dataset', data, schema)
    expect(store.datasets.has('test_dataset')).toBe(true)
    expect(store.activeDatasetName).toBe('test_dataset')
    expect(toastSpy).toHaveBeenCalledWith(expect.objectContaining({ type: 'success' }))
  })

  it('fails to add invalid dataset', async () => {
    const store = useDataStore()
    
    await expect(store.addDataset('Bad', "not an object")).rejects.toThrow('El resultado no es un conjunto de datos válido.')
  })

  it('removes a dataset successfully', async () => {
    const store = useDataStore()
    
    await store.addDataset('test_dataset', [{ id: 1 }], [{ name: 'id', type: 'number' }])
    expect(store.datasets.has('test_dataset')).toBe(true)

    await store.removeDataset('test_dataset')

    expect(sqlClient.dropTable).toHaveBeenCalledWith('test_dataset')
    expect(store.datasets.has('test_dataset')).toBe(false)
    expect(store.activeDatasetName).toBe(null)
  })

  it('adds and removes relationships', () => {
    const store = useDataStore()
    
    store.datasets.set('table_a', {})
    store.datasets.set('table_b', {})

    store.addRelationship('table_a', 'id', 'table_b', 'a_id', '1:N')
    
    expect(store.relationships.length).toBe(1)
    expect(store.relationships[0].fromTable).toBe('table_a')

    const relId = store.relationships[0].id
    store.removeRelationship(relId)
    
    expect(store.relationships.length).toBe(0)
  })

  it('prevents adding relationship for non-existent tables', () => {
    const store = useDataStore()
    store.addRelationship('ghost_a', 'id', 'ghost_b', 'id')
    expect(store.relationships.length).toBe(0)
  })

  it('builds a JOIN query successfully', () => {
    const store = useDataStore()
    store.datasets.set('A', { name: 'A' })
    store.datasets.set('B', { name: 'B' })

    store.addRelationship('A', 'id', 'B', 'a_id')

    const query = store.buildJoinQuery('A', ['A', 'B'])
    
    expect(query).toContain('"A" AS "A"')
    expect(query).toContain('"A"."id" = "B"."a_id" OR')
    expect(query).toContain('CAST("A"."id" AS VARCHAR) = CAST("B"."a_id" AS VARCHAR)')
  })
  
  it('applies transformations', async () => {
    const store = useDataStore()
    store.datasets.set('test', { originalName: 'Test', schema: [] })
    
    const data = [{ id: 1 }]
    const schema = [{ name: 'id', type: 'number' }]
    const steps = [{ type: 'filter' }]

    await store.applyTransformations('test', data, schema, steps)

    expect(sqlClient.dropTable).toHaveBeenCalledWith('test')
    expect(sqlClient.createTable).toHaveBeenCalledWith('test', data, schema)
    
    const ds = store.datasets.get('test')
    expect(ds.transformations).toEqual(steps)
  })
})
