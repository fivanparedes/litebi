import alasql from 'alasql'

alasql.options.cache = false
alasql.options.casesensitive = false

// Custom functions for AlaSQL (BI context)
alasql.fn.DATE = function(...args) {
  if (args.length === 3) {
    const y = parseInt(args[0]), m = parseInt(args[1]), d = parseInt(args[2]);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
    return new Date(Date.UTC(y, m-1, d)).toISOString().split('T')[0];
  }
  if (args.length === 1 && args[0]) {
    try { return new Date(args[0]).toISOString().split('T')[0] } catch(e) { return null }
  }
  return null;
}

alasql.fn.DATE_DIFF = function(unit, date1, date2) {
  if (!date1 || !date2) return null;
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  if (isNaN(d1) || isNaN(d2)) return null;
  const diffTime = d2 - d1;
  
  switch(unit?.toLowerCase()) {
    case 'year': return diffTime / (1000 * 60 * 60 * 24 * 365.25);
    case 'month': return diffTime / (1000 * 60 * 60 * 24 * 30.44);
    case 'week': return diffTime / (1000 * 60 * 60 * 24 * 7);
    case 'hour': return diffTime / (1000 * 60 * 60);
    case 'minute': return diffTime / (1000 * 60);
    case 'second': return diffTime / 1000;
    case 'day':
    default:
      return diffTime / (1000 * 60 * 60 * 24);
  }
}

self.onmessage = async (e) => {
  const { id, action, payload } = e.data
  
  try {
    let result = null
    
    switch (action) {
      case 'QUERY':
        // Fix for AlaSQL native DATEDIFF toJS bug
        const safeSql = payload.sql ? payload.sql.replace(/\bDATEDIFF\s*\(/gi, 'DATE_DIFF(') : ''
        result = alasql(safeSql, payload.params || [])
        break
        
      case 'CREATE_TABLE':
        alasql(`DROP TABLE IF EXISTS [${payload.name}]`)
        alasql(`CREATE TABLE [${payload.name}]`)
        if (payload.data) {
          alasql.tables[payload.name].data = payload.data
        }
        break
        
      case 'DROP_TABLE':
        alasql(`DROP TABLE IF EXISTS [${payload.name}]`)
        break
        
      case 'INSERT_INTO':
        if (alasql.tables[payload.name] && payload.data) {
          alasql.tables[payload.name].data = alasql.tables[payload.name].data.concat(payload.data)
        }
        break
        
      case 'EXPORT_DB': {
        const tables = {}
        Object.keys(alasql.tables).forEach(t => {
          tables[t] = alasql.tables[t].data
        })
        result = tables
        break
      }
        
      case 'IMPORT_DB':
        // Clear all
        Object.keys(alasql.tables).forEach(t => alasql(`DROP TABLE IF EXISTS [${t}]`))
        // Restore all
        if (payload.tables) {
          Object.keys(payload.tables).forEach(t => {
            alasql(`CREATE TABLE [${t}]`)
            alasql.tables[t].data = payload.tables[t]
          })
        }
        break
        
      case 'EXECUTE_PIPELINE':
        result = runPipeline(payload.baseDatasetName, payload.tempTableName, payload.originalSchema, payload.steps)
        break
        
      default:
        throw new Error(`Unknown action: ${action}`)
    }
    
    self.postMessage({ id, success: true, result })
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message })
  }
}

