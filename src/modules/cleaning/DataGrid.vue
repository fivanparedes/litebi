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

const emit = defineEmits(['column-selected'])

const tableElement = ref(null)
let tabulatorInstance = null

// Helper to calculate column stats for profiling
const calculateStats = (data, colName) => {
  let nulls = 0
  let total = data.length || 0
  let unique = new Set()
  
  if (total > 0) {
    for (let i = 0; i < total; i++) {
      const val = data[i][colName]
      if (val === null || val === undefined || val === '') {
        nulls++
      }
      unique.add(val)
    }
  }
  
  return {
    nullPct: total ? Math.round((nulls / total) * 100) : 0,
    uniqueCount: unique.size
  }
}

// Define Tabulator columns based on schema
const buildColumns = (schema, data) => {
  return schema.map(col => {
    const stats = calculateStats(data, col.name)
    const validPct = 100 - stats.nullPct
    const qualityColor = validPct < 50 ? 'var(--color-danger, #ef4444)' : validPct < 90 ? 'var(--color-warning, #eab308)' : 'var(--color-success, #10b981)'
    
    return {
      title: col.name,
      field: col.name,
      sorter: col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'string',
      headerFilter: true, // Enable basic quick filtering
      headerFilterPlaceholder: 'Filtrar...',
      formatter: col.type === 'boolean' ? 'tickCross' : 'plaintext',
      hozAlign: col.type === 'number' ? 'right' : 'left',
      titleFormatter: (cell) => {
        return `
          <div style="display:flex; flex-direction:column; width:100%; padding:2px 0;">
            <span style="font-weight:600;">${col.name}</span>
            <div style="display:flex; justify-content:space-between; font-size:10px; color:var(--color-text-secondary); margin-top:4px; font-weight:normal;">
              <span title="Valores únicos">U: ${stats.uniqueCount}</span>
              <span style="color:${qualityColor}" title="Porcentaje de datos no nulos">${validPct}% Válido</span>
            </div>
            <div style="width:100%; height:3px; background:var(--color-border); margin-top:2px; border-radius:2px; overflow:hidden;">
              <div style="width:${validPct}%; height:100%; background:${qualityColor};"></div>
            </div>
          </div>
        `
      }
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
      columns: buildColumns(props.schema, props.data),
      height: props.height,
      layout: "fitDataFill",
      reactiveData: false, // We handle reactivity manually to improve perf with huge datasets
      pagination: "local",
      paginationSize: 100,
      paginationSizeSelector: [50, 100, 500, 1000],
      movableColumns: true,
      index: "_temp_id", // Requires a unique ID if using selection
    })

    tabulatorInstance.on("headerClick", function(e, column) {
      emit('column-selected', column.getField())
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
