export const parseXlsxToCsvBlob = async (file) => {
  return new Promise((resolve, reject) => {
    // Dynamically import the worker using Vite's ?worker suffix
    import('@/workers/xlsx.worker.js?worker').then((WorkerModule) => {
      const worker = new WorkerModule.default()
      const reader = new FileReader()
      const id = Date.now().toString()

      worker.onmessage = (e) => {
        const { id: responseId, success, blob, error } = e.data
        if (responseId === id) {
          worker.terminate()
          if (success) {
            resolve(blob)
          } else {
            reject(new Error(error || 'Error procesando archivo Excel en el worker'))
          }
        }
      }

      worker.onerror = (e) => {
        worker.terminate()
        reject(new Error('Error en el Web Worker de Excel'))
      }

      reader.onload = (e) => {
        try {
          const fileBuffer = e.target.result
          worker.postMessage({ id, fileBuffer }, [fileBuffer]) // Transfer the buffer to the worker
        } catch (err) {
          worker.terminate()
          reject(err)
        }
      }

      reader.onerror = () => {
        worker.terminate()
        reject(new Error('Error al leer el archivo en el navegador'))
      }

      reader.readAsArrayBuffer(file)
    }).catch(err => {
      reject(new Error('Error al inicializar el Worker de Excel: ' + err.message))
    })
  })
}

