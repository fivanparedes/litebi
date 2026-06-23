<script setup>
import { computed } from 'vue'
import { Filter, ArrowUpDown, Trash2, Check, X, Plus, ChevronRight, Calendar } from '@lucide/vue'

const props = defineProps({
  pipelineSteps: {
    type: Array,
    required: true
  },
  schema: {
    type: Array,
    required: true
  },
  activeStepId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['remove-step', 'toggle-step', 'select-step'])

const transformOptions = [
  { value: 'filter', label: 'Filtrar', icon: Filter },
  { value: 'sort', label: 'Ordenar', icon: ArrowUpDown },
  { value: 'remove_column', label: 'Eliminar Columna', icon: Trash2 },
  { value: 'remove_nulls', label: 'Eliminar nulos', icon: Trash2 },
  { value: 'replace_value', label: 'Reemplazar Valor', icon: Check },
  { value: 'fill_nulls', label: 'Rellenar Faltantes', icon: Check },
  { value: 'text_transform', label: 'Transformar Texto', icon: Check },
  { value: 'remove_duplicates', label: 'Eliminar Duplicados', icon: Trash2 },
  { value: 'extract_date', label: 'Extraer Fecha', icon: Check },
  { value: 'date_diff', label: 'Diferencia Fechas', icon: Check },
  { value: 'date_add', label: 'Desplazar Fecha', icon: Check },
  { value: 'groupby', label: 'Agrupar', icon: Check },
  { value: 'split', label: 'Dividir Columna', icon: Check },
  { value: 'cast', label: 'Convertir Tipo', icon: Check },
  { value: 'add_formula', label: 'Columna Computada', icon: Plus },
  { value: 'parse_smart_date', label: 'Estandarizar Fecha', icon: Calendar }
]

const getStepIcon = (type) => {
  const opt = transformOptions.find(o => o.value === type)
  return opt ? opt.icon : Filter
}

const getStepTitle = (type) => {
  const opt = transformOptions.find(o => o.value === type)
  return opt ? opt.label : 'Transformación'
}

const formatStepDetails = (step) => {
  const c = step.config
  switch (step.transformId) {
    case 'filter': return `${c.column} ${c.operator} ${c.value}`
    case 'sort': return `${c.column} ${c.direction}`
    case 'remove_column': return `${c.column}`
    case 'replace_value': return `"${c.oldValue || 'null'}" → "${c.newValue}" en ${c.column}`
    case 'add_formula': return `${c.newColumnName} = ${c.expression}`
    case 'parse_smart_date': return `Estandarizar fecha: ${c.column}`
    case 'truncate_date': return `Truncar fecha a inicio de ${c.unit}: ${c.column}`
    case 'cast': return `${c.column} → ${c.castType}`
    case 'groupby': return `${c.column}, ${c.groupOperation}(${c.groupMetric})`
    default: return c.column || ''
  }
}
</script>

<template>
  <div class="flex flex-col gap-2 p-4 bg-muted/10">
    <div 
      v-for="(step, index) in pipelineSteps" 
      :key="step.id"
      class="border bg-card p-3 rounded-md flex items-center justify-between cursor-pointer transition-all hover:shadow-sm"
      :class="[
        activeStepId === step.id ? 'border-primary ring-1 ring-primary/20' : 'border-border',
        !step.enabled ? 'opacity-50' : ''
      ]"
      @click="emit('select-step', step)"
    >
      <div class="flex items-center gap-3 overflow-hidden">
        <div
class="w-8 h-8 rounded shrink-0 flex items-center justify-center text-xs font-semibold"
             :class="activeStepId === step.id ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'">
          {{ index + 1 }}
        </div>
        
        <component :is="getStepIcon(step.transformId)" class="w-4 h-4 text-muted-foreground shrink-0" :class="{ 'text-primary': activeStepId === step.id }" />
        
        <div class="min-w-0 flex-1">
          <div class="font-medium text-sm text-foreground truncate">{{ getStepTitle(step.transformId) }}</div>
          <div class="text-xs text-muted-foreground font-mono truncate" :title="formatStepDetails(step)">
            {{ formatStepDetails(step) }}
          </div>
        </div>
      </div>
      
      <div class="flex items-center gap-3 shrink-0 ml-4">
        <!-- Acciones de hover para borrar/desactivar, normalmente ocultas pero se pueden mostrar con CSS. Para MVP, las mostramos siempre -->
        <button class="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted rounded" @click.stop="emit('toggle-step', step.id)">
          <Check v-if="step.enabled" class="w-3.5 h-3.5" />
          <X v-else class="w-3.5 h-3.5" />
        </button>
        <button class="w-6 h-6 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded" @click.stop="emit('remove-step', step.id)">
          <Trash2 class="w-3.5 h-3.5" />
        </button>
        
        <!-- Flecha decorativa -->
        <ChevronRight class="w-4 h-4 text-muted-foreground opacity-50" />
      </div>
    </div>
    
    <div v-if="pipelineSteps.length === 0" class="text-center py-8 text-sm text-muted-foreground italic border border-dashed border-border rounded-md bg-card">
      No steps added yet. Click "+ Add step" to start.
    </div>
  </div>
</template>
