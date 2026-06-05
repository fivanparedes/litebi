import { sqlClient } from '@/modules/data/SqlWorkerClient'

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
// Validación del proyecto
// ---------------------------------------------------------------------------

/**
 * Valida la estructura completa del proyecto ANTES de tocar el estado.
 * Lanza errores descriptivos si algo falta o es inválido.
 * @param {Object} project - Objeto de proyecto deserializado
 */
const validateProject = (project) => {
  if (!project || typeof project !== 'object') {
    throw new Error('El contenido del proyecto no es un objeto JSON válido.')
  }

  if (!project.version) {
    throw new Error('El archivo no contiene la propiedad "version". No es un proyecto LiteBI válido.')
  }

  // --- Sección data ---
  if (!project.data || typeof project.data !== 'object') {
    throw new Error('La sección "data" del proyecto está ausente o no es válida.')
  }

  if (!Array.isArray(project.data.datasets)) {
    throw new Error('La propiedad "data.datasets" debe ser un arreglo. El archivo puede estar incompleto.')
  }

  for (let i = 0; i < project.data.datasets.length; i++) {
    const ds = project.data.datasets[i]
    if (!ds || typeof ds.name !== 'string' || ds.name.trim() === '') {
      throw new Error(`El dataset en la posición ${i} no tiene un nombre válido.`)
    }
    if (!ds.meta || typeof ds.meta !== 'object') {
      throw new Error(`El dataset "${ds.name}" no tiene metadatos válidos.`)
    }
    if (!Array.isArray(ds.data)) {
      throw new Error(`El dataset "${ds.name}" no contiene datos en formato de arreglo.`)
    }
  }

  // --- Sección formulas ---
  if (!project.formulas || typeof project.formulas !== 'object') {
    throw new Error('La sección "formulas" del proyecto está ausente o no es válida.')
  }

  // --- Sección dashboard ---
  if (!project.dashboard || typeof project.dashboard !== 'object') {
    throw new Error('La sección "dashboard" del proyecto está ausente o no es válida.')
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
 * @returns {Promise<string>} JSON string del proyecto
 */
export const serializeProject = async (dataStore, formulaStore, dashboardStore) => {
  // Convert DataStore datasets map to array
  const datasets = []
  
  // Get actual table data from AlaSQL Worker
  const allTables = await sqlClient.exportDb()

  dataStore.datasets.forEach((meta, name) => {
    const tableData = allTables[name] || []
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
    }
  }

  return JSON.stringify(projectState)
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
 * @returns {Promise<boolean>} true si la restauración fue exitosa
 */
export const deserializeProject = async (jsonString, dataStore, formulaStore, dashboardStore) => {
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
    project = JSON.parse(jsonString)
  } catch (parseError) {
    throw new Error(
      `No se pudo interpretar el archivo como JSON. ` +
      `Detalle: ${parseError.message}`
    )
  }

  // --- Paso 2: Validar estructura completa ANTES de modificar estado ---
  validateProject(project)

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
    globalFilters: dashboardStore.globalFilters ? [...dashboardStore.globalFilters] : []
  }

  try {
    // --- Paso 5: Restaurar datos ---
    // Limpiar datasets actuales (seguro porque ya validamos todo arriba)
    dataStore.datasets.clear()

    const tablesToImport = {}
    project.data.datasets.forEach(ds => {
      tablesToImport[ds.name] = ds.data
      dataStore.datasets.set(ds.name, ds.meta)
    })

    // Import into worker
    await sqlClient.importDb(tablesToImport)

    dataStore.activeDatasetName = project.data.activeDatasetName || null
    dataStore.relationships = project.data.relationships || []

    // --- Paso 6: Restaurar fórmulas ---
    formulaStore.formulas = project.formulas.items || {}

    // --- Paso 7: Restaurar dashboard ---
    dashboardStore.tabs = project.dashboard.tabs || [{ id: 'tab_1', name: 'Dashboard Principal' }]
    dashboardStore.layouts = project.dashboard.layouts || { 'tab_1': [] }
    dashboardStore.activeTabId = project.dashboard.activeTabId || 'tab_1'
    dashboardStore.globalFilters = project.dashboard.globalFilters || []

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
    } catch (rollbackError) {
      console.error('Error crítico: no se pudo revertir al estado anterior:', rollbackError)
    }

    throw new Error(
      `Error al restaurar el proyecto: ${restoreError.message}. ` +
      `Se revirtió al estado anterior.`
    )
  }
}
