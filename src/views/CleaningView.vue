<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Download, Sparkles, Filter, MoreVertical, X, Eye, EyeOff, FileDown, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight, ArrowRight } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDataStore } from '@/stores/dataStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import DragResizer from '@/components/ui/DragResizer.vue'
import { TransformPipeline } from '@/modules/cleaning/TransformPipeline'
import DataGrid from '@/modules/cleaning/DataGrid.vue'
import TransformPanel from '@/modules/cleaning/TransformPanel.vue'
import ColumnList from '@/modules/formulas/ColumnList.vue'
import FormulaEditor from '@/modules/formulas/FormulaEditor.vue'
import { Check } from '@lucide/vue'

const dataStore = useDataStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()
const { t } = useI18n()
const router = useRouter()

const hasData = computed(() => !!dataStore.activeDatasetName)

// Pipeline state
const isExporting = ref(false)

const leftSidebarWidth = ref(250)
const rightSidebarWidth = ref(300)
const isLeftCollapsed = ref(false)
const isRightCollapsed = ref(false)
const pipeline = ref(null)
const previewData = ref([])
const currentSchema = ref([])
const pipelineSteps = ref([])

const updatePreview = async () => {
  if (pipeline.value) {
    // For large datasets, Tabulator pagination + getPreviewData is safer
    // In MVP, we pass the full transformed dataset to Tabulator since AlaSQL is fast
    const result = await pipeline.value.executePipeline()
    previewData.value = result.data
    currentSchema.value = result.schema
    pipelineSteps.value = [...pipeline.value.steps]
    
    // Persist to store
    const meta = dataStore.activeDatasetMeta
    if (meta) {
      meta.transformations = JSON.parse(JSON.stringify(pipeline.value.steps))
      projectStore.markDirty()
    }
  }
}

// Initialize pipeline when dataset changes
watch(() => dataStore.activeDatasetName, async (newName) => {
  if (newName) {
    const meta = dataStore.activeDatasetMeta
    // Fix: await factory to ensure temp table is ready before use
    pipeline.value = await TransformPipeline.create(newName, meta.schema)
    if (meta.transformations && meta.transformations.length > 0) {
      pipeline.value.steps = JSON.parse(JSON.stringify(meta.transformations))
    }
    await updatePreview()
  } else {
    pipeline.value = null
    previewData.value = []
    currentSchema.value = []
    pipelineSteps.value = []
  }
}, { immediate: true })

const handleAddStep = async (transformId, config) => {
  await pipeline.value.addStep(transformId, config)
  await updatePreview()
}

const handleRemoveStep = async (stepId) => {
  await pipeline.value.removeStep(stepId)
  await updatePreview()
}

const handleToggleStep = async (stepId) => {
  await pipeline.value.toggleStep(stepId)
  await updatePreview()
}

const handleApplyTransformations = async () => {
  if (dataStore.activeDatasetName && previewData.value.length > 0) {
    await dataStore.applyTransformations(
      dataStore.activeDatasetName, 
      previewData.value, 
      currentSchema.value,
      pipelineSteps.value
    )
    projectStore.markDirty()
  }
}

// --- Formula Bar Logic ---
const selectedColumn = ref('')
const isComputedColumn = ref(false)
const formulaExpression = ref('')
const newColumnName = ref('')
const showNewColumnInput = ref(false)

const handleColumnSelected = (colName) => {
  selectedColumn.value = colName
  showNewColumnInput.value = false
  
  const step = pipelineSteps.value.find(s => s.transformId === 'add_formula' && s.config.newColumnName === colName)
  if (step) {
    isComputedColumn.value = true
    formulaExpression.value = step.config.expression
  } else {
    isComputedColumn.value = false
    formulaExpression.value = `[${colName}]`
  }
}

