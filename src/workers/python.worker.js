// Importación dinámica limpia para workers de tipo module en Vite


import { loadPyodide } from 'pyodide'

// Workaround for Vite Dev Server causing SRI integrity failures on local .whl files
const originalFetch = globalThis.fetch
globalThis.fetch = async function(resource, options) {
  if (options && options.integrity && typeof resource === 'string' && resource.endsWith('.whl')) {
    delete options.integrity
  }
  return originalFetch.call(this, resource, options)
}

let pyodide = null

async function initPyodide() {
  pyodide = await loadPyodide()
  
  // Cargar micropip y paquetes básicos
  await pyodide.loadPackage('micropip')
  await pyodide.loadPackage(['pandas', 'numpy'])
}

const pyodideReadyPromise = initPyodide()

self.onmessage = async (event) => {
  const { id, pythonCode, data, arrowBuffer } = event.data
  
  try {
    await pyodideReadyPromise
    
    // Inyectar Arrow Buffer si se provee
    if (arrowBuffer) {
      pyodide.globals.set("input_arrow_buffer", pyodide.toPy(arrowBuffer))
    } else {
      pyodide.globals.set("input_arrow_buffer", null)
    }

    // Inyectar datos JSON/Array nativo si se provee
    if (data) {
      pyodide.globals.set("input_data", pyodide.toPy(data))
    } else {
      pyodide.globals.set("input_data", null)
    }
    
    // Analizar el código e instalar dinámicamente cualquier paquete que se esté importando
    await pyodide.loadPackagesFromImports(pythonCode)
    
    // Ejecutar el código Python
    let result = await pyodide.runPythonAsync(pythonCode)
    
    // Si el resultado es un Proxy de Pyodide (ej. un dict o list de Python), convertir a JS
    let jsResult = result
    if (pyodide.isPyProxy(result)) {
      jsResult = result.toJs({ dict_converter: Object.fromEntries })
      result.destroy()
    }
    
    self.postMessage({ id, success: true, result: jsResult })
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message })
  }
}
