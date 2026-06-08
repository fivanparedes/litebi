<script setup>
import { computed, ref } from 'vue'
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

const activeTab = ref('data')

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
  { value: 'scorecard', label: 'Scorecard (Objetivos)' },
  { value: 'map', label: 'Mapa Político (Map)' },
  { value: 'image', label: 'Imagen' }
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

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 2 * 1024 * 1024) {
    alert("La imagen es demasiado grande. Máximo 2MB.")
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    updateField('imageUrl', e.target.result)
  }
  reader.readAsDataURL(file)
}

const addHierarchyLevel = (val) => {
  if (!val) return
  let currentX = props.config.xAxis
  if (!currentX) {
    updateField('xAxis', [val])
  } else if (typeof currentX === 'string') {
    updateField('xAxis', [currentX, val])
  } else if (Array.isArray(currentX)) {
    if (!currentX.includes(val)) {
      updateField('xAxis', [...currentX, val])
    }
  }
}

const removeHierarchyLevel = (idx) => {
  let currentX = props.config.xAxis
  if (Array.isArray(currentX)) {
    const newX = [...currentX]
    newX.splice(idx, 1)
    updateField('xAxis', newX.length === 1 ? newX[0] : newX.length === 0 ? '' : newX)
  } else if (typeof currentX === 'string') {
    updateField('xAxis', '')
  }
}

const advancedJsonString = computed({
  get() {
    return props.config.advancedOptions ? JSON.stringify(props.config.advancedOptions, null, 2) : ''
  },
  set(val) {
    if (!val) {
      updateField('advancedOptions', undefined)
      return
    }
    try {
      const parsed = JSON.parse(val)
      updateField('advancedOptions', parsed)
    } catch (e) {
      // Ignorar
    }
  }
})

const handleGeoJsonUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result)
      updateField('customGeoJson', {
        type: 'file',
        name: file.name.replace(/\.[^/.]+$/, ""),
        data: parsed
      })
      updateField('mapMode', 'custom')
    } catch (err) {
      alert("El archivo no es un JSON válido.")
    }
  }
  reader.readAsText(file)
}
</script>

