import { sqlClient } from '@/modules/data/SqlWorkerClient'

/** Límite máximo de caracteres permitidos en una expresión SQL */
const MAX_EXPRESSION_LENGTH = 5000

/**
 * Patrones de error comunes de AlaSQL mapeados a mensajes amigables en español.
 * Cada entrada es un par [RegExp, mensaje traducido].
 * @type {Array<[RegExp, string]>}
 */
const ERROR_TRANSLATIONS = [
  [/Unexpected token/i, 'Error de sintaxis en la fórmula. Verifique paréntesis y operadores.'],
  [/Column .* not found/i, 'La columna especificada no existe en el dataset.'],
  [/Table .* already exists/i, 'La tabla temporal ya existe. Intente nuevamente.'],
  [/Table .* does not exist/i, 'El dataset especificado no fue encontrado.'],
  [/Division by zero/i, 'Error de división por cero en la fórmula.'],
  [/Unknown function/i, 'La función utilizada no es reconocida.'],
  [/Parse error/i, 'Error al analizar la expresión. Verifique la sintaxis.'],
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
export const testSqlExpression = async (datasetName, expression) => {
  // Rechazar expresiones que excedan el límite de longitud
  if (expression && expression.length > MAX_EXPRESSION_LENGTH) {
    return {
      success: false,
      error: `La expresión excede el límite de ${MAX_EXPRESSION_LENGTH} caracteres.`,
    }
  }

  const tempTableName = `${datasetName}_test`
  const tempTable = `[${tempTableName}]`

  try {
    // Take a small sample to validate the expression syntax and logic
    const sourceData = await sqlClient.query(`SELECT TOP 1 * FROM [${datasetName}]`)

    await sqlClient.createTable(tempTableName, sourceData)

    // Try to execute the expression
    const sql = `SELECT ${expression} AS _test_result FROM ${tempTable}`
    const result = await sqlClient.query(sql)

    if (result && result.length > 0) {
      return {
        success: true,
        sampleResult: result[0]._test_result,
      }
    }

    return { success: false, error: 'No se pudo obtener el resultado' }
  } catch (error) {
    return {
      success: false,
      error: translateError(error.message),
    }
  } finally {
    // Fix: siempre eliminar la tabla temporal para evitar fugas de memoria,
    // incluso si sqlClient.query() lanza un error.
    try {
      await sqlClient.dropTable(tempTableName)
    } catch {
      // Ignorar errores al eliminar la tabla temporal (puede no existir si
      // createTable falló antes de crearla).
    }
  }
}
