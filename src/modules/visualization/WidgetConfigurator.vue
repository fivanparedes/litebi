<script setup>
import { computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDataStore } from '@/stores/dataStore'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:config', 'close'])

const dataStore = useDataStore()

const availableColumns = computed(() => {
  const baseName = props.config.dataset || dataStore.activeDatasetName
  if (!baseName) return []
  
  const cols = []
  
  // Base columns
  const meta = dataStore.datasets.get(baseName)
  const baseSchema = meta?.schema || []
  baseSchema.forEach(c => {
    cols.push({
      type: c.type,
      value: `[${baseName}].[${c.name}]`,
      label: c.name
    })
  })
  
  // Find related tables
  const relatedTables = new Set()
  dataStore.relationships.forEach(rel => {
    if (rel.fromTable === baseName) relatedTables.add(rel.toTable)
    if (rel.toTable === baseName) relatedTables.add(rel.fromTable)
  })
  
  relatedTables.forEach(tName => {
    const tMeta = dataStore.datasets.get(tName)
    if (tMeta && tMeta.schema) {
      tMeta.schema.forEach(c => {
        cols.push({
          type: c.type,
          value: `[${tName}].[${c.name}]`,
          label: `${tName} > ${c.name}`
        })
      })
    }
  })
  
  return cols
})

const columnOptions = computed(() => availableColumns.value.map(c => ({ value: c.value, label: c.label })))
const numericColumnOptions = computed(() => availableColumns.value.filter(c => c.type === 'number').map(c => ({ value: c.value, label: c.label })))

const chartTypeOptions = [
  { value: 'bar', label: 'Gráfico de Barras' },
  { value: 'line', label: 'Gráfico de Líneas' },
  { value: 'pie', label: 'Gráfico de Torta' },
  { value: 'scatter', label: 'Dispersión (Scatter)' },
  { value: 'heatmap', label: 'Mapa de Calor (Heatmap)' },
  { value: 'treemap', label: 'Mapa de Árbol (Treemap)' },
  { value: 'radar', label: 'Radar' },
  { value: 'waterfall', label: 'Cascada (Waterfall)' },
  { value: 'kpi', label: 'Tarjeta KPI' },
  { value: 'slicer', label: 'Segmentador (Filtro)' },
  { value: 'boxplot', label: 'Cajas y Bigotes (Boxplot)' },
  { value: 'grid', label: 'Tabla de Datos (Grid)' },
  { value: 'combo', label: 'Combinado (Barras + Líneas)' },
  { value: 'funnel', label: 'Embudo (Funnel)' },
  { value: 'gauge', label: 'Medidor de Metas (Gauge)' },
  { value: 'map', label: 'Mapa Político (Map)' }
]

const aggregationOptions = [
  { value: 'SUM', label: 'Suma (SUM)' },
  { value: 'AVG', label: 'Promedio (AVG)' },
  { value: 'MIN', label: 'Mínimo (MIN)' },
  { value: 'MAX', label: 'Máximo (MAX)' },
  { value: 'COUNT', label: 'Recuento (COUNT)' }
]

const updateField = (field, value) => {
  emit('update:config', { ...props.config, [field]: value })
}
</script>

