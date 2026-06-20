<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Download, Sparkles, Filter, MoreVertical, X, Eye, EyeOff, FileDown, PanelLeftClose, PanelRightClose, PanelLeft, PanelRight, ArrowRight, Database, Plus, Check, Type, Hash, Calendar, ToggleLeft } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import { useDataStore } from '@/stores/dataStore'
import { useProjectStore } from '@/stores/projectStore'
import { useUiStore } from '@/stores/uiStore'
import { TransformPipeline } from '@/modules/cleaning/TransformPipeline'
import DataGrid from '@/modules/cleaning/DataGrid.vue'
import TransformPanel from '@/modules/cleaning/TransformPanel.vue'
import FormulaBar from '@/components/ui/FormulaBar.vue'

const dataStore = useDataStore()
const projectStore = useProjectStore()
const uiStore = useUiStore()
const { t } = useI18n()
const router = useRouter()

const hasData = computed(() => !!dataStore.activeDatasetName)

const getIconForType = (type) => {
  if (!type) return Type
  const t = type.toUpperCase()
  if (t === 'VARCHAR' || t === 'TEXT' || t === 'STRING') return Type
  if (t === 'INTEGER' || t === 'BIGINT' || t === 'DOUBLE' || t === 'DECIMAL' || t === 'NUMERIC' || t === 'NUMBER') return Hash
  if (t === 'DATE' || t === 'TIMESTAMP' || t === 'DATETIME' || t === 'TIME') return Calendar
  if (t === 'BOOLEAN') return ToggleLeft
  return Type
}

const pipeline = ref(null)
const previewData = ref([])
const currentSchema = ref([])
const pipelineSteps = ref([])

const activeStepId = ref(null)
const formulaText = ref('')
const isAddingStep = ref(false)

const selectedTransform = ref('filter')
const stepConfig = ref({ column: '', operator: 'equals', value: '', direction: 'ASC' })

const transformOptions = computed(() => [
  { value: 'filter', label: t('cleaningView.transforms.filter') },
  { value: 'sort', label: t('cleaningView.transforms.sort') },
  { value: 'remove_column', label: t('cleaningView.transforms.remove_column') },
  { value: 'remove_nulls', label: t('cleaningView.transforms.remove_nulls') },
  { value: 'replace_value', label: t('cleaningView.transforms.replace_value') },
  { value: 'fill_nulls', label: t('cleaningView.transforms.fill_nulls') },
  { value: 'text_transform', label: t('cleaningView.transforms.text_transform') },
  { value: 'remove_duplicates', label: t('cleaningView.transforms.remove_duplicates') },
  { value: 'extract_date', label: t('cleaningView.transforms.extract_date') },
  { value: 'date_diff', label: t('cleaningView.transforms.date_diff') },
  { value: 'date_add', label: t('cleaningView.transforms.date_add') },
  { value: 'groupby', label: t('cleaningView.transforms.groupby') },
  { value: 'split', label: t('cleaningView.transforms.split') },
  { value: 'cast', label: t('cleaningView.transforms.cast') },
  { value: 'add_formula', label: t('cleaningView.transforms.add_formula') }
])

const columnOptions = computed(() => {
  return currentSchema.value.map(c => ({ value: c.name, label: c.name }))
})

const updatePreview = async () => {
  if (pipeline.value) {
    const result = await pipeline.value.executePipeline()
    previewData.value = result.data
    currentSchema.value = result.schema
    pipelineSteps.value = [...pipeline.value.steps]
    
    const meta = dataStore.activeDatasetMeta
    if (meta) {
      meta.transformations = JSON.parse(JSON.stringify(pipeline.value.steps))
      projectStore.markDirty()
    }
  }
}

const syncPipelineSteps = () => {
  if (pipeline.value) {
    pipelineSteps.value = [...pipeline.value.steps]
    const meta = dataStore.activeDatasetMeta
    if (meta) {
      meta.transformations = JSON.parse(JSON.stringify(pipeline.value.steps))
      projectStore.markDirty()
    }
  }
}

