/**
 * Umbral por defecto para inferencia de tipo: si ≥80% de los valores
 * no nulos coinciden con un tipo, se infiere ese tipo para la columna.
 * @type {number}
 */
export const DEFAULT_TYPE_THRESHOLD = 0.8

/**
 * Regex estricta para fechas válidas.
 * Acepta:
 *  - ISO 8601: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss (con fracción y/o Z opcionales)
 *  - Formato día/mes/año: DD/MM/YYYY
 *  - Formato mes/día/año: MM/DD/YYYY
 *
 * NO usa Date.parse() para evitar falsos positivos ('1', 'true', etc.).
 * @type {RegExp}
 */
const STRICT_DATE_REGEX = /^(?:\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?Z?)?|(?:0[1-9]|[12]\d|3[01])\/(?:0[1-9]|1[0-2])\/\d{4}|(?:0[1-9]|1[0-2])\/(?:0[1-9]|[12]\d|3[01])\/\d{4})$/

/**
 * Infers the data types of columns in a dataset by sampling rows.
 * Uses a configurable threshold so a few stray values don't force
 * the entire column to `string`.
 *
 * @param {Array<Object>} data - Array of row objects
 * @param {Object}  [options]                   - Optional settings
 * @param {number}  [options.sampleSize=100]     - Number of rows to sample
 * @param {number}  [options.typeThreshold=0.8]  - Fraction (0-1) of non-null values
 *   that must match a type for it to be inferred (e.g. 0.8 = 80%)
 * @returns {Array<Object>} Schema definition array
 */
export const inferSchema = (data, { sampleSize = 100, typeThreshold = DEFAULT_TYPE_THRESHOLD } = {}) => {
  if (!data || data.length === 0) return []

  const columns = Object.keys(data[0])
  const schema = columns.map(col => ({
    name: col,
    type: 'string', // default
    isNullable: false
  }))

  const rowsToCheck = Math.min(data.length, sampleSize)
  
  // Track potential types for each column
  const typeCounters = columns.reduce((acc, col) => {
    acc[col] = { number: 0, boolean: 0, date: 0, string: 0, null: 0 }
    return acc
  }, {})

  // Fix: se usa STRICT_DATE_REGEX en vez de Date.parse() para evitar falsos positivos

  for (let i = 0; i < rowsToCheck; i++) {
    const row = data[i]
    
    for (const col of columns) {
      const val = row[col]
      
      if (val === null || val === undefined || val === '') {
        typeCounters[col].null++
        continue
      }
      
      if (typeof val === 'number') {
        typeCounters[col].number++
      } else if (typeof val === 'boolean') {
        typeCounters[col].boolean++
      } else if (typeof val === 'string') {
        // Check if string is actually a number
        if (!isNaN(Number(val)) && val.trim() !== '') {
          typeCounters[col].number++
        }
        // Check if string is a date — regex-only, no Date.parse()
        else if (STRICT_DATE_REGEX.test(val)) {
          typeCounters[col].date++
        } else {
          typeCounters[col].string++
        }
      }
    }
  }

  // Determinar tipo final usando umbral configurable en vez de exigir 100%
  return schema.map(colDef => {
    const counts = typeCounters[colDef.name]
    const totalNonNull = rowsToCheck - counts.null
    
    colDef.isNullable = counts.null > 0

    if (totalNonNull === 0) {
      colDef.type = 'string'
    } else {
      const ratios = {
        number:  counts.number  / totalNonNull,
        boolean: counts.boolean / totalNonNull,
        date:    counts.date    / totalNonNull,
      }

      // Prioridad: date > boolean > number > string
      if (ratios.date >= typeThreshold) {
        colDef.type = 'date'
      } else if (ratios.boolean >= typeThreshold) {
        colDef.type = 'boolean'
      } else if (ratios.number >= typeThreshold) {
        colDef.type = 'number'
      } else {
        colDef.type = 'string'
      }
    }
    
    return colDef
  })
}

/**
 * Convierte cadenas de fecha en formato DD/MM/YYYY o MM/DD/YYYY a ISO 8601.
 * Si el valor ya está en ISO, lo devuelve tal cual.
 *
 * @param {string} val - Cadena de fecha
 * @returns {string} Fecha en formato ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss…)
 */
const toISODate = (val) => {
  // Ya es ISO 8601 (YYYY-MM-…)
  if (/^\d{4}-/.test(val)) return val

  // DD/MM/YYYY o MM/DD/YYYY → intentar DD/MM/YYYY primero
  const parts = val.split('/')
  if (parts.length === 3) {
    const [a, b, year] = parts
    // Si el primer segmento > 12, asumimos DD/MM/YYYY
    if (Number(a) > 12) {
      return `${year}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`
    }
    // Caso ambiguo o MM/DD/YYYY
    return `${year}-${a.padStart(2, '0')}-${b.padStart(2, '0')}`
  }

  return val
}

/**
 * Coerces dataset values to match the inferred schema types.
 * Handles `number`, `boolean`, and `date` conversions.
 *
 * @param {Array<Object>} data   - Array of row objects
 * @param {Array<Object>} schema - Schema as returned by `inferSchema`
 * @returns {Array<Object>} New array with coerced values
 */
export const coerceData = (data, schema) => {
  return data.map(row => {
    const newRow = { ...row }
    schema.forEach(col => {
      const val = newRow[col.name]
      if (val === null || val === undefined || val === '') {
        newRow[col.name] = null
        return
      }
      
      if (col.type === 'number' && typeof val !== 'number') {
        newRow[col.name] = Number(val)
      } else if (col.type === 'boolean' && typeof val !== 'boolean') {
        newRow[col.name] = val === 'true' || val === '1' || val === 1 || val === true
      } else if (col.type === 'date' && typeof val === 'string') {
        // Convertir cadenas de fecha a formato ISO 8601
        newRow[col.name] = toISODate(val)
      }
    })
    return newRow
  })
}
