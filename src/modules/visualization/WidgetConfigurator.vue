<script setup>
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useFormulaStore } from '@/stores/formulaStore'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import DragResizer from '@/components/ui/DragResizer.vue'
import { 
  BarChart3, LineChart, PieChart, ScatterChart, Grid3X3, LayoutGrid, 
  Radar, AlignEndHorizontal, Hash, Filter, SlidersHorizontal, 
  AlignVerticalSpaceBetween, Table, AreaChart, AlignCenter, 
  Gauge, Target, Map, CalendarDays, Cloud, Code, Image as ImageIcon,
  PanelRight, PanelRightClose
} from '@lucide/vue'

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

const formulaStore = useFormulaStore()

const corporateMetricOptions = computed(() => {
  const baseName = props.config.dataset || dataStore.activeDatasetName
  if (!baseName) return []
  const metrics = formulaStore.getCorporateMetricsForDataset(baseName)
  return metrics.map(m => ({
    value: `__METRIC__${m.id}`,
    label: `✨ Métrica: ${m.name}`
  }))
})

const columnOptions = computed(() => {
  const baseCols = availableColumns.value.map(c => ({ value: c.value, label: c.label }))
  return [...corporateMetricOptions.value, ...baseCols]
})

const numericColumnOptions = computed(() => {
  const numCols = availableColumns.value.filter(c => c.type === 'number').map(c => ({ value: c.value, label: c.label }))
  return [...corporateMetricOptions.value, ...numCols]
})

const chartTypeOptions = [
  { value: 'bar', label: 'Barras', icon: BarChart3 },
  { value: 'line', label: 'Líneas', icon: LineChart },
  { value: 'pie', label: 'Torta', icon: PieChart },
  { value: 'scatter', label: 'Dispersión', icon: ScatterChart },
  { value: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
  { value: 'treemap', label: 'Treemap', icon: LayoutGrid },
  { value: 'radar', label: 'Radar', icon: Radar },
  { value: 'waterfall', label: 'Cascada', icon: AlignEndHorizontal },
  { value: 'kpi', label: 'KPI', icon: Hash },
  { value: 'slicer', label: 'Filtro', icon: Filter },
  { value: 'parameter', label: 'What-If', icon: SlidersHorizontal },
  { value: 'boxplot', label: 'Cajas', icon: AlignVerticalSpaceBetween },
  { value: 'grid', label: 'Tabla', icon: Table },
  { value: 'combo', label: 'Combinado', icon: AreaChart },
  { value: 'funnel', label: 'Embudo', icon: AlignCenter },
  { value: 'gauge', label: 'Medidor', icon: Gauge },
  { value: 'scorecard', label: 'Scorecard', icon: Target },
  { value: 'map', label: 'Mapa', icon: Map },
  { value: 'calendar', label: 'Calendario', icon: CalendarDays },
  { value: 'wordcloud', label: 'Word Cloud', icon: Cloud },
  { value: 'python', label: 'Python', icon: Code },
  { value: 'image', label: 'Imagen', icon: ImageIcon }
]

const sidebarWidth = ref(320)
const isCollapsed = ref(false)

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

const filterOperators = [
  { value: '=', label: 'Igual (=)' },
  { value: '!=', label: 'Distinto (!=)' },
  { value: '>', label: 'Mayor (>)' },
  { value: '<', label: 'Menor (<)' },
  { value: '>=', label: 'Mayor o Igual (>=)' },
  { value: '<=', label: 'Menor o Igual (<=)' },
  { value: 'LIKE', label: 'Contiene (LIKE)' }
]

const addFilter = () => {
  const currentFilters = props.config.filters || []
  updateField('filters', [...currentFilters, { column: '', operator: '=', value: '' }])
}

const updateFilter = (index, field, value) => {
  const newFilters = [...(props.config.filters || [])]
  newFilters[index] = { ...newFilters[index], [field]: value }
  updateField('filters', newFilters)
}

const removeFilter = (index) => {
  const newFilters = [...(props.config.filters || [])]
  newFilters.splice(index, 1)
  updateField('filters', newFilters)
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
      // Ignorar error hasta que termine de escribir
    }
  }
})