<template>
  <div class="configurator">
    <div class="config-header">
      <h3>Configurar Widget</h3>
      <button class="close-btn" @click="emit('close')">&times;</button>
    </div>
    
    <div class="config-body">
      <div class="form-group">
        <label>Título del Widget</label>
        <BaseInput 
          :modelValue="config.title || ''" 
          @update:modelValue="val => updateField('title', val)"
          placeholder="Ej: Ventas por Región"
        />
      </div>
      
      <div class="form-group">
        <label>Tipo de Gráfico</label>
        <BaseDropdown 
          :modelValue="config.type || 'bar'" 
          @update:modelValue="val => updateField('type', val)"
          :options="chartTypeOptions" 
        />
      </div>
      
      <div v-if="config.type !== 'kpi' && config.type !== 'pie' && config.type !== 'scatter' && config.type !== 'slicer'" class="form-group">
        <label>Orientación</label>
        <BaseDropdown 
          :modelValue="config.orientation || 'vertical'" 
          @update:modelValue="val => updateField('orientation', val)"
          :options="[{value:'vertical', label:'Vertical'}, {value:'horizontal', label:'Horizontal'}]" 
        />
      </div>
      
      <hr class="divider" />
      
      <div class="form-group" v-if="config.type === 'slicer'">
        <label>Tipo de Segmentador</label>
        <BaseDropdown 
          :modelValue="config.slicerType || 'list'" 
          @update:modelValue="val => updateField('slicerType', val)"
          :options="[{value:'list', label:'Lista (Botones)'}, {value:'slider', label:'Rango (Slider Numérico/Fechas)'}]" 
        />
      </div>

      <!-- Dimensión (X) -->
      <div class="form-group" v-if="config.type !== 'kpi' && config.type !== 'gauge'">
        <label>{{ config.type === 'scatter' ? 'Eje X (Numérico)' : config.type === 'slicer' ? 'Campo a Filtrar' : config.type === 'map' ? 'Región (Nombre del País)' : 'Dimensión (Categoría)' }}</label>
        <BaseDropdown 
          :modelValue="config.xAxis || ''" 
          @update:modelValue="val => updateField('xAxis', val)"
          :options="config.type === 'scatter' ? numericColumnOptions : columnOptions" 
          placeholder="Seleccionar columna..."
        />
      </div>
      
      <!-- Métrica (Y) -->
      <template v-if="config.type !== 'slicer'">
        <div class="form-group">
          <label>{{ config.type === 'kpi' ? 'Métrica a Calcular' : config.type === 'scatter' ? 'Eje Y (Numérico)' : 'Métrica (Eje Y)' }}</label>
          <BaseDropdown 
            :modelValue="config.yAxis || ''" 
            @update:modelValue="val => updateField('yAxis', val)"
            :options="numericColumnOptions" 
            placeholder="Seleccionar métrica numérica..."
          />
        </div>
        
        <!-- Combo Chart Secondary Y Axis or Heatmap Y Axis -->
        <div class="form-group" v-if="config.type === 'combo' || config.type === 'heatmap'">
          <label>{{ config.type === 'heatmap' ? 'Eje Y (Categoría Secundaria)' : 'Métrica Secundaria (Eje Y2 - Línea)' }}</label>
          <BaseDropdown 
            :modelValue="config.secondaryYAxis || ''" 
            @update:modelValue="val => updateField('secondaryYAxis', val)"
            :options="config.type === 'heatmap' ? columnOptions : numericColumnOptions" 
            placeholder="Seleccionar métrica secundaria..."
          />
        </div>

        <!-- Gauge Target Value -->
        <div class="form-group" v-if="config.type === 'gauge'">
          <label>Valor Meta (Target)</label>
          <BaseInput 
            :modelValue="config.targetValue || 100" 
            @update:modelValue="val => updateField('targetValue', Number(val))"
            type="number"
          />
        </div>
        
        <div class="form-group" v-if="config.type !== 'scatter'">
          <label>Agregación</label>
          <BaseDropdown 
            :modelValue="config.aggregation || 'SUM'" 
            @update:modelValue="val => updateField('aggregation', val)"
            :options="aggregationOptions" 
          />
        </div>
      </template>
      
      <hr class="divider" />
      
      <h4>Estilo y Diseño</h4>
      <div class="form-group">
        <label>Mostrar Leyenda</label>
        <BaseDropdown 
          :modelValue="config.styles?.showLegend === false ? 'false' : 'true'" 
          @update:modelValue="val => updateField('styles', { ...(config.styles || {}), showLegend: val === 'true' })"
          :options="[{value:'true', label:'Sí'}, {value:'false', label:'No'}]" 
        />
      </div>
      <div class="form-group">
        <label>Mostrar Ejes / Etiquetas</label>
        <BaseDropdown 
          :modelValue="config.styles?.showAxisLabels === false ? 'false' : 'true'" 
          @update:modelValue="val => updateField('styles', { ...(config.styles || {}), showAxisLabels: val === 'true' })"
          :options="[{value:'true', label:'Sí'}, {value:'false', label:'No'}]" 
        />
      </div>
      <div class="form-group">
        <label>Redondeo (Border Radius)</label>
        <BaseInput 
          :modelValue="config.styles?.borderRadius || 0" 
          @update:modelValue="val => updateField('styles', { ...(config.styles || {}), borderRadius: Number(val) })"
          type="number"
        />
      </div>
      <div class="form-group">
        <label>Color de Fondo</label>
        <BaseInput 
          :modelValue="config.styles?.backgroundColor || ''" 
          @update:modelValue="val => updateField('styles', { ...(config.styles || {}), backgroundColor: val })"
          placeholder="Ej: #ffffff, transparent"
        />
      </div>
      <div class="form-group">
        <label>Paleta Personalizada (Hex, sep. comas)</label>
        <BaseInput 
          :modelValue="config.styles?.customColors ? config.styles.customColors.join(',') : ''" 
          @update:modelValue="val => updateField('styles', { ...(config.styles || {}), customColors: val.split(',').map(c => c.trim()).filter(c => c) })"
          placeholder="Ej: #ff0000,#00ff00"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.configurator {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--color-bg-surface);
  border-left: 1px solid var(--color-border);
  width: 320px;
}

.config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.config-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-text-tertiary);
  cursor: pointer;
}
.close-btn:hover { color: var(--color-text-primary); }

.config-body {
  flex-grow: 1;
  padding: var(--space-4);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-2) 0;
}
</style>
