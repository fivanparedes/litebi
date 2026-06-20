<template>
  <div 
    v-if="visible" 
    class="absolute z-[100] pointer-events-none transition-all duration-75 ease-out"
    :style="{ top: `${y + 15}px`, left: `${x + 15}px` }"
  >
    <div class="bg-card text-card-foreground border border-border shadow-lg rounded-md p-3 min-w-[200px] max-w-[350px]">
      
      <!-- DEFAULT LIST MODE -->
      <template v-if="mode === 'list' || !mode || mode === 'default'">
        <div class="font-semibold text-sm border-b border-border pb-2 mb-2 flex items-center justify-between gap-4">
          <span class="truncate">{{ title }}</span>
        </div>
        <div class="space-y-1.5">
          <div v-for="(item, idx) in items" :key="idx" class="flex items-center justify-between gap-4 text-xs">
            <div class="flex items-center gap-1.5 truncate">
              <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: item.color }"></span>
              <span class="text-muted-foreground truncate">{{ item.name }}</span>
            </div>
            <span class="font-medium tabular-nums">{{ formatValue(item.value, item.seriesName) }}</span>
          </div>
        </div>
        
        <!-- Extra Tooltips injected via SQL -->
        <div v-if="extraFields.length > 0" class="mt-2 pt-2 border-t border-border/50 space-y-1.5">
          <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Additional Metrics</div>
          <div v-for="(ext, idx) in extraFields" :key="'ext-'+idx" class="flex items-center justify-between gap-4 text-xs">
            <span class="text-muted-foreground truncate">{{ ext.name }}</span>
            <span class="font-medium tabular-nums">{{ formatValue(ext.value, ext.name) }}</span>
          </div>
        </div>
      </template>

      <!-- MINI-TABLE MODE -->
      <template v-else-if="mode === 'table'">
        <div class="font-semibold text-sm border-b border-border pb-2 mb-2">
          <span class="truncate">{{ title }}</span>
        </div>
        <table class="w-full text-xs text-left border-collapse">
          <thead>
            <tr class="text-muted-foreground border-b border-border/50">
              <th class="pb-1 font-medium">Series</th>
              <th class="pb-1 font-medium text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in items" :key="idx" class="border-b border-border/20 last:border-0">
              <td class="py-1 flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: item.color }"></span>
                <span>{{ item.name }}</span>
              </td>
              <td class="py-1 text-right font-medium tabular-nums">{{ formatValue(item.value, item.seriesName) }}</td>
            </tr>
            <tr v-for="(ext, idx) in extraFields" :key="'ext-'+idx" class="border-b border-border/20 last:border-0 bg-muted/20">
              <td class="py-1 text-muted-foreground flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0 bg-muted-foreground/30"></span>
                <span>{{ ext.name }}</span>
              </td>
              <td class="py-1 text-right font-medium tabular-nums">{{ formatValue(ext.value, ext.name) }}</td>
            </tr>
          </tbody>
        </table>
      </template>

      <!-- SPARKLINE MODE -->
      <template v-else-if="mode === 'sparkline'">
        <div class="font-semibold text-sm border-b border-border pb-2 mb-2 flex items-center justify-between gap-4">
          <span class="truncate">{{ title }}</span>
        </div>
        <div class="space-y-3">
          <div v-for="(item, idx) in items" :key="idx">
            <div class="flex items-center justify-between gap-4 text-xs mb-1">
              <div class="flex items-center gap-1.5 truncate">
                <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: item.color }"></span>
                <span class="text-muted-foreground truncate">{{ item.name }}</span>
              </div>
              <span class="font-medium tabular-nums">{{ formatValue(item.value, item.seriesName) }}</span>
            </div>
            <!-- CSS Sparkline Bar Representation (Relative to max value) -->
            <div class="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                class="h-full rounded-full transition-all" 
                :style="{ 
                  width: `${Math.max(2, (Number(item.value) / Math.max(1, maxValue)) * 100)}%`, 
                  backgroundColor: item.color 
                }"
              ></div>
            </div>
          </div>
          
          <div v-if="extraFields.length > 0" class="mt-2 pt-2 border-t border-border/50">
            <div class="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Context</div>
            <div class="grid grid-cols-2 gap-2">
              <div v-for="(ext, idx) in extraFields" :key="'ext-'+idx" class="bg-muted/30 p-1.5 rounded flex flex-col">
                <span class="text-[10px] text-muted-foreground truncate">{{ ext.name }}</span>
                <span class="text-xs font-medium tabular-nums">{{ formatValue(ext.value, ext.name) }}</span>
              </div>
            </div>
          </div>
        </div>
      </template>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  visible: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  params: { type: [Object, Array], default: () => [] },
  mode: { type: String, default: 'list' },
  formatters: { type: Object, default: () => ({}) }
})

// Normalize params to array
const normalizedParams = computed(() => {
  if (!props.params) return []
  return Array.isArray(props.params) ? props.params : [props.params]
})

// Extract the main axis title (X-axis category)
const title = computed(() => {
  if (normalizedParams.value.length > 0) {
    return normalizedParams.value[0].axisValueLabel || normalizedParams.value[0].name || ''
  }
  return ''
})

// Extract the standard series items
const items = computed(() => {
  return normalizedParams.value.map(p => {
    // Determine the actual value to display. In ECharts, dataset rows are arrays or objects.
    let val = p.value
    if (Array.isArray(val)) {
      // Typically [category, series1_value, series2_value, tooltip1, tooltip2]
      // We look at the encode map to find the correct dimension.
      if (p.dimensionNames && p.encode && p.encode.y) {
        val = val[p.encode.y[0]]
      } else {
        val = val[1] !== undefined ? val[1] : val[0]
      }
    } else if (val !== null && typeof val === 'object') {
      val = val.value || val[p.seriesName]
    }
    
    return {
      name: p.seriesName || p.name,
      seriesName: p.seriesName,
      color: p.color,
      value: val
    }
  })
})

// Calculate max value for sparkline
const maxValue = computed(() => {
  return Math.max(...items.value.map(i => Number(i.value) || 0))
})

// Extract extra tooltip fields injected via SQL
const extraFields = computed(() => {
  if (normalizedParams.value.length === 0) return []
  const firstParam = normalizedParams.value[0]
  
  const extras = []
  if (Array.isArray(firstParam.value) && firstParam.dimensionNames) {
    // Look for dimensions starting with 'tooltip_'
    firstParam.dimensionNames.forEach((dim, idx) => {
      if (dim && dim.startsWith('tooltip_')) {
        extras.push({
          name: dim.replace('tooltip_', ''),
          value: firstParam.value[idx]
        })
      }
    })
  } else if (firstParam.value && typeof firstParam.value === 'object') {
    Object.keys(firstParam.value).forEach(key => {
      if (key.startsWith('tooltip_')) {
        extras.push({
          name: key.replace('tooltip_', ''),
          value: firstParam.value[key]
        })
      }
    })
  }
  return extras
})

// Value formatter
const formatValue = (val, seriesName) => {
  if (val === undefined || val === null || isNaN(Number(val))) return val
  
  // Use provided formatters from ChartRenderer (e.g., Currency, Percent)
  if (props.formatters && typeof props.formatters.format === 'function') {
    return props.formatters.format(val, seriesName)
  }
  
  // Fallback default formatting
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(val)
}
</script>
