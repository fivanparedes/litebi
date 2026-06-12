<script setup>
import { computed, ref, watchEffect } from 'vue'

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

const columnNulls = ref({})

watchEffect(() => {
  const nullStats = {}
  if (props.data && props.data.length > 0 && props.schema) {
    props.schema.forEach(col => {
      let nullCount = 0
      props.data.forEach(row => {
        if (row[col.name] === null || row[col.name] === undefined || row[col.name] === '') {
          nullCount++
        }
      })
      nullStats[col.name] = (nullCount / props.data.length) * 100
    })
  }
  columnNulls.value = nullStats
})

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
  return val
}
</script>

<template>
  <div class="data-grid-container flex-1 overflow-auto custom-scrollbar">
    <table class="w-full text-xs text-left border-collapse min-w-max">
      <thead class="sticky top-0 bg-muted/40 shadow-[0_1px_0_var(--color-border)] z-10">
        <tr>
          <th 
            v-for="col in schema" 
            :key="col.name"
            class="px-4 py-3 font-normal border-r border-border last:border-r-0"
          >
            <div class="flex flex-col gap-0.5">
              <span class="font-mono font-semibold text-foreground text-xs">{{ col.name }}</span>
              <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                {{ col.type }} - NULLS {{ (columnNulls[col.name] || 0).toFixed(0) }}%
              </span>
            </div>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr 
          v-for="(row, idx) in data" 
          :key="idx"
          class="hover:bg-muted/30 transition-colors"
        >
          <td 
            v-for="col in schema" 
            :key="col.name"
            class="px-4 py-2 border-r border-border last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] font-mono text-[11px]"
            :class="{ 'text-right': col.type === 'number' || col.type === 'integer' || col.type === 'decimal' || col.type === 'BIGINT' || col.type === 'DOUBLE' }"
          >
            <span class="text-foreground" v-html="formatValue(row[col.name], col.type)"></span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.data-grid-container {
  width: 100%;
  height: 100%;
  background-color: transparent;
}

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
