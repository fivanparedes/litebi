/**
 * Registry of available transformation operations
 * Each transform defines how to build a DuckDB query to apply the change
 */

/**
 * Escapes a value for safe interpolation into SQL strings.
 * Prevents SQL injection by quoting strings and escaping single quotes.
 * @param {*} val - The value to escape
 * @returns {string|number} SQL-safe representation of the value
 */
const escapeSQL = (val) => {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'number') return val
  return `'${String(val).replace(/'/g, "''")}'`
}

export const Transforms = {
  FILTER: {
    id: 'filter',
    name: 'Filtrar filas',
    icon: 'Filter',
    description: 'Filtra las filas según una condición',
    // Generates the SQL WHERE clause part
    generateSql: (config) => {
      const { column, operator, value } = config
      // Fix: use escapeSQL for safe value interpolation and bracket-wrap column names
      const sqlValue = escapeSQL(value)
      const col = `"${column}"`

      switch (operator) {
        case 'equals': return `${col} = ${sqlValue}`
        case 'not_equals': return `${col} != ${sqlValue}`
        case 'greater_than': return `${col} > ${sqlValue}`
        case 'less_than': return `${col} < ${sqlValue}`
        // Fix: escape value inside LIKE patterns to prevent injection
        case 'contains': {
          const escaped = String(value).replace(/'/g, "''")
          return `${col} LIKE '%${escaped}%'`
        }
        case 'not_contains': {
          const escaped = String(value).replace(/'/g, "''")
          return `${col} NOT LIKE '%${escaped}%'`
        }
        case 'is_null': return `${col} IS NULL`
        case 'is_not_null': return `${col} IS NOT NULL`
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
      // Fix: validate direction to prevent arbitrary SQL injection, default to ASC
      const safeDirection = direction === 'DESC' ? 'DESC' : 'ASC'
      return `"${column}" ${safeDirection}`
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
        if (colName === oldName || colName === `[${oldName}]`) {
          return `"${oldName}" AS "${newName}"`
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
        // Fix: also match bracket-wrapped column names
        return colName !== column && colName !== `"${column}"`
      })
      return newParts.join(', ')
    }
  },
  
  // Minimal implementations for future transforms — generateSql returns no-op so the
  // pipeline can safely include them without crashing.
  CHANGE_TYPE: {
    id: 'change_type',
    name: 'Cambiar tipo',
    icon: 'Hash',
    description: 'Cambia el tipo de dato de una columna',
    generateSql: (config) => {
      const { column, targetType } = config
      // DuckDB CAST syntax applied in SELECT; returns a column expression
      return `CAST("${column}" AS ${targetType === 'number' ? 'NUMBER' : targetType === 'boolean' ? 'BOOLEAN' : 'STRING'})`
    }
  },
  FIND_REPLACE: {
    id: 'find_replace',
    name: 'Buscar/Reemplazar',
    icon: 'Search',
    description: 'Busca y reemplaza valores en una columna',
    generateSql: (config) => {
      const { column, find, replace } = config
      const safFind = String(find).replace(/'/g, "''")
      const safReplace = String(replace).replace(/'/g, "''")
      return `REPLACE("${column}", '${safFind}', '${safReplace}')`
    }
  },
  REMOVE_DUPLICATES: {
    id: 'remove_duplicates',
    name: 'Eliminar duplicados',
    icon: 'CopyMinus',
    description: 'Elimina filas duplicadas del dataset',
    // Handled by adding DISTINCT to the SELECT clause
    modifiesSelect: true,
    applyToSelect: (selectClause) => {
      if (selectClause.startsWith('DISTINCT ')) return selectClause
      return `DISTINCT ${selectClause}`
    }
  },
  FILL_NULLS: {
    id: 'fill_nulls',
    name: 'Rellenar nulos',
    icon: 'Droplets',
    description: 'Reemplaza valores nulos en una columna con un valor fijo',
    generateSql: (config) => {
      const { column, fillValue } = config
      const safeFill = escapeSQL(fillValue)
      return `COALESCE("${column}", ${safeFill})`
    }
  }
}

export const getTransformConfig = (id) => {
  return Transforms[Object.keys(Transforms).find(k => Transforms[k].id === id)]
}
