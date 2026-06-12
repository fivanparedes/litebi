import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import { Logger } from '@/utils/Logger'

const MAX_CACHE_SIZE = 200

const safeStringify = (obj) => {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return Number(value)
    }
    return value
  })
}

class SqlClient {
  constructor() {
    this.cache = new Map()
    this.db = null
    this.conn = null
    this.initPromise = this.initDuckDB()
  }

  async initDuckDB() {
    try {
      // Configurar bundles locales (empaquetados por Vite) en lugar de CDN
      const MANUAL_BUNDLES = {
        mvp: {
          mainModule: duckdb_wasm,
          mainWorker: mvp_worker,
        },
        eh: {
          mainModule: duckdb_wasm_eh,
          mainWorker: eh_worker,
        },
      }
      
      const bundle = await duckdb.selectBundle(MANUAL_BUNDLES)
      const worker = new Worker(bundle.mainWorker)
      
      const logger = new duckdb.ConsoleLogger()
      
      this.db = new duckdb.AsyncDuckDB(logger, worker)
      await this.db.instantiate(bundle.mainModule, bundle.pthreadWorker)
      
      this.conn = await this.db.connect()
      Logger.info('DuckDB-Wasm', 'Initialized successfully.')
    } catch (err) {
      Logger.error('DuckDB-Wasm', 'Failed to initialize', err)
      throw err
    }
  }

  clearCache() {
    this.cache.clear()
  }

  async query(sql, params = []) {
    await this.initPromise
    let finalSql = sql
    
    // Inject global parameters
    try {
      const { useDashboardStore } = await import('@/stores/dashboardStore')
      const dashStore = useDashboardStore()
      const globalParams = dashStore.globalParameters || {}
      
      for (const [key, value] of Object.entries(globalParams)) {
        const regex = new RegExp(`@${key}\\b`, 'gi')
        finalSql = finalSql.replace(regex, typeof value === 'number' ? value : `'${value}'`)
      }
    } catch (e) {
      // Ignore if store not ready
    }

    const cacheKey = safeStringify({ sql: finalSql, params })
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    let result;
    try {
      const sanitizeRow = (row) => {
        const json = row.toJSON()
        for (const key in json) {
          const val = json[key]
          if (typeof val === 'bigint') {
            json[key] = Number(val)
          } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
            try {
              const str = val.toString()
              if (/^-?\d+(\.\d+)?$/.test(str)) {
                json[key] = Number(str)
              }
            } catch (e) { /* ignore */ }
          }
        }
        return json
      }

      if (params && params.length > 0) {
        const stmt = await this.conn.prepare(finalSql)
        const arrowResult = await stmt.query(...params)
        result = arrowResult.toArray().map(sanitizeRow)
        await stmt.close()
      } else {
        const arrowResult = await this.conn.query(finalSql)
        result = arrowResult.toArray().map(sanitizeRow)
      }
    } catch (err) {
      throw new Error(`DuckDB Query Error: ${err.message}`)
    }

    this.cache.set(cacheKey, result)
    if (this.cache.size > MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    return result
  }

  async createTable(name, data = null) {
    this.clearCache()
    await this.initPromise
    
    await this.dropTable(name)
    
    if (data && data.length > 0) {
      const fileName = `${name}.json`
      await this.db.registerFileText(fileName, safeStringify(data))
      // DuckDB uses double quotes for table names
      await this.conn.query(`CREATE TABLE "${name}" AS SELECT * FROM read_json_auto('${fileName}')`)
    } else {
      await this.conn.query(`CREATE TABLE "${name}" (id INTEGER)`)
    }
    return true
  }

  async dropTable(name) {
    this.clearCache()
    await this.initPromise
    try {
      await this.conn.query(`DROP TABLE IF EXISTS "${name}"`)
    } catch (e) {
      console.warn('Drop table warning', e)
    }
    return true
  }