watch(() => uiStore.runPipelineTrigger, async () => {
  await updatePreview(null)
  uiStore.addToast({ message: t('header.pipelineExecuted', 'Pipeline Executed'), type: 'success' })
})

const initPipeline = async () => {
  const newName = dataStore.activeDatasetName
  const meta = dataStore.activeDatasetMeta
  if (newName && meta) {
    pipeline.value = await TransformPipeline.create(newName, meta.schema)
    if (meta.transformations && meta.transformations.length > 0) {
      pipeline.value.steps = JSON.parse(JSON.stringify(meta.transformations))
    }
    await updatePreview(100)
  }
}

watch(() => dataStore.activeDatasetName, async (newName) => {
  if (newName) {
    await initPipeline()
  } else {
    pipeline.value = null
    previewData.value = []
    currentSchema.value = []
    pipelineSteps.value = []
  }
}, { immediate: true })

const initNewStep = () => {
  activeStepId.value = null
  isAddingStep.value = true
  selectedTransform.value = 'filter'
  stepConfig.value = { 
    column: '', 
    operator: 'equals', 
    value: '', 
    direction: 'ASC',
    oldValue: '',
    newValue: '',
    newColumnName: '',
    expression: '',
    method: 'fixed',
    operation: 'trim',
    columnsText: '',
    columns: [],
    component: 'year',
    columnEnd: '',
    unit: 'days',
    offsetValue: '1',
    groupMetric: '',
    groupOperation: 'SUM',
    separator: '',
    newColumnsText: '',
    newColumns: [],
    castType: 'string'
  }
}

const selectStep = (step) => {
  isAddingStep.value = false
  activeStepId.value = step.id
  selectedTransform.value = step.transformId
  
  const configCopy = { ...step.config }
  if (step.transformId === 'remove_duplicates' && Array.isArray(configCopy.columns)) {
    configCopy.columnsText = configCopy.columns.join(', ')
  }
  if (step.transformId === 'split' && Array.isArray(configCopy.newColumns)) {
    configCopy.newColumnsText = configCopy.newColumns.join(', ')
  }
  stepConfig.value = configCopy
}

const saveActiveStep = async () => {
  const finalConfig = { ...stepConfig.value }
  if (selectedTransform.value === 'remove_duplicates') {
    finalConfig.columns = finalConfig.columnsText
      ? finalConfig.columnsText.split(',').map(s => s.trim())
      : []
  }
  if (selectedTransform.value === 'split') {
    finalConfig.newColumns = finalConfig.newColumnsText
      ? finalConfig.newColumnsText.split(',').map(s => s.trim())
      : []
  }

  if (isAddingStep.value) {
    await pipeline.value.addStep(selectedTransform.value, finalConfig)
  } else if (activeStepId.value) {
    const step = pipeline.value.steps.find(s => s.id === activeStepId.value)
    if (step) {
      step.transformId = selectedTransform.value
      step.config = finalConfig
    }
  }
  isAddingStep.value = false
  activeStepId.value = null
  syncPipelineSteps()
}

const handleRemoveStep = async (stepId) => {
  await pipeline.value.removeStep(stepId)
  if (activeStepId.value === stepId) activeStepId.value = null
  syncPipelineSteps()
}

const handleToggleStep = async (stepId) => {
  await pipeline.value.toggleStep(stepId)
  syncPipelineSteps()
}

const activeStepValidation = computed(() => {
  if (!activeStepId.value && !isAddingStep.value) return null
  return 'PASS'
})

