<script setup>
import { ref, computed, watch } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  schema: {
    type: Array,
    default: () => []
  },
  datasetName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'generate'])

const categoryOptions = [
  { value: 'agregacion', label: 'Agregación' },
  { value: 'matematicas', label: 'Matemáticas' },
  { value: 'texto', label: 'Texto' },
  { value: 'tiempo', label: 'Inteligencia de Tiempo' }
]

const measuresMap = {
  agregacion: [
    {
      value: 'running_total', label: 'Suma Acumulada',
      description: 'Calcula la suma de un valor a lo largo de un orden.',
      parameters: [
        { id: 'valor', label: 'Valor a sumar', type: 'column' },
        { id: 'orden', label: 'Ordenar por', type: 'column' }
      ],
      template: (p, ds) => `(SELECT SUM([${p.valor}]) FROM [${ds}] b WHERE b.[${p.orden}] <= [${ds}].[${p.orden}])`
    }
  ],
  matematicas: [
    {
      value: 'ratio', label: 'Ratio',
      description: 'Divide un valor base por un valor a comparar.',
      parameters: [
        { id: 'base', label: 'Valor Base', type: 'column' },
        { id: 'compare', label: 'Valor a Comparar', type: 'column' }
      ],
      template: (p) => `IFNULL([${p.base}] / NULLIF([${p.compare}], 0), 0)`
    },
    {
      value: 'percent_diff', label: 'Diferencia Porcentual',
      description: 'Calcula la diferencia porcentual entre dos valores.',
      parameters: [
        { id: 'actual', label: 'Valor Actual', type: 'column' },
        { id: 'anterior', label: 'Valor Anterior', type: 'column' }
      ],
      template: (p) => `([${p.actual}] - [${p.anterior}]) / NULLIF([${p.anterior}], 0)`
    },
    {
      value: 'multiplicacion', label: 'Multiplicación',
      description: 'Multiplica dos columnas.',
      parameters: [
        { id: 'val1', label: 'Valor 1', type: 'column' },
        { id: 'val2', label: 'Valor 2', type: 'column' }
      ],
      template: (p) => `[${p.val1}] * [${p.val2}]`
    }
  ],
  texto: [
    {
      value: 'concat', label: 'Concatenar',
      description: 'Une dos columnas de texto con un espacio entre ellas.',
      parameters: [
        { id: 't1', label: 'Texto 1', type: 'column' },
        { id: 't2', label: 'Texto 2', type: 'column' }
      ],
      template: (p) => `[${p.t1}] || ' ' || [${p.t2}]`
    },
    {
      value: 'upper', label: 'Mayúsculas',
      description: 'Convierte un texto a mayúsculas.',
      parameters: [
        { id: 'text', label: 'Texto', type: 'column' }
      ],
      template: (p) => `UPPER([${p.text}])`
    }
  ],
  tiempo: [
    {
      value: 'year_over_year', label: 'Año sobre Año (Year-over-Year)',
      description: 'Variación de un valor respecto al registro anterior basado en el orden de fecha.',
      parameters: [
        { id: 'val', label: 'Valor', type: 'column' },
        { id: 'date', label: 'Columna de Fecha (Orden)', type: 'column' }
      ],
      template: (p, ds) => `([${p.val}] - (SELECT TOP 1 [${p.val}] FROM [${ds}] b WHERE b.[${p.date}] < [${ds}].[${p.date}] ORDER BY b.[${p.date}] DESC)) / NULLIF((SELECT TOP 1 [${p.val}] FROM [${ds}] b WHERE b.[${p.date}] < [${ds}].[${p.date}] ORDER BY b.[${p.date}] DESC), 0)`
    },
    {
      value: 'year', label: 'Año',
      description: 'Extrae el año de una columna de fecha.',
      parameters: [
        { id: 'date', label: 'Fecha', type: 'column' }
      ],
      template: (p) => `YEAR([${p.date}])`
    },
    {
      value: 'datediff', label: 'Diferencia en Días',
      description: 'Días transcurridos entre dos fechas.',
      parameters: [
        { id: 'start', label: 'Fecha Inicio', type: 'column' },
        { id: 'end', label: 'Fecha Fin', type: 'column' }
      ],
      template: (p) => `DATEDIFF('day', [${p.start}], [${p.end}])`
    }
  ]
}

const selectedCategory = ref(null)
const selectedMeasureValue = ref(null)
const parameterValues = ref({})

const columnOptions = computed(() => {
  return props.schema.map(col => ({ value: col.name, label: col.name }))
})

const currentMeasureOptions = computed(() => {
  if (!selectedCategory.value) return []
  return measuresMap[selectedCategory.value] || []
})

const activeMeasure = computed(() => {
  if (!selectedCategory.value || !selectedMeasureValue.value) return null
  return currentMeasureOptions.value.find(m => m.value === selectedMeasureValue.value)
})

watch(selectedCategory, () => {
  selectedMeasureValue.value = null
  parameterValues.value = {}
})

watch(selectedMeasureValue, () => {
  parameterValues.value = {}
  if (activeMeasure.value) {
    activeMeasure.value.parameters.forEach(p => {
      parameterValues.value[p.id] = null
    })
  }
})

const generatedExpression = computed(() => {
  if (!activeMeasure.value) return ''
  
  const isComplete = activeMeasure.value.parameters.every(p => parameterValues.value[p.id])
  if (!isComplete) return ''
  
  return activeMeasure.value.template(parameterValues.value, props.datasetName)
})

const canGenerate = computed(() => {
  return generatedExpression.value !== ''
})

const close = () => {
  emit('update:modelValue', false)
}

const handleGenerate = () => {
  if (canGenerate.value) {
    emit('generate', generatedExpression.value)
    close()
  }
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    @update:model-value="val => emit('update:modelValue', val)"
    title="Medidas Rápidas"
    size="md"
  >
    <div class="quick-measures">
      <div class="form-group">
        <label>Categoría</label>
        <BaseDropdown 
          v-model="selectedCategory" 
          :options="categoryOptions" 
          placeholder="Seleccionar categoría..." 
        />
      </div>
      
      <div class="form-group" v-if="selectedCategory">
        <label>Medida</label>
        <BaseDropdown 
          v-model="selectedMeasureValue" 
          :options="currentMeasureOptions" 
          placeholder="Seleccionar medida..." 
        />
      </div>

      <div v-if="activeMeasure" class="measure-details">
        <p class="measure-description">{{ activeMeasure.description }}</p>

        <div class="parameters">
          <div class="form-group" v-for="param in activeMeasure.parameters" :key="param.id">
            <label>{{ param.label }}</label>
            <BaseDropdown 
              v-if="param.type === 'column'"
              v-model="parameterValues[param.id]" 
              :options="columnOptions" 
              placeholder="Seleccionar columna..." 
            />
          </div>
        </div>

        <div class="preview" v-if="generatedExpression">
          <label>Expresión generada:</label>
          <pre><code>{{ generatedExpression }}</code></pre>
        </div>
      </div>
    </div>
    
    <template #footer>
      <BaseButton variant="ghost" @click="close">Cancelar</BaseButton>
      <BaseButton variant="primary" :disabled="!canGenerate" @click="handleGenerate">Insertar</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.quick-measures {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 450px;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}
.measure-details {
  margin-top: var(--space-2);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.measure-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.parameters {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  background-color: var(--color-bg-secondary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
.preview {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.preview label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}
.preview pre {
  margin: 0;
  padding: var(--space-3);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
