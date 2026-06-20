<script setup>
import { computed, ref, watchEffect } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

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
  },
  config: {
    type: Object,
    default: () => ({})
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

const virtualData = computed(() => {
  return props.data.map((row, index) => ({ ...row, _vid: index }))
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

const getRowStyle = (item) => {
  if (!props.config?.advanced?.conditionalRules || props.config.advanced.conditionalRules.length === 0) return {}
  
  for (const r of props.config.advanced.conditionalRules) {
    if (!r.column || !r.value || !r.color) continue
    const val = item[r.column]
    if (val === undefined || val === null) continue
    
    const v = Number(val)
    const rv = Number(r.value)
    
    if (!isNaN(v) && !isNaN(rv)) {
      if (r.operator === '=' && v === rv) return { backgroundColor: r.color + '33' }
      if (r.operator === '!=' && v !== rv) return { backgroundColor: r.color + '33' }
      if (r.operator === '>' && v > rv) return { backgroundColor: r.color + '33' }
      if (r.operator === '>=' && v >= rv) return { backgroundColor: r.color + '33' }
      if (r.operator === '<' && v < rv) return { backgroundColor: r.color + '33' }
      if (r.operator === '<=' && v <= rv) return { backgroundColor: r.color + '33' }
    } else {
      const sv = String(val).toLowerCase()
      const srv = String(r.value).toLowerCase()
      if (r.operator === '=' && sv === srv) return { backgroundColor: r.color + '33' }
      if (r.operator === '!=' && sv !== srv) return { backgroundColor: r.color + '33' }
    }
  }
  return {}
}
</script>

<template>
  <div class="data-grid-container flex-1 overflow-auto custom-scrollbar relative">
    <div class="min-w-max flex flex-col h-full">
      <div class="sticky top-0 bg-muted/40 shadow-[0_1px_0_var(--color-border)] z-10 flex border-b border-border">
        <div 
          v-for="col in schema" 
          :key="col.name"
          class="px-4 py-3 font-normal border-r border-border last:border-r-0 w-[200px] shrink-0"
        >
          <div class="flex flex-col gap-0.5">
            <span class="font-mono font-semibold text-foreground text-xs">{{ col.name }}</span>
            <span class="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {{ col.type }} - NULLS {{ (columnNulls[col.name] || 0).toFixed(0) }}%
            </span>
          </div>
        </div>
      </div>
      
      <RecycleScroller
        v-slot="{ item }"
        class="flex-1"
        :items="virtualData"
        :item-size="36"
        key-field="_vid"
      >
        <div class="flex transition-colors border-b border-border" :style="getRowStyle(item)" :class="{ 'hover:bg-muted/30': !getRowStyle(item).backgroundColor }">
          <div 
            v-for="col in schema" 
            :key="col.name"
            class="px-4 py-2 border-r border-border last:border-r-0 whitespace-nowrap overflow-hidden text-ellipsis w-[200px] shrink-0 font-mono text-[11px]"
            :class="{ 'text-right': col.type === 'number' || col.type === 'integer' || col.type === 'decimal' || col.type === 'BIGINT' || col.type === 'DOUBLE' }"
          >
            <span class="text-foreground" v-html="formatValue(item[col.name], col.type)"></span>
          </div>
        </div>
      </RecycleScroller>
    </div>
  </div>
</template>

<style scoped>
.data-grid-container {
  width: 100%;
  height: 100%;
  background-color: transparent;
}

/* Custom scrollbar for the container */
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
