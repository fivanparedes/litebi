import { sqlClient } from '@/modules/data/SqlWorkerClient'
import LZString from 'lz-string'

/** Tamaño máximo de JSON permitido: 500 MB */
const MAX_JSON_SIZE = 500 * 1024 * 1024

/** Versión actual del formato de proyecto */
const CURRENT_VERSION = '1.0'

// ---------------------------------------------------------------------------
// Migración de versiones
// ---------------------------------------------------------------------------

/**
 * Registro de migraciones por versión.
 * Cada clave es la versión de ORIGEN y el valor es una función que
 * transforma el proyecto a la siguiente versión.
 * Ejemplo futuro:
 *   '1.0': (project) => { ... mutate project ...; project.version = '1.1'; return project; }
 */
const migrations = {
  // Reservado para migraciones futuras
  // '1.0': (project) => { project.version = '1.1'; return project }
}

/**
 * Aplica migraciones incrementales hasta alcanzar CURRENT_VERSION.
 * Muta el objeto `project` in-place y lo devuelve.
 * @param {Object} project - Objeto de proyecto deserializado
 * @returns {Object} El mismo objeto con la versión actualizada
 */
const migrateProject = (project) => {
  let version = project.version
  let safety = 0
  const MAX_ITERATIONS = 100 // protección contra bucles infinitos

  while (version !== CURRENT_VERSION && safety < MAX_ITERATIONS) {
    const migrationFn = migrations[version]
    if (!migrationFn) {
      throw new Error(
        `No se encontró una migración para la versión "${version}". ` +
        `El archivo puede ser de una versión futura no soportada.`
      )
    }
    project = migrationFn(project)
    version = project.version
    safety++
  }

  if (safety >= MAX_ITERATIONS) {
    throw new Error('Se alcanzó el límite de migraciones; posible bucle en la cadena de versiones.')
  }

  return project
}

// ---------------------------------------------------------------------------
import { z } from 'zod'

const datasetSchema = z.object({
  name: z.string().min(1, 'El nombre del dataset no puede estar vacío'),
  meta: z.object({}).passthrough(),
  data: z.array(z.any())
})

const projectSchema = z.object({
  version: z.string({ required_error: 'La versión es requerida' }),
  timestamp: z.string().optional(),
  data: z.object({
    activeDatasetName: z.string().nullable().optional(),
    relationships: z.array(z.any()).optional(),
    datasets: z.array(datasetSchema)
  }, { required_error: 'La sección data es requerida' }),
  formulas: z.object({
    items: z.record(z.any()).optional()
  }).optional(),
  dashboard: z.object({
    tabs: z.array(z.any()).optional(),
    layouts: z.record(z.any()).optional(),
    activeTabId: z.string().optional(),
    globalFilters: z.array(z.any()).optional()
  }).optional(),
  report: z.object({
    pages: z.array(z.any()).optional(),
    activePageId: z.string().optional()
  }).optional()
})

/**
 * Valida la estructura completa del proyecto ANTES de tocar el estado.
 * Lanza errores descriptivos si algo falta o es inválido.
 * @param {Object} project - Objeto de proyecto deserializado
 */
const validateProject = (project) => {
  const result = projectSchema.safeParse(project)
  if (!result.success) {
    const errorDetails = result.error.errors.map(e => `${e.path.join('.') || 'Raíz'}: ${e.message}`).join(', ')
    throw new Error('Estructura de proyecto inválida o corrupta: ' + errorDetails)
  }
}

// ---------------------------------------------------------------------------
// Serialización
// ---------------------------------------------------------------------------

/**
 * Serializa el estado completo del proyecto a JSON.
 * @param {Object} dataStore
 * @param {Object} formulaStore
 * @param {Object} dashboardStore
 * @param {Object} reportStore
 * @param {Object} options - { includeData: boolean }
 * @returns {Promise<string>} JSON string del proyecto
 */
export const serializeProject = async (dataStore, formulaStore, dashboardStore, reportStore, options = { includeData: true }) => {
  // Convert DataStore datasets map to array
  const datasets = []
  
  // Get actual table data from DuckDB Worker solo si se requiere (ahorro de RAM en History)
  let allTables = {}
  if (options.includeData) {
    allTables = await sqlClient.exportDb()
  }

  dataStore.datasets.forEach((meta, name) => {
    const tableData = options.includeData ? (allTables[name] || []) : []
    datasets.push({
      name,
      meta,
      data: tableData
    })
  })

  const projectState = {
    version: CURRENT_VERSION,
    timestamp: new Date().toISOString(),
    data: {
      activeDatasetName: dataStore.activeDatasetName,
      relationships: dataStore.relationships,
      datasets
    },
    formulas: {
      items: formulaStore.formulas
    },
    dashboard: {
      tabs: dashboardStore.tabs,
      activeTabId: dashboardStore.activeTabId,
      layouts: dashboardStore.layouts,
      globalFilters: dashboardStore.globalFilters
    },
    report: {
      pages: reportStore.pages,
      activePageId: reportStore.activePageId
    }
  }

  const jsonString = JSON.stringify(projectState, (key, value) => {
    if (typeof value === 'bigint') {
      return Number(value) // Convert BigInt to Number for JSON compatibility
    }
    return value
  })
  
  return LZString.compressToUTF16(jsonString)
}

// ---------------------------------------------------------------------------
// Deserialización
// ---------------------------------------------------------------------------

/**
 * Deserializa un JSON de proyecto y restaura el estado en los stores.
 * Valida la estructura completa ANTES de modificar cualquier estado,
 * y crea un respaldo para rollback en caso de falla.
 * @param {string} jsonString - JSON string del proyecto
 * @param {Object} dataStore
 * @param {Object} formulaStore
 * @param {Object} dashboardStore
 * @param {Object} reportStore
 * @returns {Promise<boolean>} true si la restauración fue exitosa
 */
