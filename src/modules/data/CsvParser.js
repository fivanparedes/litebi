import Papa from 'papaparse'
import { inferSchema } from './SchemaManager'

export const parseCsv = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true, // Auto-convert numbers and booleans
      ...options,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(`Error parsing CSV: ${results.errors[0].message}`))
          return
        }
        
        const schema = inferSchema(results.data)
        resolve({
          data: results.data,
          schema,
          meta: results.meta
        })
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}
