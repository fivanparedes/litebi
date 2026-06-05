<script setup>
import { ref, computed } from 'vue'
import { Filter, ArrowUpDown, Trash2, Check, X, Plus } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'

const props = defineProps({
  pipelineSteps: {
    type: Array,
    required: true
  },
  schema: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['add-step', 'remove-step', 'toggle-step'])

const isAddingStep = ref(false)
const selectedTransform = ref('filter')

const transformOptions = [
  { value: 'filter', label: 'Filtrar', icon: Filter },
  { value: 'sort', label: 'Ordenar', icon: ArrowUpDown },
  { value: 'remove_column', label: 'Eliminar Columna', icon: Trash2 },
  { value: 'remove_nulls', label: 'Eliminar filas Nulas', icon: Trash2 },
  { value: 'replace_value', label: 'Reemplazar Valor', icon: Check },
  { value: 'fill_nulls', label: 'Rellenar Faltantes', icon: Check },
  { value: 'text_transform', label: 'Transformar Texto', icon: Check },
  { value: 'remove_duplicates', label: 'Eliminar Duplicados', icon: Trash2 },
  { value: 'extract_date', label: 'Extraer Fecha', icon: Check },
  { value: 'date_diff', label: 'Diferencia de Fechas', icon: Check },
  { value: 'date_add', label: 'Desplazar Fecha', icon: Check },
  { value: 'groupby', label: 'Agrupar (Group By)', icon: Check },
  { value: 'split', label: 'Dividir Columna (Split)', icon: Check },
  { value: 'cast', label: 'Convertir Tipo (Cast)', icon: Check }
]

const columnOptions = computed(() => {
  return props.schema.map(c => ({ value: c.name, label: c.name }))
})

const stepConfig = ref({
  column: '',
  operator: 'equals',
  value: '',
  direction: 'ASC',
  oldValue: '',
  newValue: '',
  method: 'mean',
  fixedValue: '',
  operation: 'trim',
  component: 'year',
  newColumnName: '',
  dateColumn2: '',
  dateDiffUnit: 'days',
  dateAddAmount: 1,
  dateAddUnit: 'days',
  separator: ',',
  castType: 'number',
  groupOperation: 'SUM',
  groupMetric: ''
})

const operatorOptions = [
  { value: 'equals', label: '=' },
  { value: 'not_equals', label: '!=' },
  { value: 'greater_than', label: '>' },
  { value: 'less_than', label: '<' },
  { value: 'contains', label: 'Contiene' }
]


const handleAdd = () => {
  if (!stepConfig.value.column) return
  
  emit('add-step', selectedTransform.value, { ...stepConfig.value })
  
  // Reset
  isAddingStep.value = false
  stepConfig.value = { column: '', operator: 'equals', value: '', direction: 'ASC' }
}

const getStepIcon = (type) => {
  if (type === 'filter') return Filter
  if (type === 'sort') return ArrowUpDown
  if (type === 'remove_column') return Trash2
  if (type === 'remove_nulls') return Trash2
  if (type === 'replace_value') return Check
  return Filter
}

const getStepDescription = (step) => {
  return ''
}
</script>

<template>
  <div class="transform-panel">
    <div class="panel-header">
      <h3>Historial de Limpieza</h3>
      <BaseButton variant="primary" size="sm" icon @click="isAddingStep = true" v-if="!isAddingStep">
        <Plus />
      </BaseButton>
    </div>
    
    <!-- Add Step Form -->
    <div v-if="isAddingStep" class="add-step-form">
      <h4>Nueva Transformación</h4>
      
      <div class="form-group">
        <label>Tipo de operación</label>
        <BaseDropdown v-model="selectedTransform" :options="transformOptions" />
      </div>
      
      <div class="form-group" v-if="selectedTransform !== 'remove_duplicates' && selectedTransform !== 'date_diff'">
        <label>Columna</label>
        <BaseDropdown v-model="stepConfig.column" :options="columnOptions" placeholder="Selecciona columna" />
      </div>
      
      <!-- Filter specific fields -->
      <template v-if="selectedTransform === 'filter'">
        <div class="form-row">
          <BaseDropdown class="op-select" v-model="stepConfig.operator" :options="operatorOptions" />
          <BaseInput class="val-input" v-model="stepConfig.value" placeholder="Valor..." />
        </div>
      </template>
      
      <!-- Sort specific fields -->
      <template v-if="selectedTransform === 'sort'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.direction" :options="[{value: 'ASC', label: 'Ascendente'}, {value: 'DESC', label: 'Descendente'}]" />
        </div>
      </template>

      <!-- Replace value fields -->
      <template v-if="selectedTransform === 'replace_value'">
        <div class="form-row">
          <BaseInput v-model="stepConfig.oldValue" placeholder="Valor a reemplazar ('null' para vacíos)" />
          <BaseInput v-model="stepConfig.newValue" placeholder="Nuevo valor" />
        </div>
      </template>

      <!-- Fill Nulls fields -->
      <template v-if="selectedTransform === 'fill_nulls'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.method" :options="[{value: 'mean', label: 'Media'}, {value: 'median', label: 'Mediana'}, {value: 'mode', label: 'Moda'}, {value: 'ffill', label: 'Valor Anterior'}, {value: 'fixed', label: 'Fijo'}]" />
          <BaseInput v-if="stepConfig.method === 'fixed'" v-model="stepConfig.fixedValue" placeholder="Valor fijo..." />
        </div>
      </template>

      <!-- Text Transform fields -->
      <template v-if="selectedTransform === 'text_transform'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.operation" :options="[{value: 'trim', label: 'Quitar Espacios'}, {value: 'upper', label: 'MAYÚSCULAS'}, {value: 'lower', label: 'minúsculas'}]" />
        </div>
      </template>

      <!-- Extract Date fields -->
      <template v-if="selectedTransform === 'extract_date'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.component" :options="[{value: 'year', label: 'Año'}, {value: 'month', label: 'Mes'}, {value: 'day', label: 'Día'}, {value: 'quarter', label: 'Trimestre'}]" />
          <BaseInput v-model="stepConfig.newColumnName" placeholder="Nombre nueva columna" />
        </div>
      </template>
      
      <!-- Date Diff fields -->
      <template v-if="selectedTransform === 'date_diff'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.column" :options="columnOptions" placeholder="Fecha Inicial" />
          <BaseDropdown v-model="stepConfig.dateColumn2" :options="columnOptions" placeholder="Fecha Final" />
        </div>
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.dateDiffUnit" :options="[{value: 'days', label: 'Días'}, {value: 'months', label: 'Meses'}, {value: 'years', label: 'Años'}]" />
          <BaseInput v-model="stepConfig.newColumnName" placeholder="Nueva columna" />
        </div>
      </template>
      
      <!-- Date Add fields -->
      <template v-if="selectedTransform === 'date_add'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.column" :options="columnOptions" placeholder="Fecha Base" />
          <BaseDropdown v-model="stepConfig.dateAddUnit" :options="[{value: 'days', label: 'Días'}, {value: 'months', label: 'Meses'}, {value: 'years', label: 'Años'}]" />
          <BaseInput type="number" v-model="stepConfig.dateAddAmount" placeholder="Cantidad" />
        </div>
        <div class="form-row">
          <BaseInput v-model="stepConfig.newColumnName" placeholder="Nueva columna" />
        </div>
      </template>

      <!-- Group By fields -->
      <template v-if="selectedTransform === 'groupby'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.column" :options="columnOptions" placeholder="Columna a Agrupar" />
          <BaseDropdown v-model="stepConfig.groupMetric" :options="columnOptions" placeholder="Métrica" />
        </div>
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.groupOperation" :options="[{value:'SUM', label:'Suma'}, {value:'AVG', label:'Promedio'}, {value:'MIN', label:'Mínimo'}, {value:'MAX', label:'Máximo'}, {value:'COUNT', label:'Conteo'}]" />
        </div>
      </template>

      <!-- Split fields -->
      <template v-if="selectedTransform === 'split'">
        <div class="form-row">
          <BaseInput v-model="stepConfig.separator" placeholder="Separador (ej: , o - o espacio)" />
        </div>
      </template>

      <!-- Cast fields -->
      <template v-if="selectedTransform === 'cast'">
        <div class="form-row">
          <BaseDropdown v-model="stepConfig.castType" :options="[{value:'number', label:'Número'}, {value:'string', label:'Texto'}, {value:'date', label:'Fecha'}]" />
        </div>
      </template>
      
      <div class="form-actions">
        <BaseButton variant="ghost" size="sm" @click="isAddingStep = false">Cancelar</BaseButton>
        <BaseButton variant="primary" size="sm" @click="handleAdd" :disabled="!stepConfig.column && selectedTransform !== 'remove_duplicates'">Aplicar</BaseButton>
      </div>
    </div>
    
    <div class="steps-list">
      <!-- Steps History -->
      <div 
        v-for="(step, index) in pipelineSteps" 
        :key="step.id"
        class="step-item"
        :class="{ 'step-item--disabled': !step.enabled }"
      >
        <div class="step-item__number">{{ index + 1 }}</div>
        <div class="step-item__content">
          <div class="step-item__header">
            <component :is="getStepIcon(step.transformId)" class="step-item__icon" />
            <span class="step-item__title">{{ transformOptions.find(o => o.value === step.transformId)?.label }}</span>
          </div>
          <div class="step-item__desc">
            <div class="step-details" v-if="step.transformId === 'filter'">
              Filtro: {{ step.config.column }} {{ step.config.operator }} {{ step.config.value }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'sort'">
              Orden: {{ step.config.column }} {{ step.config.direction }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'remove_column'">
              Eliminar: {{ step.config.column }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'remove_nulls'">
              Limpiar: Filas nulas en {{ step.config.column }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'replace_value'">
              Reemplazar: "{{ step.config.oldValue || 'null' }}" por "{{ step.config.newValue }}" en {{ step.config.column }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'fill_nulls'">
              Rellenar Nulos: {{ step.config.column }} usando {{ step.config.method }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'text_transform'">
              Texto: {{ step.config.operation }} en {{ step.config.column }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'remove_duplicates'">
              Eliminar Duplicados
            </div>
            <div class="step-details" v-else-if="step.transformId === 'extract_date'">
              Extraer: {{ step.config.component }} de {{ step.config.column }}
            </div>
            <div class="step-details" v-else-if="step.transformId === 'groupby'">
              Agrupar por: {{ step.config.column }}, {{ step.config.groupOperation }}({{ step.config.groupMetric }})
            </div>
            <div class="step-details" v-else-if="step.transformId === 'split'">
              Dividir: {{ step.config.column }} por "{{ step.config.separator }}"
            </div>
            <div class="step-details" v-else-if="step.transformId === 'cast'">
              Convertir: {{ step.config.column }} a {{ step.config.castType }}
            </div>
          </div>
        </div>
        <div class="step-item__actions">
          <button class="icon-btn" @click="emit('toggle-step', step.id)">
            <Check v-if="step.enabled" />
            <X v-else />
          </button>
          <button class="icon-btn icon-btn--danger" @click="emit('remove-step', step.id)">
            <Trash2 />
          </button>
        </div>
      </div>
      
      <div v-if="pipelineSteps.length === 0 && !isAddingStep" class="empty-steps">
        No se han aplicado transformaciones.
      </div>
    </div>
  </div>
</template>

<style scoped>
.transform-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-surface);
  border-right: 1px solid var(--color-border);
}

.panel-header {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.steps-list {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.step-item {
  display: flex;
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  gap: var(--space-3);
  align-items: flex-start;
  transition: opacity var(--transition-fast);
}

.step-item--disabled {
  opacity: 0.5;
}

.step-item__number {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  font-weight: var(--font-bold);
  flex-shrink: 0;
}

.step-item__content {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.step-item__header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.step-item__icon {
  width: 14px;
  height: 14px;
  color: var(--color-text-secondary);
}

.step-item__title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.step-item__desc {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  font-family: var(--font-mono);
}

.step-item__actions {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.icon-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  padding: 4px;
}

.icon-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.icon-btn--danger:hover {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.icon-btn svg {
  width: 14px;
  height: 14px;
}

.empty-steps {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  padding: var(--space-4) 0;
  font-style: italic;
}

.add-step-form {
  border-top: 1px solid var(--color-border);
  padding: var(--space-4);
  background-color: var(--color-bg-primary);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.add-step-form h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}
.form-group label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.form-row {
  display: flex;
  gap: var(--space-2);
}
.op-select {
  flex: 1;
}
.val-input {
  flex: 2;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  margin-top: var(--space-2);
}
</style>
