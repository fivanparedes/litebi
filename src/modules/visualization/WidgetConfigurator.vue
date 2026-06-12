<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFormulaStore } from '@/stores/formulaStore'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseSwitch from '@/components/ui/BaseSwitch.vue'
import DragResizer from '@/components/ui/DragResizer.vue'
import CodeEditor from '@/components/ui/CodeEditor.vue'
import { 
  BarChart3, LineChart, PieChart, Table, Hash, X, GripVertical, Plus, 
  Map as MapIcon, Calendar, Image as ImageIcon, Code, Target, ScatterChart,
  LayoutGrid, Activity, BoxSelect, Maximize, Gauge, Filter
} from '@lucide/vue'
const props = defineProps({
  config: {
    type: Object,
    required: true
  },
  tabId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['update:config', 'close'])

const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const formulaStore = useFormulaStore()

const activeTab = ref('data')
const sidebarWidth = ref(360)

// Copia local para edicion
const localConfig = ref(null)

const initLocalConfig = () => {
  localConfig.value = JSON.parse(JSON.stringify(props.config))
  
  // Initialize nested objects if they don't exist
  if (!localConfig.value.styles) localConfig.value.styles = {}
  if (!localConfig.value.interactions) localConfig.value.interactions = { drillThrough: {}, tooltipPage: {} }
  if (!localConfig.value.advanced) localConfig.value.advanced = { query: {}, permissions: {} }
  if (!localConfig.value.advancedJsonString) localConfig.value.advancedJsonString = ''
  if (!localConfig.value.customGeoJson) localConfig.value.customGeoJson = { type: 'url', url: '', name: 'custom_map', featureKey: 'name' }
  if (!localConfig.value.filters) localConfig.value.filters = []
  if (!localConfig.value.interactions.crossFilter) localConfig.value.interactions.crossFilter = {}
  if (!localConfig.value.pythonCode) localConfig.value.pythonCode = '# Escribe código Python aquí\n'
  if (!localConfig.value.imageUrl) localConfig.value.imageUrl = ''
}

watch(() => props.config, () => {
  initLocalConfig()
}, { deep: true })

onMounted(() => {
  initLocalConfig()
})

const datasetOptions = computed(() => {
  return dataStore.datasetNames.map(name => {
    const meta = dataStore.datasets.get(name)
    return { value: name, label: meta?.originalName || name }
  })
})

const availableColumns = computed(() => {
  const baseName = localConfig.value?.dataset || dataStore.activeDatasetName
  if (!baseName) return []
  
  const cols = []
  const meta = dataStore.datasets.get(baseName)
  const baseSchema = meta?.schema || []
  baseSchema.forEach(c => {
    cols.push({
      type: c.type,
      value: `[${baseName}].[${c.name}]`,
      label: c.name
    })
  })
  
  return cols
})

const corporateMetricOptions = computed(() => {
  const baseName = localConfig.value?.dataset || dataStore.activeDatasetName
  if (!baseName) return []
  const metrics = formulaStore.getCorporateMetricsForDataset(baseName)
  return metrics.map(m => ({
    value: `__METRIC__${m.id}`,
    label: `✨ Métrica: ${m.name}`
  }))
})

const columnOptions = computed(() => {
  const baseCols = availableColumns.value.map(c => ({ value: c.value, label: c.label }))
  return [...corporateMetricOptions.value, ...baseCols]
})

const chartTypeOptions = [
  { value: 'bar', label: 'Bar', icon: BarChart3 },
  { value: 'line', label: 'Line', icon: LineChart },
  { value: 'pie', label: 'Donut', icon: PieChart },
  { value: 'grid', label: 'Table', icon: Table },
  { value: 'kpi', label: 'KPI', icon: Hash },
  { value: 'scorecard', label: 'Scorecard', icon: Target },
  { value: 'scatter', label: 'Scatter', icon: ScatterChart },
  { value: 'boxplot', label: 'Boxplot', icon: BoxSelect },
  { value: 'combo', label: 'Combo', icon: Activity },
  { value: 'heatmap', label: 'Heatmap', icon: LayoutGrid },
  { value: 'treemap', label: 'Treemap', icon: LayoutGrid },
  { value: 'radar', label: 'Radar', icon: Target },
  { value: 'waterfall', label: 'Waterfall', icon: BarChart3 },
  { value: 'funnel', label: 'Funnel', icon: Filter },
  { value: 'gauge', label: 'Gauge', icon: Gauge },
  { value: 'map', label: 'Map', icon: MapIcon },
  { value: 'maplibre', label: 'MapLibre', icon: MapIcon },
  { value: 'calendar', label: 'Calendar', icon: Calendar },
  { value: 'python', label: 'Python', icon: Code },
  { value: 'image', label: 'Image', icon: ImageIcon }
]

const updateField = (field, value) => {
  if (!localConfig.value) return
  localConfig.value[field] = value
}

// Helpers for array fields (xAxis, yAxis)
const addAxis = (axisName) => {
  if (!localConfig.value[axisName]) localConfig.value[axisName] = []
  if (!Array.isArray(localConfig.value[axisName])) {
    localConfig.value[axisName] = [localConfig.value[axisName]]
  }
  const newArr = [...localConfig.value[axisName]]
  newArr.push('')
  localConfig.value[axisName] = newArr
}

const updateAxis = (axisName, idx, val) => {
  if (Array.isArray(localConfig.value[axisName])) {
    const newArr = [...localConfig.value[axisName]]
    newArr[idx] = val
    localConfig.value[axisName] = newArr
  } else {
    localConfig.value[axisName] = val
  }
}

const removeAxis = (axisName, idx) => {
  if (Array.isArray(localConfig.value[axisName])) {
    const newArr = [...localConfig.value[axisName]]
    newArr.splice(idx, 1)
    localConfig.value[axisName] = newArr
  } else {
    localConfig.value[axisName] = ''
  }
}

const addFilter = () => {
  if (!localConfig.value.filters) localConfig.value.filters = []
  localConfig.value.filters.push({
    column: '',
    operator: '=',
    value: ''
  })
}

const updateFilter = (idx, field, val) => {
  if (localConfig.value.filters && localConfig.value.filters[idx]) {
    localConfig.value.filters[idx][field] = val
  }
}

const removeFilter = (idx) => {
  if (localConfig.value.filters) {
    localConfig.value.filters.splice(idx, 1)
  }
}

// Interactions list
const otherWidgets = computed(() => {
  const layout = dashboardStore.layouts[props.tabId]
  if (!layout) return []
  return layout.filter(w => w.id !== localConfig.value?.id).map(w => ({
    id: w.id,
    title: w.config?.title,
    type: w.config?.type
  }))
})

// Acciones principales
const handleApply = () => {
  // Asegurar que title y description reflejen localConfig.styles.title si es que existe o viceversa
  if (localConfig.value.styles?.titleText) {
    localConfig.value.title = localConfig.value.styles.titleText
  }
  emit('update:config', JSON.parse(JSON.stringify(localConfig.value)))
}

const handleReset = () => {
  initLocalConfig()
}

const handleClose = () => {
  emit('close')
}
</script>

<template>
  <aside 
    class="flex flex-col bg-card border-l border-border h-full transition-all duration-300 relative z-40"
    :style="{ width: sidebarWidth + 'px' }"
  >
    <DragResizer v-model:width="sidebarWidth" :is-right="false" />

    <header class="pt-4 px-4 pb-2 border-b border-border shrink-0 bg-card flex flex-col gap-2">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Widget</div>
          <div class="text-sm font-semibold tracking-tight truncate">{{ localConfig?.title || 'Widget configuration' }}</div>
        </div>
        <button class="h-6 w-6 flex items-center justify-center hover:bg-muted text-muted-foreground rounded transition-colors" title="Cerrar" @click="handleClose">
          <X class="w-4 h-4" />
        </button>
      </div>

      <nav class="flex mt-2 h-9 border-b border-border">
        <button 
          v-for="tab in ['data', 'format', 'interactions', 'advanced']" 
          :key="tab"
          :class="[
            'flex-1 text-[11px] font-medium tracking-tight py-2 border-b-2 -mb-[1px] transition-colors capitalize text-center', 
            activeTab === tab ? 'border-primary text-foreground font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'
          ]" 
          @click="activeTab = tab"
        >
          {{ tab }}
        </button>
      </nav>
    </header>
    
    <div v-if="localConfig" class="flex-1 overflow-y-auto p-4 space-y-6 bg-card">
      
      <!-- DATA TAB -->
      <div v-if="activeTab === 'data'" class="space-y-6 animate-in fade-in duration-200">
        
        <!-- VISUALIZATION -->
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Visualization</div>
          <div class="grid grid-cols-5 gap-0 border border-border rounded-none overflow-y-auto bg-muted/10 max-h-[140px]">
            <button
              v-for="opt in chartTypeOptions"
              :key="opt.value"
              :class="[
                'flex flex-col items-center justify-center gap-1.5 py-3 text-[10px] transition-colors border-r border-border last:border-r-0', 
                localConfig.type === opt.value ? 'bg-primary/5 text-primary border-b-2 border-b-primary font-medium shadow-inner' : 'text-muted-foreground hover:bg-muted'
              ]"
              :title="opt.label"
              @click="updateField('type', opt.value)"
            >
              <component :is="opt.icon" class="w-5 h-5 mb-0.5" :class="localConfig.type === opt.value ? 'text-primary' : 'text-muted-foreground/70'" />
              <span>{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <!-- AXIS -->
        <div v-if="!['python', 'image'].includes(localConfig.type)" class="space-y-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Axis</div>
          
          <!-- X-AXIS -->
          <div v-if="!['kpi', 'scorecard'].includes(localConfig.type)" class="border border-border rounded-none shadow-none bg-card">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">X-Axis</span>
              <button class="text-muted-foreground hover:text-foreground" @click="addAxis('xAxis')"><Plus class="w-3.5 h-3.5" /></button>
            </div>
            <div class="p-2 space-y-2 bg-muted/5">
              <template v-if="localConfig.xAxis && (Array.isArray(localConfig.xAxis) ? localConfig.xAxis.length > 0 : true)">
                <div v-for="(col, idx) in (Array.isArray(localConfig.xAxis) ? localConfig.xAxis : [localConfig.xAxis])" :key="idx" class="flex items-center gap-2 border border-border bg-card px-2 py-1.5 rounded-none">
                  <GripVertical class="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
                  <BaseDropdown size="compact" class="flex-1 text-xs" :model-value="col" :options="columnOptions" placeholder="Select column..." @update:model-value="val => updateAxis('xAxis', idx, val)" />
                  <button class="text-muted-foreground hover:text-destructive shrink-0" @click="removeAxis('xAxis', idx)"><X class="w-3.5 h-3.5" /></button>
                </div>
              </template>
              <div v-else class="text-[11px] text-muted-foreground/60 italic p-1">Drop fields here</div>
            </div>
          </div>

          <!-- Y-AXIS (VALUES) -->
          <div class="border border-border rounded-none shadow-none bg-card">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Y-Axis (Values)</span>
              <button class="text-muted-foreground hover:text-foreground" @click="addAxis('yAxis')"><Plus class="w-3.5 h-3.5" /></button>
            </div>
            <div class="p-2 space-y-2 bg-muted/5">
              <template v-if="localConfig.yAxis && (Array.isArray(localConfig.yAxis) ? localConfig.yAxis.length > 0 : true)">
                <div v-for="(col, idx) in (Array.isArray(localConfig.yAxis) ? localConfig.yAxis : [localConfig.yAxis])" :key="idx" class="flex items-center gap-2 border border-border bg-card px-2 py-1.5 rounded-none">
                  <GripVertical class="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
                  <BaseDropdown size="compact" class="flex-1 text-xs" :model-value="col" :options="columnOptions" placeholder="Select value..." @update:model-value="val => updateAxis('yAxis', idx, val)" />
                  <button class="text-muted-foreground hover:text-destructive shrink-0" @click="removeAxis('yAxis', idx)"><X class="w-3.5 h-3.5" /></button>
                </div>
              </template>
              <div v-else class="text-[11px] text-muted-foreground/60 italic p-1">Drop fields here</div>
              
              <!-- AGGREGATION SELECTOR -->
              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-border border-dashed">
                <span class="text-[10px] text-muted-foreground/70 w-16 uppercase tracking-wider">Agregación</span>
                <BaseDropdown 
                  v-model="localConfig.aggregation" 
                  size="compact" 
                  class="flex-1 text-xs" 
                  :options="[
                    {label: 'Suma (SUM)', value: 'SUM'},
                    {label: 'Promedio (AVG)', value: 'AVG'},
                    {label: 'Mínimo (MIN)', value: 'MIN'},
                    {label: 'Máximo (MAX)', value: 'MAX'},
                    {label: 'Conteo (COUNT)', value: 'COUNT'}
                  ]" 
                />
              </div>

              <!-- CUSTOM LABEL -->
              <div class="flex items-center gap-2 mt-2 pt-2 border-t border-border border-dashed">
                <span class="text-[10px] text-muted-foreground/70 w-16 uppercase tracking-wider">Etiqueta</span>
                <BaseInput 
                  v-model="localConfig.yAxisLabel" 
                  size="compact" 
                  class="flex-1 text-xs" 
                  placeholder="Ej. Total Ventas"
                />
              </div>
            </div>
          </div>

          <!-- LEGEND -->
          <div v-if="!['python', 'image', 'kpi', 'scorecard', 'grid'].includes(localConfig.type)" class="border border-border rounded-none shadow-none bg-card">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Legend</span>
              <button class="text-muted-foreground hover:text-foreground" @click="addAxis('legend')"><Plus class="w-3.5 h-3.5" /></button>
            </div>
            <div class="p-2 space-y-2 bg-muted/5">
              <template v-if="localConfig.legend && (Array.isArray(localConfig.legend) ? localConfig.legend.length > 0 : true)">
                <div v-for="(col, idx) in (Array.isArray(localConfig.legend) ? localConfig.legend : [localConfig.legend])" :key="idx" class="flex items-center gap-2 border border-border bg-card px-2 py-1.5 rounded-none">
                  <GripVertical class="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
                  <BaseDropdown size="compact" class="flex-1 text-xs" :model-value="col" :options="columnOptions" placeholder="Select column..." @update:model-value="val => updateAxis('legend', idx, val)" />
                  <button class="text-muted-foreground hover:text-destructive shrink-0" @click="removeAxis('legend', idx)"><X class="w-3.5 h-3.5" /></button>
                </div>
              </template>
              <div v-else class="text-[11px] text-muted-foreground/60 italic p-1">Drop fields here</div>
            </div>
          </div>

          <!-- TOOLTIPS -->
          <div v-if="!['python', 'image', 'kpi', 'scorecard', 'grid'].includes(localConfig.type)" class="border border-border rounded-none shadow-none bg-card">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Tooltips</span>
              <button class="text-muted-foreground hover:text-foreground" @click="addAxis('tooltips')"><Plus class="w-3.5 h-3.5" /></button>
            </div>
            <div class="p-2 space-y-2 bg-muted/5">
              <template v-if="localConfig.tooltips && (Array.isArray(localConfig.tooltips) ? localConfig.tooltips.length > 0 : true)">
                <div v-for="(col, idx) in (Array.isArray(localConfig.tooltips) ? localConfig.tooltips : [localConfig.tooltips])" :key="idx" class="flex items-center gap-2 border border-border bg-card px-2 py-1.5 rounded-none">
                  <GripVertical class="w-3.5 h-3.5 text-muted-foreground/50 cursor-grab shrink-0" />
                  <BaseDropdown size="compact" class="flex-1 text-xs" :model-value="col" :options="columnOptions" placeholder="Select value..." @update:model-value="val => updateAxis('tooltips', idx, val)" />
                  <button class="text-muted-foreground hover:text-destructive shrink-0" @click="removeAxis('tooltips', idx)"><X class="w-3.5 h-3.5" /></button>
                </div>
              </template>
              <div v-else class="text-[11px] text-muted-foreground/60 italic px-2 py-1.5">Drop fields here</div>
            </div>
          </div>
        </div>

        <!-- FILTERS ON THIS WIDGET -->
        <div class="space-y-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Filters on this widget</div>
          <div class="border border-border rounded-none shadow-none bg-card">
            <div class="flex items-center justify-between px-3 py-1.5 border-b border-border bg-muted/20">
              <span class="text-[10px] uppercase tracking-wider text-muted-foreground">Filter fields</span>
              <button class="text-muted-foreground hover:text-foreground" @click="addFilter"><Plus class="w-3.5 h-3.5" /></button>
            </div>
            <div class="p-2 space-y-2 bg-muted/5">
              <div v-if="localConfig.filters && localConfig.filters.length > 0" class="space-y-2">
                <div v-for="(f, idx) in localConfig.filters" :key="idx" class="flex flex-col gap-1.5 border border-border bg-card p-2 rounded-none">
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Filtro {{ idx + 1 }}</span>
                    <button class="text-muted-foreground hover:text-destructive shrink-0" @click="removeFilter(idx)"><X class="w-3.5 h-3.5" /></button>
                  </div>
                  <div class="flex flex-col gap-1">
                    <BaseDropdown size="compact" class="text-xs" :model-value="f.column" :options="columnOptions" placeholder="Select column..." @update:model-value="val => updateFilter(idx, 'column', val)" />
                    <div class="flex gap-1">
                      <BaseDropdown
