import { inferSchema } from './SchemaManager'

// Import xlsx lazily to reduce initial bundle size
export const parseXlsx = async (file) => {
  const xlsx = await import('xlsx')
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = xlsx.read(data, { type: 'array' })
        
        // We'll just read the first sheet for the MVP
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        
        // Convert to JSON (array of objects)
        const jsonData = xlsx.utils.sheet_to_json(worksheet, {
          raw: true, // Keep actual values, don't format as strings
          defval: null // Set empty cells to null
        })
        
        if (jsonData.length === 0) {
          throw new Error('El archivo Excel está vacío')
        }
        
        const schema = inferSchema(jsonData)
        
        resolve({
          data: jsonData,
          schema,
          meta: { sheetName: firstSheetName }
        })
      } catch (error) {
        reject(error)
      }
    }
    
    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}
