<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { FileText, FileSpreadsheet, User, Wand2 } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useRouter } from 'vue-router'

const dataStore = useDataStore()
const router = useRouter()

const activeDataset = computed(() => dataStore.activeDatasetMeta)
const previewData = ref([])
const columnNulls = ref({})

const getMockSubtitle = (name) => {
  if (!name) return ''
  if (name.toLowerCase().includes('order') || name.toLowerCase().includes('sale')) return 'Sales'
  if (name.toLowerCase().includes('emp')) return 'HR Records'
  if (name.toLowerCase().includes('ledger') || name.toLowerCase().includes('finance')) return 'Finance Ledger'
  if (name.toLowerCase().includes('stock')) return 'Inventory Warehouse'
  if (name.toLowerCase().includes('crm')) return 'CRM Pipeline'
  if (name.toLowerCase().includes('ops')) return 'Operations DW'
  return 'Data Warehouse'
}

const getConnectorName = (dataset) => {
  if (!dataset) return ''
  const type = dataset.connectorConfig?.type || 'csv'
  switch (type) {
    case 'postgres': return 'PostgreSQL'
    case 'mysql': return 'MySQL'
    case 'sqlserver': return 'SQL Server'
    case 'api': return 'REST API'
    case 'salesforce': return 'Salesforce'
    case 'csv': return 'Local CSV'
    case 'excel': return 'Excel File'
    default: return 'Custom Source'
  }
}

watchEffect(async () => {
  if (!activeDataset.value) {
    previewData.value = []
    columnNulls.value = {}
    return
  }
  const data = await dataStore.getPreviewData(activeDataset.value.name, 100)
  previewData.value = data
  
  // Compute mock null percentages based on preview
  const nullStats = {}
  if (data.length > 0) {
    activeDataset.value.schema.forEach(col => {
      let nullCount = 0
      data.forEach(row => {
        if (row[col.name] === null || row[col.name] === undefined || row[col.name] === '') {
          nullCount++
        }
      })
      nullStats[col.name] = ((nullCount / data.length) * 100).toFixed(0)
    })
  }
  columnNulls.value = nullStats
})

const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const formatValue = (val, type) => {
  if (val === null || val === undefined || val === '') return '<span class="text-muted-foreground/50">null</span>'
  if (typeof val === 'boolean') return val.toString()
  if ((type === 'date' || type === 'DATE') && typeof val === 'number') {
    // Arrow returns dates as unix epoch ms
    try {
      return new Date(val).toISOString().split('T')[0]
    } catch (e) {
      return val
    }
  }
  return escapeHtml(String(val))
}

const formatNumber = (num) => new Intl.NumberFormat().format(num)

</script>

<template>
  <div v-if="activeDataset" class="flex flex-col h-full overflow-hidden">
    <!-- Header -->
    <div class="px-6 py-4 border-b border-border bg-card shrink-0 flex justify-between items-start">
      <div>
        <h2 class="text-base font-semibold tracking-tight text-foreground mb-1">{{ activeDataset.originalName }}</h2>
        <div class="text-xs text-muted-foreground flex items-center gap-1">
          <span>{{ getMockSubtitle(activeDataset.originalName) }}</span>
          <span>—</span>
          <span>{{ getConnectorName(activeDataset) }}</span>
          <span>·</span>
          <span>showing first {{ Math.min(100, activeDataset.rowCount) }} of {{ formatNumber(activeDataset.rowCount) }} rows</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <BaseButton variant="outline" size="sm" @click="router.push('/profile')">
          Open in Profile
        </BaseButton>
        <BaseButton variant="outline" size="sm" @click="router.push('/cleaning')">
          Open in Transform
        </BaseButton>
      </div>
    </div>
    
    <!-- Table -->
    <div class="flex-1 overflow-auto custom-scrollbar">
      <table class="w-full text-xs text-left border-collapse min-w-max">
        <thead class="sticky top-0 bg-muted/40 shadow-[0_1px_0_var(--color-border)] z-10">
          <tr>
            <th 
              v-for="col in activeDataset.schema" 
              :key="col.name"
              class="px-4 py-3 font-normal border-r border-border last:border-r-0"
            >
              <div class="flex flex-col gap-0.5">
                <span class="font-mono font-semibold text-foreground text-xs">{{ col.name }}</span>
                <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {{ col.type }} - NULLS {{ columnNulls[col.name] || '0' }}%
                </span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr 
            v-for="(row, idx) in previewData" 
            :key="idx"
            class="hover:bg-muted/30 transition-colors"
          >
            <td 
              v-for="col in activeDataset.schema" 
              :key="col.name"
              class="px-4 py-2 border-r border-border last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] font-mono text-[11px]"
              :class="{ 'text-right': col.type === 'number' || col.type === 'integer' || col.type === 'decimal' }"
            >
              <span class="text-foreground" v-html="formatValue(row[col.name], col.type)"></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for the table */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: var(--muted-foreground);
}
</style>
