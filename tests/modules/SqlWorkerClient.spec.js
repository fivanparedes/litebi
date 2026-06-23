import { describe, it, expect, beforeEach, vi } from 'vitest'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import * as duckdb from '@duckdb/duckdb-wasm'

vi.mock('@duckdb/duckdb-wasm', async () => {
  global.Worker = class Worker {
    constructor() {}
    postMessage() {}
    terminate() {}
  }
  if (typeof window !== 'undefined') window.Worker = global.Worker
  
  const actual = await vi.importActual('@duckdb/duckdb-wasm')
  
  const queryMock = vi.fn().mockResolvedValue({
    schema: { fields: [] },
    toArray: () => [
      { toJSON: () => ({ name: 'id', type: 'INTEGER', column_name: 'id', column_type: 'number' }) },
      { toJSON: () => ({ name: 'name', type: 'VARCHAR', column_name: 'name', column_type: 'string' }) }
    ]
  })
  
  const connectMock = vi.fn().mockResolvedValue({
    query: queryMock,
    insertArrowTable: vi.fn(),
    insertArrowFromIPCStream: vi.fn(),
    dropTable: vi.fn(),
    getTableSchema: vi.fn().mockResolvedValue([{ name: 'id', type: 'number' }]),
    createTableFromFile: vi.fn()
  })
  
  const instantiateMock = vi.fn().mockResolvedValue()
  
  return {
    ...actual,
    selectBundle: vi.fn().mockResolvedValue({
      mainWorker: 'worker.js',
      mainModule: 'module.wasm',
      pthreadWorker: 'pthread.js'
    }),
    ConsoleLogger: vi.fn(),
    AsyncDuckDB: vi.fn().mockImplementation(() => ({
      instantiate: instantiateMock,
      connect: connectMock
    })),
    Table: {
      from: vi.fn().mockReturnValue({})
    }
  }
})

describe('SqlWorkerClient', () => {
  beforeEach(() => {
    sqlClient.clearCache()
    vi.clearAllMocks()
  })

  it('initializes DuckDB properly', async () => {
    await sqlClient.initPromise
    expect(sqlClient.db).toBeDefined()
    expect(sqlClient.conn).toBeDefined()
  })

  it('executes a query and caches the result', async () => {
    const data = await sqlClient.query('SELECT * FROM test')
    expect(data.length).toBeGreaterThan(0)
    
    // Check if cache has it
    expect(sqlClient.cache.size).toBe(1)
    
    // Query again should use cache
    const cachedData = await sqlClient.query('SELECT * FROM test')
    expect(cachedData).toEqual(data)
  })

  it('can drop a table', async () => {
    await sqlClient.dropTable('my_table')
  })

  it('gets table schema', async () => {
    const schema = await sqlClient.getTableSchema('my_table')
    expect(schema).toBeDefined()
    expect(schema.length).toBe(2)
    expect(schema[0].name).toBe('id')
    expect(schema[0].type).toBe('number')
  })
})
