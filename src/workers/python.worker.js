// Importación dinámica limpia para workers de tipo module en Vite


let pyodide = null

async function initPyodide() {
  const module = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.mjs')
  const loadPyodide = module.loadPyodide
  
  pyodide = await loadPyodide({
    indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/'
  })
  
  // Cargar paquetes comunes de análisis de datos y visualización
  await pyodide.loadPackage(['pandas', 'numpy', 'matplotlib', 'pyarrow'])
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
