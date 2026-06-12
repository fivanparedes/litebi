import { sqlClient } from '@/modules/data/SqlWorkerClient'

/** Límite máximo de caracteres permitidos en una expresión SQL */
const MAX_EXPRESSION_LENGTH = 5000

/**
 * Patrones de error comunes de AlaSQL mapeados a mensajes amigables en español.
 * Cada entrada es un par [RegExp, mensaje traducido].
 * @type {Array<[RegExp, string]>}
 */
const ERROR_TRANSLATIONS = [
  [/Unexpected token/i, 'Error de sintaxis: carácter inesperado o falta de paréntesis.'],
  [/Column .* not found/i, 'La columna especificada no existe. Verifica que esté escrita exactamente igual y entre [Corchetes].'],
  [/Table .* already exists/i, 'La tabla temporal ya existe. Intente nuevamente.'],
  [/Table .* does not exist/i, 'El dataset especificado no fue encontrado.'],
  [/Division by zero/i, 'Error de división por cero en la fórmula. Usa NULLIF(col, 0).'],
  [/Unknown function/i, 'Función no reconocida. Revisa el Manual de Fórmulas.'],
  [/Parse error/i, 'Error de sintaxis: Falta un paréntesis, un operador (+, -, *), o hay un corchete sin cerrar.'],
  [/is not a function/i, 'La función SQL contiene argumentos inválidos o tipos de datos incorrectos.'],
  [/Cannot read properties of undefined/i, 'Error interno al evaluar los datos. Verifica que no estés usando variables o columnas inexistentes.']
]

/**
 * Traduce un mensaje de error de AlaSQL a un mensaje amigable en español.
 * Si el mensaje no coincide con ningún patrón conocido, se devuelve tal cual.
 *
 * @param {string} message - Mensaje de error original de AlaSQL
 * @returns {string} Mensaje traducido o el original si no hay coincidencia
 */
const translateError = (message) => {
  if (!message) return 'Error desconocido al evaluar la expresión.'

  for (const [pattern, translation] of ERROR_TRANSLATIONS) {
    if (pattern.test(message)) {
      return translation
    }
  }

  return message
}

/**
 * Valida una expresión SQL contra un dataset sin confirmar cambios.
 * Crea una tabla temporal con una muestra del dataset, ejecuta la expresión
 * y devuelve el resultado de la validación.
 *
 * @param {string} datasetName - Nombre del dataset origen
 * @param {string} expression - Expresión SQL a validar
 * @returns {Promise<{success: boolean, sampleResult?: *, error?: string}>}
 *   Objeto con el resultado de la validación
 */
export const testSqlExpression = async (datasetName, expression, mode = 'columna', columnName = 'Prueba') => {
  // Rechazar expresiones que excedan el límite de longitud
  if (expression && expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      success: false,
      error: `La expresión excede el límite de ${MAX_EXPRESSION_LENGTH} caracteres.`,
    }
  }

  const safeColName = columnName || 'Prueba'

  try {
    let sql;
    if (mode === 'metrica') {
      sql = `SELECT ${expression} AS "${safeColName}" FROM "${datasetName}"`
    } else {
      sql = `SELECT ${expression} AS "${safeColName}" FROM "${datasetName}"`
    }
    
    const result = await sqlClient.query(sql)

    if (result && result.length > 0) {
      return {
        success: true,
        sampleResult: result,
        mode,
        columnName: safeColName
      }
    }

    return { success: false, error: 'No se pudo obtener el resultado' }
  } catch (error) {
    return {
      success: false,
      error: translateError(error.message),
    }
  }
}
