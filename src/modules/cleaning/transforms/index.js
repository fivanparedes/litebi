/**
 * Registry of available transformation operations
 * Each transform defines how to build an AlaSQL query to apply the change
 */

export const Transforms = {
  FILTER: {
    id: 'filter',
    name: 'Filtrar filas',
    icon: 'Filter',
    description: 'Filtra las filas según una condición',
    // Generates the SQL WHERE clause part
    generateSql: (config) => {
      const { column, operator, value } = config
      let sqlValue = typeof value === 'number' ? value : `'${value}'`
      
      switch (operator) {
        case 'equals': return `${column} = ${sqlValue}`
        case 'not_equals': return `${column} != ${sqlValue}`
        case 'greater_than': return `${column} > ${sqlValue}`
        case 'less_than': return `${column} < ${sqlValue}`
        case 'contains': return `${column} LIKE '%${value}%'`
        case 'not_contains': return `${column} NOT LIKE '%${value}%'`
        case 'is_null': return `${column} IS NULL`
        case 'is_not_null': return `${column} IS NOT NULL`
        default: return '1=1' // fallback safe
      }
    }
  },
  
  SORT: {
    id: 'sort',
    name: 'Ordenar',
    icon: 'ArrowUpDown',
    description: 'Ordena el dataset por una o más columnas',
    // Handled in the ORDER BY clause
    generateSql: (config) => {
      const { column, direction } = config // direction: 'ASC' | 'DESC'
      return `${column} ${direction}`
    }
  },

  RENAME_COLUMN: {
    id: 'rename_column',
    name: 'Renombrar columna',
    icon: 'Type',
    description: 'Cambia el nombre de una columna',
    // Modifies the SELECT clause
    applyToSelect: (selectClause, config) => {
      const { oldName, newName } = config
      // Replace "oldName" with "oldName AS newName"
      const parts = selectClause.split(',').map(p => p.trim())
      
      if (parts.length === 1 && parts[0] === '*') {
        // Special case: if it's SELECT *, we can't just rename one easily in simple SQL
        // The pipeline manager will convert * to explicit column list before calling this
        return selectClause
      }
      
      const newParts = parts.map(part => {
        // Handle if it's just "colName" or already has an alias "colName AS otherName"
        const colName = part.split(' AS ')[0].trim()
        if (colName === oldName) {
          return `${oldName} AS ${newName}`
        }
        return part
      })
      
      return newParts.join(', ')
    }
  },
  
  REMOVE_COLUMN: {
    id: 'remove_column',
    name: 'Eliminar columna',
    icon: 'Trash2',
    description: 'Elimina una columna del dataset',
    applyToSelect: (selectClause, config) => {
      const { column } = config
      const parts = selectClause.split(',').map(p => p.trim())
      const newParts = parts.filter(part => {
        const colName = part.split(' AS ')[0].trim()
        return colName !== column
      })
      return newParts.join(', ')
    }
  },
  
  // Future transforms placeholder
  CHANGE_TYPE: { id: 'change_type', name: 'Cambiar tipo', icon: 'Hash' },
  FIND_REPLACE: { id: 'find_replace', name: 'Buscar/Reemplazar', icon: 'Search' },
  REMOVE_DUPLICATES: { id: 'remove_duplicates', name: 'Eliminar duplicados', icon: 'CopyMinus' },
  FILL_NULLS: { id: 'fill_nulls', name: 'Rellenar nulos', icon: 'Droplets' }
}

export const getTransformConfig = (id) => {
  return Transforms[Object.keys(Transforms).find(k => Transforms[k].id === id)]
}