const activeStepCost = computed(() => {
  if (!activeStepId.value && !isAddingStep.value) return '0.0s'
  const ds = dataStore.activeDatasetMeta
  const rows = ds ? ds.rowCount : 1000
  let costPer1k = 0.001
  if (selectedTransform.value === 'remove_duplicates') costPer1k = 0.005
  else if (selectedTransform.value === 'split') costPer1k = 0.003
  else if (selectedTransform.value === 'add_formula') costPer1k = 0.004
  return Math.max(0.01, (rows / 1000) * costPer1k).toFixed(2) + 's'
})

const selectedColumnName = ref('')

const expandedDatasets = ref(new Set())
const toggleDataset = (name) => {
  const newSet = new Set(expandedDatasets.value)
  if (newSet.has(name)) newSet.delete(name)
  else newSet.add(name)
  expandedDatasets.value = newSet
}
const isExpanded = (name) => expandedDatasets.value.has(name)

onMounted(() => {
  if (dataStore.activeDatasetName) {
    expandedDatasets.value.add(dataStore.activeDatasetName)
  }
})

const handleSelectColumn = (col) => {
  selectedColumnName.value = col.name
  formulaText.value = `"${col.name}"`
}
</script>

<template>
  <div class="flex flex-col h-full bg-background overflow-hidden relative">
    <div v-if="!hasData" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-[480px] flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="w-20 h-20 rounded-full bg-success-light flex items-center justify-center mb-6">
          <Sparkles class="w-10 h-10 text-success" />
        </div>
        <h2 class="text-xl font-semibold mb-3">{{ $t('cleaning.noData') }}</h2>
        <p class="text-sm text-muted-foreground mb-8">{{ $t('cleaning.noDataDesc') }}</p>
        <BaseButton variant="outline" @click="router.push('/data')">
          <template #icon-right><ArrowRight /></template>
          {{ $t('cleaning.goToData') }}
        </BaseButton>
      </div>
    </div>
    
    <div v-else class="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
      <FormulaBar 
        v-model="formulaText" 
        v-model:column-name="selectedColumnName"
        lang="SQL"
        @insert-function="initNewStep"
      />
      <div class="flex-1 grid grid-cols-[260px_1fr_320px] gap-4 min-h-0">
      <!-- Left Panel: Source schema -->
      <div class="bg-card border border-border flex flex-col shadow-none rounded-none overflow-hidden">
        <div class="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
          <h3 class="font-semibold text-sm tracking-tight text-foreground">{{ $t('cleaningView.sourceSchema') }}</h3>
        </div>
        <div class="flex-1 overflow-y-auto p-4 text-xs space-y-4">
          <div v-for="ds in dataStore.datasetList" :key="ds.name">
            <div class="flex items-center gap-2 font-medium py-1 text-foreground cursor-pointer hover:text-primary" @click="toggleDataset(ds.name)">
              <svg v-if="!isExpanded(ds.name)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-muted-foreground"><polyline points="9 18 15 12 9 6"></polyline></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-muted-foreground"><polyline points="6 9 12 15 18 9"></polyline></svg>
              <Database class="w-4 h-4 text-primary" />
              <span class="truncate">{{ ds.originalName || ds.name }}</span>
              <span v-if="isExpanded(ds.name)" class="ml-auto text-muted-foreground">{{ ds.schema?.length || 0 }} cols</span>
            </div>
            <div v-if="isExpanded(ds.name)" class="ml-2 border-l-2 border-border pl-3 mt-1 space-y-2 text-muted-foreground">
              <div v-for="col in (ds.schema || [])" :key="col.name" class="flex items-center justify-between py-0.5 hover:text-foreground cursor-pointer" @click="handleSelectColumn(col)">
                <div class="flex items-center gap-2 truncate">
                  <component :is="getIconForType(col.type)" class="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span class="truncate text-sm">{{ col.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Middle Panel: Pipeline & DataGrid -->
      <div class="bg-card border border-border flex flex-col shadow-none rounded-none flex-1 overflow-hidden min-h-0">
        <!-- Pipeline List -->
        <div class="flex flex-col shrink-0" style="max-height: 50%;">
          <div class="px-4 py-3 border-b border-border flex items-center justify-between shrink-0 bg-muted/20">
            <div>
              <h3 class="font-semibold text-sm tracking-tight text-foreground">{{ $t('cleaningView.pipeline') }}</h3>
              <p class="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{{ $t('cleaningView.pipelineDesc') }}</p>
            </div>
            <BaseButton variant="outline" size="sm" @click="initNewStep">
              <template #icon-left><Plus class="w-3.5 h-3.5" /></template>
              {{ $t('cleaningView.addStep') }}
            </BaseButton>
          </div>
          <div class="flex-1 overflow-y-auto bg-muted/10">
            <TransformPanel 
              :pipeline-steps="pipelineSteps"
              :schema="currentSchema"
              :active-step-id="activeStepId"
              @remove-step="handleRemoveStep"
              @toggle-step="handleToggleStep"
              @select-step="selectStep"
            />
          </div>
        </div>

        <!-- Preview Grid -->
        <div class="flex flex-col flex-1 overflow-hidden border-t border-border">
          <div class="px-4 py-2 border-b border-border bg-muted/20 text-xs flex items-center justify-between shrink-0">
            <span class="font-semibold text-xs tracking-tight text-foreground">{{ $t('cleaningView.previewLastStep') }}</span>
            <span class="text-muted-foreground">{{ previewData.length }} {{ $t('cleaningView.rows') }}</span>
          </div>
          <div class="flex-1 relative overflow-hidden bg-background">
            <DataGrid 
              v-if="currentSchema.length > 0"
              :data="previewData" 
              :schema="currentSchema" 
            />
          </div>
        </div>
      </div>

      <!-- Right Panel: Step configuration -->
      <div class="bg-card border border-border flex flex-col shadow-none rounded-none overflow-hidden">
        <div class="px-4 py-3 border-b border-border shrink-0 bg-muted/20">
          <h3 class="font-semibold text-sm tracking-tight text-foreground">{{ $t('cleaningView.stepConfig') }}</h3>
          <p class="text-[10px] uppercase tracking-wider text-muted-foreground mt-0.5">{{ isAddingStep ? $t('cleaningView.addStepDesc') : activeStepId ? $t('cleaningView.editStepDesc') : $t('cleaningView.noStepDesc') }}</p>
        </div>
        
        <div class="flex-1 overflow-y-auto p-4 text-sm bg-card">
          <div v-if="!isAddingStep && !activeStepId" class="flex flex-col items-center justify-center h-40 text-muted-foreground text-center whitespace-pre-line">
            <Filter class="w-8 h-8 mb-3 opacity-20" />
            <p class="text-xs">{{ $t('cleaningView.selectStepHint') }}</p>
          </div>
          
          <div v-else class="flex flex-col gap-4">
            <div class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.opType') }}</label>
              <BaseDropdown v-model="selectedTransform" :options="transformOptions" />
            </div>
            
            <div v-if="selectedTransform !== 'remove_duplicates' && selectedTransform !== 'date_diff'" class="space-y-1.5">
              <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.sourceCol') }}</label>
              <BaseDropdown v-model="stepConfig.column" :options="columnOptions" :placeholder="$t('cleaningView.placeholders.selectColumn')" />
            </div>
            
            <template v-if="selectedTransform === 'filter'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.condition') }}</label>
                <div class="flex gap-2">
                  <BaseDropdown v-model="stepConfig.operator" class="flex-1" :options="[{value:'equals',label: $t('cleaningView.filterOps.equals') },{value:'not_equals',label: $t('cleaningView.filterOps.not_equals') },{value:'greater_than',label: $t('cleaningView.filterOps.greater_than') },{value:'less_than',label: $t('cleaningView.filterOps.less_than') },{value:'contains',label: $t('cleaningView.filterOps.contains') },{value:'is_null',label: $t('cleaningView.filterOps.is_null') }]" />
                  <BaseInput v-model="stepConfig.value" class="flex-[2]" :placeholder="$t('cleaningView.placeholders.value')" />
                </div>
              </div>
            </template>
            
            <template v-if="selectedTransform === 'sort'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.direction') }}</label>
                <BaseDropdown v-model="stepConfig.direction" :options="[{value:'ASC',label: $t('cleaningView.sortOps.asc') },{value:'DESC',label: $t('cleaningView.sortOps.desc') }]" />
              </div>
            </template>
            
            <template v-if="selectedTransform === 'replace_value'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.valueToReplace') }}</label>
                <BaseInput v-model="stepConfig.oldValue" :placeholder="$t('cleaningView.placeholders.replaceOld')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.newValue') }}</label>
                <BaseInput v-model="stepConfig.newValue" :placeholder="$t('cleaningView.placeholders.replaceNew')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'fill_nulls'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.method') }}</label>
                <BaseDropdown