export const deserializeProject = async (jsonString, dataStore, formulaStore, dashboardStore, reportStore, options = { includeData: true }) => {
  // --- Paso 0: Validar tamaño del JSON ---
  if (typeof jsonString !== 'string') {
    throw new Error('El contenido proporcionado no es una cadena de texto válida.')
  }
  if (jsonString.length > MAX_JSON_SIZE) {
    throw new Error(
      `El archivo excede el tamaño máximo permitido (${Math.round(MAX_JSON_SIZE / 1024 / 1024)} MB). ` +
      `Tamaño recibido: ${Math.round(jsonString.length / 1024 / 1024)} MB.`
    )
  }

  // --- Paso 1: Parsear JSON ---
    let project
    try {
      let targetString = jsonString
      if (!jsonString.trim().startsWith('{')) {
        const decompressed = LZString.decompressFromUTF16(jsonString)
        if (decompressed) {
          targetString = decompressed
        }
      }
      project = JSON.parse(targetString)
    } catch (parseError) {
    throw new Error(
      `No se pudo interpretar el archivo como JSON. ` +
      `Detalle: ${parseError.message}`
    )
  }

  // --- Paso 2: Validar estructura completa ANTES de modificar estado ---
  // If we are restoring from history, data arrays might be empty, so skip data array validation
  if (options.includeData) {
    validateProject(project)
  }

  // --- Paso 3: Migrar versión si es necesario ---
  if (project.version !== CURRENT_VERSION) {
    try {
      project = migrateProject(project)
    } catch (migrationError) {
      throw new Error(
        `Error al migrar el proyecto desde la versión "${project.version}": ${migrationError.message}`
      )
    }
  }

  // --- Paso 4: Crear respaldo del estado actual para rollback ---
  const backup = {
    datasets: new Map(dataStore.datasets),
    activeDatasetName: dataStore.activeDatasetName,
    relationships: dataStore.relationships ? [...dataStore.relationships] : [],
    formulas: { ...formulaStore.formulas },
    tabs: dashboardStore.tabs ? [...dashboardStore.tabs] : [],
    layouts: { ...dashboardStore.layouts },
    activeTabId: dashboardStore.activeTabId,
    globalFilters: dashboardStore.globalFilters ? [...dashboardStore.globalFilters] : [],
    reportPages: reportStore.pages ? [...reportStore.pages] : [],
    reportActivePageId: reportStore.activePageId
  }

  try {
    // --- Paso 5: Restaurar datos ---
    if (options.includeData) {
      // Limpiar datasets actuales
      dataStore.datasets.clear()

      const tablesToImport = {}
      project.data.datasets.forEach(ds => {
        tablesToImport[ds.name] = ds.data
        dataStore.datasets.set(ds.name, ds.meta)
      })

      // Import into worker
      await sqlClient.importDb(tablesToImport)
    } else {
      // Only restore metadata for existing datasets
      project.data.datasets.forEach(ds => {
        if (dataStore.datasets.has(ds.name)) {
          dataStore.datasets.set(ds.name, ds.meta)
        }
      })
    }

    dataStore.activeDatasetName = project.data.activeDatasetName || null
    dataStore.relationships = project.data.relationships || []

    // --- Paso 6: Restaurar fórmulas ---
    formulaStore.formulas = project.formulas.items || {}

    // --- Paso 7: Restaurar dashboard ---
    dashboardStore.tabs = project.dashboard.tabs || [{ id: 'tab_1', name: 'Dashboard Principal' }]
    dashboardStore.layouts = project.dashboard.layouts || { 'tab_1': [] }
    dashboardStore.activeTabId = project.dashboard.activeTabId || 'tab_1'
    dashboardStore.globalFilters = project.dashboard.globalFilters || []

    // --- Paso 8: Restaurar reporte ---
    if (project.report) {
      reportStore.pages = project.report.pages || [{ id: 'page_1', layout: [], orientation: 'portrait' }]
      reportStore.activePageId = project.report.activePageId || 'page_1'
    } else {
      reportStore.pages = [{ id: 'page_1', layout: [], orientation: 'portrait' }]
      reportStore.activePageId = 'page_1'
    }

    // --- Paso 9: Reconstruir tablas de transformación ---
    for (const [name, meta] of dataStore.datasets.entries()) {
      if (meta.transformations && meta.transformations.length > 0) {
        try {
          await sqlClient.executePipeline(name, `${name}_working`, meta.schema, meta.transformations)
        } catch (e) {
          console.error(`Error rebuilding pipeline for ${name}`, e)
        }
      }
    }

    return true
  } catch (restoreError) {
    // Rollback: restaurar estado previo desde el respaldo
    console.error('Error durante la restauración del proyecto, revirtiendo cambios:', restoreError)

    try {
      dataStore.datasets.clear()
      backup.datasets.forEach((meta, name) => dataStore.datasets.set(name, meta))
      dataStore.activeDatasetName = backup.activeDatasetName
      dataStore.relationships = backup.relationships
      formulaStore.formulas = backup.formulas
      dashboardStore.tabs = backup.tabs
      dashboardStore.layouts = backup.layouts
      dashboardStore.activeTabId = backup.activeTabId
      dashboardStore.globalFilters = backup.globalFilters
      
      reportStore.pages = backup.reportPages
      reportStore.activePageId = backup.reportActivePageId
    } catch (fallbackError) {
      console.error('Error crítico: no se pudo revertir al estado anterior:', fallbackError)
    }

    throw new Error(
      `Error al restaurar el proyecto: ${restoreError.message}. ` +
      `Se revirtió al estado anterior.`
    )
  }
}
