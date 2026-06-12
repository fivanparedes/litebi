<script setup>
import { computed, ref } from 'vue'
import { Database, FileText, FileSpreadsheet, Server, Globe, Box, Eye, Cloud, DatabaseZap, Globe2, Edit3, Type, Hash, Calendar, Table, ChevronRight, Plus, X } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'

const props = defineProps({
  searchQuery: {
    type: String,
    default: ''
  }
})

const dataStore = useDataStore()

const expandedCard = ref(null)

const toggleCard = (name) => {
  if (expandedCard.value === name) {
    expandedCard.value = null // Collapse
  } else {
    expandedCard.value = name
    dataStore.setActiveDataset(name) // Load preview
  }
}

const filteredDatasets = computed(() => {
  if (!props.searchQuery) return dataStore.datasetList
  const query = props.searchQuery.toLowerCase()
  return dataStore.datasetList.filter(d => d.originalName.toLowerCase().includes(query))
})

const formatNumber = (num) => new Intl.NumberFormat().format(num)

const formatSize = (rows, cols) => {
  const bytes = rows * cols * 15
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

const getTags = (dataset) => {
  if (dataset.tags && dataset.tags.length > 0) return dataset.tags
  // Initial auto-generation if empty
  const tags = []
  const name = dataset.originalName.toLowerCase()
  if (name.includes('fact') || name.includes('order') || name.includes('sale')) {
    tags.push('FACT', 'SALES')
  } else if (name.includes('dim') || name.includes('emp') || name.includes('customer')) {
    tags.push('DIMENSION', 'HR')
  }
  tags.push('CERTIFIED')
  // We don't save these to store automatically to not clutter it, 
  // but if they edit them, they get saved.
  return tags
}

const editingTags = ref({})
const newTagInput = ref('')

const startEditingTags = (datasetName) => {
  editingTags.value[datasetName] = true
  // ensure the dataset has the initial tags in the store if it was empty
  const ds = dataStore.datasetList.find(d => d.name === datasetName)
  if (ds && (!ds.tags || ds.tags.length === 0)) {
    dataStore.updateDatasetTags(datasetName, getTags(ds))
  }
}

const removeTag = (datasetName, tagIndex) => {
  const ds = dataStore.datasetList.find(d => d.name === datasetName)
  if (ds && ds.tags) {
    const newTags = [...ds.tags]
    newTags.splice(tagIndex, 1)
    dataStore.updateDatasetTags(datasetName, newTags)
  }
}

const addTag = (datasetName) => {
  if (!newTagInput.value.trim()) return
  const ds = dataStore.datasetList.find(d => d.name === datasetName)
  if (ds) {
    const newTags = [...(ds.tags || [])]
    if (!newTags.includes(newTagInput.value.trim().toUpperCase())) {
      newTags.push(newTagInput.value.trim().toUpperCase())
      dataStore.updateDatasetTags(datasetName, newTags)
    }
  }
  newTagInput.value = ''
}

const stopEditingTags = (datasetName) => {
  editingTags.value[datasetName] = false
}

const getTimeAgo = (date) => {
  if (!date) return 'Unknown'
  const seconds = Math.floor((new Date() - new Date(date)) / 1000)
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hours ago`
  return `${Math.floor(hours / 24)} days ago`
}

const getConnectorIcon = (dataset) => {
  const type = dataset.connectorConfig?.type || 'csv'
  if (type === 'postgres' || type === 'mysql' || type === 'sqlserver') return DatabaseZap
  if (type === 'api' || type === 'salesforce') return Cloud
  if (type === 'csv' || type === 'excel') return FileSpreadsheet
  return Database
}

const getConnectorName = (dataset) => {
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

const getMockSubtitle = (name) => {
  const lower = name.toLowerCase()
  if (lower.includes('order') || lower.includes('sale')) return 'Sales'
  if (lower.includes('emp')) return 'HR Records'
  if (lower.includes('ledger') || lower.includes('finance')) return 'Finance Ledger'
  if (lower.includes('stock')) return 'Inventory Warehouse'
  if (lower.includes('crm')) return 'CRM Pipeline'
  if (lower.includes('ops')) return 'Operations DW'
  return 'Data Warehouse'
}
</script>

<template>
  <div class="dataset-grid">
    <div 
      v-for="dataset in filteredDatasets" 
      :key="dataset.name"
      class="dataset-card"
      :class="{ 'dataset-card--active': expandedCard === dataset.name }"
      @click="toggleCard(dataset.name)"
    >
      <!-- Top Section -->
      <div class="flex items-start gap-4">
        <div class="w-10 h-10 rounded-none bg-muted flex items-center justify-center shrink-0 border border-border">
          <component :is="getConnectorIcon(dataset)" class="w-5 h-5 text-muted-foreground" />
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-foreground text-sm truncate">{{ dataset.originalName }}</h3>
            <ChevronRight class="w-4 h-4 text-muted-foreground transition-transform duration-200" :class="{ 'rotate-90': expandedCard === dataset.name }" />
          </div>
          <div class="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-2">
            <span>{{ getMockSubtitle(dataset.originalName) }} — {{ getConnectorName(dataset) }}</span>
            <span v-if="dataset.originalName.toLowerCase().includes('crm')" class="px-1.5 py-0.5 rounded-none text-[10px] font-bold bg-red-100 text-red-600 border border-red-200">ERROR</span>
          </div>
          <div class="text-xs text-muted-foreground mt-1">
            {{ formatNumber(dataset.rowCount) }} rows · {{ dataset.colCount }} cols · {{ formatSize(dataset.rowCount, dataset.colCount) }}
          </div>
        </div>
      </div>

      <!-- Expanded Section -->
      <div v-if="expandedCard === dataset.name" class="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-200" @click.stop>
        <div class="flex gap-8 mb-4">
          <div>
            <div class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">Updated</div>
            <div class="text-xs font-medium">{{ getTimeAgo(dataset.importedAt) }}</div>
          </div>
          <div>
            <div class="text-[10px] font-bold uppercase text-muted-foreground tracking-wider mb-0.5">Owner</div>
            <div class="text-xs font-medium">data-eng</div>
          </div>
        </div>
        
        <!-- Tags Section -->
        <div class="mb-4">
          <div class="flex flex-wrap items-center gap-1.5">
            <span 
              v-for="(tag, idx) in getTags(dataset)" 
              :key="idx"
              class="px-2 py-0.5 border border-border rounded-none text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 group"
            >
              {{ tag }}
              <button v-if="editingTags[dataset.name]" class="hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" @click="removeTag(dataset.name, idx)">
                <X class="w-3 h-3" />
              </button>
            </span>
            
            <button 
              v-if="!editingTags[dataset.name]"
              class="px-2 py-0.5 border border-dashed border-border rounded-none text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors flex items-center gap-1"
              @click="startEditingTags(dataset.name)"
            >
              <Edit3 class="w-3 h-3" /> Edit
            </button>
          </div>

          <!-- Edit tags inline -->
          <div v-if="editingTags[dataset.name]" class="mt-2 flex items-center gap-2">
            <input 
              v-model="newTagInput" 
              placeholder="Add tag..."
              class="text-xs px-2 py-1 border border-border rounded-none outline-none focus:border-primary flex-1 bg-background"
              @keyup.enter="addTag(dataset.name)"
            />
            <button class="text-xs px-2 py-1 bg-primary text-primary-foreground rounded-none font-medium" @click="addTag(dataset.name)">Add</button>
            <button class="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-none font-medium" @click="stopEditingTags(dataset.name)">Done</button>
          </div>
        </div>

        <button class="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors" @click="dataStore.setActiveDataset(dataset.name)">
          <Eye class="w-3.5 h-3.5" />
          View table below
        </button>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-if="filteredDatasets.length === 0" class="col-span-full py-12 text-center text-muted-foreground">
      No datasets found matching your criteria.
    </div>
  </div>
</template>

<style scoped>
.dataset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
  align-items: start;
}

.dataset-card {
  background-color: var(--card);
  border: 1px solid var(--color-border);
  border-radius: 0;
  padding: var(--space-6);
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.dataset-card:hover {
  border-color: var(--color-border-hover);
}

.dataset-card--active {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}
</style>
