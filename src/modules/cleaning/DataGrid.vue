<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { TabulatorFull as Tabulator } from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator.min.css'

const props = defineProps({
  data: {
    type: Array,
    required: true
  },
  schema: {
    type: Array,
    required: true
  },
  height: {
    type: String,
    default: '100%'
  }
})

const tableElement = ref(null)
let tabulatorInstance = null

// Define Tabulator columns based on schema
const buildColumns = (schema) => {
  return schema.map(col => {
    return {
      title: col.name,
      field: col.name,
      sorter: col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'string',
      headerFilter: true, // Enable basic quick filtering
      headerFilterPlaceholder: 'Filtrar...',
      formatter: col.type === 'boolean' ? 'tickCross' : 'plaintext',
      hozAlign: col.type === 'number' ? 'right' : 'left'
    }
  })
}

const initTabulator = () => {
  if (tabulatorInstance) {
    tabulatorInstance.destroy()
  }
  
  if (tableElement.value) {
    tabulatorInstance = new Tabulator(tableElement.value, {
      data: props.data,
      columns: buildColumns(props.schema),
      height: props.height,
      layout: "fitDataFill",
      reactiveData: false, // We handle reactivity manually to improve perf with huge datasets
      pagination: "local",
      paginationSize: 100,
      paginationSizeSelector: [50, 100, 500, 1000],
      movableColumns: true,
      index: "_temp_id", // Requires a unique ID if using selection
    })
  }
}

// Re-init if schema changes (columns changed)
watch(() => props.schema, () => {
  initTabulator()
}, { deep: true })

// Just update data if data changes but schema is same
watch(() => props.data, (newData) => {
  if (tabulatorInstance) {
    tabulatorInstance.replaceData(newData)
  }
}, { deep: false })

onMounted(() => {
  initTabulator()
})

onUnmounted(() => {
  if (tabulatorInstance) {
    tabulatorInstance.destroy()
    tabulatorInstance = null
  }
})
</script>

<template>
  <div class="data-grid-container">
    <div ref="tableElement" class="litebi-tabulator"></div>
  </div>
</template>

<style scoped>
.data-grid-container {
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Customizing Tabulator Theme to match LiteBI */
:deep(.tabulator) {
  border: none;
  background-color: transparent;
  font-family: var(--font-family);
  font-size: var(--text-sm);
}

:deep(.tabulator-header) {
  background-color: var(--color-bg-primary) !important;
  border-bottom: 1px solid var(--color-border) !important;
  color: var(--color-text-primary);
  font-weight: var(--font-semibold);
}

:deep(.tabulator-col) {
  background-color: transparent !important;
  border-right: 1px solid var(--color-border) !important;
}

:deep(.tabulator-row) {
  background-color: var(--color-bg-surface) !important;
  border-bottom: 1px solid var(--color-border) !important;
  color: var(--color-text-primary);
}

:deep(.tabulator-row:hover) {
  background-color: var(--color-bg-secondary) !important;
}

:deep(.tabulator-footer) {
  background-color: var(--color-bg-primary) !important;
  border-top: 1px solid var(--color-border) !important;
  color: var(--color-text-secondary);
}

:deep(.tabulator-page) {
  color: var(--color-text-primary) !important;
  border-color: var(--color-border) !important;
  border-radius: var(--radius-sm);
}

:deep(.tabulator-page.active) {
  color: var(--color-accent) !important;
}

:deep(.tabulator input),
:deep(.tabulator select) {
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 2px 4px;
}
</style>
