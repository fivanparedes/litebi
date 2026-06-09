import PythonWorker from '@/workers/python.worker.js?worker'

class PythonClient {
  constructor() {
    this.worker = new PythonWorker()
    this.callbacks = new Map()
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

    this.worker.onerror = (e) => {
      console.error('[PythonClient] Worker error:', e)
    }
  }

  /**
   * Ejecuta código Python en el worker de manera asíncrona.
   * @param {string} pythonCode - Script en Python a ejecutar.
   * @param {Object|Array} data - Datos opcionales para inyectar como `input_data`.
   * @returns {Promise<*>}
   */
  async runPython(pythonCode, data = null) {
    return new Promise((resolve, reject) => {
      const id = ++this.msgId
      const timeout = setTimeout(() => {
        this.callbacks.delete(id)
        reject(new Error('Python Worker timeout (60s)'))
      }, 60000) // 60 segundos porque la carga inicial de Pyodide puede tardar
      
      this.callbacks.set(id, {
        resolve: (res) => { clearTimeout(timeout); resolve(res) },
        reject: (err) => { clearTimeout(timeout); reject(err) }
      })
      
      this.worker.postMessage({ id, pythonCode, data })
    })
  }

  /**
   * Ejecuta código Python asumiendo el uso de matplotlib y devuelve una cadena en base64 de la figura.
   */
  async runPythonPlot(pythonCode, data = null, datasetName = null) {
    const wrappedCode = `
import base64
import io
import os
import pandas as pd
os.environ['MPLBACKEND'] = 'AGG'
try:
    import matplotlib
    matplotlib.use('Agg')
except ImportError:
    pass

# Preparar datos
if 'input_data' in globals() and input_data is not None:
    df = pd.DataFrame(input_data)
    ${datasetName ? `globals()['${datasetName.replace(/[^a-zA-Z0-9_]/g, '_')}'] = df` : ''}

# Ejecutar el código del usuario
${pythonCode}

# Extraer la figura si matplotlib está cargado y se ha dibujado algo
result_img = None
if 'matplotlib' in globals() or 'matplotlib.pyplot' in globals():
    import matplotlib.pyplot as plt
    fig = plt.gcf()
    if fig.get_axes():
        f = io.BytesIO()
        fig.savefig(f, format="png", bbox_inches="tight", transparent=True)
        f.seek(0)
        result_img = "data:image/png;base64," + base64.b64encode(f.read()).decode("utf-8")
        plt.clf()

result_img
`
    return await this.runPython(wrappedCode, data)
  }
}

export const pythonClient = new PythonClient()
