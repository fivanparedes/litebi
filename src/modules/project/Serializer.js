import alasql from 'alasql'

export const serializeProject = (dataStore, formulaStore, dashboardStore) => {
  // Convert DataStore datasets map to array
  const datasets = []
  dataStore.datasets.forEach((meta, name) => {
    // Get actual table data from AlaSQL
    const tableData = alasql.tables[name]?.data || []
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

export const deserializeProject = (jsonString, dataStore, formulaStore, dashboardStore) => {
  try {
    const project = JSON.parse(jsonString)
    if (!project.version) throw new Error("Invalid project file")

    // 1. Restore Data
    // Clear current datasets and tables
    dataStore.datasets.clear()
    Object.keys(alasql.tables).forEach(t => alasql(`DROP TABLE IF EXISTS [${t}]`))
    
    project.data.datasets.forEach(ds => {
      alasql(`CREATE TABLE [${ds.name}]`)
      alasql.tables[ds.name].data = ds.data
      dataStore.datasets.set(ds.name, ds.meta)
    })
    
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
