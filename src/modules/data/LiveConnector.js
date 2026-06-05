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
    // Simulamos un retraso de red
    await new Promise(resolve => setTimeout(resolve, 1200))
    
    // Si es un API, intentamos hacer la petición real o devolver mock si no hay URL
    if (type === 'api' || type === 'salesforce' || type === 'google-analytics') {
      if (type === 'api' && credentials.url && credentials.url.startsWith('http')) {
        try {
          const method = credentials.method || 'GET'
          let headers = {}
          if (credentials.headers) {
            try {
              headers = JSON.parse(credentials.headers)
            } catch (err) {
              throw new Error("El formato de los Headers (Encabezados) es inválido. Asegúrese de que sea un JSON válido (las claves y valores de texto deben estar entre comillas dobles).")
            }
          }
          
          let targetUrl = credentials.url
          if (credentials.useCorsProxy) {
            targetUrl = `https://corsproxy.io/?${encodeURIComponent(credentials.url)}`
          }

          const response = await fetch(targetUrl, {
            method,
            headers
          })
          if (!response.ok) {
            let friendlyMsg = `Error HTTP ${response.status}`
            if (response.status === 404) friendlyMsg = "No se encontró la fuente de datos en la URL especificada (Error 404)"
            else if (response.status === 401 || response.status === 403) friendlyMsg = "Acceso denegado: Revise sus credenciales o autenticación (Error 401/403)"
            else if (response.status >= 500) friendlyMsg = "El servidor de origen experimentó un error interno (Error 5xx)"
            
            const errorObj = new Error(friendlyMsg)
            errorObj.rawResponse = response
            throw errorObj
          }
          
          try {
            return await response.json()
          } catch (jsonErr) {
            throw new Error("La fuente de datos no devolvió un formato JSON válido (posiblemente retornó una página web HTML o hubo un error de ruta).")
          }
        } catch (e) {
          Logger.error('LiveConnector', 'Fetch failed', e)
          
          if (e.message && e.message.includes('Failed to fetch')) {
            throw new Error("Error de red: Revise su conexión a internet, verifique que la URL sea correcta y que no esté siendo bloqueada por reglas de CORS.")
          }
          
          throw e
        }
      }
      return this._mockApiResponse(type, credentials)
    }
    
    // Si es SQL, devolvemos un dataset tabular basado en el query
    return this._mockSqlResponse(type, credentials)
  }

  static _mockSqlResponse(type, credentials) {
    const { query } = credentials
    
    // Dataset simulado: Ventas ERP
    const data = []
    const regions = ['Norteamérica', 'Europa', 'Latinoamérica', 'Asia']
    const products = ['Servidores', 'Laptops', 'Software Empresarial', 'Licencias', 'Consultoría']
    
    // Generar entre 100 y 500 filas simuladas según el tipo
    const numRows = type === 'postgres' ? 500 : 250
    
    for (let i = 1; i <= numRows; i++) {
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * 365))
      
      data.push({
        id: i,
        fecha_venta: date.toISOString().split('T')[0],
        region: regions[Math.floor(Math.random() * regions.length)],
        producto: products[Math.floor(Math.random() * products.length)],
        ingreso: Math.floor(Math.random() * 50000) + 1000,
        costo: Math.floor(Math.random() * 20000) + 500,
        estado: Math.random() > 0.1 ? 'Completado' : 'Pendiente'
      })
    }
    
    // Simular un fallo genérico si el query contiene un error de sintaxis evidente
    if (query && query.toLowerCase().includes('error')) {
      throw new Error(`[${type.toUpperCase()}] Syntax Error at or near "error"`)
    }
    
    return data
  }

  static _mockApiResponse(type, credentials) {
    const data = []
    
    if (type === 'google-analytics') {
      // Mock de tráfico web
      const sources = ['Organic Search', 'Direct', 'Referral', 'Social', 'Email']
      for (let i = 1; i <= 30; i++) {
        const date = new Date()
        date.setDate(date.getDate() - (30 - i))
        
        data.push({
          date: date.toISOString().split('T')[0],
          source: sources[Math.floor(Math.random() * sources.length)],
          sessions: Math.floor(Math.random() * 5000) + 500,
          bounce_rate: (Math.random() * 0.4 + 0.2).toFixed(2), // 20% to 60%
          avg_session_duration: Math.floor(Math.random() * 180) + 60
        })
      }
    } else {
      // Mock Genérico REST API
      for (let i = 1; i <= 100; i++) {
        data.push({
          user_id: 1000 + i,
          email: `user${i}@example.com`,
          status: i % 5 === 0 ? 'inactive' : 'active',
          subscription_plan: i % 3 === 0 ? 'Premium' : 'Basic',
          created_at: new Date(Date.now() - Math.random() * 10000000000).toISOString()
        })
      }
    }
    
    return data
  }
}