v-model="stepConfig.method" :options="[
                  {value:'fixed',label: $t('cleaningView.fillOps.fixed') },
                  {value:'ffill',label: $t('cleaningView.fillOps.ffill') },
                  {value:'mean',label: $t('cleaningView.fillOps.mean') }
                ]" />
              </div>
              <div v-if="stepConfig.method === 'fixed'" class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.fillValue') }}</label>
                <BaseInput v-model="stepConfig.value" :placeholder="$t('cleaningView.placeholders.value')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'text_transform'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.operation') }}</label>
                <BaseDropdown
v-model="stepConfig.operation" :options="[
                  {value:'trim',label: $t('cleaningView.textOps.trim') },
                  {value:'upper',label: $t('cleaningView.textOps.upper') },
                  {value:'lower',label: $t('cleaningView.textOps.lower') }
                ]" />
              </div>
            </template>

            <template v-if="selectedTransform === 'remove_duplicates'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.evalCols') }}</label>
                <BaseInput v-model="stepConfig.columnsText" :placeholder="$t('cleaningView.placeholders.evalCols')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'extract_date'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.extractComponent') }}</label>
                <BaseDropdown
v-model="stepConfig.component" :options="[
                  {value:'year',label: $t('cleaningView.dateComponents.year') },
                  {value:'month',label: $t('cleaningView.dateComponents.month') },
                  {value:'day',label: $t('cleaningView.dateComponents.day') }
                ]" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.newColName') }}</label>
                <BaseInput v-model="stepConfig.newColumnName" :placeholder="$t('cleaningView.placeholders.newColDate')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'date_diff'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.startDateCol') }}</label>
                <BaseDropdown v-model="stepConfig.column" :options="columnOptions" :placeholder="$t('cleaningView.placeholders.selectColumn')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.endDateCol') }}</label>
                <BaseDropdown v-model="stepConfig.columnEnd" :options="columnOptions" :placeholder="$t('cleaningView.placeholders.selectColumn')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.unit') }}</label>
                <BaseDropdown
