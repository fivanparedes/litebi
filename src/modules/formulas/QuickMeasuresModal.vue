<script setup>
import { ref, computed } from 'vue'
import { Sigma, CalendarClock, Percent, Calculator, Filter, X } from '@lucide/vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import CodeEditor from '@/components/ui/CodeEditor.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  schema: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue', 'insert-measure'])

const categories = [
  { id: 'aggregations', label: 'Aggregations per category', icon: Sigma },
  { id: 'time', label: 'Time intelligence', icon: CalendarClock },
  { id: 'totals', label: '% Totals & ratios', icon: Percent },
  { id: 'math', label: 'Mathematical operations', icon: Calculator },
  { id: 'filters', label: 'Filters', icon: Filter }
]

const measures = {
  aggregations: [
    { id: 'sum', name: 'Sum', desc: 'Calculates the sum of a column.' },
    { id: 'avg', name: 'Average', desc: 'Calculates the average of a column.' },
    { id: 'min', name: 'Minimum', desc: 'Finds the minimum value of a column.' },
    { id: 'max', name: 'Maximum', desc: 'Finds the maximum value of a column.' },
    { id: 'count', name: 'Count', desc: 'Counts the number of rows.' },
    { id: 'distinct', name: 'Count Distinct', desc: 'Counts the number of unique values.' }
  ],
  time: [
    { id: 'yoy', name: 'Year-over-year change', desc: 'Compares a measure to the same period last year.' },
    { id: 'ytd', name: 'Year-to-date total', desc: 'Cumulative sum from the start of the fiscal year.' },
    { id: 'rolling', name: 'Rolling average', desc: 'Trailing N-period average of a measure.' }
  ],
  totals: [
    { id: 'pct_total', name: '% of grand total', desc: 'Percentage over the total sum.' },
    { id: 'ratio', name: 'Ratio', desc: 'Divides one measure by another.' }
  ],
  math: [
    { id: 'add', name: 'Addition', desc: 'Adds two values.' },
    { id: 'sub', name: 'Subtraction', desc: 'Subtracts one value from another.' },
    { id: 'mul', name: 'Multiplication', desc: 'Multiplies two values.' },
    { id: 'div', name: 'Division', desc: 'Divides one value by another.' }
  ],
  filters: [
    { id: 'filtered', name: 'Filtered measure', desc: 'Applies a condition to the calculation.' }
  ]
}

const activeCategory = ref('time')
const activeMeasure = ref('yoy')

const baseMeasure = ref('')
const compareMeasure = ref('')
const dateColumn = ref('')
const filterColumn = ref('')
const filterValue = ref('Value')

const currentMeasureList = computed(() => measures[activeCategory.value] || [])
const activeMeasureDetails = computed(() => currentMeasureList.value.find(m => m.id === activeMeasure.value))

const requiredInputs = computed(() => {
  const m = activeMeasure.value
  const c = activeCategory.value
  
  if (c === 'time') return ['base', 'date']
  if (c === 'math' || m === 'ratio') return ['base', 'compare']
  if (c === 'filters') return ['base', 'filterCol', 'filterVal']
  
  return ['base']
})

const customPreview = ref(null)

import { watch } from 'vue'
watch([activeMeasure, baseMeasure, compareMeasure, dateColumn, filterColumn, filterValue], () => {
  customPreview.value = null
})

