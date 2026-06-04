import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import alasql from 'alasql'
import { useDataStore } from './dataStore'
import { useUiStore } from './uiStore'

// Custom functions for AlaSQL (BI context)
alasql.fn.DATE = function(...args) {
  if (args.length === 3) {
    const y = parseInt(args[0]), m = parseInt(args[1]), d = parseInt(args[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(Date.UTC(y, m-1, d)).toISOString().split('T')[0];
  }
  if (args.length === 1 && args[0]) {
    try { return new Date(args[0]).toISOString().split('T')[0] } catch(e) { return null }
  }
  return null;
}

export const useFormulaStore = defineStore('formula', () => {
  const dataStore = useDataStore()
  const uiStore = useUiStore()
  
  // Format: { [datasetName]: [ { name: 'Total', expression: 'Precio * Cantidad', type: 'number' } ] }
  const formulas = ref({})
  
  const getFormulasForDataset = (datasetName) => {
    return formulas.value[datasetName] || []
  }
  
  const addFormula = (datasetName, columnName, expression, type = 'number') => {
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
      const res = alasql(`SELECT *, (${expression}) AS [${columnName}] FROM [${datasetName}]`)
      alasql.tables[datasetName].data = res
      
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
  
  const removeFormula = (datasetName, columnName) => {
    if (!formulas.value[datasetName]) return
    
    formulas.value[datasetName] = formulas.value[datasetName].filter(f => f.name !== columnName)
    
    // Update dataStore schema metadata
    const meta = dataStore.datasets.get(datasetName)
    if (meta) {
      meta.schema = meta.schema.filter(c => c.name !== columnName)
      meta.colCount--
      
      // En AlaSQL para eliminar un key de los objetos JSON:
      // Alasql doesn't have ALTER TABLE DROP COLUMN for memory JSON objects easily, 
      // but we can map over data
      alasql.tables[datasetName].data.forEach(row => {
        delete row[columnName]
      })
      
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
