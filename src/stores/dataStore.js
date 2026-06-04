import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import alasql from 'alasql'
import { coerceData } from '@/modules/data/SchemaManager'
import { useUiStore } from './uiStore'

export const useDataStore = defineStore('data', () => {
  const uiStore = useUiStore()
  
  // State
  const datasets = ref(new Map())
  const activeDatasetName = ref(null)
  const relationships = ref([])
  
  // AlaSQL config
  alasql.options.cache = false
  alasql.options.casesensitive = false

  // Actions
  const addDataset = (name, data, schema) => {
    try {
      // 1. Coerce data based on inferred schema
      const cleanedData = coerceData(data, schema)
      
      // 2. Format name (safe for SQL)
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
      
      // 3. Create table in AlaSQL
      // AlaSQL handles JS array of objects easily without strict CREATE TABLE schemas for MVP
      alasql(`DROP TABLE IF EXISTS ${safeName}`)
      alasql(`CREATE TABLE ${safeName}`)
      
      // 4. Insert data
      // AlaSQL can directly query JS arrays, but inserting creates a managed table
      alasql.tables[safeName].data = cleanedData
      
      // 5. Save metadata
      const datasetMeta = {
        name: safeName,
        originalName: name,
        schema,
        rowCount: cleanedData.length,
        colCount: schema.length,
        importedAt: new Date(),
        transformations: []
      }
      
      datasets.value.set(safeName, datasetMeta)
      
      // 6. Set as active if it's the first one
      if (!activeDatasetName.value || datasets.value.size === 1) {
        activeDatasetName.value = safeName
      }
      
      uiStore.addToast({
        message: `Dataset "${name}" importado con éxito (${cleanedData.length} filas)`,
        type: 'success'
      })
      
      return safeName
    } catch (error) {
      console.error('Error adding dataset:', error)
      uiStore.addToast({
        message: `Error al importar datos: ${error.message}`,
        type: 'error'
      })
      throw error
    }
  }
  
  const removeDataset = (name) => {
    if (datasets.value.has(name)) {
      alasql(`DROP TABLE IF EXISTS ${name}`)
      datasets.value.delete(name)
      
      if (activeDatasetName.value === name) {
        const nextActive = datasets.value.keys().next().value
        activeDatasetName.value = nextActive || null
      }
      
      uiStore.addToast({
        message: `Dataset "${name}" eliminado`,
        type: 'info'
      })
    }
  }
  
  const setActiveDataset = (name) => {
    if (datasets.value.has(name)) {
      activeDatasetName.value = name
    }
  }
  
  const getPreviewData = (name, limit = 100) => {
    try {
      return alasql(`SELECT TOP ${limit} * FROM [${name}]`)
    } catch (e) {
      return []
    }
  }

  // --- Relationships API ---
  const addRelationship = (fromTable, fromCol, toTable, toCol, type = '1:N') => {
    relationships.value.push({
      id: `rel_${Date.now()}`,
      fromTable,
      fromColumn: fromCol,
      toTable,
      toColumn: toCol,
      type
    })
    uiStore.addToast({ message: 'Relación añadida exitosamente', type: 'success' })
  }

  const removeRelationship = (id) => {
    relationships.value = relationships.value.filter(r => r.id !== id)
    uiStore.addToast({ message: 'Relación eliminada', type: 'info' })
  }

  const buildJoinQuery = (baseTable, requiredTables) => {
    let joinClause = `[${baseTable}]`
    const tablesToJoin = requiredTables.filter(t => t !== baseTable)
    
    for (const targetTable of tablesToJoin) {
      const rel = relationships.value.find(r => 
        (r.fromTable === baseTable && r.toTable === targetTable) ||
        (r.toTable === baseTable && r.fromTable === targetTable)
      )
      
      if (rel) {
        if (rel.fromTable === baseTable) {
          joinClause += ` LEFT JOIN [${targetTable}] ON [${baseTable}].[${rel.fromColumn}] = [${targetTable}].[${rel.toColumn}]`
        } else {
          joinClause += ` LEFT JOIN [${targetTable}] ON [${baseTable}].[${rel.toColumn}] = [${targetTable}].[${rel.fromColumn}]`
        }
      } else {
        console.warn(`No relationship found between ${baseTable} and ${targetTable}`)
      }
    }
    
    return joinClause
  }
  
  // Getters
  const datasetNames = computed(() => Array.from(datasets.value.keys()))
  
  const datasetList = computed(() => {
    return Array.from(datasets.value.values()).sort((a, b) => b.importedAt - a.importedAt)
  })
  
  const activeDatasetMeta = computed(() => {
    if (!activeDatasetName.value) return null
    return datasets.value.get(activeDatasetName.value) || null
  })

  return {
    datasets,
    activeDatasetName,
    relationships,
    datasetNames,
    activeDatasetMeta,
    addDataset,
    removeDataset,
    setActiveDataset,
    getPreviewData,
    addRelationship,
    removeRelationship,
    buildJoinQuery,
    datasetList
  }
})
