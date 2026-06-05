import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { useDataStore } from './dataStore'
import { useUiStore } from './uiStore'

export const useFormulaStore = defineStore('formula', () => {
  const dataStore = useDataStore()
  const uiStore = useUiStore()
  
  // Format: { [datasetName]: [ { name: 'Total', expression: 'Precio * Cantidad', type: 'number' } ] }
  const formulas = ref({})
  
  const getFormulasForDataset = (datasetName) => {
    return formulas.value[datasetName] || []
  }
  
  const addFormula = async (datasetName, columnName, expression, type = 'number') => {
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
      const res = await sqlClient.query(`SELECT *, (${expression}) AS [${columnName}] FROM [${datasetName}]`)
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
      uiStore.addToast({
        message: `Error en la fórmula: ${e.message}`,
        type: 'error'
      })
      throw e
    }
  }
  
  const removeFormula = async (datasetName, columnName) => {
    if (!formulas.value[datasetName]) return
    
    formulas.value[datasetName] = formulas.value[datasetName].filter(f => f.name !== columnName)
    
    // Update dataStore schema metadata
    const meta = dataStore.datasets.get(datasetName)
    if (meta) {
      meta.schema = meta.schema.filter(c => c.name !== columnName)
      meta.colCount--
      
      // Update data in worker
      const currentCols = meta.schema.map(c => `[${c.name}]`).join(', ')
      const res = await sqlClient.query(`SELECT ${currentCols} FROM [${datasetName}]`)
      await sqlClient.createTable(datasetName, res)
      
      uiStore.addToast({
        message: `Columna '${columnName}' eliminada`,
        type: 'info'
      })
    }
  }
  
  return {
    formulas,
    getFormulasForDataset,
    addFormula,
    removeFormula
  }
})
