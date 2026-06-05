import { sqlClient } from '@/modules/data/SqlWorkerClient'

/**
 * Validates a SQL expression against a dataset without committing changes
 */
export const testSqlExpression = async (datasetName, expression) => {
  try {
    const tempTableName = `${datasetName}_test`
    const tempTable = `[${tempTableName}]`
    
    // Take a small sample to validate the expression syntax and logic
    const sourceData = await sqlClient.query(`SELECT TOP 1 * FROM [${datasetName}]`)
    
    await sqlClient.createTable(tempTableName, sourceData)
    
    // Try to execute the expression
    const sql = `SELECT ${expression} AS _test_result FROM ${tempTable}`
    const result = await sqlClient.query(sql)
    
    await sqlClient.dropTable(tempTableName)
    
    if (result && result.length > 0) {
      return {
        success: true,
        sampleResult: result[0]._test_result
      }
    }
    
    return { success: false, error: 'No se pudo obtener el resultado' }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
