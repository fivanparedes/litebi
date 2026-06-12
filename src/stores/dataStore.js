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
  
  // Scheduled Refresh Tasks
  const refreshTimers = new Map()

  const scheduleRefresh = (datasetName) => {
    const ds = datasets.value.get(datasetName)
    if (!ds || !ds.refreshInterval || !ds.connectorConfig) return
    
    if (refreshTimers.has(datasetName)) {
      clearInterval(refreshTimers.get(datasetName))
    }
    
    const intervalMs = ds.refreshInterval * 60 * 1000
    const timerId = setInterval(async () => {
      try {
        const { LiveConnector } = await import('@/modules/data/LiveConnector')
        const resultData = await LiveConnector.query(ds.connectorConfig.type, ds.connectorConfig.credentials)
        if (resultData && resultData.length > 0) {
          // Replace data (using internal SQL Client since table exists)
          let targetData = resultData
          if (!Array.isArray(resultData)) {
            const arrayProp = Object.values(resultData).find(val => Array.isArray(val))
            targetData = arrayProp || [resultData]
          }
          const finalSchema = ds.schema || inferSchema(targetData)
          const cleanedData = coerceData(targetData, finalSchema)
          
          await sqlClient.dropTable(datasetName)
          await sqlClient.createTable(datasetName, cleanedData)
          
          ds.rowCount = cleanedData.length
          ds.importedAt = new Date()
          dataVersion.value++
          
          console.log(`[ScheduledRefresh] Dataset ${datasetName} refreshed automatically.`)
          uiStore.addToast({ message: `Dataset ${ds.originalName} actualizado automáticamente.`, type: 'info' })
        }
      } catch (e) {
        console.error(`[ScheduledRefresh] Failed to refresh ${datasetName}:`, e)
      }
    }, intervalMs)
    
    refreshTimers.set(datasetName, timerId)
  }
  
  // Actions
  const addDataset = async (name, data, schema, connectorConfig = null, refreshInterval = 0) => {
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
        transformations: [],
        ui: { x: 50, y: 50 }, // Posición inicial para Modelado
        connectorConfig,
        refreshInterval,
        tags: []
      }
      
      datasets.value.set(safeName, datasetMeta)
      
      if (refreshInterval > 0) {
        scheduleRefresh(safeName)
      }
      
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
  
  const addDatasetFromFile = async (name, file, connectorConfig = null, refreshInterval = 0) => {
    try {
      const safeName = name.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
      
      await sqlClient.createTableFromFile(safeName, file)
      
      const sample = await sqlClient.query(`SELECT * FROM "${safeName}" LIMIT 100`)
      const finalSchema = inferSchema(sample)
      
      const countRes = await sqlClient.query(`SELECT COUNT(*) as "count" FROM "${safeName}"`)
      const rowCount = countRes[0]?.count || 0
      
      const datasetMeta = {
        name: safeName,
        originalName: name,
        schema: finalSchema,
        rowCount,
        colCount: finalSchema.length,
        importedAt: new Date(),
        transformations: [],
        ui: { x: 50, y: 50 },
        connectorConfig,
        refreshInterval,
        tags: []
      }
      
      datasets.value.set(safeName, datasetMeta)
      
      if (refreshInterval > 0) scheduleRefresh(safeName)
      if (!activeDatasetName.value || datasets.value.size === 1) activeDatasetName.value = safeName
      dataVersion.value++
      
      uiStore.addToast({
        message: `Dataset "${name}" importado nativamente (${rowCount} filas)`,
        type: 'success'
      })
      
      return safeName
    } catch (error) {
      Logger.error('DataStore', `Error adding native dataset: ${name}`, error)
      console.error('Error adding native dataset:', error)
      uiStore.addToast({
        message: `Error al importar nativamente: ${error.message}`,
        type: 'error'
      })
      throw error
    }
  }
  
  const appendData = async (datasetName, newData) => {
    try {
      const ds = datasets.value.get(datasetName)
      if (!ds) throw new Error(`Dataset no encontrado: ${datasetName}`)
      
      let targetData = Array.isArray(newData) ? newData : [newData]
      
      // Coerce con el esquema existente
      const cleanedData = coerceData(targetData, ds.schema)
      
      // Insertar en worker
      await sqlClient.insertIntoTable(datasetName, cleanedData)
      
      // Actualizar metadatos
      ds.rowCount += cleanedData.length
      dataVersion.value++
      
      console.log(`[Streaming] ${cleanedData.length} filas añadidas a ${datasetName}.`)
      return true
    } catch (error) {
      console.error(`[Streaming] Error en appendData para ${datasetName}:`, error)
      return false
    }
  }

  const removeDataset = async (name) => {
    try {
      if (datasets.value.has(name)) {
        if (refreshTimers.has(name)) {
          clearInterval(refreshTimers.get(name))
          refreshTimers.delete(name)
        }
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
      return await sqlClient.query(`SELECT * FROM "${name}" LIMIT ${limit}`)
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const updateDatasetPosition = (name, x, y) => {
    const ds = datasets.value.get(name)
    if (ds) {
      if (!ds.ui) ds.ui = {}
      ds.ui.x = x
      ds.ui.y = y
      dataVersion.value++
    }
  }

  const updateDatasetTags = (name, tags) => {
    const ds = datasets.value.get(name)
    if (ds) {
      ds.tags = tags
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
      if (!datasets.value.has(baseTable)) {
        throw new Error(`La tabla base "${baseTable}" no existe en los datasets.`)
      }

      const getActualTableName = (t) => {
        const ds = datasets.value.get(t)
        return (ds && ds.transformations && ds.transformations.length > 0) ? `${t}_working` : t
      }

      const actualBase = getActualTableName(baseTable)
      let joinClause = `"${actualBase}" AS "${baseTable}"`
      
      const tablesToJoin = requiredTables.filter(t => t !== baseTable)
      
      for (const targetTable of tablesToJoin) {
        if (!datasets.value.has(targetTable)) {
          Logger.warn('DataStore', `Tabla "${targetTable}" no existe, se omite del JOIN.`)
          continue
        }

        const actualTarget = getActualTableName(targetTable)
        const rel = relationships.value.find(r => 
          (r.fromTable === baseTable && r.toTable === targetTable) ||
          (r.toTable === baseTable && r.fromTable === targetTable)
        )
        
        if (rel) {
          if (rel.fromTable === baseTable) {
            joinClause += ` LEFT JOIN "${actualTarget}" AS "${targetTable}" ON "${baseTable}"."${rel.fromColumn}" = "${targetTable}"."${rel.toColumn}"`
          } else {
            joinClause += ` LEFT JOIN "${actualTarget}" AS "${targetTable}" ON "${baseTable}"."${rel.toColumn}" = "${targetTable}"."${rel.fromColumn}"`
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
      return `"${baseTable}"`
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

  const saveManualDataset = async (name, data, schema) => {
    try {
      return await addDataset(name, data, schema)
    } catch (error) {
      Logger.error('DataStore', 'Error saving manual dataset', error)
      throw error
    }
  }

  const getAllData = async (name) => {
    try {
      return await sqlClient.query(`SELECT * FROM "${name}"`)
    } catch (e) {
      console.error(e)
      return []
    }
  }

  const applyTransformations = async (name, data, schema, pipelineSteps) => {
    try {
      // Remove Vue Proxies to avoid DataCloneError in Worker postMessage
      const cleanData = JSON.parse(JSON.stringify(data))
      const cleanSchema = JSON.parse(JSON.stringify(schema))
      const cleanSteps = JSON.parse(JSON.stringify(pipelineSteps))

      await sqlClient.dropTable(name)
      await sqlClient.createTable(name, cleanData)
      
      const ds = datasets.value.get(name)
      if (ds) {
        ds.schema = cleanSchema
        ds.rowCount = cleanData.length
        ds.colCount = cleanSchema.length
        ds.transformations = cleanSteps
        dataVersion.value++
      }
      uiStore.addToast({ message: `Transformaciones aplicadas a ${ds?.originalName || name}`, type: 'success' })
    } catch (e) {
      Logger.error('DataStore', 'Error applying transformations', e)
      uiStore.addToast({ message: `Error al aplicar transformaciones: ${e.message}`, type: 'error' })
      throw e
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
    addDatasetFromFile,
    appendData,
    removeDataset,
    setActiveDataset,
    getPreviewData,
    updateDatasetPosition,
    updateDatasetTags,
    addRelationship,
    removeRelationship,
    buildJoinQuery,
    generateCalendarTable,
    saveManualDataset,
    applyTransformations,
    getAllData,
    dataVersion,
    
    // Getters exported via destructuring implicitly
    datasetList
  }
})