v-model="stepConfig.unit" :options="[
                  {value:'days',label: $t('cleaningView.dateUnits.days') },
                  {value:'months',label: $t('cleaningView.dateUnits.months') },
                  {value:'years',label: $t('cleaningView.dateUnits.years') }
                ]" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.newColName') }}</label>
                <BaseInput v-model="stepConfig.newColumnName" :placeholder="$t('cleaningView.placeholders.newColDiff')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'date_add'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.offsetAmount') }}</label>
                <BaseInput v-model="stepConfig.offsetValue" :placeholder="$t('cleaningView.placeholders.offsetValue')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.unit') }}</label>
                <BaseDropdown
v-model="stepConfig.unit" :options="[
                  {value:'days',label: $t('cleaningView.dateUnits.days') },
                  {value:'months',label: $t('cleaningView.dateUnits.months') },
                  {value:'years',label: $t('cleaningView.dateUnits.years') }
                ]" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.newColName') }}</label>
                <BaseInput v-model="stepConfig.newColumnName" :placeholder="$t('cleaningView.placeholders.newColOffset')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'groupby'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.metricCol') }}</label>
                <BaseDropdown v-model="stepConfig.groupMetric" :options="columnOptions" :placeholder="$t('cleaningView.placeholders.selectColumn')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.aggregation') }}</label>
                <BaseDropdown
