import { describe, it, expect, vi, beforeEach } from 'vitest'
import { testSqlExpression } from '../../src/modules/formulas/SqlEngine'
import { sqlClient } from '../../src/modules/data/SqlWorkerClient'

// Mock the sqlClient
vi.mock('../../src/modules/data/SqlWorkerClient', () => ({
  sqlClient: {
    query: vi.fn()
  }
}))

describe('SqlEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error if expression exceeds MAX_EXPRESSION_LENGTH', async () => {
    const longExpression = 'A'.repeat(5001)
    const result = await testSqlExpression('dataset1', longExpression)
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('La expresión excede el límite de 5000 caracteres.')
  })

  it('should successfully execute valid SQL expression', async () => {
    const mockData = [{ Prueba: 10 }]
    vi.mocked(sqlClient.query).mockResolvedValue(mockData)

    const result = await testSqlExpression('dataset1', '10 + 0', 'columna', 'Prueba')
    
    expect(sqlClient.query).toHaveBeenCalledWith('SELECT 10 + 0 AS "Prueba" FROM "dataset1"')
    expect(result.success).toBe(true)
    expect(result.sampleResult).toEqual(mockData)
    expect(result.columnName).toBe('Prueba')
  })

  it('should format SQL correctly for metric mode', async () => {
    const mockData = [{ MyMetric: 100 }]
    vi.mocked(sqlClient.query).mockResolvedValue(mockData)

    const result = await testSqlExpression('dataset1', 'SUM(col)', 'metrica', 'MyMetric')
    
    expect(sqlClient.query).toHaveBeenCalledWith('SELECT SUM(col) AS "MyMetric" FROM "dataset1"')
    expect(result.success).toBe(true)
    expect(result.sampleResult).toEqual(mockData)
  })

  it('should return an error when query returns no results', async () => {
    vi.mocked(sqlClient.query).mockResolvedValue([])

    const result = await testSqlExpression('dataset1', '1 + 1')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('No se pudo obtener el resultado')
  })

  it('should translate common DuckDB syntax errors', async () => {
    vi.mocked(sqlClient.query).mockRejectedValue(new Error('Unexpected token foo'))

    const result = await testSqlExpression('dataset1', 'foo')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Error de sintaxis: carácter inesperado o falta de paréntesis.')
  })

  it('should translate DuckDB column not found errors', async () => {
    vi.mocked(sqlClient.query).mockRejectedValue(new Error('Column XYZ not found'))

    const result = await testSqlExpression('dataset1', 'XYZ')
    
    expect(result.success).toBe(false)
    expect(result.error).toContain('La columna especificada no existe')
  })

  it('should return original error message if translation not found', async () => {
    vi.mocked(sqlClient.query).mockRejectedValue(new Error('Some obscure database error'))

    const result = await testSqlExpression('dataset1', '1/0')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Some obscure database error')
  })

  it('should handle undefined error messages gracefully', async () => {
    vi.mocked(sqlClient.query).mockRejectedValue({})

    const result = await testSqlExpression('dataset1', 'foo')
    
    expect(result.success).toBe(false)
    expect(result.error).toBe('Error desconocido al evaluar la expresión.')
  })
})
