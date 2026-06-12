<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Calculator, ArrowRight, Play, Save, Zap, Database, Sigma, PenSquare, Type, Hash, Calendar, ToggleLeft } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import { useDataStore } from '@/stores/dataStore'
import { useFormulaStore } from '@/stores/formulaStore'
import { testSqlExpression } from '@/modules/formulas/SqlEngine'
import CodeEditor from '@/components/ui/CodeEditor.vue'
import ColumnList from '@/modules/formulas/ColumnList.vue'
import QuickMeasuresModal from '@/modules/formulas/QuickMeasuresModal.vue'
import { BookOpen, PanelLeftClose, PanelLeft } from '@lucide/vue'
import FormulaManualModal from '@/modules/formulas/FormulaManualModal.vue'
import DragResizer from '@/components/ui/DragResizer.vue'
import FormulaBar from '@/components/ui/FormulaBar.vue'

const { t } = useI18n()
const router = useRouter()
const dataStore = useDataStore()
const formulaStore = useFormulaStore()

const hasData = computed(() => !!dataStore.activeDatasetName)
const activeDatasetMeta = computed(() => dataStore.activeDatasetMeta)

const getIconForType = (type) => {
  if (!type) return Type
  const t = type.toUpperCase()
  if (t === 'VARCHAR' || t === 'TEXT' || t === 'STRING') return Type
  if (t === 'INTEGER' || t === 'BIGINT' || t === 'DOUBLE' || t === 'DECIMAL' || t === 'NUMERIC' || t === 'NUMBER') return Hash
  if (t === 'DATE' || t === 'TIMESTAMP' || t === 'DATETIME' || t === 'TIME') return Calendar
  if (t === 'BOOLEAN') return ToggleLeft
  return Type
}

// Editor State
const expression = ref('')
const columnName = ref('')
const columnType = ref('number')
const testResult = ref(null)
const isQuickMeasuresModalOpen = ref(false)
const isFormulaManualModalOpen = ref(false)
const formulaMode = ref('columna')
const attemptedSave = ref(false)

const sidebarWidth = ref(280)
const isSidebarCollapsed = ref(false)

const allAvailableColumns = computed(() => {
  const baseSchema = activeDatasetMeta.value?.schema || []
  const dsName = dataStore.activeDatasetName
  if (!dsName) return baseSchema
  
  const metrics = formulaStore.getCorporateMetricsForDataset(dsName).map(m => ({ name: m.name, type: m.type || 'number', isMetric: true, expression: m.expression }))
  
  return [...baseSchema, ...metrics]
})

const availableFields = computed(() => {
  const baseSchema = activeDatasetMeta.value?.schema || []
  const dsName = dataStore.activeDatasetName
  if (!dsName) return { base: [], computed: [], metrics: [] }
  
  const metrics = formulaStore.getCorporateMetricsForDataset(dsName).map(m => ({ name: m.name, type: m.type || 'number', isMetric: true, expression: m.expression }))
  
  return {
    base: baseSchema.filter(c => !c.isCalculated),
    computed: baseSchema.filter(c => c.isCalculated),
    metrics: metrics
  }
})

const modeOptions = [
  { value: 'columna', label: 'Nueva Columna Computada' },
  { value: 'metrica', label: 'Nueva Métrica Agrupada' }
]

const typeOptions = [
  { value: 'number', label: 'Número' },
  { value: 'integer', label: 'Entero' },
  { value: 'decimal', label: 'Decimal' },
  { value: 'string', label: 'Texto' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'date', label: 'Fecha' },
  { value: 'datetime', label: 'Fecha y Hora' },
  { value: 'time', label: 'Hora' },
  { value: 'json', label: 'JSON / Array' }
]

const handleInsertColumn = (colStr) => {
  expression.value = expression.value ? `${expression.value} ${colStr}` : colStr
}

const handleInsertSnippet = (snippet) => {
  expression.value = expression.value ? `${expression.value} ${snippet}` : snippet
}

const handleCancelFormula = () => {
  expression.value = ''
  columnName.value = ''
  testResult.value = null
  attemptedSave.value = false
}

const handleEditColumn = (col) => {
  columnName.value = col.name
  columnType.value = col.type || 'number'
  expression.value = col.expression || ''
  formulaMode.value = col.isMetric ? 'metrica' : 'columna'
  attemptedSave.value = false
}

const handleTest = async () => {
  if (!expression.value || !dataStore.activeDatasetName) return
  testResult.value = await testSqlExpression(
    dataStore.activeDatasetName, 
    expression.value, 
    formulaMode.value, 
    columnName.value
  )
}

