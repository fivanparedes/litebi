import { sqlClient } from '@/modules/data/SqlWorkerClient'

export class TransformPipeline {
  /**
   * Use TransformPipeline.create() instead of `new` — the constructor is internal.
   * The factory ensures the temp table is ready before the instance is used.
   */
  constructor(baseDatasetName, originalSchema) {
    this.baseDatasetName = baseDatasetName
    this.originalSchema = [...originalSchema]
    this.steps = []

    // Create a temporary working table
    this.tempTableName = `${this.baseDatasetName}_working`

    // Fix: expose a `ready` promise so callers can await initialisation
    this.ready = this._resetTempTable()
  }

  /**
   * Factory that creates a fully-initialised pipeline.
   * Awaits the async temp-table setup before returning.
   * @param {string} baseDatasetName
   * @param {Array} originalSchema
   * @returns {Promise<TransformPipeline>}
   */
  static async create(baseDatasetName, originalSchema) {
    const instance = new TransformPipeline(baseDatasetName, originalSchema)
    await instance.ready
    return instance
  }

  async addStep(transformId, config) {
    const step = {
      id: `step_${Date.now()}`,
      transformId,
      config,
      enabled: true
    }
    this.steps.push(step)
  }

  async removeStep(stepId) {
    this.steps = this.steps.filter(s => s.id !== stepId)
  }

  async toggleStep(stepId) {
    const step = this.steps.find(s => s.id === stepId)
    if (step) {
      step.enabled = !step.enabled
    }
  }

  async _resetTempTable() {
    await sqlClient.dropTable(this.tempTableName)
    await sqlClient.query(`CREATE TABLE "${this.tempTableName}" AS SELECT * FROM "${this.baseDatasetName}" LIMIT 100`)
  }

  /**
   * Re-evaluates the entire pipeline on the base data asynchronously via worker
   */
  async executePipeline(previewLimit = null) {
    try {
      const result = await sqlClient.executePipeline(
        this.baseDatasetName, 
        this.tempTableName, 
        this.originalSchema, 
        this.steps,
        previewLimit
      )
      return result
    } catch (error) {
      console.error("Pipeline execution error:", error)
      throw error
    }
  }
  
  async getPreviewData(limit = 100) {
    try {
      return await sqlClient.query(`SELECT * FROM "${this.tempTableName}" LIMIT ${limit}`)
    } catch (e) {
      return []
    }
  }

  // Dead code removed: _mapOperator and _formatVal were never called —
  // the actual pipeline runs entirely in the SQL worker.
}
