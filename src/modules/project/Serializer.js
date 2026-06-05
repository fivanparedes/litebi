import { sqlClient } from '@/modules/data/SqlWorkerClient'

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
    version: '1.0',
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

export const deserializeProject = async (jsonString, dataStore, formulaStore, dashboardStore) => {
  try {
    const project = JSON.parse(jsonString)
    if (!project.version) throw new Error("Invalid project file")

    // 1. Restore Data
    // Clear current datasets and tables
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

    // 2. Restore Formulas
    formulaStore.formulas = project.formulas.items || {}

    // 3. Restore Dashboard
    dashboardStore.tabs = project.dashboard.tabs || [{ id: 'tab_1', name: 'Dashboard Principal' }]
    dashboardStore.layouts = project.dashboard.layouts || { 'tab_1': [] }
    dashboardStore.activeTabId = project.dashboard.activeTabId || 'tab_1'
    dashboardStore.globalFilters = project.dashboard.globalFilters || []

    return true
  } catch (error) {
    console.error("Failed to parse project file:", error)
    throw new Error("No se pudo leer el archivo del proyecto. ¿Está corrupto?")
  }
}
