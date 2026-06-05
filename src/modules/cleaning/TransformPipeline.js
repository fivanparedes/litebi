import { sqlClient } from '@/modules/data/SqlWorkerClient'

export class TransformPipeline {
  constructor(baseDatasetName, originalSchema) {
    this.baseDatasetName = baseDatasetName
    this.originalSchema = [...originalSchema]
    this.steps = []
    
    // Create a temporary working table
    this.tempTableName = `${this.baseDatasetName}_working`
    this._resetTempTable()
  }

  async addStep(transformId, config) {
    const step = {
      id: `step_${Date.now()}`,
      transformId,
      config,
      enabled: true
    }
    this.steps.push(step)
    return await this.executePipeline()
  }

  async removeStep(stepId) {
    this.steps = this.steps.filter(s => s.id !== stepId)
    return await this.executePipeline()
  }

  async toggleStep(stepId) {
    const step = this.steps.find(s => s.id === stepId)
    if (step) {
      step.enabled = !step.enabled
      return await this.executePipeline()
    }
  }

  async _resetTempTable() {
    await sqlClient.dropTable(this.tempTableName)
    await sqlClient.createTable(this.tempTableName)
    const sourceData = await sqlClient.query(`SELECT * FROM [${this.baseDatasetName}]`)
    await sqlClient.createTable(this.tempTableName, sourceData)
  }

  /**
   * Re-evaluates the entire pipeline on the base data asynchronously via worker
   */
  async executePipeline() {
    try {
      const result = await sqlClient.executePipeline(
        this.baseDatasetName, 
        this.tempTableName, 
        this.originalSchema, 
        this.steps
      )
      return result
    } catch (error) {
      console.error("Pipeline execution error:", error)
      throw error
    }
  }
  
  async getPreviewData(limit = 100) {
    try {
      return await sqlClient.query(`SELECT TOP ${limit} * FROM [${this.tempTableName}]`)
    } catch (e) {
      return []
    }
  }

  // Helpers
  _mapOperator(op) {
    const ops = {
      'equals': '=', 'not_equals': '!=', 'greater_than': '>', 'less_than': '<',
      'contains': 'LIKE', 'is_null': 'IS NULL'
    }
    return ops[op] || '='
  }
  
  _formatVal(val) {
    if (typeof val === 'number') return val
    if (val === null) return 'NULL'
    // Escape single quotes for SQL safety
    const escapedVal = String(val).replace(/'/g, "''")
    return `'${escapedVal}'`
  }
}