const handleSave = () => {
  attemptedSave.value = true
  if (!columnName.value || !expression.value) return
  
  try {
    if (formulaMode.value === 'metrica') {
      formulaStore.addCorporateMetric(
        dataStore.activeDatasetName,
        columnName.value,
        expression.value,
        columnType.value
      )
    } else {
      formulaStore.addFormula(
        dataStore.activeDatasetName, 
        columnName.value, 
        expression.value, 
        columnType.value
      )
    }
    // Clear form on success
    columnName.value = ''
    expression.value = ''
    testResult.value = null
    attemptedSave.value = false
  } catch (e) {
    // Error is handled in store (Toast)
  }
}

const handleQuickMeasureGenerate = (generatedExpression) => {
  if (expression.value && expression.value.trim() !== '') {
    expression.value += '\n' + generatedExpression
  } else {
    expression.value = generatedExpression
  }
}

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
</script>

<template>
  <div class="flex flex-col h-full bg-background overflow-hidden relative">
    <div v-if="!hasData" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-[480px] flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="w-20 h-20 rounded-full bg-warning-light flex items-center justify-center mb-6">
          <Calculator class="w-10 h-10 text-warning" />
        </div>
        <h2 class="text-xl font-semibold mb-3">{{ $t('formulas.noData') }}</h2>
        <p class="text-sm text-muted-foreground mb-8">{{ $t('formulas.noDataDesc') }}</p>
        
        <div class="flex justify-center w-full">
          <BaseButton variant="outline" @click="router.push('/data')">
            <template #icon-right><ArrowRight /></template>
            {{ $t('formulas.goToData') }}
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div v-else class="flex flex-col h-full p-4 gap-4 overflow-hidden">
      <FormulaBar 
        v-model="expression" 
        v-model:column-name="columnName"
        lang="SQL"
        @apply="handleSave"
        @cancel="handleCancelFormula"
        @insert-function="isQuickMeasuresModalOpen = true"
      />

      <div class="flex-1 grid grid-cols-[260px_1fr_320px] gap-4 overflow-hidden">
        
        <!-- Left Panel: Fields & Quick measures -->
        <div class="flex flex-col gap-4 overflow-hidden">
          <div class="bg-card border border-border flex flex-col shadow-none min-h-[50%]">
            <div class="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
              <h3 class="font-medium text-sm">{{ $t('formulasView.fields') }}</h3>
            </div>
            <div class="flex-1 overflow-y-auto p-4 text-xs space-y-4">
              <div v-for="ds in dataStore.datasetList" :key="ds.name">
                <div class="flex items-center gap-2 font-medium py-1 text-foreground cursor-pointer hover:text-primary" @click="toggleDataset(ds.name)">
                  <svg v-if="!isExpanded(ds.name)" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-muted-foreground"><polyline points="9 18 15 12 9 6"></polyline></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-3 h-3 text-muted-foreground"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  <Database class="w-4 h-4 text-primary" />
                  <span class="truncate">{{ ds.originalName || ds.name }}</span>
                </div>
                
                <div v-if="isExpanded(ds.name)" class="ml-2 border-l border-border pl-3 space-y-4 text-muted-foreground mt-2">
                  <!-- Base Columns -->
                  <div v-if="(ds.schema || []).length > 0">
                    <div class="text-[10px] uppercase font-semibold text-muted-foreground/60 mb-1">{{ $t('formulasView.baseColumns') }}</div>
                    <div class="space-y-0.5">
                      <div v-for="col in (ds.schema || [])" :key="col.name" class="flex items-center gap-1.5 py-1 hover:text-foreground cursor-pointer group" @click="handleInsertColumn('&quot;' + col.name + '&quot;')">
                        <component :is="getIconForType(col.type)" class="w-3.5 h-3.5 text-muted-foreground/50" />
                        <span class="font-mono truncate text-foreground/80 group-hover:text-foreground">{{ col.name }}</span>
                        <span class="text-muted-foreground/40 text-[9px] uppercase ml-auto">{{ col.type }}</span>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Computed Columns -->
                  <div v-if="formulaStore.getFormulasForDataset(ds.name).length > 0">
                    <div class="text-[10px] uppercase font-semibold text-muted-foreground/60 mb-1">{{ $t('formulasView.computedColumns') }}</div>
                    <div class="space-y-0.5">
                      <div v-for="col in formulaStore.getFormulasForDataset(ds.name)" :key="col.name" class="flex items-center gap-1.5 py-1 hover:text-primary cursor-pointer group">
                        <div class="flex-1 flex items-center gap-1.5 overflow-hidden" @click="handleInsertColumn('&quot;' + col.name + '&quot;')">
                          <Zap class="w-3 h-3 text-primary/60 group-hover:text-primary shrink-0" />
                          <component :is="getIconForType(col.type)" class="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span class="font-mono truncate text-foreground/80 group-hover:text-primary">{{ col.name }}</span>
                          <span class="text-muted-foreground/40 text-[9px] uppercase ml-auto">{{ col.type }}</span>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0" :title="$t('formulasView.editColumn')" @click.stop="handleEditColumn(col)">
                          <PenSquare class="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <!-- Corporate Metrics -->
                  <div v-if="formulaStore.getCorporateMetricsForDataset(ds.name).length > 0">
                    <div class="text-[10px] uppercase font-semibold text-muted-foreground/60 mb-1">{{ $t('formulasView.metrics') }}</div>
                    <div class="space-y-0.5">
                      <div v-for="col in formulaStore.getCorporateMetricsForDataset(ds.name)" :key="col.name" class="flex items-center gap-1.5 py-1 hover:text-purple-400 cursor-pointer group">
                        <div class="flex-1 flex items-center gap-1.5 overflow-hidden" @click="handleInsertColumn('&quot;' + col.name + '&quot;')">
                          <Sigma class="w-3 h-3 text-purple-500/60 group-hover:text-purple-400 shrink-0" />
                          <span class="font-mono truncate text-foreground/80 group-hover:text-purple-400">{{ col.name }}</span>
                          <span class="text-muted-foreground/40 text-[9px] uppercase ml-auto">{{ col.type }}</span>
                        </div>
                        <button class="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground shrink-0" :title="$t('formulasView.editMetric')" @click.stop="handleEditColumn(col)">
                          <PenSquare class="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="bg-card border border-border flex flex-col shadow-none">
            <div class="px-4 py-3 border-b border-border flex flex-col gap-1 shrink-0">
              <div class="flex items-center justify-between">
                <h3 class="font-medium text-sm">{{ $t('formulasView.quickMeasures') }}</h3>
                <button class="text-[10px] uppercase tracking-wider text-primary hover:underline" @click="isQuickMeasuresModalOpen = true">
                  {{ $t('formulasView.browseAll') }}
                </button>
              </div>
              <p class="text-[10px] text-muted-foreground">{{ $t('formulasView.insertEditor') }}</p>
            </div>
            <div class="p-3 grid grid-cols-2 gap-1.5">
              <button class="flex items-center gap-1.5 text-[11px] px-2 py-1.5 bg-muted/40 border border-border hover:border-primary hover:bg-accent text-left transition-colors" @click="handleInsertSnippet('SUM(&quot;Column&quot;)')">
                <span class="font-mono font-semibold text-primary">SUM</span>
              </button>
              <button class="flex items-center gap-1.5 text-[11px] px-2 py-1.5 bg-muted/40 border border-border hover:border-primary hover:bg-accent text-left transition-colors" @click="handleInsertSnippet('AVG(&quot;Column&quot;)')">
                <span class="font-mono font-semibold text-primary">AVG</span>
              </button>
              <button class="flex items-center gap-1.5 text-[11px] px-2 py-1.5 bg-muted/40 border border-border hover:border-primary hover:bg-accent text-left transition-colors" @click="handleInsertSnippet('COUNT(DISTINCT &quot;Column&quot;)')">
                <span class="font-mono font-semibold text-primary">COUNT DISTINCT</span>
              </button>
              <button class="flex items-center gap-1.5 text-[11px] px-2 py-1.5 bg-muted/40 border border-border hover:border-primary hover:bg-accent text-left transition-colors" @click="handleInsertSnippet('COUNT(&quot;Column&quot;)')">
                <span class="font-mono font-semibold text-primary">COUNT</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Center Panel: Editor -->
        <div class="flex flex-col gap-4 overflow-hidden">
          <!-- Editor Card -->
          <div class="bg-card border border-border flex flex-col shadow-none overflow-hidden relative min-h-[50%]">
          <div class="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
            <h3 class="font-medium text-sm">{{ $t('formulasView.definition') }}</h3>
            <div class="flex items-center gap-2">
              <BaseButton variant="outline" size="sm" :disabled="!expression" @click="handleTest">
                <template #icon-left><Play class="w-3 h-3" /></template>
                {{ $t('formulasView.test') }}
              </BaseButton>
              <BaseButton variant="primary" size="sm" :disabled="!expression || !columnName" @click="handleSave">
                <template #icon-left><Save class="w-3 h-3" /></template>
                {{ $t('formulasView.apply') }}
              </BaseButton>
            </div>
          </div>
          
          <div class="flex-1 flex flex-col overflow-hidden bg-background">
            <!-- CodeMirror Editor wrapper -->
            <div class="flex-1 flex flex-col overflow-hidden relative" :class="{ 'border-t-2 border-danger': attemptedSave && !expression }">
              <CodeEditor 
                v-model="expression"
                :schema="activeDatasetMeta?.schema || []"
              />
            </div>
            
            </div>
          </div>

          <!-- Result Preview Card -->
          <div class="bg-card border border-border flex flex-col shadow-none overflow-hidden flex-1">
              <div class="px-4 py-2 border-b border-border bg-muted/30 text-xs flex items-center justify-between shrink-0">
                <span class="font-medium">{{ $t('formulasView.resultPreview') }}</span>
                <span v-if="testResult" :class="testResult.success ? 'text-success' : 'text-danger'">
                  {{ testResult.success ? $t('formulasView.querySuccess') : $t('formulasView.queryError') }}
                </span>
                <span v-else class="text-muted-foreground">{{ $t('formulasView.runTestToSee') }}</span>
              </div>
              <div class="flex-1 overflow-auto p-2">
                <div v-if="testResult && !testResult.success" class="text-danger text-xs font-mono p-2 bg-danger-light/20 rounded">
                  {{ testResult.error }}
                </div>
                <table v-else-if="testResult && testResult.success" class="w-full text-[11px] font-mono text-left border-collapse">
                  <thead class="bg-muted/20 text-muted-foreground">
                    <tr>
                      <th v-for="key in Object.keys(testResult.sampleResult[0] || {})" :key="key" class="px-3 py-1.5 font-medium border-b border-border">{{ key }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, i) in testResult.sampleResult" :key="i" :class="i % 2 ? 'bg-muted/10' : ''">
                      <td v-for="(val, key) in row" :key="key" class="px-3 py-1 border-b border-border/50">{{ val }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        <!-- Right Panel: Properties -->
        <div class="bg-card border border-border flex flex-col shadow-none">
          <div class="px-4 py-3 border-b border-border shrink-0">
            <h3 class="font-medium text-sm">{{ $t('formulasView.properties') }}</h3>
          </div>
          <div class="flex-1 overflow-y-auto p-4 text-xs space-y-4">
            <div>
              <div class="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">{{ $t('formulasView.name') }}</div>
              <input v-model="columnName" placeholder="e.g. Total Revenue" class="w-full h-8 px-2 border border-border bg-card focus:outline-none focus:border-primary transition-colors rounded-none" :class="{ 'border-danger': attemptedSave && !columnName }" />
            </div>
            <div>
              <div class="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">{{ $t('formulasView.type') }}</div>
              <select v-model="formulaMode" class="w-full h-8 px-2 border border-border bg-card focus:outline-none focus:border-primary transition-colors rounded-none">
                <option value="columna">{{ $t('formulasView.computedColumn') }}</option>
                <option value="metrica">{{ $t('formulasView.aggregatedMeasure') }}</option>
              </select>
            </div>
            <div>
              <div class="text-muted-foreground uppercase text-[10px] tracking-wider mb-1">{{ $t('formulasView.dataFormat') }}</div>
              <select v-model="columnType" class="w-full h-8 px-2 border border-border bg-card focus:outline-none focus:border-primary transition-colors rounded-none">
                <option value="number">{{ $t('formulasView.number') }}</option>
                <option value="decimal">{{ $t('formulasView.decimal') }}</option>
                <option value="integer">{{ $t('formulasView.integer') }}</option>
                <option value="string">{{ $t('formulasView.text') }}</option>
                <option value="boolean">{{ $t('formulasView.boolean') }}</option>
                <option value="date">{{ $t('formulasView.date') }}</option>
              </select>
            </div>
            
            <div class="pt-4 border-t border-border">
               <button class="text-primary hover:underline flex items-center gap-1.5" @click="isFormulaManualModalOpen = true">
                 <BookOpen class="w-3.5 h-3.5" /> DAX / SQL Manual
               </button>
            </div>
          </div>
        </div>

      </div>
    </div>
    
    <QuickMeasuresModal 
      v-model="isQuickMeasuresModalOpen"
      :schema="allAvailableColumns"
      :dataset-name="dataStore.activeDatasetName"
      @insert-measure="handleQuickMeasureGenerate"
    />

    <FormulaManualModal 
      v-model="isFormulaManualModalOpen"
    />
  </div>
</template>

<style scoped>
/* Tailwind handles everything */
.cm-wrapper :deep(.cm-editor) { height: 100%; }
</style>
