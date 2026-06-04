import alasql from 'alasql'

export class TransformPipeline {
  constructor(baseDatasetName, originalSchema) {
    this.baseDatasetName = baseDatasetName
    this.originalSchema = [...originalSchema]
    this.steps = []
    
    // Create a temporary working table
    this.tempTableName = `${this.baseDatasetName}_working`
    this._resetTempTable()
  }

  addStep(transformId, config) {
    const step = {
      id: `step_${Date.now()}`,
      transformId,
      config,
      enabled: true
    }
    this.steps.push(step)
    return this.executePipeline()
  }

  removeStep(stepId) {
    this.steps = this.steps.filter(s => s.id !== stepId)
    return this.executePipeline()
  }

  toggleStep(stepId) {
    const step = this.steps.find(s => s.id === stepId)
    if (step) {
      step.enabled = !step.enabled
      return this.executePipeline()
    }
  }

  _resetTempTable() {
    alasql(`DROP TABLE IF EXISTS [${this.tempTableName}]`)
    alasql(`CREATE TABLE [${this.tempTableName}]`)
    const sourceData = alasql.tables[this.baseDatasetName]?.data || []
    alasql.tables[this.tempTableName].data = JSON.parse(JSON.stringify(sourceData))
  }

  /**
   * Re-evaluates the entire pipeline on the base data
   */
  executePipeline() {
    try {
      let currentColumns = this.originalSchema.map(col => col.name)
      let currentSelect = currentColumns.join(', ')
      let currentWhere = []
      let currentOrderBy = []

      // Go through enabled steps in order
      const enabledSteps = this.steps.filter(s => s.enabled)
      
      // For AlaSQL MVP, we'll construct a single query if possible, 
      // or chain them into a temp table if complex
      
      for (const step of enabledSteps) {
        if (step.transformId === 'filter') {
          // Simplification for MVP: assuming simple transforms module
          const sql = `SELECT * FROM ? WHERE ${step.config.column} ${this._mapOperator(step.config.operator)} ${this._formatVal(step.config.value)}`
          // Note: Full SQL generation via the index.js definition is better for complex pipelines.
          // For now, we will do sequential TEMP table updates to guarantee stability
        }
      }
      
      // --- Safe sequential execution mode ---
      this._resetTempTable()
      
      for (const step of enabledSteps) {
        if (step.transformId === 'filter') {
          const result = alasql(`SELECT * FROM [${this.tempTableName}] WHERE [${step.config.column}] ${this._mapOperator(step.config.operator)} ${this._formatVal(step.config.value)}`)
          alasql.tables[this.tempTableName].data = result
        } 
        else if (step.transformId === 'sort') {
          const result = alasql(`SELECT * FROM [${this.tempTableName}] ORDER BY [${step.config.column}] ${step.config.direction}`)
          alasql.tables[this.tempTableName].data = result
        }
        else if (step.transformId === 'remove_column') {
          // Rebuild columns list
          currentColumns = currentColumns.filter(c => c !== step.config.column)
          const result = alasql(`SELECT ${currentColumns.map(c => `[${c}]`).join(', ')} FROM [${this.tempTableName}]`)
          alasql.tables[this.tempTableName].data = result
        }
        else if (step.transformId === 'remove_nulls') {
          const result = alasql(`SELECT * FROM [${this.tempTableName}] WHERE [${step.config.column}] IS NOT NULL AND [${step.config.column}] != ''`)
          alasql.tables[this.tempTableName].data = result
        }
        else if (step.transformId === 'replace_value') {
          const newVal = this._formatVal(step.config.newValue)
          const cleanOldVal = step.config.oldValue ? String(step.config.oldValue).replace(/^['"]|['"]$/g, '').toLowerCase() : ''
          if (cleanOldVal === 'null' || cleanOldVal === '') {
            alasql(`UPDATE [${this.tempTableName}] SET [${step.config.column}] = ${newVal} WHERE [${step.config.column}] IS NULL OR [${step.config.column}] = ''`)
          } else {
            const oldVal = this._formatVal(step.config.oldValue)
            alasql(`UPDATE [${this.tempTableName}] SET [${step.config.column}] = ${newVal} WHERE [${step.config.column}] = ${oldVal}`)
          }
          const result = alasql(`SELECT * FROM [${this.tempTableName}]`)
          alasql.tables[this.tempTableName].data = result
        }
        else if (step.transformId === 'fill_nulls') {
          const col = step.config.column
          const method = step.config.method // 'mean', 'median', 'mode', 'fixed', 'ffill'
          const data = alasql.tables[this.tempTableName].data
          let fillValue = step.config.fixedValue

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
          const data = alasql.tables[this.tempTableName].data
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
          
          const data = alasql.tables[this.tempTableName].data
          const seen = new Set()
          const uniqueData = []
          
          for (const row of data) {
            const key = cols.map(c => row[c]).join('|')
            if (!seen.has(key)) {
              seen.add(key)
              uniqueData.push(row)
            }
          }
          alasql.tables[this.tempTableName].data = uniqueData
        }
        else if (step.transformId === 'extract_date') {
          const { column, component, newColumnName } = step.config
          const data = alasql.tables[this.tempTableName].data
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
          const data = alasql.tables[this.tempTableName].data
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
          const data = alasql.tables[this.tempTableName].data
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
      }
      
      // Update schema based on currentColumns
      const newSchema = currentColumns.map(colName => {
        const existing = this.originalSchema.find(c => c.name === colName)
        return existing || { name: colName, type: 'string' } // Default to string if newly created
      })
      
      return {
        data: alasql.tables[this.tempTableName].data,
        schema: newSchema,
        rowCount: alasql.tables[this.tempTableName].data.length
      }

    } catch (error) {
      console.error("Pipeline execution error:", error)
      throw error
    }
  }
  
  getPreviewData(limit = 100) {
    try {
      return alasql(`SELECT TOP ${limit} * FROM [${this.tempTableName}]`)
    } catch (e) {
      return []
    }
  }

  // Helpers
  _mapOperator(op) {
    const ops = {
      'equals': '=', 'not_equals': '!=', 'greater_than': '>', 'less_than': '<',
      'contains': 'LIKE', 'is_null': 'IS NULL'
    }
    return ops[op] || '='
  }
  
  _formatVal(val) {
    if (typeof val === 'number') return val
    if (val === null) return 'NULL'
    // Escape single quotes for SQL safety
    const escapedVal = String(val).replace(/'/g, "''")
    return `'${escapedVal}'`
  }
}