const handleSaveFormula = () => {
  if (showNewColumnInput.value) {
    if (!newColumnName.value || !formulaExpression.value) return
    handleAddStep('add_formula', {
      newColumnName: newColumnName.value,
      expression: formulaExpression.value
    })
    showNewColumnInput.value = false
  } else if (isComputedColumn.value && selectedColumn.value) {
    const stepIndex = pipeline.value.steps.findIndex(s => s.transformId === 'add_formula' && s.config.newColumnName === selectedColumn.value)
    if (stepIndex !== -1) {
      pipeline.value.steps[stepIndex].config.expression = formulaExpression.value
      updatePreview()
    }
  }
}

const handleNewColumn = () => {
  selectedColumn.value = ''
  isComputedColumn.value = false
  showNewColumnInput.value = true
  newColumnName.value = 'Nueva Columna'
  formulaExpression.value = ''
}
</script>

<template>
  <div class="view-container">
    <div v-if="!hasData" class="empty-state-wrapper">
      <div class="empty-state">
        <div class="empty-state__icon-wrapper empty-state__icon-wrapper--success">
          <Sparkles class="empty-state__icon" />
        </div>
        <h2 class="empty-state__title">{{ $t('cleaning.noData') }}</h2>
        <p class="empty-state__desc">{{ $t('cleaning.noDataDesc') }}</p>
        
        <div class="empty-state__actions">
          <BaseButton variant="secondary" @click="router.push('/data')">
            <template #icon-right><ArrowRight /></template>
            {{ $t('cleaning.goToData') }}
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div v-else class="cleaning-workspace">
      <!-- Left Panel: Dataset Selection -->
      <aside 
        class="cleaning-datasets-sidebar"
        :style="{ width: isLeftCollapsed ? '48px' : leftSidebarWidth + 'px', position: 'relative' }"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); height: 48px; box-sizing: border-box;">
          <h2 v-if="!isLeftCollapsed" style="font-size: 14px; margin: 0; font-weight: 600;">Datasets</h2>
          <button @click="isLeftCollapsed = !isLeftCollapsed" :title="isLeftCollapsed ? 'Expandir' : 'Colapsar'" style="background: none; border: none; cursor: pointer; display: flex; color: var(--color-text-secondary); padding: 4px; margin-left: auto;">
            <PanelLeft v-if="isLeftCollapsed" />
            <PanelLeftClose v-else />
          </button>
        </div>
        <div v-show="!isLeftCollapsed" style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column;">
          <ColumnList 
            :datasets="Array.from(dataStore.datasets.values())"
            @select-dataset="(name) => dataStore.setActiveDataset(name)"
          />
        </div>
        <DragResizer v-if="!isLeftCollapsed" v-model:width="leftSidebarWidth" :is-right="true" />
      </aside>

      <!-- Middle Panel: Transform Pipeline -->
      <aside 
        class="cleaning-sidebar"
        :style="{ width: isRightCollapsed ? '48px' : rightSidebarWidth + 'px', position: 'relative' }"
      >
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--color-border); height: 48px; box-sizing: border-box;">
          <button @click="isRightCollapsed = !isRightCollapsed" :title="isRightCollapsed ? 'Expandir' : 'Colapsar'" style="background: none; border: none; cursor: pointer; display: flex; color: var(--color-text-secondary); padding: 4px; margin-right: 8px;">
            <PanelRight v-if="isRightCollapsed" />
            <PanelRightClose v-else />
          </button>
          <h2 v-if="!isRightCollapsed" style="font-size: 14px; margin: 0; font-weight: 600; flex-grow: 1;">Transformaciones</h2>
        </div>
        <div v-show="!isRightCollapsed" style="flex-grow: 1; overflow: hidden; display: flex; flex-direction: column;">
          <TransformPanel 
            :pipeline-steps="pipelineSteps"
            :schema="currentSchema"
            @add-step="handleAddStep"
            @remove-step="handleRemoveStep"
            @toggle-step="handleToggleStep"
          />
        </div>
        <DragResizer v-if="!isRightCollapsed" v-model:width="rightSidebarWidth" :is-right="true" />
      </aside>
      
      <!-- Right Panel: Data Grid -->
      <main class="cleaning-main">
        <div class="cleaning-main__header">
          <div class="dataset-info">
            <span class="dataset-name">{{ dataStore.activeDatasetMeta?.originalName }}</span>
            <span class="dataset-stats">{{ previewData.length }} filas • {{ currentSchema.length }} columnas</span>
          </div>
          <BaseButton @click="handleApplyTransformations" variant="primary">
            Guardar Cambios
          </BaseButton>
        </div>
        
        <div class="cleaning-main__grid-container">
          <!-- Formula Bar -->
          <div class="formula-bar-container" v-if="currentSchema.length > 0">
            <div class="formula-bar">
              <span class="formula-icon"><i>fx</i></span>
              
              <div v-if="showNewColumnInput" class="new-col-inputs">
                <input v-model="newColumnName" class="new-col-name" placeholder="Nombre..." />
                <span>=</span>
              </div>
              
              <div class="formula-editor-wrapper" :class="{'is-readonly': !isComputedColumn && !showNewColumnInput}">
                <FormulaEditor 
                  v-model="formulaExpression" 
                  :schema="currentSchema" 
                />
              </div>
              
              <button 
                class="formula-save-btn" 
                :disabled="(!isComputedColumn && !showNewColumnInput) || !formulaExpression"
                @click="handleSaveFormula"
                title="Guardar Fórmula"
              >
                <Check />
              </button>
            </div>
            <BaseButton variant="ghost" size="sm" @click="handleNewColumn" style="flex-shrink: 0;">+ Nueva Columna</BaseButton>
          </div>

          <div class="cleaning-main__grid">
            <DataGrid 
              v-if="currentSchema.length > 0"
              :data="previewData" 
              :schema="currentSchema" 
              @column-selected="handleColumnSelected"
            />
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  display: flex;
}