function runPipeline(baseDatasetName, tempTableName, originalSchema, steps) {
  // 1. Reset temp table
  alasql(`DROP TABLE IF EXISTS [${tempTableName}]`)
  alasql(`CREATE TABLE [${tempTableName}]`)
  const sourceData = alasql.tables[baseDatasetName]?.data || []
  
  // Optimización de Memoria: Evitar JSON.parse(JSON.stringify()) para grandes datasets
  // Dado que las filas de AlaSQL son objetos planos, una copia superficial por cada fila
  // es suficiente para proteger sourceData y consume mucha menos RAM y CPU.
  alasql.tables[tempTableName].data = sourceData.map(row => ({ ...row }))

  let currentColumns = originalSchema.map(col => col.name)
  const enabledSteps = steps.filter(s => s.enabled)

  const _mapOperator = (op) => {
    const ops = {
      'equals': '=', 'not_equals': '!=', 'greater_than': '>', 'less_than': '<',
      'contains': 'LIKE', 'is_null': 'IS NULL'
    }
    return ops[op] || '='
  }
  
  const _formatVal = (val) => {
    if (typeof val === 'number') return val
    if (val === null) return 'NULL'
    const escapedVal = String(val).replace(/'/g, "''")
    return `'${escapedVal}'`
  }

  for (const step of enabledSteps) {
    if (step.transformId === 'filter') {
      const result = alasql(`SELECT * FROM [${tempTableName}] WHERE [${step.config.column}] ${_mapOperator(step.config.operator)} ${_formatVal(step.config.value)}`)
      alasql.tables[tempTableName].data = result
    } 
    else if (step.transformId === 'sort') {
      const result = alasql(`SELECT * FROM [${tempTableName}] ORDER BY [${step.config.column}] ${step.config.direction}`)
      alasql.tables[tempTableName].data = result
    }
    else if (step.transformId === 'remove_column') {
      currentColumns = currentColumns.filter(c => c !== step.config.column)
      const result = alasql(`SELECT ${currentColumns.map(c => `[${c}]`).join(', ')} FROM [${tempTableName}]`)
      alasql.tables[tempTableName].data = result
    }
    else if (step.transformId === 'add_formula') {
      try {
        const result = alasql(`SELECT *, ${step.config.expression} AS [${step.config.newColumnName}] FROM [${tempTableName}]`)
        alasql.tables[tempTableName].data = result
        currentColumns.push(step.config.newColumnName)
      } catch (err) {
        console.warn(`Error in add_formula step (col: ${step.config.newColumnName}):`, err)
        // If formula fails, we skip it to prevent crashing the whole pipeline
      }
    }
    else if (step.transformId === 'remove_nulls') {
      const result = alasql(`SELECT * FROM [${tempTableName}] WHERE [${step.config.column}] IS NOT NULL AND [${step.config.column}] != ''`)
      alasql.tables[tempTableName].data = result
    }
    else if (step.transformId === 'replace_value') {
      const newVal = _formatVal(step.config.newValue)
      const cleanOldVal = step.config.oldValue ? String(step.config.oldValue).replace(/^['"]|['"]$/g, '').toLowerCase() : ''
      if (cleanOldVal === 'null' || cleanOldVal === '') {
        alasql(`UPDATE [${tempTableName}] SET [${step.config.column}] = ${newVal} WHERE [${step.config.column}] IS NULL OR [${step.config.column}] = ''`)
      } else {
        const oldVal = _formatVal(step.config.oldValue)
        alasql(`UPDATE [${tempTableName}] SET [${step.config.column}] = ${newVal} WHERE [${step.config.column}] = ${oldVal}`)
      }
    }
    else if (step.transformId === 'fill_nulls') {
      const { column: col, method, value } = step.config
      const data = alasql.tables[tempTableName].data
      
      let fillValue = value
      if (method === 'mean' || method === 'median' || method === 'mode') {
        const values = data.map(r => r[col]).filter(v => v != null && v !== '')
        if (values.length > 0) {
          if (method === 'mean') {
            fillValue = values.reduce((a, b) => Number(a) + Number(b), 0) / values.length
          } else if (method === 'median') {
            values.sort((a, b) => Number(a) - Number(b))
            const mid = Math.floor(values.length / 2)
            fillValue = values.length % 2 !== 0 ? values[mid] : (Number(values[mid - 1]) + Number(values[mid])) / 2
          } else if (method === 'mode') {
            const counts = {}
            let maxCount = 0
            values.forEach(v => {
              counts[v] = (counts[v] || 0) + 1
              if (counts[v] > maxCount) { maxCount = counts[v]; fillValue = v }
            })
          }
        }
      }

      let lastValid = null
      data.forEach(row => {
        const isNull = row[col] == null || row[col] === ''
        if (!isNull && method === 'ffill') {
          lastValid = row[col]
        } else if (isNull) {
          row[col] = method === 'ffill' ? lastValid : fillValue
        }
      })
    }
    else if (step.transformId === 'text_transform') {
      const { column, operation } = step.config
      const data = alasql.tables[tempTableName].data
      data.forEach(row => {
        if (row[column] != null && typeof row[column] === 'string') {
          if (operation === 'trim') row[column] = row[column].trim()
          else if (operation === 'upper') row[column] = row[column].toUpperCase()
          else if (operation === 'lower') row[column] = row[column].toLowerCase()
        }
      })
    }
    else if (step.transformId === 'remove_duplicates') {
      const cols = step.config.columns || currentColumns
      if (cols.length === 0) continue
      
      const data = alasql.tables[tempTableName].data
      const seen = new Set()
      const uniqueData = []
      
      for (const row of data) {
        const key = cols.map(c => row[c]).join('|')
        if (!seen.has(key)) {
          seen.add(key)
          uniqueData.push(row)
        }
      }
      alasql.tables[tempTableName].data = uniqueData
    }
    else if (step.transformId === 'extract_date') {
      const { column, component, newColumnName } = step.config
      const data = alasql.tables[tempTableName].data
      const newCol = newColumnName || `${column}_${component}`
      
      if (!currentColumns.includes(newCol)) {
        currentColumns.push(newCol)
      }

      data.forEach(row => {
        const d = new Date(row[column])
        if (!isNaN(d.getTime())) {
          if (component === 'year') row[newCol] = d.getFullYear()
          else if (component === 'month') row[newCol] = d.getMonth() + 1
          else if (component === 'day') row[newCol] = d.getDate()
          else if (component === 'quarter') row[newCol] = Math.floor(d.getMonth() / 3) + 1
        } else {
          row[newCol] = null
        }
      })
    }
    else if (step.transformId === 'date_diff') {
      const { column, dateColumn2, dateDiffUnit, newColumnName } = step.config
      const data = alasql.tables[tempTableName].data
      const newCol = newColumnName || `diff_${column}_${dateColumn2}`
      
      if (!currentColumns.includes(newCol)) {
        currentColumns.push(newCol)
      }

      data.forEach(row => {
        const d1 = new Date(row[column])
        const d2 = new Date(row[dateColumn2])
        if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
          const diffMs = d2 - d1
          if (dateDiffUnit === 'days') row[newCol] = diffMs / (1000 * 60 * 60 * 24)
          else if (dateDiffUnit === 'months') row[newCol] = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
          else if (dateDiffUnit === 'years') row[newCol] = d2.getFullYear() - d1.getFullYear()
        } else {
          row[newCol] = null
        }
      })
    }
    else if (step.transformId === 'date_add') {
      const { column, dateAddUnit, dateAddAmount, newColumnName } = step.config
      const data = alasql.tables[tempTableName].data
      const newCol = newColumnName || `${column}_added`
      
      if (!currentColumns.includes(newCol)) {
        currentColumns.push(newCol)
      }

      data.forEach(row => {
        const d = new Date(row[column])
        if (!isNaN(d.getTime())) {
          const val = Number(dateAddAmount)
          if (dateAddUnit === 'days') d.setDate(d.getDate() + val)
          else if (dateAddUnit === 'months') d.setMonth(d.getMonth() + val)
          else if (dateAddUnit === 'years') d.setFullYear(d.getFullYear() + val)
          row[newCol] = d.toISOString().split('T')[0]
        } else {
          row[newCol] = null
        }
      })
    }
    else if (step.transformId === 'groupby') {
      const { column, groupOperation, groupMetric } = step.config
      const result = alasql(`SELECT [${column}], ${groupOperation}([${groupMetric}]) AS [${groupMetric}] FROM [${tempTableName}] GROUP BY [${column}]`)
      alasql.tables[tempTableName].data = result
      currentColumns = [column, groupMetric]
    }
    else if (step.transformId === 'split') {
      const { column, separator } = step.config
      const data = alasql.tables[tempTableName].data
      
      let maxSplits = 0
      data.forEach(row => {
        if (row[column] && typeof row[column] === 'string') {
          const parts = row[column].split(separator)
          if (parts.length > maxSplits) maxSplits = parts.length
          parts.forEach((p, i) => {
            row[`${column}_part${i+1}`] = p.trim()
          })
        }
      })
      
      for (let i = 1; i <= maxSplits; i++) {
        const newCol = `${column}_part${i}`
        if (!currentColumns.includes(newCol)) currentColumns.push(newCol)
      }
    }
    else if (step.transformId === 'cast') {
      const { column, castType } = step.config
      const data = alasql.tables[tempTableName].data
      
      data.forEach(row => {
        if (row[column] != null) {
          if (castType === 'number') {
            const num = Number(row[column])
            row[column] = isNaN(num) ? null : num
          } else if (castType === 'string') {
            row[column] = String(row[column])
          } else if (castType === 'date') {
            const d = new Date(row[column])
            row[column] = isNaN(d.getTime()) ? null : d.toISOString()
          }
        }
      })
    }
  }

  const newSchema = currentColumns.map(colName => {
    const existing = originalSchema.find(c => c.name === colName)
    return existing || { name: colName, type: 'string' }
  })
  
  return {
    data: alasql.tables[tempTableName].data,
    schema: newSchema,
    rowCount: alasql.tables[tempTableName].data.length
  }
}