v-model="stepConfig.groupOperation" :options="[
                  {value:'SUM',label: $t('cleaningView.aggregations.sum') },
                  {value:'AVG',label: $t('cleaningView.aggregations.avg') },
                  {value:'COUNT',label: $t('cleaningView.aggregations.count') },
                  {value:'MIN',label: $t('cleaningView.aggregations.min') },
                  {value:'MAX',label: $t('cleaningView.aggregations.max') }
                ]" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.newColName') }}</label>
                <BaseInput v-model="stepConfig.newColumnName" :placeholder="$t('cleaningView.placeholders.newColGroup')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'split'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.separator') }}</label>
                <BaseInput v-model="stepConfig.separator" :placeholder="$t('cleaningView.placeholders.separator')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.generatedCols') }}</label>
                <BaseInput v-model="stepConfig.newColumnsText" :placeholder="$t('cleaningView.placeholders.generatedCols')" />
              </div>
            </template>

            <template v-if="selectedTransform === 'cast'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.targetDataType') }}</label>
                <BaseDropdown
v-model="stepConfig.castType" :options="[
                  {value:'string',label: $t('cleaningView.castTypes.string') },
                  {value:'integer',label: $t('cleaningView.castTypes.integer') },
                  {value:'decimal',label: $t('cleaningView.castTypes.decimal') },
                  {value:'date',label: $t('cleaningView.castTypes.date') },
                  {value:'boolean',label: $t('cleaningView.castTypes.boolean') }
                ]" />
              </div>
            </template>
            
            <template v-if="selectedTransform === 'add_formula'">
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.newColName') }}</label>
                <BaseInput v-model="stepConfig.newColumnName" :placeholder="$t('cleaningView.placeholders.newColFormula')" />
              </div>
              <div class="space-y-1.5">
                <label class="text-xs font-medium text-muted-foreground">{{ $t('cleaningView.sqlExpression') }}</label>
                <textarea v-model="stepConfig.expression" rows="3" class="w-full text-sm font-mono p-2 bg-background border border-border rounded-none focus:outline-none focus:border-primary" :placeholder="$t('cleaningView.placeholders.sqlExpression')"></textarea>
              </div>
            </template>
            
            <div class="pt-4 mt-2 border-t border-border flex justify-end gap-2">
              <BaseButton variant="ghost" size="sm" @click="isAddingStep = false; activeStepId = null">{{ $t('cleaningView.cancel') }}</BaseButton>
              <BaseButton variant="primary" size="sm" @click="saveActiveStep">{{ $t('cleaningView.applyRules') }}</BaseButton>
            </div>
          </div>
          
          <div v-if="(activeStepId || isAddingStep) && selectedTransform" class="mt-8 pt-4 border-t border-border space-y-3 text-xs text-muted-foreground">
            <div class="flex justify-between items-center">
              <span>{{ $t('cleaningView.validation') }}</span>
              <span v-if="activeStepValidation === 'PASS'" class="bg-success/10 text-success border border-success/20 px-1.5 py-0.5 rounded-none text-[10px] font-semibold tracking-wider">{{ $t('cleaningView.passes') || 'PASS' }}</span>
              <span v-else class="bg-destructive/10 text-destructive border border-destructive/20 px-1.5 py-0.5 rounded-none text-[10px] font-semibold tracking-wider">FAIL</span>
            </div>
            <div class="flex justify-between items-center">
              <span>{{ $t('cleaningView.estimatedCost') }}</span>
              <span class="font-mono text-foreground">{{ activeStepCost }}</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  </div>
</template>
