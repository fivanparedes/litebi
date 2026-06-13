import * as duckdb from '@duckdb/duckdb-wasm'
import duckdb_wasm from '@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url'
import mvp_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url'
import duckdb_wasm_eh from '@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url'
import eh_worker from '@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url'
import { Logger } from '@/utils/Logger'

const MAX_CACHE_SIZE = 200

const mapDuckDbToUiType = (duckDbType) => {
  const t = (duckDbType || '').toUpperCase()
  if (t.includes('INT') || t.includes('FLOAT') || t.includes('DOUBLE') || t.includes('DECIMAL') || t.includes('NUMERIC')) return 'number'
  if (t.includes('DATE') || t.includes('TIME')) return 'date'
  if (t.includes('BOOL')) return 'boolean'
  return 'string'
}

const mapUiToDuckDbType = (uiType) => {
  const t = (uiType || '').toLowerCase()
  if (t === 'number') return 'DOUBLE'
  if (t === 'date') return 'TIMESTAMP'
  if (t === 'boolean') return 'BOOLEAN'
  return 'VARCHAR'
}

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

  async queryToArrowIPC(sql, params = []) {
    await this.initPromise
    let finalSql = sql
    
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

    let ipcBuffer;
    try {
      if (params && params.length > 0) {
        const stmt = await this.conn.prepare(finalSql)
        const arrowResult = await stmt.query(...params)
        ipcBuffer = arrowResult.serialize()
        await stmt.close()
      } else {
        const arrowResult = await this.conn.query(finalSql)
        ipcBuffer = arrowResult.serialize()
      }
    } catch (err) {
      throw new Error(`DuckDB Query Error: ${err.message}`)
    }

    return ipcBuffer
  }

  async createTable(name, data = null, schema = null) {
    this.clearCache()
    await this.initPromise
    
    await this.dropTable(name)
    
    if (data && data.length > 0) {
      const fileName = `${name}.json`
      await this.db.registerFileText(fileName, safeStringify(data))
      // DuckDB uses double quotes for table names
      if (schema && schema.length > 0) {
        const selectParts = schema.map(col => {
          const duckType = mapUiToDuckDbType(col.type)
          return `TRY_CAST("${col.name}" AS ${duckType}) AS "${col.name}"`
        }).join(', ')
        await this.conn.query(`CREATE TABLE "${name}" AS SELECT ${selectParts} FROM read_json_auto('${fileName}')`)
      } else {
        await this.conn.query(`CREATE TABLE "${name}" AS SELECT * FROM read_json_auto('${fileName}')`)
      }
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

  async getFilePreview(file, limit = 50) {
    await this.initPromise
    
    const buffer = await file.arrayBuffer()
    const uint8array = new Uint8Array(buffer)
    
    const tempFileName = `temp_preview_${Date.now()}_${file.name}`
    await this.db.registerFileBuffer(tempFileName, uint8array)
    
    try {
      const isParquet = tempFileName.toLowerCase().endsWith('.parquet')
      const queryStr = isParquet
        ? `SELECT * FROM read_parquet('${tempFileName}') LIMIT ${limit}`
        : `SELECT * FROM read_csv_auto('${tempFileName}') LIMIT ${limit}`
        
      const previewRows = await this.query(queryStr)
      
      const countQueryStr = isParquet
        ? `SELECT COUNT(*) as "count" FROM read_parquet('${tempFileName}')`
        : `SELECT COUNT(*) as "count" FROM read_csv_auto('${tempFileName}')`
        
      const countRes = await this.query(countQueryStr)
      const totalRows = countRes[0]?.count || 0
      
      const schemaQueryStr = isParquet
        ? `DESCRIBE SELECT * FROM read_parquet('${tempFileName}')`
        : `DESCRIBE SELECT * FROM read_csv_auto('${tempFileName}')`
      const rawSchema = await this.query(schemaQueryStr)
      const schema = rawSchema.map(col => ({
        name: col.column_name,
        type: mapDuckDbToUiType(col.column_type),
        originalType: col.column_type
      }))
      
      return {
        previewRows,
        totalRows,
        schema,
        tempFileName
      }
    } catch (err) {
      console.error('[SqlClient] Error in getFilePreview:', err)
      try {
        await this.db.registerFileBuffer(tempFileName, null)
      } catch (e) {
        // ignore
      }
      throw err
    }
  }

  async cleanupFile(fileName) {
    await this.initPromise
    try {
      await this.db.registerFileBuffer(fileName, null)
    } catch (err) {
      console.warn('[SqlClient] Failed to cleanup file:', fileName, err)
    }
  }

  async createTableFromRegisteredFile(tableName, tempFileName, selectedColumns = []) {
    this.clearCache()
    await this.initPromise
    
    try {
      await this.dropTable(tableName)
      
      const colsPart = selectedColumns.length > 0
        ? selectedColumns.map(c => `"${c}"`).join(', ')
        : '*'
        
      const isParquet = tempFileName.toLowerCase().endsWith('.parquet')
      const queryStr = isParquet
        ? `CREATE TABLE "${tableName}" AS SELECT ${colsPart} FROM read_parquet('${tempFileName}')`
        : `CREATE TABLE "${tableName}" AS SELECT ${colsPart} FROM read_csv_auto('${tempFileName}')`
        
      await this.conn.query(queryStr)
      return true
    } catch (err) {
      console.error('[SqlClient] Error in createTableFromRegisteredFile:', err)
      throw err
    }
  }

  async getTableSchema(tableName) {
    await this.initPromise
    try {
      const info = await this.query(`PRAGMA table_info("${tableName}")`)
      return info.map(col => ({
        name: col.name,
        type: mapDuckDbToUiType(col.type),
        originalType: col.type
      }))
    } catch (err) {
      console.error('[SqlClient] Error in getTableSchema:', err)
      return []
    }
  }

  async insertIntoTable(name, data, schema = null) {
    this.clearCache()
    await this.initPromise
    if (!data || data.length === 0) return true
    
    const tempName = `${name}_temp_${Date.now()}.json`
    await this.db.registerFileText(tempName, safeStringify(data))
    
    if (schema && schema.length > 0) {
      const selectParts = schema.map(col => {
        const duckType = mapUiToDuckDbType(col.type)
        return `TRY_CAST("${col.name}" AS ${duckType}) AS "${col.name}"`
      }).join(', ')
      await this.conn.query(`INSERT INTO "${name}" SELECT ${selectParts} FROM read_json_auto('${tempName}')`)
    } else {
      await this.conn.query(`INSERT INTO "${name}" SELECT * FROM read_json_auto('${tempName}')`)
    }
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
      else if (step.transformId === 'fill_nulls') {
        const { column: col, method, value } = step.config
        if (method === 'value') {
          const newVal = _formatVal(value)
          await this.conn.query(`UPDATE "${tempTableName}" SET "${col}" = ${newVal} WHERE "${col}" IS NULL OR "${col}" = ''`)
        } else if (method === 'mean') {
          await this.conn.query(`UPDATE "${tempTableName}" SET "${col}" = (SELECT AVG(CAST("${col}" AS DOUBLE)) FROM "${tempTableName}") WHERE "${col}" IS NULL OR "${col}" = ''`)
        } else if (method === 'ffill') {
          const selectList = currentColumns.map(c => {
            if (c === col) {
              return `COALESCE("${c}", LAST_VALUE("${c}") IGNORE NULLS OVER (ORDER BY rowid)) AS "${c}"`
            }
            return `"${c}"`
          }).join(', ')
          await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT ${selectList} FROM "${tempTableName}"`)
          await this.dropTable(tempTableName)
          await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        }
      }
      else if (step.transformId === 'text_transform') {
        const { column, operation } = step.config
        const sqlExpr = operation === 'trim' ? `TRIM(CAST("${column}" AS VARCHAR))` 
                      : operation === 'upper' ? `UPPER(CAST("${column}" AS VARCHAR))`
                      : `LOWER(CAST("${column}" AS VARCHAR))`
        const selectList = currentColumns.map(c => {
          if (c === column) {
            return `${sqlExpr} AS "${c}"`
          }
          return `"${c}"`
        }).join(', ')
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT ${selectList} FROM "${tempTableName}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
      }
      else if (step.transformId === 'extract_date') {
        const { column, component, newColumnName } = step.config
        const newCol = newColumnName || `${column}_${component}`
        const part = component.toUpperCase()
        
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT *, EXTRACT(${part} FROM TRY_CAST("${column}" AS TIMESTAMP)) AS "${newCol}" FROM "${tempTableName}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        if (!currentColumns.includes(newCol)) {
          currentColumns.push(newCol)
        }
      }
      else if (step.transformId === 'remove_duplicates') {
        const cols = step.config.columns || currentColumns
        if (cols.length > 0) {
          const partitionCols = cols.map(c => `"${c}"`).join(', ')
          await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT * EXCLUDE (row_num) FROM (
            SELECT *, ROW_NUMBER() OVER (PARTITION BY ${partitionCols} ORDER BY rowid) as row_num FROM "${tempTableName}"
          ) WHERE row_num = 1`)
          await this.dropTable(tempTableName)
          await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        }
      }
      else if (step.transformId === 'date_diff') {
        const { column: col1, columnEnd: col2, unit, newColumnName } = step.config
        const newCol = newColumnName || `${col1}_${col2}_diff`
        const duckdbUnit = unit === 'days' ? 'day' : unit === 'months' ? 'month' : unit === 'years' ? 'year' : 'millisecond'
        
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT *, 
          DATE_DIFF('${duckdbUnit}', TRY_CAST("${col1}" AS TIMESTAMP), TRY_CAST("${col2}" AS TIMESTAMP)) AS "${newCol}" 
          FROM "${tempTableName}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        if (!currentColumns.includes(newCol)) {
          currentColumns.push(newCol)
        }
      }
      else if (step.transformId === 'date_add') {
        const { column: col, offsetValue, unit, newColumnName } = step.config
        const newCol = newColumnName || `${col}_add`
        const offset = Number(offsetValue) || 0
        const intervalUnit = unit === 'days' ? 'days' : unit === 'months' ? 'months' : unit === 'years' ? 'years' : 'days'
        const intervalStr = `${offset} ${intervalUnit}`
        
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT *, 
          CAST((TRY_CAST("${col}" AS TIMESTAMP) + INTERVAL '${intervalStr}') AS DATE) AS "${newCol}" 
          FROM "${tempTableName}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        if (!currentColumns.includes(newCol)) {
          currentColumns.push(newCol)
        }
      }
      else if (step.transformId === 'groupby') {
        const { column: groupCol, groupMetric, groupOperation, newColumnName } = step.config
        const newCol = newColumnName || `${groupMetric}_${groupOperation.toLowerCase()}`
        
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT 
          "${groupCol}", 
          ${groupOperation}("${groupMetric}") AS "${newCol}" 
          FROM "${tempTableName}" 
          GROUP BY "${groupCol}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        currentColumns = [groupCol, newCol]
      }
      else if (step.transformId === 'split') {
        const { column: col, separator, newColumns } = step.config
        const sep = separator || ' '
        const targets = newColumns || []
        
        const selectParts = targets.map((newCol, i) => {
          return `string_split(CAST("${col}" AS VARCHAR), '${sep.replace(/'/g, "''")}')[${i + 1}] AS "${newCol}"`
        })
        
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT *, 
          ${selectParts.join(', ')} 
          FROM "${tempTableName}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
        
        targets.forEach(newCol => {
          if (!currentColumns.includes(newCol)) {
            currentColumns.push(newCol)
          }
        })
      }
      else if (step.transformId === 'cast') {
        const { column: col, castType } = step.config
        let sqlCastType = 'VARCHAR'
        if (castType === 'integer') sqlCastType = 'BIGINT'
        else if (castType === 'decimal') sqlCastType = 'DOUBLE'
        else if (castType === 'date') sqlCastType = 'DATE'
        else if (castType === 'boolean') sqlCastType = 'BOOLEAN'
        
        const selectList = currentColumns.map(c => {
          if (c === col) {
            return `TRY_CAST("${c}" AS ${sqlCastType}) AS "${c}"`
          }
          return `"${c}"`
        }).join(', ')
        
        await this.conn.query(`CREATE TABLE "${tempTableName}_tmp" AS SELECT ${selectList} FROM "${tempTableName}"`)
        await this.dropTable(tempTableName)
        await this.conn.query(`ALTER TABLE "${tempTableName}_tmp" RENAME TO "${tempTableName}"`)
      }
      else {
        console.warn(`[SqlWorkerClient] Unhandled transformation step: ${step.transformId}`)
      }
    }

    const finalData = await this.query(`SELECT * FROM "${tempTableName}"`)
    const newSchema = await this.getTableSchema(tempTableName)

    return {
      data: finalData,
      schema: newSchema,
      rowCount: finalData.length
    }
  }
}

export const sqlClient = new SqlClient()
