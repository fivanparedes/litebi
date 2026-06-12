<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Download, Filter, FileSpreadsheet } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'

import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { exportToPDF } from '@/modules/project/ExportManager'

const dataStore = useDataStore()
const uiStore = useUiStore()
const router = useRouter()

const hasData = computed(() => !!dataStore.activeDatasetName)
const activeDatasetMeta = computed(() => dataStore.activeDatasetMeta)

const totalRows = ref(0)
const totalColumns = ref(0)
const columnStats = ref([])
const isProfiling = ref(false)
const overallQuality = ref(100)
const nullDensity = ref(0)

const detectedTypes = ref([])

// Helper component for quality bar inline
const getTone = (value) => {
  return value >= 95 ? "bg-success" : value >= 85 ? "bg-warning" : "bg-danger"
}

const performProfiling = async () => {
  if (!dataStore.activeDatasetName || !activeDatasetMeta.value) return
  isProfiling.value = true
  
  try {
    const dsName = dataStore.activeDatasetName
    const schema = activeDatasetMeta.value.schema || []
    totalColumns.value = schema.length

    // 1. Get total rows
    const rowCountRes = await sqlClient.query(`SELECT COUNT(*) as total FROM "${dsName}"`)
    const rows = Number(rowCountRes[0].total) || 0
    totalRows.value = rows

    if (rows === 0) {
      columnStats.value = []
      isProfiling.value = false
      return
    }

    // 2. Profile each column
    const stats = []
    let totalNulls = 0
    let totalCells = rows * schema.length

    const typeCounts = {
      'Numeric': 0,
      'String': 0,
      'Date / Time': 0,
      'Boolean': 0
    }

    for (const col of schema) {
      // DuckDB specific query for profiling
      const querySql = `SELECT 
        SUM(CASE WHEN "${col.name}" IS NULL THEN 1 ELSE 0 END) as nulls,
        COUNT(DISTINCT "${col.name}") as unique_count
      FROM "${dsName}"`
      
      const res = await sqlClient.query(querySql)
      const colNulls = Number(res[0].nulls) || 0
      const colUnique = Number(res[0].unique_count) || 0
      
      // Sample
      const sampleRes = await sqlClient.query(`SELECT DISTINCT "${col.name}" as val FROM "${dsName}" WHERE "${col.name}" IS NOT NULL LIMIT 3`)
      const sample = sampleRes.map(r => r.val).join(', ')

      const nullPct = (colNulls / rows) * 100
      const uniquePct = (colUnique / rows) * 100
      const quality = Math.max(0, 100 - nullPct) // simplified quality metric

      totalNulls += colNulls

      stats.push({
        name: col.name,
        type: col.type,
        nulls: nullPct.toFixed(1),
        unique: uniquePct.toFixed(1),
        sample: sample || '-',
        quality: Math.round(quality)
      })

      // Categorize types roughly
      const t = col.type.toLowerCase()
      if (t.includes('int') || t.includes('dec') || t.includes('num') || t.includes('float')) {
        typeCounts['Numeric']++
      } else if (t.includes('date') || t.includes('time')) {
        typeCounts['Date / Time']++
      } else if (t.includes('bool')) {
        typeCounts['Boolean']++
      } else {
        typeCounts['String']++
      }
    }

    columnStats.value = stats
    
    // Calculate overall stats
    if (totalCells > 0) {
      nullDensity.value = ((totalNulls / totalCells) * 100).toFixed(1)
      overallQuality.value = Math.max(0, 100 - nullDensity.value).toFixed(1)
    }

    detectedTypes.value = [
      ["Numeric", typeCounts['Numeric'], "var(--color-chart-1)"],
      ["String", typeCounts['String'], "var(--color-chart-2)"],
      ["Date / Time", typeCounts['Date / Time'], "var(--color-chart-3)"],
      ["Boolean", typeCounts['Boolean'], "var(--color-chart-4)"]
    ].filter(t => t[1] > 0)

  } catch (err) {
    console.error("Profiling error:", err)
  } finally {
    isProfiling.value = false
  }
}

onMounted(() => {
  performProfiling()
})

watch(() => dataStore.activeDatasetName, () => {
  performProfiling()
})

const formatNumber = (num) => {
  return new Intl.NumberFormat('en-US').format(num)
}

