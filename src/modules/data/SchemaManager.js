/**
 * Infers the data types of columns in a dataset by sampling rows
 * @param {Array<Object>} data - Array of row objects
 * @param {Number} sampleSize - Number of rows to check (default 100)
 * @returns {Array<Object>} - Schema definition array
 */
export const inferSchema = (data, sampleSize = 100) => {
  if (!data || data.length === 0) return []

  const columns = Object.keys(data[0])
  const schema = columns.map(col => ({
    name: col,
    type: 'string', // default
    isNullable: false
  }))

  const rowsToCheck = Math.min(data.length, sampleSize)
  
  // Track potential types for each column
  const typeCounters = columns.reduce((acc, col) => {
    acc[col] = { number: 0, boolean: 0, date: 0, string: 0, null: 0 }
    return acc
  }, {})

  // Date regex pattern (basic YYYY-MM-DD or DD/MM/YYYY)
  const dateRegex = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})(T\d{2}:\d{2}:\d{2}(\.\d+)?Z?)?$/

  for (let i = 0; i < rowsToCheck; i++) {
    const row = data[i]
    
    for (const col of columns) {
      const val = row[col]
      
      if (val === null || val === undefined || val === '') {
        typeCounters[col].null++
        continue
      }
      
      if (typeof val === 'number') {
        typeCounters[col].number++
      } else if (typeof val === 'boolean') {
        typeCounters[col].boolean++
      } else if (typeof val === 'string') {
        // Check if string is actually a number
        if (!isNaN(Number(val)) && val.trim() !== '') {
          typeCounters[col].number++
        }
        // Check if string is a date
        else if (dateRegex.test(val) || !isNaN(Date.parse(val))) {
          typeCounters[col].date++
        } else {
          typeCounters[col].string++
        }
      }
    }
  }

  // Determine final type based on counters
  return schema.map(colDef => {
    const counts = typeCounters[colDef.name]
    const totalNonNull = rowsToCheck - counts.null
    
    colDef.isNullable = counts.null > 0

    if (totalNonNull === 0) {
      colDef.type = 'string'
    } else if (counts.string > 0) {
      colDef.type = 'string'
    } else if (counts.date === totalNonNull) {
      colDef.type = 'date'
    } else if (counts.boolean === totalNonNull) {
      colDef.type = 'boolean'
    } else if (counts.number === totalNonNull) {
      colDef.type = 'number'
    }
    
    return colDef
  })
}

/**
 * Coerces dataset values to match the schema types
 */
export const coerceData = (data, schema) => {
  return data.map(row => {
    const newRow = { ...row }
    schema.forEach(col => {
      const val = newRow[col.name]
      if (val === null || val === undefined || val === '') {
        newRow[col.name] = null
        return
      }
      
      if (col.type === 'number' && typeof val !== 'number') {
        newRow[col.name] = Number(val)
      } else if (col.type === 'boolean' && typeof val !== 'boolean') {
        newRow[col.name] = val === 'true' || val === '1' || val === 1 || val === true
      }
    })
    return newRow
  })
}
