import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { useDataStore } from './dataStore'
import { useUiStore } from './uiStore'
import { Logger } from '@/utils/Logger'

/** Regex para nombres seguros de datasets/columnas */
const SAFE_NAME_REGEX = /^[a-zA-Z0-9_\s\u00C0-\u024F]+$/

/** Palabras clave SQL peligrosas que no deben aparecer como statements en expresiones */
const DANGEROUS_SQL_KEYWORDS = /\b(DROP|DELETE|INSERT|UPDATE|ALTER|CREATE|TRUNCATE|EXEC|EXECUTE)\b/i

/** Longitud máxima de una expresión de fórmula */
const MAX_EXPRESSION_LENGTH = 5000

export const useFormulaStore = defineStore('formula', () => {
  const dataStore = useDataStore()
  const uiStore = useUiStore()
  
  // Format: { [datasetName]: [ { name: 'Total', expression: 'Precio * Cantidad', type: 'number' } ] }
  const formulas = ref({})
  
  // Format: { [datasetName]: [ { id: 'm1', name: 'Margen', expression: 'SUM(Ventas)', type: 'number' } ] }
  const corporateMetrics = ref({})
  
  /**
   * Obtiene las fórmulas definidas para un dataset
   * @param {string} datasetName - Nombre del dataset
   * @returns {Array} - Lista de fórmulas
   */
  const getFormulasForDataset = (datasetName) => {
    return formulas.value[datasetName] || []
  }
  
  /**
   * Valida los inputs de una fórmula antes de ejecutarla
   * @param {string} datasetName
   * @param {string} columnName
   * @param {string} expression
   * @throws {Error} Si algún input es inválido
   */
  const validateFormulaInputs = (datasetName, columnName, expression) => {
    if (!datasetName || typeof datasetName !== 'string') {
      throw new Error('El nombre del dataset es obligatorio.')
    }
    if (!columnName || typeof columnName !== 'string') {
      throw new Error('El nombre de la columna es obligatorio.')
    }
    if (!expression || typeof expression !== 'string' || expression.trim() === '') {
      throw new Error('La expresión de la fórmula es obligatoria.')
    }
    if (!SAFE_NAME_REGEX.test(columnName)) {
      throw new Error(`El nombre de columna "${columnName}" contiene caracteres no permitidos. Use solo letras, números, espacios y guiones bajos.`)
    }
    if (expression.length > MAX_EXPRESSION_LENGTH) {
      throw new Error(`La expresión excede el límite de ${MAX_EXPRESSION_LENGTH} caracteres.`)
    }
    // Blocklist de keywords peligrosos (solo como statements independientes)
    if (DANGEROUS_SQL_KEYWORDS.test(expression)) {
      throw new Error('La expresión contiene palabras clave SQL no permitidas (DROP, DELETE, INSERT, etc.). Solo se permiten expresiones de cálculo.')
    }
  }
  
  /**
   * Agrega o actualiza una columna calculada en un dataset
   * @param {string} datasetName - Nombre del dataset
   * @param {string} columnName - Nombre de la nueva columna
   * @param {string} expression - Expresión SQL para calcular
   * @param {string} type - Tipo de dato ('number', 'string', etc.)
   * @returns {Promise<boolean>}
   */
  const addFormula = async (datasetName, columnName, expression, type = 'number') => {
    // Validar inputs antes de ejecutar
    validateFormulaInputs(datasetName, columnName, expression)
    
    if (!formulas.value[datasetName]) {
      formulas.value[datasetName] = []
    }
    
    // Validar si ya existe
    const existingIdx = formulas.value[datasetName].findIndex(f => f.name === columnName)
    
    // Construir consulta para validar si la expresión es válida y añadirla a la tabla base
    try {
      // 1. Agregar columna
      // Nota: Usamos SELECT y reemplazamos los datos en lugar de UPDATE debido a un 
      // bug en el compilador de AlaSQL con sentencias CASE WHEN (Identifier 'r' has already been declared)
      const compiledExpr = expression.replace(/\[([^\]]+)\]\.\[([^\]]+)\]/g, '"$1"."$2"').replace(/\[([^\]]+)\]/g, '"$1"');
      const res = await sqlClient.query(`SELECT *, (${compiledExpr}) AS "${columnName}" FROM "${datasetName}"`)
      await sqlClient.createTable(datasetName, res)
      
      // Update dataStore schema metadata
      const meta = dataStore.datasets.get(datasetName)
      if (meta) {
        if (existingIdx === -1) {
          meta.schema.push({ name: columnName, type, isCalculated: true, expression })
          meta.colCount++
        } else {
          // It existed, update expression
          const schemaCol = meta.schema.find(c => c.name === columnName)
          if (schemaCol) {
            schemaCol.expression = expression
            schemaCol.type = type
          }
        }
      }
      
      if (existingIdx === -1) {
        formulas.value[datasetName].push({ name: columnName, expression, type })
      } else {
        formulas.value[datasetName][existingIdx] = { name: columnName, expression, type }
      }
      
      uiStore.addToast({
        message: `Columna '${columnName}' calculada con éxito`,
        type: 'success'
      })
      
      return true
    } catch (e) {
      Logger.error('FormulaStore', `Error al agregar fórmula "${columnName}" en "${datasetName}"`, e)
      uiStore.addToast({
        message: `Error en la fórmula: ${e.message}`,
        type: 'error'
      })
      throw e
    }
  }
  
  /**
   * Elimina una columna calculada de un dataset
   * @param {string} datasetName - Nombre del dataset
   * @param {string} columnName - Nombre de la columna a eliminar
   */
  const removeFormula = async (datasetName, columnName) => {
    if (!formulas.value[datasetName]) return
    
    formulas.value[datasetName] = formulas.value[datasetName].filter(f => f.name !== columnName)
    
    // Update dataStore schema metadata
    const meta = dataStore.datasets.get(datasetName)
    if (meta) {
      try {
        meta.schema = meta.schema.filter(c => c.name !== columnName)
        meta.colCount--
        
        // Update data in worker
        const currentCols = meta.schema.map(c => `"${c.name}"`).join(', ')
        const res = await sqlClient.query(`SELECT ${currentCols} FROM "${datasetName}"`)
        await sqlClient.createTable(datasetName, res)
        
        uiStore.addToast({
          message: `Columna '${columnName}' eliminada`,
          type: 'info'
        })
      } catch (e) {
        Logger.error('FormulaStore', `Error al eliminar fórmula "${columnName}" de "${datasetName}"`, e)
        uiStore.addToast({
          message: `Error al eliminar columna: ${e.message}`,
          type: 'error'
        })
      }
    }
  }
  const getCorporateMetricsForDataset = (datasetName) => {
    return corporateMetrics.value[datasetName] || []
  }

  const addCorporateMetric = (datasetName, metricName, expression, type = 'number') => {
    validateFormulaInputs(datasetName, metricName, expression)
    
    if (!corporateMetrics.value[datasetName]) {
      corporateMetrics.value[datasetName] = []
    }
    
    const existingIdx = corporateMetrics.value[datasetName].findIndex(m => m.name === metricName)
    const metric = { 
      id: existingIdx !== -1 ? corporateMetrics.value[datasetName][existingIdx].id : `metric_${Date.now()}`,
      name: metricName, 
      expression, 
      type 
    }
    
    if (existingIdx === -1) {
      corporateMetrics.value[datasetName].push(metric)
    } else {
      corporateMetrics.value[datasetName][existingIdx] = metric
    }
    
    uiStore.addToast({
      message: `Métrica corporativa '${metricName}' guardada con éxito`,
      type: 'success'
    })
  }

  const removeCorporateMetric = (datasetName, metricId) => {
    if (!corporateMetrics.value[datasetName]) return
    corporateMetrics.value[datasetName] = corporateMetrics.value[datasetName].filter(m => m.id !== metricId)
    uiStore.addToast({
      message: 'Métrica eliminada',
      type: 'info'
    })
  }
  
  return {
    formulas,
    corporateMetrics,
    getFormulasForDataset,
    getCorporateMetricsForDataset,
    addFormula,
    addCorporateMetric,
    removeFormula,
    removeCorporateMetric
  }
})
