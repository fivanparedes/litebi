/**
 * Utility for tracking errors and saving them to a downloadable file.
 */

class ErrorLogger {
  constructor() {
    this.logs = []
  }

  error(context, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      context,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details, Object.getOwnPropertyNames(details)) : details) : ''
    }
    this.logs.push(logEntry)
    // Also print to actual console
    console.error(`[${context}] ${message}`, details || '')
  }

  warn(context, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      context,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details, Object.getOwnPropertyNames(details)) : details) : ''
    }
    this.logs.push(logEntry)
    console.warn(`[${context}] ${message}`, details || '')
  }

  info(context, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      context,
      message,
      details: details ? (typeof details === 'object' ? JSON.stringify(details, Object.getOwnPropertyNames(details)) : details) : ''
    }
    this.logs.push(logEntry)
    console.log(`[${context}] ${message}`, details || '')
  }

  downloadLogs() {
    if (this.logs.length === 0) return

    const logText = this.logs.map(log => 
      `[${log.timestamp}] [${log.level}] [${log.context}] ${log.message} ${log.details ? '\\nDetalles: ' + log.details : ''}`
    ).join('\\n\\n')

    const blob = new Blob([logText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `litebi-error-log-${new Date().toISOString().replace(/:/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  clear() {
    this.logs = []
  }
}

export const Logger = new ErrorLogger()
