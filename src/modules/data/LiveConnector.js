import { Logger } from '@/utils/Logger'

/**
 * LiveConnector.js
 * Servicio de conexión a bases de datos y APIs remotas.
 * 
 * NOTA: Al ejecutarse en entorno de navegador (offline-first), las llamadas TCP directas
 * a PostgreSQL/MySQL son bloqueadas por políticas CORS o ausencia de sockets puros.
 * Este módulo sirve como "Proxy" o "Mock" para testear el flujo de Live Data de la Etapa 18.
 * En producción, esto apuntaría mediante `fetch` a un micro-backend Node.js.
 */

export class LiveConnector {
  /**
   * Simula o realiza la conexión a un origen de datos remoto
   * @param {String} type - Tipo de conexión ('postgres', 'mysql', 'sqlserver', 'api', 'salesforce')
   * @param {Object} credentials - Objeto con host, port, user, db, query, url, etc.
   */
  static async query(type, credentials) {
    if (type === 'api' && credentials.url && credentials.url.startsWith('http')) {
      try {
        const method = credentials.method || 'GET'
        let headers = {}
        if (credentials.headers) {
          try {
            headers = JSON.parse(credentials.headers)
          } catch (err) {
            throw new Error("El formato de los Headers (Encabezados) es inválido.")
          }
        }
        
        let targetUrl = credentials.url
        if (credentials.useCorsProxy) {
          targetUrl = `https://corsproxy.io/?${encodeURIComponent(credentials.url)}`
        }

        const response = await fetch(targetUrl, { method, headers })
        if (!response.ok) {
          throw new Error(`Error HTTP ${response.status}`)
        }
        
        try {
          return await response.json()
        } catch (jsonErr) {
          throw new Error("La fuente de datos no devolvió un formato JSON válido.")
        }
      } catch (e) {
        Logger.error('LiveConnector', 'Fetch failed', e)
        throw e
      }
    }
    
    // For SQL databases and specialized connectors (salesforce, google-analytics)
    return this._fetchFromBackend(type, credentials)
  }

  static async _fetchFromBackend(type, credentials) {
    try {
      const response = await fetch('http://localhost:3001/api/query', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer litebi-dev-key'
        },
        body: JSON.stringify({ type, credentials, query: credentials.query || '' })
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(()=>({}));
        throw new Error(errData.error || `Error del backend HTTP ${response.status}`);
      }
      
      const blob = await response.blob();
      return new File([blob], `${credentials.datasetName || type + '_export'}.parquet`, { type: 'application/vnd.apache.parquet' });
    } catch (err) {
      Logger.error('LiveConnector', 'Backend Fetch Error', err);
      throw err;
    }
  }
}
