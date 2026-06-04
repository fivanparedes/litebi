import alasql from 'alasql'

/**
 * Validates a SQL expression against a dataset without committing changes
 */
export const testSqlExpression = (datasetName, expression) => {
  try {
    // Take a small sample to validate the expression syntax and logic
    const tempTableName = `${datasetName}_test`
    const tempTable = `[${tempTableName}]`
    
    alasql(`DROP TABLE IF EXISTS ${tempTable}`)
    alasql(`CREATE TABLE ${tempTable}`)
    
    const sourceData = alasql.tables[datasetName]?.data || []
    if (sourceData.length > 0) {
      alasql.tables[tempTableName].data = [JSON.parse(JSON.stringify(sourceData[0]))]
    } else {
      alasql.tables[tempTableName].data = []
    }
    
    // Try to execute the expression
    const sql = `SELECT ${expression} AS _test_result FROM ${tempTable}`
    const result = alasql(sql)
    
    alasql(`DROP TABLE IF EXISTS ${tempTable}`)
    
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