  async createTableFromFile(name, file) {
    this.clearCache()
    await this.initPromise
    
    try {
      const buffer = await file.arrayBuffer()
      const uint8array = new Uint8Array(buffer)
      
      const fileName = file.name || `${name}.csv`
      await this.db.registerFileBuffer(fileName, uint8array)
      await this.dropTable(name)
      
      if (fileName.toLowerCase().endsWith('.parquet')) {
        await this.conn.query(`CREATE TABLE "${name}" AS SELECT * FROM read_parquet('${fileName}')`)
      } else {
        await this.conn.query(`CREATE TABLE "${name}" AS SELECT * FROM read_csv_auto('${fileName}')`)
      }
      return true
    } catch (err) {
      console.error('[SqlClient] Error in createTableFromFile:', err)
      throw err
    }
  }

  async insertIntoTable(name, data) {
    this.clearCache()
    await this.initPromise
    if (!data || data.length === 0) return true
    
    const tempName = `${name}_temp_${Date.now()}.json`
    await this.db.registerFileText(tempName, safeStringify(data))
    await this.conn.query(`INSERT INTO "${name}" SELECT * FROM read_json_auto('${tempName}')`)
    return true
  }

  async exportDb() {
    await this.initPromise
    const res = await this.conn.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='main'`)
    const tables = res.toArray().map(r => r.toJSON().table_name)
    
    const result = {}
    for (const t of tables) {
      const tRes = await this.conn.query(`SELECT * FROM "${t}"`)
      result[t] = tRes.toArray().map(r => {
        const json = r.toJSON()
        for (const key in json) {
          const val = json[key]
          if (typeof val === 'bigint') {
            json[key] = Number(val)
          } else if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
            try {
              const str = val.toString()
              if (/^-?\d+(\.\d+)?$/.test(str)) {
                json[key] = Number(str)
              }
            } catch (e) { /* ignore */ }
          }
        }
        return json
      })
    }
    return result
  }

  async importDb(tables) {
    this.clearCache()
    await this.initPromise
    
    if (!tables) return true
    for (const [name, data] of Object.entries(tables)) {
      await this.createTable(name, data)
    }
    return true
  }

  async executePipeline(baseDatasetName, tempTableName, originalSchema, steps, previewLimit = null) {
    this.clearCache()
    await this.initPromise
    
    await this.dropTable(tempTableName)
    const limitClause = previewLimit ? ` LIMIT ${previewLimit}` : ''
    await this.conn.query(`CREATE TABLE "${tempTableName}" AS SELECT * FROM "${baseDatasetName}"${limitClause}`)
    
    const enabledSteps = steps.filter(s => s.enabled)
    let currentColumns = originalSchema.map(col => col.name)

    const _mapOp = (op) => {
      const ops = {
        'equals': '=', 'not_equals': '!=', 'greater_than': '>', 'less_than': '<',
        'contains': 'LIKE', 'is_null': 'IS NULL'
      }
      return ops[op] || '='
    }
    
    const _formatVal = (val, op) => {
      if (val === null) return 'NULL'
      if (op === 'contains') return `'%${String(val).replace(/'/g, "''")}%'`
      if (typeof val === 'number') return val
      return `'${String(val).replace(/'/g, "''")}'`
    }

    for (const step of enabledSteps) {
      if (step.transformId === 'filter') {
        const val = _formatVal(step.config.value, step.config.operator)
        await this.conn.query(`DELETE FROM "${tempTableName}" WHERE NOT ("${step.config.column}" ${_mapOp(step.config.operator)} ${val})`)
      }
      else if (step.transformId === 'sort') {
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT * FROM "${tempTableName}" ORDER BY "${step.config.column}" ${step.config.direction}`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
      }
      else if (step.transformId === 'remove_column') {
        currentColumns = currentColumns.filter(c => c !== step.config.column)
        await this.conn.query(`ALTER TABLE "${tempTableName}" DROP COLUMN "${step.config.column}"`)
      }
      else if (step.transformId === 'add_formula') {
        try {
          await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT *, ${step.config.expression} AS "${step.config.newColumnName}" FROM "${tempTableName}"`)
          await this.dropTable(tempTableName)
          await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
          currentColumns.push(step.config.newColumnName)
        } catch (err) {
          console.warn(`Formula error:`, err)
        }
      }
      else if (step.transformId === 'remove_nulls') {
        await this.conn.query(`DELETE FROM "${tempTableName}" WHERE "${step.config.column}" IS NULL OR "${step.config.column}" = ''`)
      }
      else if (step.transformId === 'replace_value') {
        const newVal = _formatVal(step.config.newValue)
        const cleanOldVal = step.config.oldValue ? String(step.config.oldValue).replace(/^['"]|['"]$/g, '').toLowerCase() : ''
        if (cleanOldVal === 'null' || cleanOldVal === '') {
          await this.conn.query(`UPDATE "${tempTableName}" SET "${step.config.column}" = ${newVal} WHERE "${step.config.column}" IS NULL OR "${step.config.column}" = ''`)
        } else {
          const oldVal = _formatVal(step.config.oldValue)
          await this.conn.query(`UPDATE "${tempTableName}" SET "${step.config.column}" = ${newVal} WHERE "${step.config.column}" = ${oldVal}`)
        }
      }
      // Future steps can be migrated progressively. We will do a full data fetch, process in JS, and recreate if the step is too complex.
      else {
        // Fallback for complex operations (e.g. fill_nulls, split, date diff)
        // Fetch data, process in JS (like alasql did), recreate table
        let fallbackData = await this.query(`SELECT * FROM "${tempTableName}"`)
        
        if (step.transformId === 'fill_nulls') {
          const { column: col, method, value } = step.config
          let fillValue = value
          if (method === 'mean' || method === 'median' || method === 'mode') {
             // simplified mean calculation
             const vals = fallbackData.map(r => r[col]).filter(v => v != null && v !== '')
             if (vals.length > 0 && method === 'mean') fillValue = vals.reduce((a, b) => Number(a) + Number(b), 0) / vals.length
          }
          let lastValid = null
          fallbackData.forEach(row => {
            const isNull = row[col] == null || row[col] === ''
            if (!isNull && method === 'ffill') lastValid = row[col]
            else if (isNull) row[col] = method === 'ffill' ? lastValid : fillValue
          })
        }
        else if (step.transformId === 'text_transform') {
           const { column, operation } = step.config
           fallbackData.forEach(row => {
             if (row[column] != null && typeof row[column] === 'string') {
               if (operation === 'trim') row[column] = row[column].trim()
               else if (operation === 'upper') row[column] = row[column].toUpperCase()
               else if (operation === 'lower') row[column] = row[column].toLowerCase()
             }
           })
        }
        else if (step.transformId === 'extract_date') {
          const { column, component, newColumnName } = step.config
          const newCol = newColumnName || `${column}_${component}`
          if (!currentColumns.includes(newCol)) currentColumns.push(newCol)
          
          fallbackData.forEach(row => {
            const d = new Date(row[column])
            if (!isNaN(d.getTime())) {
              if (component === 'year') row[newCol] = d.getFullYear()
              else if (component === 'month') row[newCol] = d.getMonth() + 1
              else if (component === 'day') row[newCol] = d.getDate()
            } else row[newCol] = null
          })
        }
        else if (step.transformId === 'remove_duplicates') {
          const cols = step.config.columns || currentColumns
          if (cols.length > 0) {
            const seen = new Set()
            fallbackData = fallbackData.filter(row => {
              const key = cols.map(c => row[c]).join('|')
              if (!seen.has(key)) { seen.add(key); return true }
              return false
            })
          }
        }
        else if (step.transformId === 'date_diff') {
          const { column: col1, columnEnd: col2, unit, newColumnName } = step.config
          const newCol = newColumnName || `${col1}_${col2}_diff`
          if (!currentColumns.includes(newCol)) currentColumns.push(newCol)
          
          fallbackData.forEach(row => {
            const d1 = new Date(row[col1])
            const d2 = new Date(row[col2])
            if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
              const diffMs = d2.getTime() - d1.getTime()
              if (unit === 'days') {
                row[newCol] = Math.floor(diffMs / (1000 * 60 * 60 * 24))
              } else if (unit === 'months') {
                row[newCol] = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth())
              } else if (unit === 'years') {
                row[newCol] = d2.getFullYear() - d1.getFullYear()
              } else {
                row[newCol] = diffMs
              }
            } else {
              row[newCol] = null
            }
          })
        }
        else if (step.transformId === 'date_add') {
          const { column: col, offsetValue, unit, newColumnName } = step.config
          const newCol = newColumnName || `${col}_add`
          if (!currentColumns.includes(newCol)) currentColumns.push(newCol)
          
          const offset = Number(offsetValue) || 0
          fallbackData.forEach(row => {
            const d = new Date(row[col])
            if (!isNaN(d.getTime())) {
              const newD = new Date(d)
              if (unit === 'days') {
                newD.setDate(newD.getDate() + offset)
              } else if (unit === 'months') {
                newD.setMonth(newD.getMonth() + offset)
              } else if (unit === 'years') {
                newD.setFullYear(newD.getFullYear() + offset)
              }
              row[newCol] = newD.toISOString().split('T')[0]
            } else {
              row[newCol] = null
            }
          })
        }
        else if (step.transformId === 'groupby') {
          const { column: groupCol, groupMetric, groupOperation, newColumnName } = step.config
          const newCol = newColumnName || `${groupMetric}_${groupOperation.toLowerCase()}`
          
          const groups = {}
          fallbackData.forEach(row => {
            const key = row[groupCol] !== undefined ? String(row[groupCol]) : 'null'
            if (!groups[key]) groups[key] = []
            groups[key].push(row)
          })
          
          let newRows = []
          for (const [key, rows] of Object.entries(groups)) {
            const valFirst = rows[0]?.[groupCol]
            const metricVals = rows.map(r => Number(r[groupMetric])).filter(v => !isNaN(v))
            
            let groupedVal = 0
            if (groupOperation === 'SUM') {
              groupedVal = metricVals.reduce((a, b) => a + b, 0)
            } else if (groupOperation === 'AVG') {
              groupedVal = metricVals.length > 0 ? metricVals.reduce((a, b) => a + b, 0) / metricVals.length : 0
            } else if (groupOperation === 'COUNT') {
              groupedVal = rows.length
            } else if (groupOperation === 'MIN') {
              groupedVal = metricVals.length > 0 ? Math.min(...metricVals) : 0
            } else if (groupOperation === 'MAX') {
              groupedVal = metricVals.length > 0 ? Math.max(...metricVals) : 0
            }
            
            newRows.push({
              [groupCol]: valFirst,
              [newCol]: groupedVal
            })
          }
          fallbackData = newRows
          currentColumns = [groupCol, newCol]
        }
        else if (step.transformId === 'split') {
          const { column: col, separator, newColumns } = step.config
          const sep = separator || ' '
          const targets = newColumns || []
          
          targets.forEach(newCol => {
            if (!currentColumns.includes(newCol)) currentColumns.push(newCol)
          })
          
          fallbackData.forEach(row => {
            const val = row[col] !== undefined && row[col] !== null ? String(row[col]) : ''
            const parts = val.split(sep)
            targets.forEach((newCol, i) => {
              row[newCol] = parts[i] !== undefined ? parts[i] : null
            })
          })
        }
        else if (step.transformId === 'cast') {
          const { column: col, castType } = step.config
          fallbackData.forEach(row => {
            const val = row[col]
            if (val === null || val === undefined || val === '') {
              row[col] = null
            } else if (castType === 'string') {
              row[col] = String(val)
            } else if (castType === 'integer') {
              const num = parseInt(val, 10)
              row[col] = isNaN(num) ? null : num
            } else if (castType === 'decimal') {
              const num = parseFloat(val)
              row[col] = isNaN(num) ? null : num
            } else if (castType === 'date') {
              const d = new Date(val)
              row[col] = isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
            } else if (castType === 'boolean') {
              row[col] = (String(val).toLowerCase() === 'true' || val === 1 || val === true)
            }
          })
        }
        
        await this.createTable(tempTableName, fallbackData)
      }
    }

    const finalData = await this.query(`SELECT * FROM "${tempTableName}"`)
    const newSchema = currentColumns.map(colName => {
      const existing = originalSchema.find(c => c.name === colName)
      return existing || { name: colName, type: 'string' }
    })

    return {
      data: finalData,
      schema: newSchema,
      rowCount: finalData.length
    }
  }
}

export const sqlClient = new SqlClient()
