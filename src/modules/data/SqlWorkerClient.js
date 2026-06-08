import SqlWorker from '@/workers/alasql.worker.js?worker'

/** Tamaño máximo de entradas en la caché LRU de consultas */
const MAX_CACHE_SIZE = 200

/**
 * Cliente de comunicación con el Web Worker de AlaSQL.
 * Encapsula el envío/recepción de mensajes, el caché LRU de consultas
 * y el manejo de timeouts y errores del worker.
 */
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

    // Manejo de errores/crash del worker
    this.worker.onerror = (e) => {
      console.error('[SqlClient] Worker error:', e)
    }
  }

  /**
   * Envía un mensaje al worker y retorna una Promise con la respuesta.
   * Si el worker no responde en 30 segundos, la promesa se rechaza con timeout.
   * @param {string} action - Acción a ejecutar en el worker.
   * @param {Object} payload - Datos adicionales para la acción.
   * @returns {Promise<*>} Resultado del worker.
   */
  _post(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId
      const timeout = setTimeout(() => {
        this.callbacks.delete(id)
        reject(new Error(`Worker timeout: ${action} did not respond in 30s`))
      }, 30000)
      this.callbacks.set(id, { 
        resolve: (result) => { clearTimeout(timeout); resolve(result) },
        reject: (error) => { clearTimeout(timeout); reject(error) }
      })
      this.worker.postMessage({ id, action, payload })
    })
  }

  /** Limpia toda la caché de consultas. */
  clearCache() {
    this.cache.clear()
  }

  /**
   * Ejecuta una consulta SQL en el worker, usando caché LRU.
   * @param {string} sql - Consulta SQL a ejecutar.
   * @param {Array} params - Parámetros de la consulta.
   * @returns {Promise<Array>} Resultado de la consulta.
   */
  async query(sql, params = []) {
    const cacheKey = JSON.stringify({ sql, params })
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)
    }
    
    const result = await this._post('QUERY', { sql, params })
    this.cache.set(cacheKey, result)

    // Evicción LRU: si se supera el tamaño máximo, eliminar la entrada más antigua
    if (this.cache.size > MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }

    return result
  }

  /**
   * Crea una tabla en la base de datos del worker.
   * @param {string} name - Nombre de la tabla.
   * @param {Array|null} data - Datos iniciales de la tabla.
   * @returns {Promise<*>}
   */
  createTable(name, data = null) {
    this.clearCache()
    return this._post('CREATE_TABLE', { name, data })
  }

  /**
   * Elimina una tabla de la base de datos del worker.
   * @param {string} name - Nombre de la tabla.
   * @returns {Promise<*>}
   */
  dropTable(name) {
    this.clearCache()
    return this._post('DROP_TABLE', { name })
  }

  /**
   * Inserta nuevos datos al final de una tabla existente.
   * @param {string} name - Nombre de la tabla.
   * @param {Array} data - Nuevos datos a insertar.
   * @returns {Promise<*>}
   */
  insertIntoTable(name, data) {
    this.clearCache()
    return this._post('INSERT_INTO', { name, data })
  }

  /**
   * Exporta todas las tablas de la base de datos del worker.
   * @returns {Promise<Object>}
   */
  exportDb() {
    return this._post('EXPORT_DB')
  }

  /**
   * Importa tablas a la base de datos del worker.
   * @param {Object} tables - Tablas a importar.
   * @returns {Promise<*>}
   */
  importDb(tables) {
    this.clearCache()
    return this._post('IMPORT_DB', { tables })
  }

  /**
   * Ejecuta un pipeline de transformación sobre un dataset.
   * @param {string} baseDatasetName - Nombre del dataset base.
   * @param {string} tempTableName - Nombre de la tabla temporal.
   * @param {Array} originalSchema - Esquema original del dataset.
   * @param {Array} steps - Pasos del pipeline a ejecutar.
   * @returns {Promise<*>}
   */
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