const handleExportProfile = async () => {
  try {
    uiStore.addToast({ message: 'Generating PDF report...', type: 'info' })
    const filename = `DataProfile_${activeDatasetMeta.value?.originalName || 'Dataset'}`
    await exportToPDF('profile-export-area', filename)
    uiStore.addToast({ message: 'PDF exported successfully!', type: 'success' })
  } catch (err) {
    uiStore.addToast({ message: 'Error exporting PDF', type: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col h-full bg-background overflow-hidden relative">
    <div v-if="!hasData" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-[480px] flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 border border-primary/20">
          <FileSpreadsheet class="w-10 h-10 text-primary" />
        </div>
        <h2 class="text-xl font-semibold mb-3">No dataset selected</h2>
        <p class="text-sm text-muted-foreground mb-8">Select or import a dataset in the Data Sources view to see its profiling statistics.</p>
        
        <BaseButton variant="primary" @click="router.push('/data')">
          Go to Data Sources
        </BaseButton>
      </div>
    </div>
    
    <div v-else id="profile-export-area" class="flex-1 overflow-y-auto p-4 lg:p-6 bg-background">
      <div class="mb-4 flex items-center justify-between">
        <div>
           <h2 class="text-xl font-semibold tracking-tight text-foreground">Data Profile &middot; {{ activeDatasetMeta?.originalName }}</h2>
           <p class="text-sm text-muted-foreground">Inspect schema, quality and distribution of your dataset.</p>
        </div>
        <div class="flex items-center gap-2" data-html2canvas-ignore="true">
          <BaseButton variant="outline" size="sm" :disabled="isProfiling" @click="performProfiling">
             Refresh Profile
          </BaseButton>
          <BaseButton variant="outline" size="sm" @click="handleExportProfile">
             <template #icon-left><Download class="w-3.5 h-3.5" /></template>
             Export report
          </BaseButton>
        </div>
      </div>

      <div v-if="isProfiling" class="py-12 flex justify-center items-center">
         <div class="flex flex-col items-center gap-4 text-muted-foreground">
           <div class="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           <p class="text-sm">Running profiling queries against DuckDB...</p>
         </div>
      </div>
      
      <div v-else class="space-y-6">
        <!-- KPI Row -->
        <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="bg-card border border-border rounded-none p-4 shadow-none flex flex-col justify-between">
            <div class="text-sm font-medium text-muted-foreground">Rows</div>
            <div class="mt-2 flex items-baseline gap-2">
               <span class="text-2xl font-semibold tracking-tight">{{ formatNumber(totalRows) }}</span>
            </div>
          </div>
          <div class="bg-card border border-border rounded-none p-4 shadow-none flex flex-col justify-between">
            <div class="text-sm font-medium text-muted-foreground">Columns</div>
            <div class="mt-2 flex items-baseline gap-2">
               <span class="text-2xl font-semibold tracking-tight">{{ totalColumns }}</span>
               <span class="text-xs font-semibold px-1.5 py-0.5 rounded-none bg-muted text-muted-foreground">STABLE</span>
            </div>
          </div>
          <div class="bg-card border border-border rounded-none p-4 shadow-none flex flex-col justify-between">
            <div class="text-sm font-medium text-muted-foreground">Overall Quality</div>
            <div class="mt-2 flex items-baseline gap-2">
               <span class="text-2xl font-semibold tracking-tight">{{ overallQuality }}<span class="text-lg text-muted-foreground ml-0.5">%</span></span>
               <span class="text-xs font-semibold px-1.5 py-0.5 rounded-none" :class="overallQuality >= 90 ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'">HEALTHY</span>
            </div>
          </div>
          <div class="bg-card border border-border rounded-none p-4 shadow-none flex flex-col justify-between">
            <div class="text-sm font-medium text-muted-foreground">Null Density</div>
            <div class="mt-2 flex items-baseline gap-2">
               <span class="text-2xl font-semibold tracking-tight">{{ nullDensity }}<span class="text-lg text-muted-foreground ml-0.5">%</span></span>
            </div>
          </div>
        </div>

        <!-- Middle Row -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div class="lg:col-span-2 bg-card border border-border rounded-none shadow-none flex flex-col">
            <div class="px-4 py-3 border-b border-border">
               <h3 class="font-semibold text-sm tracking-tight text-foreground">Quality breakdown</h3>
            </div>
            <div class="p-4 space-y-4">
               <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                     <span class="text-muted-foreground">Complete rows (estimated)</span>
                     <span class="tabular-nums font-medium">{{ overallQuality }}%</span>
                  </div>
                  <div class="h-2 bg-muted rounded-none overflow-hidden">
                     <div class="h-full bg-success transition-all duration-500" :style="{ width: overallQuality + '%' }"></div>
                  </div>
               </div>
               <div>
                  <div class="flex items-center justify-between text-xs mb-1">
                     <span class="text-muted-foreground">Rows with nullable gaps (estimated)</span>
                     <span class="tabular-nums font-medium">{{ nullDensity }}%</span>
                  </div>
                  <div class="h-2 bg-muted rounded-none overflow-hidden">
                     <div class="h-full bg-warning transition-all duration-500" :style="{ width: nullDensity + '%' }"></div>
                  </div>
               </div>
            </div>
          </div>

          <div class="bg-card border border-border rounded-none shadow-none flex flex-col">
             <div class="px-4 py-3 border-b border-border">
               <h3 class="font-semibold text-sm tracking-tight text-foreground">Detected types</h3>
            </div>
            <div class="p-4 space-y-3 text-xs">
               <div v-for="[label, count, color] in detectedTypes" :key="label" class="flex items-center justify-between border-b border-border/50 pb-2 last:border-0 last:pb-0">
                 <div class="flex items-center gap-2">
                   <span class="w-2.5 h-2.5 rounded-full" :style="{ background: color }"></span>
                   <span>{{ label }}</span>
                 </div>
                 <span class="font-medium tabular-nums">{{ count }} cols</span>
               </div>
            </div>
          </div>
        </div>

        <!-- Bottom Table -->
        <div class="bg-card border border-border rounded-none shadow-none flex flex-col overflow-hidden">
          <div class="px-4 py-3 border-b border-border bg-muted/20">
             <h3 class="font-semibold text-sm tracking-tight text-foreground">Column profile</h3>
             <p class="text-xs text-muted-foreground mt-0.5">Inferred types, null density, distinctness and sample values.</p>
          </div>
          <div class="overflow-x-auto">
             <table class="w-full text-xs text-left">
               <thead class="bg-muted/30 text-muted-foreground">
                 <tr>
                   <th class="py-2.5 px-4 font-medium uppercase tracking-wider text-[10px] border-b border-border">Column</th>
                   <th class="py-2.5 px-4 font-medium uppercase tracking-wider text-[10px] border-b border-border">Type</th>
                   <th class="py-2.5 px-4 font-medium uppercase tracking-wider text-[10px] border-b border-border">Nulls</th>
                   <th class="py-2.5 px-4 font-medium uppercase tracking-wider text-[10px] border-b border-border">Distinct</th>
                   <th class="py-2.5 px-4 font-medium uppercase tracking-wider text-[10px] border-b border-border">Sample</th>
                   <th class="py-2.5 px-4 font-medium uppercase tracking-wider text-[10px] border-b border-border">Quality</th>
                 </tr>
               </thead>
               <tbody>
                 <tr v-for="(c, i) in columnStats" :key="c.name" :class="i % 2 === 1 ? 'bg-muted/10' : ''" class="hover:bg-muted/20 transition-colors">
                   <td class="py-2.5 px-4 font-mono font-medium text-foreground">{{ c.name }}</td>
                   <td class="py-2.5 px-4">
                      <span class="inline-flex items-center px-1.5 py-0.5 rounded-none text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                         {{ c.type }}
                      </span>
                   </td>
                   <td class="py-2.5 px-4 tabular-nums">{{ c.nulls }}%</td>
                   <td class="py-2.5 px-4 tabular-nums">{{ c.unique }}%</td>
                   <td class="py-2.5 px-4 text-muted-foreground font-mono truncate max-w-[200px] lg:max-w-[300px]">{{ c.sample }}</td>
                   <td class="py-2.5 px-4">
                     <div class="flex items-center gap-2">
                       <div class="h-1.5 w-20 bg-muted overflow-hidden rounded-none">
                         <div class="h-full rounded-none transition-all duration-500" :class="getTone(c.quality)" :style="{ width: c.quality + '%' }"></div>
                       </div>
                       <span class="text-xs tabular-nums font-medium w-8 text-right">{{ c.quality }}%</span>
                     </div>
                   </td>
                 </tr>
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tailwind classes only */
</style>
