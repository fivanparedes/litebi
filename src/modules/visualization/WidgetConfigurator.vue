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

const datasetOptions = computed(() => {
  return dataStore.datasetNames.map(name => {
    const meta = dataStore.datasets.get(name)
    return { value: name, label: meta?.originalName || name }
  })
})

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
  if (field === 'dataset' && props.config.dataset !== value) {
    emit('update:config', { ...props.config, [field]: value, xAxis: '', yAxis: '', secondaryYAxis: '' })
  } else {
    emit('update:config', { ...props.config, [field]: value })
  }
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
        <label>Dataset Origen</label>
        <BaseDropdown 
          :model-value="config.dataset || dataStore.activeDatasetName" 
          :options="datasetOptions"
          @update:model-value="val => updateField('dataset', val)" 
        />
      </div>

      <div class="form-group">
        <label>Título del Widget</label>
        <BaseInput 
          :model-value="config.title || ''" 
          placeholder="Ej: Ventas por Región"
          @update:model-value="val => updateField('title', val)"
        />
      </div>
      
      <div class="form-group">
        <label>Tipo de Gráfico</label>
        <BaseDropdown 
          :model-value="config.type || 'bar'" 
          :options="chartTypeOptions"
          @update:model-value="val => updateField('type', val)" 
        />
      </div>
      
      <div v-if="config.type !== 'kpi' && config.type !== 'pie' && config.type !== 'scatter' && config.type !== 'slicer'" class="form-group">
        <label>Orientación</label>
        <BaseDropdown 
          :model-value="config.orientation || 'vertical'" 
          :options="[{value:'vertical', label:'Vertical'}, {value:'horizontal', label:'Horizontal'}]"
          @update:model-value="val => updateField('orientation', val)" 
        />
      </div>
      
      <hr class="divider" />
      
      <div v-if="config.type === 'slicer'" class="form-group">
        <label>Tipo de Segmentador</label>
        <BaseDropdown 
          :model-value="config.slicerType || 'list'" 
          :options="[{value:'list', label:'Lista (Botones)'}, {value:'slider', label:'Rango (Slider Numérico/Fechas)'}]"
          @update:model-value="val => updateField('slicerType', val)" 
        />
      </div>

      <div v-if="config.type === 'map'" class="form-group">
        <label>Modo de Mapa</label>
        <BaseDropdown 
          :model-value="config.mapMode || 'choropleth'" 
          :options="[{value:'choropleth', label:'Áreas Pintadas (Regiones)'}, {value:'scatter', label:'Puntos (Coordenadas)'}]"
          @update:model-value="val => updateField('mapMode', val)" 
        />
      </div>

      <!-- Dimensión (X) -->
      <div v-if="config.type !== 'kpi' && config.type !== 'gauge'" class="form-group">
        <label>{{ config.type === 'scatter' ? 'Eje X (Numérico)' : config.type === 'slicer' ? 'Campo a Filtrar' : config.type === 'map' ? (config.mapMode === 'scatter' ? 'Longitud (X)' : 'Región (Nombre del País)') : 'Dimensión (Categoría)' }}</label>
        <BaseDropdown 
          :model-value="config.xAxis || ''" 
          :options="(config.type === 'scatter' || (config.type === 'map' && config.mapMode === 'scatter')) ? numericColumnOptions : columnOptions"
          placeholder="Seleccionar columna..." 
          @update:model-value="val => updateField('xAxis', val)"
        />
        <BaseInput 
          v-if="config.xAxis"
          :model-value="config.xAxisLabel || ''" 
          placeholder="Etiqueta personalizada (Opcional)"
          @update:model-value="val => updateField('xAxisLabel', val)"
        />
      </div>
      
      <!-- Métrica (Y) -->
      <template v-if="config.type !== 'slicer'">
        <div class="form-group">
          <label>{{ config.type === 'kpi' ? 'Métrica a Calcular' : config.type === 'scatter' ? 'Eje Y (Numérico)' : config.type === 'map' && config.mapMode === 'scatter' ? 'Latitud (Y)' : 'Métrica (Eje Y)' }}</label>
          <BaseDropdown 
            :model-value="config.yAxis || ''" 
            :options="numericColumnOptions"
            placeholder="Seleccionar métrica numérica..." 
            @update:model-value="val => updateField('yAxis', val)"
          />
          <BaseInput 
            v-if="config.yAxis"
            :model-value="config.yAxisLabel || ''" 
            placeholder="Etiqueta personalizada (Opcional)"
            @update:model-value="val => updateField('yAxisLabel', val)"
          />
        </div>
        
        <!-- Combo Chart Secondary Y Axis or Heatmap Y Axis -->
        <div v-if="config.type === 'combo' || config.type === 'line' || config.type === 'heatmap' || (config.type === 'map' && config.mapMode === 'scatter')" class="form-group">
          <label>{{ config.type === 'heatmap' ? 'Eje Y (Categoría Secundaria)' : config.type === 'map' ? 'Métrica (Tamaño/Color)' : 'Métrica Secundaria (Opcional)' }}</label>
          <BaseDropdown 
            :model-value="config.secondaryYAxis || ''" 
            :options="config.type === 'heatmap' ? columnOptions : numericColumnOptions"
            placeholder="Seleccionar métrica secundaria..." 
            @update:model-value="val => updateField('secondaryYAxis', val)"
          />
          <BaseInput 
            v-if="config.secondaryYAxis"
            :model-value="config.secondaryYAxisLabel || ''" 
            placeholder="Etiqueta personalizada (Opcional)"
            @update:model-value="val => updateField('secondaryYAxisLabel', val)"
          />
        </div>

        <!-- Gauge Target Value -->
        <div v-if="config.type === 'gauge'" class="form-group">
          <label>Valor Meta (Target)</label>
          <BaseInput 
            :model-value="config.targetValue || 100" 
            type="number"
            @update:model-value="val => updateField('targetValue', Number(val))"
          />
        </div>
        
        <div v-if="config.type !== 'scatter' && !(config.type === 'map' && config.mapMode === 'scatter')" class="form-group">
          <label>Agregación</label>
          <BaseDropdown 
            :model-value="config.aggregation || 'SUM'" 
            :options="aggregationOptions"
            @update:model-value="val => updateField('aggregation', val)" 
          />
        </div>
      </template>
      
      <hr class="divider" />
      
      <h4>Estilo y Diseño</h4>
      <div v-if="config.type === 'line'" class="form-group">
        <label>Rellenar Área bajo la Curva</label>
        <BaseDropdown 
          :model-value="config.styles?.fillArea === true ? 'true' : 'false'" 
          :options="[{value:'true', label:'Sí'}, {value:'false', label:'No'}]"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), fillArea: val === 'true' })" 
        />
      </div>
      <div class="form-group">
        <label>Mostrar Leyenda</label>
        <BaseDropdown 
          :model-value="config.styles?.showLegend === false ? 'false' : 'true'" 
          :options="[{value:'true', label:'Sí'}, {value:'false', label:'No'}]"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), showLegend: val === 'true' })" 
        />
      </div>
      <div class="form-group">
        <label>Mostrar Ejes / Etiquetas</label>
        <BaseDropdown 
          :model-value="config.styles?.showAxisLabels === false ? 'false' : 'true'" 
          :options="[{value:'true', label:'Sí'}, {value:'false', label:'No'}]"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), showAxisLabels: val === 'true' })" 
        />
      </div>
      <div class="form-group">
        <label>Redondeo (Border Radius)</label>
        <BaseInput 
          :model-value="config.styles?.borderRadius || 0" 
          type="number"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), borderRadius: Number(val) })"
        />
      </div>
      <div class="form-group">
        <label>Color de Fondo</label>
        <BaseInput 
          :model-value="config.styles?.backgroundColor || ''" 
          placeholder="Ej: #ffffff, transparent"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), backgroundColor: val })"
        />
      </div>
      <div class="form-group">
        <label>Paleta Personalizada (Hex, sep. comas)</label>
        <BaseInput 
          :model-value="config.styles?.customColors ? config.styles.customColors.join(',') : ''" 
          placeholder="Ej: #ff0000,#00ff00"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), customColors: val.split(',').map(c => c.trim()).filter(c => c) })"
        />
      </div>

      <template v-if="config.type === 'scatter' || config.type === 'line' || config.type === 'bar'">
        <hr class="divider" />
        <h4>Machine Learning (Avanzado)</h4>
        
        <div class="form-group">
          <label>Tendencia (Regresión)</label>
          <BaseDropdown 
            :model-value="config.ml?.regressionType || 'none'" 
            :options="[
              {value: 'none', label: 'Ninguna'},
              {value: 'linear', label: 'Lineal'},
              {value: 'exponential', label: 'Exponencial'},
              {value: 'polynomial', label: 'Polinómica'}
            ]"
            @update:model-value="val => updateField('ml', { ...(config.ml || {}), regressionType: val })" 
          />
        </div>
        
        <div v-if="config.type === 'scatter'" class="form-group">
          <label>Agrupamiento (K-Means Clustering)</label>
          <BaseDropdown 
            :model-value="config.ml?.clusterCount || 'none'" 
            :options="[
              {value: 'none', label: 'Ninguno'},
              {value: '2', label: '2 Clusters'},
              {value: '3', label: '3 Clusters'},
              {value: '4', label: '4 Clusters'},
              {value: '5', label: '5 Clusters'},
              {value: '6', label: '6 Clusters'}
            ]"
            @update:model-value="val => updateField('ml', { ...(config.ml || {}), clusterCount: val })" 
          />
        </div>
      </template>

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