const previewDax = computed({
  get() {
    if (customPreview.value !== null) return customPreview.value
    
    const m = activeMeasure.value
    const b = baseMeasure.value || '"Column"'
    const c = compareMeasure.value || '"Other Column"'
    const d = dateColumn.value || '"dim_date"."date"'
    const fc = filterColumn.value || '"Category"'
    const fv = filterValue.value || 'Value'

    // Aggregations
  if (m === 'sum') return `SUM( ${b} )`
  if (m === 'avg') return `AVG( ${b} )`
  if (m === 'min') return `MIN( ${b} )`
  if (m === 'max') return `MAX( ${b} )`
  if (m === 'count') return `COUNT( ${b} )`
  if (m === 'distinct') return `COUNT( DISTINCT ${b} )`

  // Totals & Ratios
  if (m === 'pct_total') return `SUM( ${b} ) / NULLIF(SUM(SUM( ${b} )) OVER (), 0)`
  if (m === 'ratio') return `SUM( ${b} ) / NULLIF(SUM( ${c} ), 0)`

  // Math
  if (m === 'add') return `SUM( ${b} ) + SUM( ${c} )`
  if (m === 'sub') return `SUM( ${b} ) - SUM( ${c} )`
  if (m === 'mul') return `SUM( ${b} ) * SUM( ${c} )`
  if (m === 'div') return `SUM( ${b} ) / NULLIF(SUM( ${c} ), 0)`

  // Filters
  if (m === 'filtered') return `SUM( CASE WHEN ${fc} = '${fv}' THEN ${b} ELSE 0 END )`

  // Time Intelligence (SQL approach using Window Functions or basic lag)
  if (m === 'yoy') {
    return `-- Requiere que la consulta esté agrupada por año
-- y utiliza funciones de ventana (LAG)
(SUM( ${b} ) - LAG(SUM( ${b} ), 1) OVER (ORDER BY ${d}))
/ NULLIF(LAG(SUM( ${b} ), 1) OVER (ORDER BY ${d}), 0)`
  }
  if (m === 'ytd') {
    return `-- Suma acumulativa en el año actual
SUM(SUM( ${b} )) OVER (
  PARTITION BY DATE_TRUNC('year', ${d}) 
  ORDER BY ${d}
  ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
)`
  }
  if (m === 'rolling') {
    return `-- Promedio móvil de 3 periodos
AVG(SUM( ${b} )) OVER (
  ORDER BY ${d}
  ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
)`
  }

  return '-- SQL Preview will appear here'
  },
  set(val) {
    customPreview.value = val
  }
})

const close = () => {
  emit('update:modelValue', false)
}

const insert = () => {
  emit('insert-measure', previewDax.value)
  close()
}
</script>