/* Empty State */
.empty-state-wrapper {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.empty-state {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: slideUpFade 0.5s ease-out forwards;
}

.empty-state__icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
}

.empty-state__icon-wrapper--success { background-color: var(--color-success-light); }
.empty-state__icon-wrapper--success .empty-state__icon { color: var(--color-success); }
.empty-state__icon { width: 40px; height: 40px; }
.empty-state__title { font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-3); }
.empty-state__desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8); }
.empty-state__actions { display: flex; justify-content: center; width: 100%; }

/* Workspace */
.cleaning-workspace {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cleaning-datasets-sidebar {
  background-color: var(--color-bg-primary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cleaning-sidebar {
  background-color: var(--color-bg-primary);
  border-left: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.cleaning-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: var(--space-4);
  gap: var(--space-4);
  background-color: var(--color-bg-primary);
}

.cleaning-main__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.dataset-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dataset-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.dataset-stats {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.cleaning-main__grid-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.formula-bar-container {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-3);
}

.formula-bar {
  flex-grow: 1;
  display: flex;
  align-items: stretch;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  height: 36px;
}

.formula-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-3);
  background-color: var(--color-bg-secondary);
  border-right: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
  font-weight: bold;
  font-style: italic;
}

.new-col-inputs {
  display: flex;
  align-items: center;
  border-right: 1px solid var(--color-border);
}

.new-col-name {
  border: none;
  background: transparent;
  padding: 0 var(--space-2);
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  outline: none;
  width: 120px;
}

.new-col-inputs span {
  padding-right: var(--space-2);
  color: var(--color-text-secondary);
}

.formula-editor-wrapper {
  flex-grow: 1;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.formula-editor-wrapper :deep(.cm-editor) {
  height: 100%;
  width: 100%;
}

.formula-editor-wrapper :deep(.cm-scroller) {
  align-items: center;
  display: flex;
}

.formula-editor-wrapper.is-readonly {
  opacity: 0.7;
  pointer-events: none;
}

.formula-save-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 var(--space-3);
  background: transparent;
  border: none;
  border-left: 1px solid var(--color-border);
  color: var(--color-success);
  cursor: pointer;
  transition: all 0.2s;
}

.formula-save-btn:disabled {
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.formula-save-btn:not(:disabled):hover {
  background-color: var(--color-success-light);
}

.formula-save-btn svg {
  width: 16px;
  height: 16px;
}

.cleaning-main__grid {
  flex-grow: 1;
  overflow: hidden;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