<template>
  <div class="configurator">
    <div class="config-header">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <h3>Configurar Widget</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>
      <div class="config-tabs">
        <button :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">Datos</button>
        <button :class="{ active: activeTab === 'style' }" @click="activeTab = 'style'">Estilo</button>
        <button :class="{ active: activeTab === 'advanced' }" @click="activeTab = 'advanced'">Avanzado</button>
      </div>
    </div>
    
    <div class="config-body">
      <div v-if="activeTab === 'data'" class="tab-content">
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
      
      <div v-if="config.type !== 'kpi' && config.type !== 'pie' && config.type !== 'scatter' && config.type !== 'slicer' && config.type !== 'image'" class="form-group">
        <label>Orientación</label>
        <BaseDropdown 
          :model-value="config.orientation || 'vertical'" 
          :options="[{value:'vertical', label:'Vertical'}, {value:'horizontal', label:'Horizontal'}]"
          @update:model-value="val => updateField('orientation', val)" 
        />
      </div>
      
      <hr class="divider" />

      <div v-if="config.type === 'image'" class="form-group">
        <label>Imagen</label>
        <BaseInput 
          :model-value="config.imageUrl || ''" 
          placeholder="URL de imagen..."
          @update:model-value="val => updateField('imageUrl', val)"
        />
        <label style="margin-top: 8px;">O subir archivo (Max 2MB):</label>
        <input type="file" accept="image/*" @change="handleImageUpload" />
        <label style="margin-top: 8px;">Ajuste de Imagen</label>
        <BaseDropdown 
          :model-value="config.imageFit || 'contain'" 
          :options="[{value:'contain', label:'Contener (No recortar)'}, {value:'cover', label:'Cubrir (Recortar)'}, {value:'fill', label:'Rellenar (Estirar)'}]"
          @update:model-value="val => updateField('imageFit', val)" 
        />
      </div>
      
      <div v-if="config.type === 'slicer'" class="form-group">
        <label>Tipo de Segmentador</label>
        <BaseDropdown 
          :model-value="config.slicerType || 'list'" 
          :options="[{value:'list', label:'Lista (Checkboxes)'}, {value:'button', label:'Botones (Píldoras)'}, {value:'slider', label:'Rango Numérico'}, {value:'input', label:'Buscador de Texto'}]"
          @update:model-value="val => updateField('slicerType', val)" 
        />
      </div>

      <div v-if="config.type === 'map'" class="form-group">
        <label>Modo de Mapa</label>
        <BaseDropdown 
          :model-value="config.mapMode || 'choropleth'" 
          :options="[{value:'choropleth', label:'Áreas Pintadas (Regiones)'}, {value:'scatter', label:'Puntos (Coordenadas)'}, {value:'custom', label:'GeoJSON Personalizado'}]"
          @update:model-value="val => updateField('mapMode', val)" 
        />
        
        <template v-if="config.mapMode === 'custom'">
          <label style="margin-top: 8px;">URL GeoJSON</label>
          <BaseInput 
            :model-value="config.customGeoJson?.type === 'url' ? config.customGeoJson.url : ''" 
            placeholder="https://..."
            @update:model-value="val => updateField('customGeoJson', { type: 'url', url: val })"
          />
          <label style="margin-top: 8px;">O subir archivo GeoJSON:</label>
          <input type="file" accept=".json,application/json" @change="handleGeoJsonUpload" />
          <span v-if="config.customGeoJson?.type === 'file'" style="font-size: 11px; color: var(--color-success); margin-top: 4px;">
            Archivo cargado: {{ config.customGeoJson.name }}
          </span>
        </template>
      </div>

      <!-- Dimensión (X) -->
      <div v-if="config.type !== 'kpi' && config.type !== 'gauge' && config.type !== 'image'" class="form-group">
        <label>{{ config.type === 'scatter' ? 'Eje X (Numérico)' : config.type === 'slicer' ? 'Campo a Filtrar' : config.type === 'map' ? (config.mapMode === 'scatter' ? 'Longitud (X)' : 'Región (Nombre del País)') : 'Dimensión (Jerarquía X)' }}</label>
        
        <!-- Jerarquía List -->
        <div v-if="Array.isArray(config.xAxis) && config.xAxis.length > 0" class="hierarchy-list">
          <div v-for="(col, idx) in config.xAxis" :key="idx" class="hierarchy-item">
            <span class="hierarchy-label">{{ idx + 1 }}. {{ col }}</span>
            <button class="remove-btn" @click="removeHierarchyLevel(idx)">&times;</button>
          </div>
        </div>
        <div v-else-if="typeof config.xAxis === 'string' && config.xAxis" class="hierarchy-list">
          <div class="hierarchy-item">
            <span class="hierarchy-label">1. {{ config.xAxis }}</span>
            <button class="remove-btn" @click="removeHierarchyLevel(0)">&times;</button>
          </div>
        </div>

        <BaseDropdown 
          :model-value="''" 
          :options="(config.type === 'scatter' || (config.type === 'map' && config.mapMode === 'scatter')) ? numericColumnOptions : columnOptions"
          placeholder="Añadir nivel de jerarquía..." 
          @update:model-value="addHierarchyLevel"
        />
        <BaseInput 
          v-if="config.xAxis && config.xAxis.length > 0"
          :model-value="config.xAxisLabel || ''" 
          placeholder="Etiqueta personalizada (Opcional)"
          @update:model-value="val => updateField('xAxisLabel', val)"
        />
      </div>
      
      <!-- Métrica (Y) -->
      <template v-if="config.type !== 'slicer' && config.type !== 'image'">
        <div class="form-group">
          <label>{{ config.type === 'kpi' || config.type === 'scorecard' ? 'Métrica a Calcular' : config.type === 'scatter' ? 'Eje Y (Numérico)' : config.type === 'map' && config.mapMode === 'scatter' ? 'Latitud (Y)' : 'Métrica (Eje Y)' }}</label>
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
        <div v-if="config.type === 'combo' || config.type === 'line' || config.type === 'heatmap' || config.type === 'scorecard' || (config.type === 'map' && config.mapMode === 'scatter')" class="form-group">
          <label>{{ config.type === 'heatmap' ? 'Eje Y (Categoría Secundaria)' : config.type === 'map' ? 'Métrica (Tamaño/Color)' : config.type === 'scorecard' ? 'Métrica Objetivo (Target)' : 'Métrica Secundaria (Opcional)' }}</label>
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
      </div> <!-- End Data Tab -->

      <div v-if="activeTab === 'style'" class="tab-content">
      <div v-if="config.type === 'line' || config.type === 'bar'" class="form-group">
        <label>Apilar Series (Stacked)</label>
        <BaseDropdown 
          :model-value="config.styles?.stacked === true ? 'true' : 'false'" 
          :options="[{value:'true', label:'Sí'}, {value:'false', label:'No'}]"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), stacked: val === 'true' })" 
        />
      </div>
      <div v-if="config.type === 'line'" class="form-group">
        <label>Rellenar Área bajo la Curva</label>
        <BaseDropdown 
          :model-value="config.styles?.areaType || 'none'" 
          :options="[{value:'none', label:'Ninguna'}, {value:'axis', label:'Hasta el Eje'}, {value:'between', label:'Entre Métricas (Stack)'}]"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), areaType: val })" 
        />
      </div>
      <div v-if="config.type === 'pie'" class="form-group">
        <label>Radio Interno (Donut %)</label>
        <BaseInput 
          :model-value="config.styles?.innerRadius ?? 40" 
          type="number"
          min="0"
          max="90"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), innerRadius: Number(val) })"
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

      <div class="form-group">
        <label>Tipografía (Font Family)</label>
        <BaseInput 
          :model-value="config.styles?.fontFamily || ''" 
          placeholder="Ej: Inter, Roboto, sans-serif"
          @update:model-value="val => updateField('styles', { ...(config.styles || {}), fontFamily: val })"
        />
      </div>
      </div> <!-- End Style Tab -->

      <div v-if="activeTab === 'advanced'" class="tab-content">
      <template v-if="config.type === 'scatter' || config.type === 'line' || config.type === 'bar'">
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

      <hr class="divider" />
      <h4>Avanzado (ECharts JSON)</h4>
      <div class="form-group">
        <label>Sobreescribir Opciones (JSON)</label>
        <textarea 
          v-model="advancedJsonString"
          rows="6"
          placeholder='{ "title": { "text": "Custom" } }'
          style="width: 100%; font-family: monospace; font-size: 12px; padding: 8px; border: 1px solid var(--color-border); border-radius: var(--radius-sm);"
        ></textarea>
        <span style="font-size: 11px; color: var(--color-text-secondary);">Este JSON se fusionará con la configuración base del gráfico.</span>
      </div>

      </div> <!-- End Advanced Tab -->

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
  flex-direction: column;
  padding: var(--space-4);
  padding-bottom: 0;
  border-bottom: 1px solid var(--color-border);
}

.config-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-3);
}

.config-tabs {
  display: flex;
  gap: var(--space-2);
}

.config-tabs button {
  background: none;
  border: none;
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
  cursor: pointer;
  border-bottom: 2px solid transparent;
}

.config-tabs button.active {
  color: var(--color-accent);
  border-bottom: 2px solid var(--color-accent);
}

.config-tabs button:hover:not(.active) {
  color: var(--color-text-primary);
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
  margin: var(--space-4) 0;
}

.hierarchy-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.hierarchy-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-bg-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  font-size: var(--text-xs);
}

.hierarchy-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 220px;
}

.remove-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
}

.remove-btn:hover {
  color: var(--color-danger);
}
</style>