<template>
  <!-- Render custom modal layout to perfectly match mockup, skipping BaseModal if it adds padding we don't want, but BaseModal is fine if we hide header -->
  <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
    <div class="bg-card w-[1000px] h-[550px] rounded-lg shadow-xl flex flex-col overflow-hidden border border-border">
      
      <!-- Header -->
      <div class="h-14 border-b border-border flex items-center justify-between px-4 shrink-0 bg-muted/10">
        <div class="flex items-center gap-2 text-foreground font-medium">
          <Sigma class="w-5 h-5 text-primary" />
          Quick measures
          <span class="text-muted-foreground font-normal text-sm ml-2">Build a measure from a template</span>
        </div>
        <button class="text-muted-foreground hover:bg-muted p-1 rounded" @click="close">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- Left Sidebar: Categories -->
        <div class="w-[200px] shrink-0 border-r border-border flex flex-col overflow-y-auto bg-muted/5 py-2">
          <button 
            v-for="cat in categories" 
            :key="cat.id"
            class="flex items-center gap-2.5 px-3 py-2 text-xs transition-colors text-left"
            :class="activeCategory === cat.id ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground border-l-2 border-transparent'"
            @click="activeCategory = cat.id; activeMeasure = measures[cat.id]?.[0]?.id"
          >
            <component :is="cat.icon" class="w-3.5 h-3.5 shrink-0" />
            <span class="truncate">{{ cat.label }}</span>
          </button>
        </div>

        <!-- Middle: Measures List -->
        <div class="w-[240px] shrink-0 border-r border-border flex flex-col bg-background">
          <div class="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/20 border-b border-border">
            Calculation
          </div>
          <div class="flex-1 overflow-y-auto p-2 space-y-1">
            <button 
              v-for="m in currentMeasureList" 
              :key="m.id"
              class="w-full text-left p-2 rounded-md transition-colors"
              :class="activeMeasure === m.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'"
              @click="activeMeasure = m.id"
            >
              <div class="text-xs font-medium mb-0.5">{{ m.name }}</div>
              <div class="text-[10px] leading-tight" :class="activeMeasure === m.id ? 'text-primary/70' : 'text-muted-foreground'">
                {{ m.desc }}
              </div>
            </button>
          </div>
        </div>

        <!-- Right: Config & Preview -->
        <div class="flex-1 flex flex-col bg-card">
          <div v-if="activeMeasureDetails" class="p-4 border-b border-border">
            <h3 class="font-medium text-foreground text-sm">{{ activeMeasureDetails.name }}</h3>
            <p class="text-[12px] text-muted-foreground mt-0.5">{{ activeMeasureDetails.desc }}</p>
            
            <div class="mt-4 grid grid-cols-2 gap-4">
              <div v-if="requiredInputs.includes('base')">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Base Measure</label>
                <select v-model="baseMeasure" class="w-full h-8 px-2 text-xs border border-border rounded focus:outline-none focus:border-primary bg-background text-foreground">
                  <option disabled value="">Select a column...</option>
                  <option v-for="col in schema" :key="col.name" :value="'&quot;' + col.name + '&quot;'">{{ col.name }}</option>
                </select>
              </div>
              <div v-if="requiredInputs.includes('compare')">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Compare Measure</label>
                <select v-model="compareMeasure" class="w-full h-8 px-2 text-xs border border-border rounded focus:outline-none focus:border-primary bg-background text-foreground">
                  <option disabled value="">Select a column...</option>
                  <option v-for="col in schema" :key="col.name" :value="'&quot;' + col.name + '&quot;'">{{ col.name }}</option>
                </select>
              </div>
              <div v-if="requiredInputs.includes('date')">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Date Column</label>
                <select v-model="dateColumn" class="w-full h-8 px-2 text-xs border border-border rounded focus:outline-none focus:border-primary bg-background text-foreground">
                  <option disabled value="">Select a column...</option>
                  <option v-for="col in schema" :key="col.name" :value="'&quot;' + col.name + '&quot;'">{{ col.name }}</option>
                </select>
              </div>
              <div v-if="requiredInputs.includes('filterCol')">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Filter Column</label>
                <select v-model="filterColumn" class="w-full h-8 px-2 text-xs border border-border rounded focus:outline-none focus:border-primary bg-background text-foreground">
                  <option disabled value="">Select a column...</option>
                  <option v-for="col in schema" :key="col.name" :value="'&quot;' + col.name + '&quot;'">{{ col.name }}</option>
                </select>
              </div>
              <div v-if="requiredInputs.includes('filterVal')">
                <label class="text-[10px] font-semibold text-muted-foreground uppercase mb-1 block">Filter Value</label>
                <input v-model="filterValue" type="text" class="w-full h-8 px-2 text-xs border border-border rounded focus:outline-none focus:border-primary bg-background text-foreground" />
              </div>
            </div>
          </div>
          
          <div class="p-4 flex-1 flex flex-col min-h-0">
            <label class="text-[10px] font-semibold text-muted-foreground uppercase mb-2 block">Preview</label>
            <div class="flex-1 border border-border rounded-md overflow-hidden relative shadow-inner">
              <CodeEditor v-model="previewDax" language="sql" />
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div class="h-14 border-t border-border flex items-center justify-between px-4 bg-muted/10 shrink-0">
        <span class="text-xs text-muted-foreground">Inserts a SQL-compatible expression at the cursor position.</span>
        <div class="flex gap-2">
          <BaseButton variant="ghost" @click="close">Cancel</BaseButton>
          <BaseButton variant="primary" @click="insert">Insert measure</BaseButton>
        </div>
      </div>

    </div>
  </div>
</template>
