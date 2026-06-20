/**
 * Utility for tracking errors and saving them to a downloadable file.
 */

/** @constant {number} Límite máximo de entradas de log almacenadas en memoria */
const MAX_LOGS = 1000

/**
 * Clase para registrar errores, advertencias e información de la aplicación.
 * Almacena los logs en memoria con rotación FIFO y permite descargarlos como archivo de texto.
 */
class ErrorLogger {
  /** Crea una instancia de ErrorLogger con un arreglo de logs vacío. */
  constructor() {
    this.logs = []
  }

  /**
   * Agrega una entrada al buffer de logs, aplicando rotación FIFO si se alcanza el límite.
   * @param {Object} logEntry - La entrada de log a agregar.
   * @private
   */
  _push(logEntry) {
    // Rotación FIFO: eliminar la entrada más antigua si se alcanzó el límite
    if (this.logs.length >= MAX_LOGS) {
      this.logs.shift()
    }
    this.logs.push(logEntry)
  }

  /**
   * Registra un error.
   * @param {string} context - Contexto o módulo donde ocurrió el error.
   * @param {string} message - Mensaje descriptivo del error.
   * @param {Object|string|null} [details=null] - Detalles adicionales (objeto o texto).
   */
  error(context, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details, Object.getOwnPropertyNames(details)) : details) : ''
    }
    this._push(logEntry)
    // Also print to actual console
    console.error(`[${context}] ${message}`, details || '')
  }

  /**
   * Registra una advertencia.
   * @param {string} context - Contexto o módulo donde ocurrió la advertencia.
   * @param {string} message - Mensaje descriptivo de la advertencia.
   * @param {Object|string|null} [details=null] - Detalles adicionales (objeto o texto).
   */
  warn(context, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      context,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details, Object.getOwnPropertyNames(details)) : details) : ''
    }
    this._push(logEntry)
    console.warn(`[${context}] ${message}`, details || '')
  }

  /**
   * Registra un mensaje informativo.
   * @param {string} context - Contexto o módulo que emite la información.
   * @param {string} message - Mensaje descriptivo.
   * @param {Object|string|null} [details=null] - Detalles adicionales (objeto o texto).
   */
  info(context, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      context,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details, Object.getOwnPropertyNames(details)) : details) : ''
    }
    this._push(logEntry)
    console.log(`[${context}] ${message}`, details || '')
  }

  /**
   * Descarga los logs almacenados como un archivo de texto (.txt).
   */
  downloadLogs() {
    if (this.logs.length === 0) {
      import('@/stores/uiStore').then(({ useUiStore }) => {
        const uiStore = useUiStore()
        uiStore.addToast({ message: "No hay registros (logs) almacenados actualmente.", type: 'warning' })
      }).catch(() => {
        window.alert("No hay registros (logs) almacenados actualmente.")
      })
      return
    }

    const logText = this.logs.map(log => 
      `[${log.timestamp}] [${log.level}] [${log.context}] ${log.message} ${log.details ? '\nDetalles: ' + log.details : ''}`
    ).join('\n\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `litebi-error-log-${new Date().toISOString().replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Elimina todos los logs almacenados en memoria.
   */
  clear() {
    this.logs = []
    import('@/stores/uiStore').then(({ useUiStore }) => {
      useUiStore().addToast({ message: "Registro de errores limpiado.", type: 'success' })
    }).catch(() => {
      if (typeof window !== 'undefined' && window.alert) window.alert("Registro de errores limpiado.")
    })
  }
}

export const Logger = new ErrorLogger()

// Interceptar errores globales no capturados
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    Logger.error('Global', event.message, event.error ? event.error.stack : null)
  })

  window.addEventListener('unhandledrejection', (event) => {
    Logger.error('Promise', event.reason?.message || 'Unhandled Rejection', event.reason?.stack || event.reason)
  })
}