const defaultPythonCode = computed(() => {
  const safeName = props.config.dataset ? props.config.dataset.replace(/[^a-zA-Z0-9_]/g, '_') : 'dataset'
  return `import matplotlib.pyplot as plt
import pandas as pd

# Los datos filtrados se inyectan en 'input_data'
df_${safeName} = pd.DataFrame(input_data)

# Dibuja tu gráfico usando la data actual
if not df_${safeName}.empty:
    plt.plot(df_${safeName}.iloc[:, 0], df_${safeName}.iloc[:, 1])
    plt.title('Mi Gráfico de ${props.config.dataset || 'Datos'}')
`
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
  <div 
    class="configurator" 
    :style="{ width: isCollapsed ? '48px' : sidebarWidth + 'px', position: 'relative' }"
  >
    <DragResizer v-if="!isCollapsed" v-model:width="sidebarWidth" :is-right="false" />

    <div class="config-header">
      <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
        <button class="icon-btn" @click="isCollapsed = !isCollapsed" :title="isCollapsed ? 'Expandir' : 'Colapsar'" style="background: none; border: none; cursor: pointer; display: flex; color: var(--color-text-secondary); padding: 4px; margin-right: 8px;">
          <PanelRight v-if="isCollapsed" />
          <PanelRightClose v-else />
        </button>
        <h3 v-if="!isCollapsed" style="flex-grow: 1;">Configurar Widget</h3>
        <button v-if="!isCollapsed" class="close-btn" @click="emit('close')">&times;</button>
      </div>
      <div v-show="!isCollapsed" class="config-tabs" style="margin-top: 16px;">
        <button :class="{ active: activeTab === 'data' }" @click="activeTab = 'data'">Datos</button>
        <button :class="{ active: activeTab === 'style' }" @click="activeTab = 'style'">Estilo</button>
        <button :class="{ active: activeTab === 'advanced' }" @click="activeTab = 'advanced'">Avanzado</button>
      </div>
    </div>
    
    <div v-show="!isCollapsed" class="config-body">
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
        <label>Tipo de Visualización</label>
        <div class="chart-type-grid">
          <button
            v-for="opt in chartTypeOptions"
            :key="opt.value"
            class="chart-type-btn"
            :class="{ active: config.type === opt.value }"
            @click="updateField('type', opt.value)"
            :title="opt.label"
          >
            <component :is="opt.icon" class="chart-type-icon" />
            <span class="chart-type-label">{{ opt.label }}</span>
          </button>
        </div>
      </div>
      
      <div v-if="config.type !== 'kpi' && config.type !== 'pie' && config.type !== 'scatter' && config.type !== 'slicer' && config.type !== 'parameter' && config.type !== 'image' && config.type !== 'calendar'" class="form-group">
        <label>Orientación</label>
        <BaseDropdown 
          :model-value="config.orientation || 'vertical'" 
          :options="[{value:'vertical', label:'Vertical'}, {value:'horizontal', label:'Horizontal'}]"
          @update:model-value="val => updateField('orientation', val)" 
        />
      </div>

      <div v-if="config.type === 'calendar'" class="form-group">
        <label>Modo del Calendario</label>
        <BaseDropdown 
          :model-value="config.calendarMode || 'heatmap'" 
          :options="[{value:'heatmap', label:'Heatmap (Color)'}, {value:'scatter', label:'Scatter (Puntos)'}, {value:'effectScatter', label:'Effect Scatter (Ondas)'}]"
          @update:model-value="val => updateField('calendarMode', val)" 
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

      <div v-if="config.type === 'python'" class="form-group">
        <label>Código Python (PyPlot)</label>
        <p style="font-size: var(--text-xs); color: var(--color-text-secondary); margin: 0 0 8px 0;">
          Usa <code>df_{{ config.dataset ? config.dataset.replace(/[^a-zA-Z0-9_]/g, '_') : 'dataset' }}</code> para acceder a los datos de este widget.
        </p>
        <textarea 
          :value="config.pythonCode || defaultPythonCode" 
          @input="e => updateField('pythonCode', e.target.value)"
          style="width: 100%; min-height: 250px; background-color: var(--color-bg-secondary); color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: var(--space-3); font-family: monospace; font-size: var(--text-xs); resize: vertical;"
          spellcheck="false"
        ></textarea>
      </div>
      
      <div v-if="config.type === 'slicer'" class="form-group">
        <label>Tipo de Segmentador</label>
        <BaseDropdown 
          :model-value="config.slicerType || 'list'" 
          :options="[{value:'list', label:'Lista (Checkboxes)'}, {value:'button', label:'Botones (Píldoras)'}, {value:'slider', label:'Rango Numérico'}, {value:'input', label:'Buscador de Texto'}]"
          @update:model-value="val => updateField('slicerType', val)" 
        />
      </div>

      <div v-if="config.type === 'parameter'" class="form-group">
        <label>Nombre del Parámetro</label>
        <BaseInput 
          :model-value="config.parameterName || ''" 
          placeholder="Ej: Descuento"
          @update:model-value="val => updateField('parameterName', val)"
        />
        <label style="margin-top: 8px;">Rango Numérico</label>
        <div style="display: flex; gap: 8px;">
          <BaseInput :model-value="config.min || 0" type="number" placeholder="Min" @update:model-value="val => updateField('min', Number(val))" />
          <BaseInput :model-value="config.max || 100" type="number" placeholder="Max" @update:model-value="val => updateField('max', Number(val))" />
          <BaseInput :model-value="config.step || 1" type="number" placeholder="Step" @update:model-value="val => updateField('step', Number(val))" />
        </div>
        <label style="margin-top: 8px;">Valor por Defecto</label>
        <BaseInput :model-value="config.defaultValue || 0" type="number" placeholder="Default" @update:model-value="val => updateField('defaultValue', Number(val))" />
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
      <div v-if="config.type !== 'kpi' && config.type !== 'gauge' && config.type !== 'image' && config.type !== 'parameter' && config.type !== 'python'" class="form-group">
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
      <template v-if="config.type !== 'slicer' && config.type !== 'image' && config.type !== 'parameter' && config.type !== 'python'">
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
        
        <div v-if="config.type !== 'scatter' && !(config.type === 'map' && config.mapMode === 'scatter') && !config.yAxis?.startsWith('__METRIC__')" class="form-group">
          <label>Agregación</label>
          <BaseDropdown 
            :model-value="config.aggregation || 'SUM'" 
            :options="aggregationOptions"
            @update:model-value="val => updateField('aggregation', val)" 
          />
        </div>
      </template>

      <!-- Local Filters -->
      <hr class="divider" />
      <div class="form-group">
        <label>Filtros Locales (Widget)</label>
        <div v-for="(filter, index) in config.filters || []" :key="index" class="filter-item">
          <BaseDropdown 
            :model-value="filter.column" 
            :options="columnOptions"
            placeholder="Columna" 
            @update:model-value="val => updateFilter(index, 'column', val)"
          />
          <BaseDropdown 
            :model-value="filter.operator" 
            :options="filterOperators"
            placeholder="Operador" 
            @update:model-value="val => updateFilter(index, 'operator', val)"
          />
          <div style="display: flex; gap: 4px;">
            <BaseInput 
              :model-value="filter.value || ''" 
              placeholder="Valor"
              @update:model-value="val => updateFilter(index, 'value', val)"
            />
            <button class="close-btn" style="background: var(--color-bg-secondary); border: 1px solid var(--color-border); padding: 0 8px; border-radius: var(--radius-sm);" @click="removeFilter(index)">&times;</button>
          </div>
        </div>
        <BaseButton variant="secondary" size="sm" style="width: 100%; margin-top: 8px;" @click="addFilter">
          + Añadir Filtro
        </BaseButton>
      </div>

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

        <div v-if="config.type === 'line' || config.type === 'bar'" class="form-group">
          <label>Predicción (Forecasting JS)</label>
          <div style="display: flex; gap: 8px;">
            <BaseDropdown 
              :model-value="config.ml?.forecasting ? 'true' : 'false'" 
              :options="[{value:'false', label:'Desactivado'}, {value:'true', label:'Activado (Holt-Winters)'}]"
              @update:model-value="val => updateField('ml', { ...(config.ml || {}), forecasting: val === 'true' })" 
              style="flex-grow: 1;"
            />
            <BaseInput 
              v-if="config.ml?.forecasting"
              :model-value="config.ml?.forecastPeriods || 3" 
              type="number"
              placeholder="Periodos"
              @update:model-value="val => updateField('ml', { ...(config.ml || {}), forecastPeriods: Number(val) })"
              style="width: 80px;"
            />
          </div>
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
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: visible;
}

.config-header {
  display: flex;
  flex-direction: column;
  padding: var(--space-4);
  padding-bottom: 0;
}

.chart-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
  margin-top: 4px;
}

.chart-type-btn {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: all 0.2s;
  height: 64px;
}

.chart-type-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border-color: var(--color-border-hover);
}

.chart-type-btn.active {
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.chart-type-icon {
  width: 20px;
  height: 20px;
  margin-bottom: 4px;
}

.chart-type-label {
  font-size: 10px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}
.config-header h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-bottom: var(--space-3);
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
  padding: 8px;
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
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