size="compact" class="w-24 text-xs" :model-value="f.operator" :options="[
                        {value: '=', label: '='},
                        {value: '!=', label: '!='},
                        {value: '<', label: '<'},
                        {value: '<=', label: '<='},
                        {value: '>', label: '>'},
                        {value: '>=', label: '>='},
                        {value: 'LIKE', label: 'LIKE'}
                      ]" @update:model-value="val => updateFilter(idx, 'operator', val)" />
                      <BaseInput size="compact" class="flex-1 text-xs" :model-value="f.value" placeholder="Value..." @update:model-value="val => updateFilter(idx, 'value', val)" />
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-[11px] text-muted-foreground/60 italic px-2 py-1.5">No active filters</div>
            </div>
          </div>
        </div>

        <!-- SORT & LIMIT -->
        <div v-if="!['python', 'image', 'kpi', 'scorecard'].includes(localConfig.type)" class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Sort & Limit</div>
          
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Sort by</span>
            <div class="flex-1">
              <BaseDropdown size="compact" :model-value="localConfig.sortBy || ''" :options="columnOptions" placeholder="[Total Revenue]" @update:model-value="val => localConfig.sortBy = val" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Direction</span>
            <div class="flex-1">
              <BaseDropdown size="compact" :model-value="localConfig.sortDir || 'desc'" :options="[{value:'desc',label:'Descending'}, {value:'asc',label:'Ascending'}]" @update:model-value="val => localConfig.sortDir = val" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Top N</span>
            <div class="flex-1 flex justify-end">
              <BaseInput size="compact" type="number" :model-value="localConfig.topN || 12" class="w-24 text-right" @update:model-value="val => localConfig.topN = Number(val)" />
            </div>
          </div>
        </div>

        <!-- PYTHON SPECIFIC -->
        <div v-if="localConfig.type === 'python'" class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Python Script</div>
          <div class="border border-border bg-muted/10 h-64 relative rounded">
            <CodeEditor v-model="localConfig.pythonCode" language="python" />
          </div>
          <p class="text-[10px] text-muted-foreground">The script runs on the server and receives `df`. It should return a base64 image or execute plotting functions.</p>
        </div>

        <!-- IMAGE SPECIFIC -->
        <div v-if="localConfig.type === 'image'" class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Image Source</div>
          <div class="flex flex-col gap-2">
            <span class="text-xs text-muted-foreground">Image URL</span>
            <BaseInput v-model="localConfig.imageUrl" size="compact" placeholder="https://example.com/image.png" class="w-full" />
          </div>
        </div>

      </div>

      <!-- FORMAT TAB -->
      <div v-if="activeTab === 'format'" class="space-y-6 animate-in fade-in duration-200">
        
        <!-- TITLE -->
        <div class="space-y-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Title</div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Show title</span>
            <BaseSwitch v-model="localConfig.styles.showTitle" square />
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Text</span>
            <div class="flex-1">
              <BaseInput v-model="localConfig.styles.titleText" size="compact" placeholder="Customer acquisition" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Align</span>
            <div class="flex-1 flex border border-border rounded-none overflow-hidden bg-card text-xs">
              <button class="flex-1 py-1.5 text-center transition-colors border-r border-border hover:bg-muted text-muted-foreground" :class="localConfig.styles.titleAlign === 'left' ? 'bg-primary text-primary-foreground font-medium hover:bg-primary' : ''" @click="localConfig.styles.titleAlign = 'left'">Left</button>
              <button class="flex-1 py-1.5 text-center transition-colors border-r border-border hover:bg-muted text-muted-foreground" :class="localConfig.styles.titleAlign === 'center' ? 'bg-primary text-primary-foreground font-medium hover:bg-primary' : ''" @click="localConfig.styles.titleAlign = 'center'">Center</button>
              <button class="flex-1 py-1.5 text-center transition-colors hover:bg-muted text-muted-foreground" :class="localConfig.styles.titleAlign === 'right' ? 'bg-primary text-primary-foreground font-medium hover:bg-primary' : ''" @click="localConfig.styles.titleAlign = 'right'">Right</button>
            </div>
          </div>
        </div>

        <!-- COLORS -->
        <div v-if="!['python', 'image', 'grid', 'kpi', 'scorecard'].includes(localConfig.type)" class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Colors</div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Palette</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.styles.palette" size="compact" :options="[{value:'slate_indigo',label:'Slate / Indigo'}, {value:'emerald',label:'Emerald'}, {value:'rose',label:'Rose'}]" placeholder="Slate / Indigo" />
            </div>
          </div>
          <div class="flex gap-1.5 mt-2 ml-24">
            <div class="w-6 h-6 rounded bg-slate-900"></div>
            <div class="w-6 h-6 rounded bg-blue-600"></div>
            <div class="w-6 h-6 rounded bg-emerald-600"></div>
            <div class="w-6 h-6 rounded bg-amber-600"></div>
            <div class="w-6 h-6 rounded bg-purple-600"></div>
          </div>
          <div class="flex items-center justify-between pt-2">
            <span class="text-xs text-muted-foreground">Data labels</span>
            <BaseSwitch v-model="localConfig.styles.dataLabels" square />
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Gridlines</span>
            <BaseSwitch v-model="localConfig.styles.gridlines" square />
          </div>
        </div>

        <!-- NUMBER FORMAT -->
        <div v-if="!['python', 'image'].includes(localConfig.type)" class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Number format</div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Format</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.styles.numberFormat" size="compact" :options="[{value:'currency',label:'Currency (USD)'}, {value:'percent',label:'Percentage'}, {value:'decimal',label:'Decimal'}]" placeholder="Currency (USD)" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Decimals</span>
            <div class="flex-1 flex justify-end">
              <BaseInput v-model="localConfig.styles.decimals" size="compact" type="number" class="w-24 text-right" placeholder="0" />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Thousands sep</span>
            <BaseSwitch v-model="localConfig.styles.thousandsSep" square />
          </div>
        </div>

        <!-- BACKGROUND & BORDER -->
        <div class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Background & Border</div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-24">Background</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.styles.background" size="compact" :options="[{value:'card',label:'Card'}, {value:'transparent',label:'Transparent'}]" placeholder="Card" />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Border</span>
            <BaseSwitch v-model="localConfig.styles.border" square />
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-24">Shadow</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.styles.shadow" size="compact" :options="[{value:'none',label:'None'}, {value:'sm',label:'Small'}, {value:'md',label:'Medium'}]" placeholder="None" />
            </div>
          </div>
        </div>

      </div>

      <!-- INTERACTIONS TAB -->
      <div v-if="activeTab === 'interactions'" class="space-y-6 animate-in fade-in duration-200">
        
        <!-- CROSS-FILTERING -->
        <div class="space-y-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Cross-filtering</div>
          <p class="text-xs text-muted-foreground mb-4">Choose how this widget reacts to selections on other widgets.</p>
          
          <div v-for="w in otherWidgets" :key="w.id" class="flex items-center justify-between gap-4">
            <span class="text-xs text-foreground truncate flex-1">{{ w.title || `Widget ${w.id.slice(0,4)}` }} ({{ w.type }})</span>
            <div class="flex border border-border rounded-none overflow-hidden text-[11px] bg-card w-44 shrink-0">
              <button 
                class="flex-1 py-1 text-center transition-colors border-r border-border hover:bg-muted text-xs" 
                :class="(localConfig.interactions.crossFilter[w.id] || 'filter') === 'filter' ? 'bg-primary text-primary-foreground font-medium hover:bg-primary' : 'text-muted-foreground'"
                @click="localConfig.interactions.crossFilter[w.id] = 'filter'"
              >
                Filter
              </button>
              <button 
                class="flex-1 py-1 text-center transition-colors border-r border-border hover:bg-muted text-xs" 
                :class="localConfig.interactions.crossFilter[w.id] === 'highlight' ? 'bg-primary text-primary-foreground font-medium hover:bg-primary' : 'text-muted-foreground'"
                @click="localConfig.interactions.crossFilter[w.id] = 'highlight'"
              >
                Highlight
              </button>
              <button 
                class="flex-1 py-1 text-center transition-colors hover:bg-muted text-xs" 
                :class="localConfig.interactions.crossFilter[w.id] === 'none' ? 'bg-primary text-primary-foreground font-medium hover:bg-primary' : 'text-muted-foreground'"
                @click="localConfig.interactions.crossFilter[w.id] = 'none'"
              >
                None
              </button>
            </div>
          </div>
        </div>

        <!-- DRILL-THROUGH -->
        <div class="space-y-3 pt-4">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Drill-through</div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Enable</span>
            <BaseSwitch v-model="localConfig.interactions.drillThrough.enabled" square />
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-20">Target page</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.interactions.drillThrough.targetPage" size="compact" :options="[{value:'customer_detail',label:'Customer detail'}, {value:'product_detail',label:'Product detail'}]" placeholder="Customer detail" />
            </div>
          </div>
        </div>

        <!-- TOOLTIP PAGE -->
        <div class="space-y-3 pt-4">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tooltip Page</div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Use page tooltip</span>
            <BaseSwitch v-model="localConfig.interactions.tooltipPage.enabled" square />
          </div>
        </div>

      </div>

      <!-- ADVANCED TAB -->
      <div v-if="activeTab === 'advanced'" class="space-y-6 animate-in fade-in duration-200">
        
        <!-- IDENTITY -->
        <div class="space-y-3">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Identity</div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Widget ID</span>
            <span class="font-mono text-xs text-foreground bg-muted/30 px-2 py-1 rounded">{{ localConfig.id }}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Bookmark group</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.advanced.bookmarkGroup" size="compact" :options="[{value:'default',label:'Default'}, {value:'group_1',label:'Group 1'}]" placeholder="Default" />
            </div>
          </div>
        </div>

        <!-- QUERY -->
        <div class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Query</div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Aggregation mode</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.advanced.query.aggMode" size="compact" :options="[{value:'import',label:'Import'}, {value:'direct_query',label:'Direct Query'}]" placeholder="Import" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Cache TTL</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.advanced.query.cacheTtl" size="compact" :options="[{value:'5m',label:'5 minutes'}, {value:'1h',label:'1 hour'}, {value:'none',label:'None'}]" placeholder="5 minutes" />
            </div>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Row limit</span>
            <div class="flex-1 flex justify-end">
              <BaseInput v-model="localConfig.advanced.query.rowLimit" size="compact" type="number" class="w-32 text-right" placeholder="10000" />
            </div>
          </div>
        </div>

        <!-- CONDITIONAL FORMATTING -->
        <div class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Conditional Formatting</div>
          <button class="w-full h-8 border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/60 flex items-center justify-center gap-1.5 rounded-none transition-colors bg-muted/5">
            <Plus class="w-3.5 h-3.5" /> Add rule
          </button>
        </div>

        <!-- PERMISSIONS -->
        <div class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Permissions</div>
          <div class="flex items-center gap-3">
            <span class="text-xs text-muted-foreground w-28">Visibility</span>
            <div class="flex-1">
              <BaseDropdown v-model="localConfig.advanced.permissions.visibility" size="compact" :options="[{value:'all',label:'All viewers'}, {value:'admins',label:'Admins only'}]" placeholder="All viewers" />
            </div>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">Export to CSV</span>
            <BaseSwitch v-model="localConfig.advanced.permissions.exportCsv" square />
          </div>
        </div>

        <!-- GEOJSON MAP SETTINGS -->
        <div v-if="localConfig.type === 'map'" class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Map Settings</div>
          
          <div class="space-y-1">
            <div class="flex items-center justify-between">
              <span class="text-xs text-muted-foreground">Map Mode</span>
            </div>
            <BaseDropdown v-model="localConfig.mapMode" size="compact" :options="[{value:'world',label:'World Map'}, {value:'custom',label:'Custom GeoJSON'}, {value:'scatter',label:'Scatter on Map'}]" placeholder="World Map" />
          </div>

          <div v-if="localConfig.mapMode === 'custom'" class="space-y-3 pt-2">
            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground">Map Name</span>
              </div>
              <BaseInput v-model="localConfig.customGeoJson.name" size="compact" placeholder="e.g. mi_mapa" class="w-full" />
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground">GeoJSON URL</span>
              </div>
              <BaseInput v-model="localConfig.customGeoJson.url" size="compact" placeholder="https://..." class="w-full" />
              <p class="text-[10px] text-muted-foreground/70 mt-1">URL must return a valid GeoJSON object</p>
            </div>

            <div class="space-y-1 mt-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-muted-foreground">GeoJSON Property Key</span>
              </div>
              <BaseInput v-model="localConfig.customGeoJson.featureKey" size="compact" placeholder="e.g. name, departamento, ID" class="w-full" />
              <p class="text-[10px] text-muted-foreground/70 mt-1">The property in the GeoJSON that matches your dataset's column (default: "name")</p>
            </div>
          </div>
        </div>

        <!-- ADVANCED JSON -->
        <div class="space-y-3 pt-2">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Custom JSON</div>
          <div class="flex items-center justify-between">
            <span class="text-xs text-muted-foreground">ECharts Option (JSON)</span>
          </div>
          <textarea v-model="localConfig.advancedJsonString" rows="4" class="w-full text-xs font-mono p-2 bg-muted/30 border border-border rounded-none focus:outline-none focus:border-primary" placeholder='{&#10;  "series": []&#10;}'></textarea>
        </div>

      </div>

    </div>

    <!-- FOOTER -->
    <footer class="p-4 border-t border-border flex items-center justify-between shrink-0 bg-card">
      <button class="text-xs text-muted-foreground hover:text-foreground transition-colors" @click="handleReset">Reset</button>
      <div class="flex items-center gap-2">
        <BaseButton variant="outline" size="sm" class="bg-card" @click="handleClose">Close</BaseButton>
        <BaseButton variant="primary" size="sm" @click="handleApply">Apply</BaseButton>
      </div>
    </footer>
  </aside>
</template>
