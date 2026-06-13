// xlsx.worker.js
import * as xlsx from 'xlsx'

self.onmessage = async (e) => {
  try {
    const { fileBuffer, id } = e.data

    // Read the array buffer using xlsx
    const workbook = xlsx.read(fileBuffer, { type: 'array' })

    // We'll read the first sheet for the MVP
    const firstSheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[firstSheetName]

    // Convert to CSV string instead of JSON array to save memory
    const csvString = xlsx.utils.sheet_to_csv(worksheet)
    
    if (!csvString || csvString.trim() === '') {
      throw new Error('El archivo Excel está vacío o no se pudo convertir a CSV.')
    }

    // Create a Blob containing the CSV string
    const blob = new Blob([csvString], { type: 'text/csv' })

    // Send the Blob back to the main thread
    self.postMessage({ id, success: true, blob })
  } catch (error) {
    self.postMessage({ id, success: false, error: error.message })
  }
}
