import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { coerceData, inferSchema } from '@/modules/data/SchemaManager'
import { useUiStore } from './uiStore'
import { Logger } from '@/utils/Logger'
import { generateId } from '@/utils/generateId'

export const useDataStore = defineStore('data', () => {
  const uiStore = useUiStore()
  
  // State
  const datasets = ref(new Map())
  const activeDatasetName = ref(null)
  const relationships = ref([])
  const dataVersion = ref(0)
  
  // Actions
  const addDataset = async (name, data, schema) => {
    try {
      if (!data || typeof data !== 'object') {
        throw new Error("El resultado no es un conjunto de datos válido.")
      }
      
      let targetData = data
      if (!Array.isArray(data)) {
        const arrayProp = Object.values(data).find(val => Array.isArray(val))
        if (arrayProp) {
          targetData = arrayProp
        } else {
          targetData = [data]
        }
      }

      // 1. Coerce data based on inferred schema
      const finalSchema = schema || inferSchema(targetData)
      const cleanedData = coerceData(targetData, finalSchema)
      
      // 2. Format name (safe for SQL)
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
      
      // 3 & 4. Create table and insert data in Worker
      await sqlClient.createTable(safeName, cleanedData)
      
      // 5. Save metadata
      const datasetMeta = {
        name: safeName,
        originalName: name,
        schema: finalSchema,
        rowCount: cleanedData.length,
        colCount: finalSchema.length,
        importedAt: new Date(),
        transformations: []
      }
      
      datasets.value.set(safeName, datasetMeta)
      
      // 6. Set as active if it's the first one
      if (!activeDatasetName.value || datasets.value.size === 1) {
        activeDatasetName.value = safeName
      }
      
      dataVersion.value++
      
      uiStore.addToast({
        message: `Dataset "${name}" importado con éxito (${cleanedData.length} filas)`,
        type: 'success'
      })
      
      return safeName
    } catch (error) {
      Logger.error('DataStore', `Error adding dataset: ${name}`, error)
      console.error('Error adding dataset:', error)
      uiStore.addToast({
        message: `Error al importar datos: ${error.message}`,
        type: 'error'
      })
      throw error
    }
  }
  
  const removeDataset = async (name) => {
    try {
      if (datasets.value.has(name)) {
        await sqlClient.dropTable(name)
        datasets.value.delete(name)
        
        if (activeDatasetName.value === name) {
          const nextActive = datasets.value.keys().next().value
          activeDatasetName.value = nextActive || null
        }
        
        dataVersion.value++
        
        uiStore.addToast({
          message: `Dataset "${name}" eliminado`,
          type: 'info'
        })
      }
    } catch (error) {
      Logger.error('DataStore', `Error removing dataset: ${name}`, error)
      uiStore.addToast({
        message: `Error al eliminar dataset: ${error.message}`,
        type: 'error'
      })
    }
  }
  
  const setActiveDataset = (name) => {
    if (datasets.value.has(name)) {
      activeDatasetName.value = name
    }
  }
  
  const getPreviewData = async (name, limit = 100) => {
    try {
      return await sqlClient.query(`SELECT TOP ${limit} * FROM [${name}]`)
    } catch (e) {
      console.error(e)
      return []
    }
  }

  // --- Relationships API ---
  const addRelationship = (fromTable, fromCol, toTable, toCol, type = '1:N') => {
    try {
      // Validar que ambas tablas existan antes de crear la relación
      if (!datasets.value.has(fromTable)) {
        throw new Error(`La tabla origen "${fromTable}" no existe en los datasets.`)
      }
      if (!datasets.value.has(toTable)) {
        throw new Error(`La tabla destino "${toTable}" no existe en los datasets.`)
      }

      relationships.value.push({
        id: generateId('rel'),
        fromTable,
        fromColumn: fromCol,
        toTable,
        toColumn: toCol,
        type
      })
      uiStore.addToast({ message: 'Relación añadida exitosamente', type: 'success' })
    } catch (error) {
      Logger.error('DataStore', `Error adding relationship: ${fromTable} -> ${toTable}`, error)
      uiStore.addToast({
        message: `Error al añadir relación: ${error.message}`,
        type: 'error'
      })
    }
  }

  const removeRelationship = (id) => {
    try {
      relationships.value = relationships.value.filter(r => r.id !== id)
      uiStore.addToast({ message: 'Relación eliminada', type: 'info' })
    } catch (error) {
      Logger.error('DataStore', `Error removing relationship: ${id}`, error)
      uiStore.addToast({
        message: `Error al eliminar relación: ${error.message}`,
        type: 'error'
      })
    }
  }

  const buildJoinQuery = (baseTable, requiredTables) => {
    try {
      // Validar que la tabla base exista
      if (!datasets.value.has(baseTable)) {
        throw new Error(`La tabla base "${baseTable}" no existe en los datasets.`)
      }

      let joinClause = `[${baseTable}]`
      const tablesToJoin = requiredTables.filter(t => t !== baseTable)
      
      for (const targetTable of tablesToJoin) {
        // Validar que la tabla destino exista
        if (!datasets.value.has(targetTable)) {
          Logger.warn('DataStore', `Tabla "${targetTable}" no existe, se omite del JOIN.`)
          continue
        }

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
          Logger.warn('DataStore', `No se encontró relación entre ${baseTable} y ${targetTable}`)
        }
      }
      
      return joinClause
    } catch (error) {
      Logger.error('DataStore', `Error building JOIN query for: ${baseTable}`, error)
      uiStore.addToast({
        message: `Error al construir consulta JOIN: ${error.message}`,
        type: 'error'
      })
      // Fallback: retornar solo la tabla base para no romper la consulta
      return `[${baseTable}]`
    }
  }
  
  // --- Calendar Generator ---
  const generateCalendarTable = async (startYear, endYear) => {
    try {
      const data = []
      const startDate = new Date(startYear, 0, 1)
      const endDate = new Date(endYear, 11, 31)
      
      const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0]
        const year = d.getFullYear()
        const month = d.getMonth() + 1
        const day = d.getDate()
        const dayOfWeek = d.getDay()
        const quarter = Math.floor(d.getMonth() / 3) + 1
        
        data.push({
          Fecha: dateStr,
          Año: year,
          Mes: month,
          NombreMes: monthNames[d.getMonth()],
          Trimestre: quarter,
          Dia: day,
          DiaSemana: dayOfWeek,
          NombreDia: dayNames[dayOfWeek],
          EsFinDeSemana: dayOfWeek === 0 || dayOfWeek === 6
        })
      }

      const schema = [
        { name: 'Fecha', type: 'date' },
        { name: 'Año', type: 'number' },
        { name: 'Mes', type: 'number' },
        { name: 'NombreMes', type: 'string' },
        { name: 'Trimestre', type: 'number' },
        { name: 'Dia', type: 'number' },
        { name: 'DiaSemana', type: 'number' },
        { name: 'NombreDia', type: 'string' },
        { name: 'EsFinDeSemana', type: 'boolean' }
      ]

      return await addDataset('Calendario', data, schema)
    } catch (error) {
      Logger.error('DataStore', 'Error generating calendar table', error)
      uiStore.addToast({
        message: `Error al generar tabla calendario: ${error.message}`,
        type: 'error'
      })
    }
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
    generateCalendarTable,
    dataVersion,
    
    // Getters exported via destructuring implicitly
    datasetList
  }
})
