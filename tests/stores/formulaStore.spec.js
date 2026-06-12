import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFormulaStore } from '../../src/stores/formulaStore'
import { useDataStore } from '../../src/stores/dataStore'
import { useUiStore } from '../../src/stores/uiStore'
import { sqlClient } from '../../src/modules/data/SqlWorkerClient'

// Mock de Worker Client
vi.mock('../../src/modules/data/SqlWorkerClient', () => ({
  sqlClient: {
    query: vi.fn(),
    createTable: vi.fn()
  }
}))

describe('Formula Store', () => {
  let formulaStore
  let dataStore
  let uiStore

  beforeEach(() => {
    setActivePinia(createPinia())
    formulaStore = useFormulaStore()
    dataStore = useDataStore()
    uiStore = useUiStore()
    
    // Setup initial data metadata
    dataStore.datasets = new Map()
    dataStore.datasets.set('ventas', {
      schema: [{ name: 'precio', type: 'number' }, { name: 'cantidad', type: 'number' }],
      colCount: 2
    })
    
    vi.clearAllMocks()
  })

  it('initializes with empty formulas', () => {
    expect(formulaStore.formulas).toEqual({})
    expect(formulaStore.getFormulasForDataset('ventas')).toEqual([])
  })

  describe('Validation', () => {
    it('throws error if datasetName is missing', async () => {
      await expect(formulaStore.addFormula(null, 'total', 'precio * cantidad')).rejects.toThrow('El nombre del dataset es obligatorio')
    })

    it('throws error if columnName is invalid', async () => {
      await expect(formulaStore.addFormula('ventas', 'invalid@name!', 'precio * cantidad')).rejects.toThrow('caracteres no permitidos')
    })

    it('throws error if expression contains dangerous SQL keywords', async () => {
      await expect(formulaStore.addFormula('ventas', 'drop_table', 'DROP TABLE ventas')).rejects.toThrow('palabras clave SQL no permitidas')
      await expect(formulaStore.addFormula('ventas', 'delete_data', 'DELETE FROM ventas')).rejects.toThrow('palabras clave SQL no permitidas')
    })

    it('throws error if expression is too long', async () => {
      const longExpr = 'a'.repeat(5001)
      await expect(formulaStore.addFormula('ventas', 'long', longExpr)).rejects.toThrow('excede el límite')
    })
  })

  describe('Adding formulas', () => {
    it('adds a valid formula and updates schema', async () => {
      sqlClient.query.mockResolvedValue([{ precio: 10, cantidad: 2, total: 20 }])
      sqlClient.createTable.mockResolvedValue(true)

      const result = await formulaStore.addFormula('ventas', 'total', 'precio * cantidad', 'number')

      expect(result).toBe(true)
      expect(sqlClient.query).toHaveBeenCalledWith('SELECT *, (precio * cantidad) AS "total" FROM "ventas"')
      expect(sqlClient.createTable).toHaveBeenCalled()
      
      const formulas = formulaStore.getFormulasForDataset('ventas')
      expect(formulas).toHaveLength(1)
      expect(formulas[0]).toEqual({ name: 'total', expression: 'precio * cantidad', type: 'number' })
      
      const meta = dataStore.datasets.get('ventas')
      expect(meta.colCount).toBe(3)
      expect(meta.schema.find(c => c.name === 'total')).toBeDefined()
    })

    it('updates an existing formula', async () => {
      // First add
      sqlClient.query.mockResolvedValue([])
      sqlClient.createTable.mockResolvedValue(true)
      await formulaStore.addFormula('ventas', 'total', 'precio * cantidad', 'number')
      
      // Then update
      await formulaStore.addFormula('ventas', 'total', 'precio * cantidad * 1.21', 'number')
      
      const formulas = formulaStore.getFormulasForDataset('ventas')
      expect(formulas).toHaveLength(1)
      expect(formulas[0].expression).toBe('precio * cantidad * 1.21')
      
      const meta = dataStore.datasets.get('ventas')
      expect(meta.colCount).toBe(3) // doesn't increment
    })

    it('handles query errors correctly', async () => {
      sqlClient.query.mockRejectedValue(new Error('Syntax error'))
      
      await expect(formulaStore.addFormula('ventas', 'error_col', 'precio *')).rejects.toThrow('Syntax error')
      
      expect(uiStore.toasts).toHaveLength(1)
      expect(uiStore.toasts[0].type).toBe('error')
    })
  })

  describe('Removing formulas', () => {
    it('removes an existing formula and updates schema', async () => {
      sqlClient.query.mockResolvedValue([])
      sqlClient.createTable.mockResolvedValue(true)
      
      await formulaStore.addFormula('ventas', 'total', 'precio * cantidad', 'number')
      expect(dataStore.datasets.get('ventas').colCount).toBe(3)
      
      sqlClient.query.mockClear()
      
      await formulaStore.removeFormula('ventas', 'total')
      
      const formulas = formulaStore.getFormulasForDataset('ventas')
      expect(formulas).toHaveLength(0)
      
      const meta = dataStore.datasets.get('ventas')
      expect(meta.colCount).toBe(2)
      expect(meta.schema.find(c => c.name === 'total')).toBeUndefined()
      
      // Should query the new schema without the removed column
      expect(sqlClient.query).toHaveBeenCalledWith('SELECT "precio", "cantidad" FROM "ventas"')
    })
  })
})
