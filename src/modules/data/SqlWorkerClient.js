import SqlWorker from '@/workers/alasql.worker.js?worker'

class SqlClient {
  constructor() {
    this.worker = new SqlWorker()
    this.callbacks = new Map()
    this.cache = new Map()
    this.msgId = 0
    
    this.worker.onmessage = (e) => {
      const { id, success, result, error } = e.data
      if (this.callbacks.has(id)) {
        const { resolve, reject } = this.callbacks.get(id)
        this.callbacks.delete(id)
        if (success) {
          resolve(result)
        } else {
          reject(new Error(error))
        }
      }
    }
  }

  _post(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId
      this.callbacks.set(id, { resolve, reject })
      this.worker.postMessage({ id, action, payload })
    })
  }

  clearCache() {
    this.cache.clear()
  }

  async query(sql, params = []) {
    const cacheKey = JSON.stringify({ sql, params })
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    const result = await this._post('QUERY', { sql, params })
    this.cache.set(cacheKey, result)
    return result
  }

  createTable(name, data = null) {
    this.clearCache()
    return this._post('CREATE_TABLE', { name, data })
  }

  dropTable(name) {
    this.clearCache()
    return this._post('DROP_TABLE', { name })
  }

  exportDb() {
    return this._post('EXPORT_DB')
  }

  importDb(tables) {
    this.clearCache()
    return this._post('IMPORT_DB', { tables })
  }

  executePipeline(baseDatasetName, tempTableName, originalSchema, steps) {
    this.clearCache()
    // Clone schema and steps to remove Vue Proxies which cause DataCloneError
    const cleanSchema = JSON.parse(JSON.stringify(originalSchema))
    const cleanSteps = JSON.parse(JSON.stringify(steps))
    return this._post('EXECUTE_PIPELINE', { 
      baseDatasetName, 
      tempTableName, 
      originalSchema: cleanSchema, 
      steps: cleanSteps 
    })
  }
}

// Export singleton instance
export const sqlClient = new SqlClient()
