<script setup>
import { computed, ref, shallowRef, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useFormulaStore } from '@/stores/formulaStore'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { pythonClient } from '@/modules/python/PythonClient'
import { use, registerTheme, registerMap, getMap, registerTransform } from 'echarts/core'
import { Loader } from '@lucide/vue'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart, BoxplotChart, FunnelChart, GaugeChart, HeatmapChart, TreemapChart, RadarChart, EffectScatterChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  GeoComponent,
  CalendarComponent
} from 'echarts/components'
import { MapChart } from 'echarts/charts'
import VChart from 'vue-echarts'
import { businessTheme } from './themes/businessTheme'
import { businessThemeDark } from './themes/businessThemeDark'
import ecStat from 'echarts-stat'
import 'echarts-wordcloud'
import DataGrid from '@/modules/cleaning/DataGrid.vue'
import MapRenderer from './MapRenderer.vue'
import { generateForecastDataset } from '@/modules/analytics/forecasting'
import { useUiStore } from '@/stores/uiStore'

registerTransform(ecStat.transform.regression)
registerTransform(ecStat.transform.clustering)

// Register ECharts core and components
use([
  CanvasRenderer,
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  BoxplotChart,
  FunnelChart,
  GaugeChart,
  HeatmapChart,
  TreemapChart,
  RadarChart,
  MapChart,
  EffectScatterChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  GeoComponent,
  CalendarComponent
])

// Register custom themes
registerTheme('business-light', businessTheme)
registerTheme('business-dark', businessThemeDark)

const props = defineProps({
  config: {
    type: Object,
    required: true,
  },
  widgetId: {
    type: String,
    required: false
  }
})

const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()
const formulaStore = useFormulaStore()

const chartData = shallowRef([])
const kpiValue = ref(0)
const isLoading = ref(false)
const datasetMissing = ref(false)
const sqlError = ref(null)

// Python state
const pythonImgBase64 = ref(null)
const pythonError = ref(null)

// Drill-down State
const drillLevel = ref(0)
const drillPath = ref([])

const currentXAxis = computed(() => {
  const x = props.config.xAxis
  if (Array.isArray(x)) {
    return x[Math.min(drillLevel.value, x.length - 1)]
  }
  return x
})

const isDrillable = computed(() => {
  return Array.isArray(props.config.xAxis) && drillLevel.value < props.config.xAxis.length - 1
})

const handleDrillUp = () => {
  if (drillLevel.value > 0) {
    drillLevel.value--
    drillPath.value.pop()
    loadData()
  }
}

// Reset drill-down if config xAxis array changes (e.g., config updated)
watch(() => props.config.xAxis, () => {
  drillLevel.value = 0
  drillPath.value = []
}, { deep: true })

const loadData = async () => {
  if (!props.config) return

  isLoading.value = true
  sqlError.value = null
  pythonError.value = null
  
  // Permitir que el hilo de UI se libere antes de cálculos pesados
  await new Promise(resolve => setTimeout(resolve, 0))

  datasetMissing.value = false
  if (props.config.dataset && !dataStore.datasets.has(props.config.dataset)) {
    datasetMissing.value = true
    chartData.value = []
    isLoading.value = false
    return
  }

  if (props.config.type === 'kpi' || props.config.type === 'scorecard') {
    if (!props.config.yAxis || !props.config.dataset) {
      kpiValue.value = props.config.type === 'scorecard' ? { total: 0, target: 0 } : 0
      isLoading.value = false
      return
    }
    
    const dsName = props.config.dataset
    const rawY = props.config.yAxis
    const rawY2 = props.config.secondaryYAxis
    const agg = props.config.aggregation || 'SUM'

    const parseCol = (colStr) => colStr.includes('].[') ? colStr : `[${dsName}].[${colStr}]`
    const extractTable = (colStr) => colStr.includes('].[') ? colStr.split('].[')[0].replace('[', '') : dsName
    
    const resolveY = (yConfig, defaultAgg) => {
      if (yConfig?.startsWith('__METRIC__')) {
        const metricId = yConfig.split('__METRIC__')[1]
        const metrics = formulaStore.getCorporateMetricsForDataset(dsName)
        const metric = metrics.find(m => m.id === metricId)
        if (metric) return `(${metric.expression})`
      }
      return `${defaultAgg}(${parseCol(yConfig)})`
    }
    
    let globalWhere = ''
    const requiredTables = [dsName, rawY.startsWith('__METRIC__') ? dsName : extractTable(rawY)]
    
    dashboardStore.globalFilters.forEach(f => {
      if (f.dataset !== dsName) {
        const rel = dataStore.relationships.find(r => 
          (r.fromTable === dsName && r.toTable === f.dataset) || (r.toTable === dsName && r.fromTable === f.dataset)
        )
        if (!rel) return
      }
      const safeVal = typeof f.value === 'string' ? String(f.value).replace(/'/g, "''") : f.value
      const colName = f.column.includes('].[') ? f.column : `[${f.dataset}].[${f.column}]`
      requiredTables.push(extractTable(f.column) || f.dataset)
      
      if (f.operator === 'BETWEEN') {
        const safeVal2 = typeof f.value2 === 'string' ? String(f.value2).replace(/'/g, "''") : f.value2
        const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
        const v2 = typeof f.value2 === 'number' ? f.value2 : `'${safeVal2}'`
        globalWhere += ` AND ${colName} BETWEEN ${v1} AND ${v2}`
      } else {
        const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
        globalWhere += ` AND ${colName} ${f.operator || '='} ${v1}`
      }
    })

    // Apply local widget filters
    if (Array.isArray(props.config.filters)) {
      props.config.filters.forEach(f => {
        if (!f.column || !f.operator || f.value === undefined || f.value === '') return
        const safeVal = typeof f.value === 'string' ? String(f.value).replace(/'/g, "''") : f.value
        const colName = f.column.includes('].[') ? f.column : `[${dsName}].[${f.column}]`
        requiredTables.push(extractTable(f.column) || dsName)
        
        const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
        if (f.operator.toUpperCase() === 'LIKE') {
          globalWhere += ` AND ${colName} LIKE '%${safeVal}%'`
        } else {
          globalWhere += ` AND ${colName} ${f.operator} ${v1}`
        }
      })
    }

    try {
      const ySafeExp = resolveY(rawY, agg)
      const uniqueRequiredTables = [...new Set(requiredTables)]
      const fromClause = dataStore.buildJoinQuery(dsName, uniqueRequiredTables)

      if (props.config.type === 'scorecard' && rawY2) {
        const y2SafeExp = resolveY(rawY2, agg)
        const q = `SELECT ${ySafeExp} as [total], ${y2SafeExp} as [target] FROM ${fromClause} WHERE 1=1 ${globalWhere}`
        const res = await sqlClient.query(q)
        kpiValue.value = {
          total: res[0]?.total || 0,
          target: res[0]?.target || 0
        }
      } else {
        // Find main column for IS NOT NULL check
        const baseColExp = rawY.startsWith('__METRIC__') ? '1' : parseCol(rawY)
        const nullCheck = baseColExp === '1' ? '' : ` AND ${baseColExp} IS NOT NULL`
        const q = `SELECT ${ySafeExp} as [total] FROM ${fromClause} WHERE 1=1${nullCheck}${globalWhere}`
        const res = await sqlClient.query(q)
        kpiValue.value = res[0]?.total || 0
      }
    } catch (e) {
      kpiValue.value = props.config.type === 'scorecard' ? { total: 0, target: 0 } : 0
    }
    chartData.value = []
    isLoading.value = false
    return
  }

  // Not KPI/Scorecard
  if (!props.config.dataset || (!currentXAxis.value && props.config.type !== 'python') || (!props.config.yAxis && props.config.type !== 'python' && props.config.type !== 'image')) {
    chartData.value = []
    isLoading.value = false
    return
  }
  
  const dsName = props.config.dataset
  const rawX = currentXAxis.value
  const rawY = props.config.yAxis
  const rawY2 = props.config.secondaryYAxis
  const agg = props.config.aggregation || 'SUM'
  
  const parseCol = (colStr) => colStr.includes('].[') ? colStr : `[${dsName}].[${colStr}]`
  const extractTable = (colStr) => colStr && colStr.includes('].[') ? colStr.split('].[')[0].replace('[', '') : dsName
  
  const resolveY = (yConfig, defaultAgg) => {
    if (yConfig?.startsWith('__METRIC__')) {
      const metricId = yConfig.split('__METRIC__')[1]
      const metrics = formulaStore.getCorporateMetricsForDataset(dsName)
      const metric = metrics.find(m => m.id === metricId)
      if (metric) return `(${metric.expression})`
    }
    return `${defaultAgg}(${parseCol(yConfig)})`
  }

  let globalWhere = ''
  const requiredTables = [dsName, extractTable(rawX), extractTable(rawY)]
  if (rawY2) requiredTables.push(extractTable(rawY2))
  
  dashboardStore.globalFilters.forEach(f => {
    if (f.dataset !== dsName) {
      const rel = dataStore.relationships.find(r => 
        (r.fromTable === dsName && r.toTable === f.dataset) || (r.toTable === dsName && r.fromTable === f.dataset)
      )
      if (!rel) return
    }
    const safeVal = typeof f.value === 'string' ? String(f.value).replace(/'/g, "''") : f.value
    const colName = f.column.includes('].[') ? f.column : `[${f.dataset}].[${f.column}]`
    requiredTables.push(extractTable(f.column) || f.dataset)
    
    if (f.operator === 'BETWEEN') {
      const safeVal2 = typeof f.value2 === 'string' ? String(f.value2).replace(/'/g, "''") : f.value2
      const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
      const v2 = typeof f.value2 === 'number' ? f.value2 : `'${safeVal2}'`
      globalWhere += ` AND ${colName} BETWEEN ${v1} AND ${v2}`
    } else {
      const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
      globalWhere += ` AND ${colName} ${f.operator || '='} ${v1}`
    }
  })

  // Apply drill-down path filters
  drillPath.value.forEach(dFilter => {
    const safeVal = typeof dFilter.value === 'string' ? String(dFilter.value).replace(/'/g, "''") : dFilter.value
    const colName = dFilter.colName.includes('].[') ? dFilter.colName : `[${dsName}].[${dFilter.colName}]`
    requiredTables.push(extractTable(dFilter.colName) || dsName)
    const v1 = typeof dFilter.value === 'number' ? dFilter.value : `'${safeVal}'`
    globalWhere += ` AND ${colName} = ${v1}`
  })

  // Apply local widget filters
  if (Array.isArray(props.config.filters)) {
    props.config.filters.forEach(f => {
      if (!f.column || !f.operator || f.value === undefined || f.value === '') return
      const safeVal = typeof f.value === 'string' ? String(f.value).replace(/'/g, "''") : f.value
      const colName = f.column.includes('].[') ? f.column : `[${dsName}].[${f.column}]`
      requiredTables.push(extractTable(f.column) || dsName)
      
      const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
      if (f.operator.toUpperCase() === 'LIKE') {
        globalWhere += ` AND ${colName} LIKE '%${safeVal}%'`
      } else {
        globalWhere += ` AND ${colName} ${f.operator} ${v1}`
      }
    })
  }

  const uniqueRequiredTables = [...new Set(requiredTables)]

  try {
    const fromClause = dataStore.buildJoinQuery(dsName, uniqueRequiredTables)

    // Execute Python Script for Visuals (must be done before trying to parse rawX)
    if (props.config.type === 'python') {
      try {
        const q = `SELECT * FROM ${fromClause} WHERE 1=1${globalWhere} LIMIT 10000`
        const rawDataForPython = await sqlClient.query(q)
        
        if (props.config.pythonCode) {
          const b64 = await pythonClient.runPythonPlot(props.config.pythonCode, rawDataForPython, dsName)
          pythonImgBase64.value = b64
          pythonError.value = null
        }
      } catch (e) {
        console.error(e)
        pythonError.value = e.message || 'Error en Python'
        pythonImgBase64.value = null
      }
      isLoading.value = false
      return
    }

    const xSafe = parseCol(rawX)
    const ySafeExp = resolveY(rawY, agg)
    const baseColExp = rawY.startsWith('__METRIC__') ? '1' : parseCol(rawY)
    const yNullCheck = baseColExp === '1' ? '' : ` AND ${baseColExp} IS NOT NULL`
    
    
    if ((props.config.type === 'map' && props.config.mapMode === 'scatter') || props.config.type === 'scatter' || props.config.type === 'boxplot') {
      const isMapScatter = props.config.type === 'map'
      const selectY2 = (isMapScatter && rawY2) ? `, ${resolveY(rawY2, agg)} as [value2]` : ''
      const groupByMap = (isMapScatter && rawY2) ? `GROUP BY ${xSafe}, ${ySafeExp}` : ''
      
      const q = isMapScatter && rawY2 
        ? `SELECT TOP 2000 ${xSafe} as [name], ${ySafeExp} as [value] ${selectY2} FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere} ${groupByMap}`
        : `SELECT TOP 2000 ${xSafe} as [name], ${ySafeExp} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere}`
        
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if (props.config.type === 'heatmap' && rawY2) {
      const ySafe2Exp = resolveY(rawY2, agg)
      const q = `SELECT ${xSafe} as [name], ${ySafe2Exp} as [name2], ${ySafeExp} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere} GROUP BY ${xSafe}, ${ySafe2Exp} LIMIT 1000`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if ((props.config.type === 'combo' || props.config.type === 'line' || props.config.type === 'bar') && rawY2) {
      const ySafe2Exp = resolveY(rawY2, agg)
      const q = `SELECT ${xSafe} as [name], ${ySafeExp} as [value], ${ySafe2Exp} as [value2] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ORDER BY [value] DESC LIMIT 100`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if (props.config.type === 'gauge') {
      const q = `SELECT ${ySafeExp} as [value] FROM ${fromClause} WHERE 1=1${yNullCheck}${globalWhere}`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if (props.config.type === 'calendar') {
      const q = `SELECT ${xSafe} as [name], ${ySafeExp} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} LIMIT 2000`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }
    
    const q = `SELECT ${xSafe} as [name], ${ySafeExp} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ORDER BY [value] DESC LIMIT 100`
    chartData.value = await sqlClient.query(q)
  } catch (e) {
    console.error("Error generating chart data:", e)
    sqlError.value = e.message || 'Error de sintaxis SQL. Revisa los filtros y tipos de datos.'
    chartData.value = []
  }
  isLoading.value = false
}

// Watch global filters and config to recalculate data
let filterTimeout
let lastRefreshCounter = props.config?.refreshCounter || 0

watch(() => [props.config, dashboardStore.globalFilters, dataStore.dataVersion], () => {
  clearTimeout(filterTimeout)
  
  const currentCounter = props.config?.refreshCounter || 0
  const isRefreshTriggered = currentCounter !== lastRefreshCounter
  lastRefreshCounter = currentCounter

  if (props.config?.isPaused && !isRefreshTriggered) {
    return
  }

  filterTimeout = setTimeout(() => {
    loadData()
  }, 100)
}, { deep: true })

onMounted(async () => {
  if (!getMap('world')) {
    try {
      const res = await fetch('https://cdn.jsdelivr.net/npm/echarts@4.9.0/map/json/world.json')
      const geoJson = await res.json()
      registerMap('world', geoJson)
    } catch (e) {
      console.error('Error fetching map data:', e)
    }
  }
  loadData()
  checkCustomGeoJson()
})

const checkCustomGeoJson = async () => {
  if (props.config?.type === 'map' && props.config?.mapMode === 'custom' && props.config?.customGeoJson) {
    const custom = props.config.customGeoJson
    if (custom.type === 'file' && custom.data && custom.name) {
      if (!getMap(custom.name)) {
        registerMap(custom.name, custom.data)
      }
    } else if (custom.type === 'url' && custom.url) {
      const mapName = custom.url
      if (!getMap(mapName)) {
        try {
          const res = await fetch(custom.url)
          const data = await res.json()
          registerMap(mapName, data)
        } catch (e) {
          console.error('Error fetching custom GeoJSON:', e)
        }
      }
    }
  }
}

watch(() => props.config?.customGeoJson, () => {
  checkCustomGeoJson()
}, { deep: true })

const formattedKpi = computed(() => {
  const formatVal = (v) => {
    if (typeof v !== 'number') return v
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(v)
  }
  
  if (props.config.type === 'scorecard') {
    const val = kpiValue.value?.total || 0
    const target = kpiValue.value?.target || 0
    const diff = val - target
    const pct = target !== 0 ? (diff / Math.abs(target)) * 100 : 0
    return {
      value: formatVal(val),
      target: formatVal(target),
      diff: formatVal(diff),
      pct: formatVal(pct),
      isPositive: diff >= 0
    }
  }
  
  return formatVal(kpiValue.value)
})

const chartStrategies = {
  pie: (baseOption, data, props) => ({
    ...baseOption,
    legend: props.config.styles?.showLegend === false ? undefined : { orient: 'vertical', right: 0, top: 'center' },
    series: [
      {
        name: props.config.yAxis,
        type: 'pie',
        radius: [props.config.styles?.innerRadius ? `${props.config.styles.innerRadius}%` : '40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10 },
        label: { show: false },
        data: data.map(d => ({ name: d.name, value: d.value }))
      }
    ]
  }),
  scatter: (baseOption, data, props) => {
    const rawData = data.map(d => [d.name, d.value])
    const result = {
      ...baseOption,
      tooltip: { trigger: 'item' },
      xAxis: { name: props.config.xAxis, type: 'value', scale: true },
      yAxis: { name: props.config.yAxis, type: 'value', scale: true },
      dataset: [{ source: rawData }],
      series: [{
        symbolSize: 10,
        datasetIndex: 0,
        type: 'scatter',
        large: true,
        largeThreshold: 500
      }]
    }

    if (props.config.ml) {
      if (props.config.ml.regressionType && props.config.ml.regressionType !== 'none') {
        result.dataset.push({
          transform: {
            type: 'ecStat:regression',
            config: { method: props.config.ml.regressionType }
          }
        })
        result.series.push({
          name: 'Regresión',
          type: 'line',
          datasetIndex: result.dataset.length - 1,
          symbolSize: 0.1,
          symbol: 'circle',
          label: { show: true, fontSize: 16 },
          labelLayout: { dx: -20 },
          encode: { label: 2, tooltip: 1 }
        })
      }

      if (props.config.ml.clusterCount && props.config.ml.clusterCount !== 'none') {
        const k = Number(props.config.ml.clusterCount)
        result.dataset.push({
          transform: {
            type: 'ecStat:clustering',
            config: { clusterCount: k, outputType: 'single', outputClusterIndexDimension: 2 }
          }
        })
        const clusteringResultIndex = result.dataset.length - 1
        
        result.series = [] // Override series to color by cluster
        for (let i = 0; i < k; i++) {
          result.dataset.push({
            fromDatasetIndex: clusteringResultIndex,
            transform: {
              type: 'filter',
              config: { dimension: 2, '=': i }
            }
          })
          result.series.push({
            type: 'scatter',
            datasetIndex: result.dataset.length - 1,
            symbolSize: 10,
            name: `Cluster ${i + 1}`
          })
        }
      }
    }

    return result
  },
  combo: (baseOption, data, props, xAxisData, seriesData) => {
    const data2 = data.map(d => d.value2)
    const isStacked = props.config.styles?.stacked
    return {
      ...baseOption,
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxisData },
      yAxis: [{ type: 'value', name: props.config.yAxis }, { type: 'value', name: props.config.secondaryYAxis }],
      series: [
        { name: props.config.yAxis, type: 'bar', data: seriesData, stack: isStacked ? 'total' : undefined, large: true, largeThreshold: 500 },
        { name: props.config.secondaryYAxis, type: 'line', yAxisIndex: 1, data: data2, stack: isStacked ? 'total' : undefined, large: true, largeThreshold: 500 }
      ]
    }
  },
  funnel: (baseOption, data, props, xAxisData, seriesData) => ({
    ...baseOption,
    tooltip: { trigger: 'item', formatter: '{a} <br/>{b} : {c}' },
    series: [
      {
        name: props.config.yAxis,
        type: 'funnel',
        left: '10%',
        top: 60,
        bottom: 60,
        width: '80%',
        min: 0,
        max: Math.max(...seriesData),
        minSize: '0%',
        maxSize: '100%',
        sort: 'descending',
        gap: 2,
        label: { show: true, position: 'inside' },
        data: data.map(d => ({ name: d.name, value: d.value }))
      }
    ]
  }),
  gauge: (baseOption, data, props) => {
    const val = data[0]?.value || 0
    const target = props.config.targetValue || 100
    return {
      ...baseOption,
      series: [
        {
          type: 'gauge',
          progress: { show: true, width: 18 },
          axisLine: { lineStyle: { width: 18 } },
          axisTick: { show: false },
          splitLine: { length: 15, lineStyle: { width: 2, color: '#999' } },
          axisLabel: { distance: 25, color: '#999', fontSize: 14 },
          anchor: { show: true, showAbove: true, size: 25, itemStyle: { borderWidth: 10 } },
          title: { show: false },
          detail: { valueAnimation: true, fontSize: 30, offsetCenter: [0, '70%'] },
          data: [{ value: val, name: props.config.yAxis }],
          max: Math.max(val, target) * 1.2
        }
      ]
    }
  },
  boxplot: (baseOption, data, props) => {
    const grouped = {}
    data.forEach(d => {
      if (!grouped[d.name]) grouped[d.name] = []
      grouped[d.name].push(Number(d.value))
    })
    
    const cats = Object.keys(grouped)
    const boxData = cats.map(c => {
      const vals = grouped[c].sort((a,b) => a-b)
      const min = vals[0]
      const max = vals[vals.length - 1]
      const q1 = vals[Math.floor(vals.length * 0.25)] || min
      const median = vals[Math.floor(vals.length * 0.5)] || min
      const q3 = vals[Math.floor(vals.length * 0.75)] || max
      return [min, q1, median, q3, max]
    })
    
    return {
      ...baseOption,
      xAxis: { type: 'category', data: cats },
      yAxis: { type: 'value' },
      series: [{
        name: props.config.yAxis,
        type: 'boxplot',
        data: boxData
      }]
    }
  },
  heatmap: (baseOption, data, props) => {
    const xCats = [...new Set(data.map(d => d.name))]
    const yCats = [...new Set(data.map(d => d.name2))]
    const mapData = data.map(d => [xCats.indexOf(d.name), yCats.indexOf(d.name2), d.value])
    const maxVal = Math.max(...data.map(d => d.value))
    
    return {
      ...baseOption,
      tooltip: { position: 'top' },
      grid: { height: '70%', top: '10%' },
      xAxis: { type: 'category', data: xCats, splitArea: { show: true } },
      yAxis: { type: 'category', data: yCats, splitArea: { show: true } },
      visualMap: { min: 0, max: maxVal, calculable: true, orient: 'horizontal', left: 'center', bottom: '0%' },
      series: [{
        name: props.config.yAxis,
        type: 'heatmap',
        data: mapData,
        label: { show: true },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }]
    }
  },
  treemap: (baseOption, data) => ({
    ...baseOption,
    series: [{
      type: 'treemap',
      data: data.map(d => ({ name: d.name, value: d.value })),
      roam: false,
      label: { show: true, formatter: '{b}\n{c}' }
    }]
  }),
  radar: (baseOption, data, props, xAxisData, seriesData) => {
    const maxVal = Math.max(...data.map(d => d.value))
    return {
      ...baseOption,
      radar: {
        indicator: data.map(d => ({ name: d.name, max: maxVal * 1.1 }))
      },
      series: [{
        name: props.config.yAxis,
        type: 'radar',
        data: [{ value: seriesData, name: props.config.yAxis }]
      }]
    }
  },
  calendar: (baseOption, data, props) => {
    // 1. Validar y formatear fechas (YYYY-MM-DD)
    const validData = []
    let minDate = Infinity
    let maxDate = -Infinity
    
    data.forEach(d => {
      const parsed = Date.parse(d.name)
      if (!isNaN(parsed)) {
        const dateObj = new Date(parsed)
        const dateStr = dateObj.toISOString().split('T')[0] // YYYY-MM-DD
        validData.push([dateStr, d.value])
        
        if (parsed < minDate) minDate = parsed
        if (parsed > maxDate) maxDate = parsed
      }
    })

    // Si no hay fechas válidas, usar el año actual como fallback
    let range
    if (validData.length > 0) {
      const minD = new Date(minDate).toISOString().split('T')[0]
      const maxD = new Date(maxDate).toISOString().split('T')[0]
      
      const minMonth = minD.substring(0, 7)
      const maxMonth = maxD.substring(0, 7)
      
      if (minMonth === maxMonth) {
        range = minMonth // Fuerza a que dibuje solo un mes (Ej: "2022-01")
      } else {
        range = [minD, maxD]
      }
    } else {
      range = new Date().getFullYear().toString()
    }

    // Generar serie de días para poner el número en cada celda
    const allDays = []
    let currentD = new Date(minDate)
    let endD = new Date(maxDate)
    
    if (validData.length > 0) {
      const minDStr = new Date(minDate).toISOString().split('T')[0]
      const maxDStr = new Date(maxDate).toISOString().split('T')[0]
      if (minDStr.substring(0, 7) === maxDStr.substring(0, 7)) {
        // Si es solo un mes, forzamos a cubrir todo el mes
        currentD = new Date(minDStr.substring(0, 7) + '-01T00:00:00')
        endD = new Date(currentD.getFullYear(), currentD.getMonth() + 1, 0)
      }
    } else {
      currentD = new Date(new Date().getFullYear(), 0, 1)
      endD = new Date(new Date().getFullYear(), 11, 31)
    }

    while (currentD <= endD) {
      allDays.push([currentD.toISOString().split('T')[0], 0])
      currentD.setDate(currentD.getDate() + 1)
    }

    const mode = props.config.calendarMode || 'heatmap'
    const maxVal = validData.length ? Math.max(...validData.map(d => d[1])) : 1
    const minVal = validData.length ? Math.min(...validData.map(d => d[1])) : 0
    
    const option = {
      ...baseOption,
      calendar: {
        top: 60,
        bottom: 20,
        left: 40,
        right: 40,
        cellSize: ['auto', 'auto'], // Permite redimensionar en ambas direcciones
        range: range,
        itemStyle: {
          borderWidth: 0.5
        },
        yearLabel: { show: true }
      }
    }

    const dayLabelSeries = {
      type: 'scatter',
      coordinateSystem: 'calendar',
      data: allDays,
      symbolSize: 0,
      label: {
        show: true,
        formatter: function (params) {
          return parseInt(params.value[0].split('-')[2], 10)
        },
        color: 'var(--color-text-secondary)',
        position: 'insideTopLeft',
        offset: [5, 5],
        fontSize: 10
      },
      silent: true // Evita que los números interfieran con tooltips o eventos
    }

    if (mode === 'heatmap') {
      option.visualMap = {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 0
      }
      option.series = [
        dayLabelSeries,
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: validData
        }
      ]
    } else {
      // scatter o effectScatter
      option.visualMap = {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 0,
        inRange: {
          color: ['#ffeda0', '#feb24c', '#f03b20']
        }
      }
      option.series = [
        dayLabelSeries,
        {
          type: mode === 'effectScatter' ? 'effectScatter' : 'scatter',
          coordinateSystem: 'calendar',
          data: validData,
          symbolSize: function (val) {
            // Escalar entre 5 y 20 basado en el maxVal para que sea más visible
            const span = maxVal - minVal || 1
            return 5 + ((val[1] - minVal) / span) * 15
          }
        }
      ]
    }

    return option
  },
  wordcloud: (baseOption, data, props) => {
    return {
      ...baseOption,
      tooltip: { show: true },
      series: [{
        type: 'wordCloud',
        shape: 'circle',
        left: 'center',
        top: 'center',
        width: '90%',
        height: '90%',
        sizeRange: [12, 60],
        rotationRange: [-90, 90],
        rotationStep: 45,
        gridSize: 8,
        drawOutOfBound: false,
        textStyle: {
          fontFamily: props.config.styles?.fontFamily || 'sans-serif',
          fontWeight: 'bold',
          color: function () {
            return 'rgb(' + [
              Math.round(Math.random() * 160),
              Math.round(Math.random() * 160),
              Math.round(Math.random() * 160)
            ].join(',') + ')';
          }
        },
        data: data.map(d => ({ name: String(d.name), value: Number(d.value) }))
      }]
    }
  },
  map: (baseOption, data, props, xAxisData, seriesData) => {
    const getMapName = () => {
      if (props.config.mapMode === 'custom' && props.config.customGeoJson) {
        return props.config.customGeoJson.type === 'file' ? props.config.customGeoJson.name : props.config.customGeoJson.url
      }
      return 'world'
    }
    const currentMap = getMapName()

    if (props.config.mapMode === 'scatter' || (props.config.mapMode === 'custom' && props.config.secondaryYAxis)) {
      const y2LabelValue = props.config.secondaryYAxisLabel || props.config.secondaryYAxis
      const mapData = data.map(d => [Number(d.name), Number(d.value), y2LabelValue ? Number(d.value2 || 0) : 1])
      let maxVal = y2LabelValue ? Math.max(...mapData.map(d => d[2])) : 1
      let minVal = y2LabelValue ? Math.min(...mapData.map(d => d[2])) : 0
      
      if (!isFinite(maxVal)) maxVal = 100
      if (!isFinite(minVal)) minVal = 0
      if (maxVal === minVal) {
        maxVal += 1
        minVal -= 1
      }
      
      return {
        ...baseOption,
        tooltip: { trigger: 'item', formatter: function (params) {
          return y2LabelValue ? `${y2LabelValue}: ${params.value[2]}` : `[${params.value[0]}, ${params.value[1]}]`
        }},
        geo: {
          map: currentMap,
          roam: true,
          itemStyle: { areaColor: '#e0e0e0', borderColor: '#111' },
          emphasis: { itemStyle: { areaColor: '#c0c0c0' } }
        },
        visualMap: y2LabelValue ? {
          left: 'right',
          min: minVal,
          max: maxVal,
          inRange: { color: ['#50a3ba', '#eac736', '#d94e5d'] },
          calculable: true,
          text: [y2LabelValue, '']
        } : undefined,
        series: [{
          name: y2LabelValue || 'Puntos',
          type: 'scatter',
          coordinateSystem: 'geo',
          data: mapData,
          symbolSize: y2LabelValue ? function (val) {
            const ratio = maxVal === minVal ? 1 : (val[2] - minVal) / (maxVal - minVal)
            return 5 + ratio * 15
          } : 10,
          itemStyle: { color: y2LabelValue ? undefined : '#ddb926' }
        }]
      }
    } else {
      const maxVal = Math.max(...seriesData, 1)
      const minVal = Math.min(...seriesData, 0)
      return {
        ...baseOption,
        visualMap: {
          left: 'right',
          min: minVal,
          max: maxVal,
          inRange: { color: ['#e0ffff', '#006edd'] },
          text: [props.config.yAxisLabel || props.config.yAxis || 'High', 'Low'],
          calculable: true
        },
        series: [{
          name: props.config.yAxisLabel || props.config.yAxis,
          type: 'map',
          map: currentMap,
          roam: true,
          data: data.map(d => ({ name: d.name, value: d.value }))
        }]
      }
    }
  },
  waterfall: (baseOption, data, props, xAxisData) => {
    const helpData = []
    const barData = []
    let currentSum = 0
    
    data.forEach(d => {
      const val = Number(d.value)
      if (val >= 0) {
        helpData.push(currentSum)
        barData.push({ value: val, itemStyle: { color: '#91cc75' } })
        currentSum += val
      } else {
        currentSum += val
        helpData.push(currentSum)
        barData.push({ value: Math.abs(val), itemStyle: { color: '#ee6666' } })
      }
    })
    
    return {
      ...baseOption,
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: function (params) {
        const tar = params[1]
        return tar ? tar.name + '<br/>' + tar.seriesName + ' : ' + tar.value : ''
      }},
      xAxis: { type: 'category', splitLine: { show: false }, data: xAxisData },
      yAxis: { type: 'value' },
      series: [
        { name: 'Placeholder', type: 'bar', stack: 'Total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } }, data: helpData },
        { name: props.config.yAxis, type: 'bar', stack: 'Total', label: { show: true, position: 'top' }, data: barData }
      ]
    }
  },
  grid: () => null
}

const getDefaultStrategy = (baseOption, data, props, xAxisData, seriesData, ctype) => {
  const isHorizontal = props.config.orientation === 'horizontal'
  
  const showXAxis = props.config.styles?.showAxisLabels !== false
  const showYAxis = props.config.styles?.showAxisLabels !== false
  const isStacked = props.config.styles?.stacked
  
  const defaultSeries = [
    {
      name: props.config.yAxisLabel || props.config.yAxis,
      type: ctype,
      data: seriesData,
      areaStyle: (ctype === 'line' && (props.config.styles?.areaType === 'axis' || props.config.styles?.areaType === 'between')) ? { opacity: 0.2 } : undefined,
      stack: isStacked || (ctype === 'line' && props.config.styles?.areaType === 'between') ? 'Total' : undefined,
      large: true,
      largeThreshold: 500,
      itemStyle: props.config.styles?.borderRadius ? { borderRadius: props.config.styles.borderRadius } : undefined
    }
  ]

  let finalXAxisData = xAxisData

  if ((ctype === 'line' || ctype === 'bar') && props.config.ml?.forecasting) {
    const forecast = generateForecastDataset(data, xAxisData, props.config.ml.forecastPeriods || 3)
    finalXAxisData = forecast.extendedXAxis
    defaultSeries[0].data = forecast.baseSeries
    
    defaultSeries.push({
      name: 'Pronóstico',
      type: 'line', // Siempre línea para predicciones
      data: forecast.predictionSeries,
      lineStyle: { type: 'dashed', width: 2 },
      itemStyle: { color: '#ff7f50' },
      smooth: true
    })
  }

  if ((ctype === 'line' || ctype === 'bar') && props.config.secondaryYAxis && data[0] && 'value2' in data[0]) {
    const data2 = data.map(d => d.value2)
    defaultSeries.push({
      name: props.config.secondaryYAxisLabel || props.config.secondaryYAxis,
      type: ctype,
      data: data2,
      areaStyle: (ctype === 'line' && (props.config.styles?.areaType === 'axis' || props.config.styles?.areaType === 'between')) ? { opacity: 0.2 } : undefined,
      stack: isStacked || (ctype === 'line' && props.config.styles?.areaType === 'between') ? 'Total' : undefined,
      large: true,
    })
  }

  const baseResult = {
    ...baseOption,
    xAxis: isHorizontal ? { type: 'value', show: showXAxis } : { type: 'category', data: finalXAxisData, show: showXAxis, axisLabel: { interval: 'auto', rotate: 30 } },
    yAxis: isHorizontal ? { type: 'category', data: finalXAxisData, show: showYAxis, axisLabel: { interval: 'auto', width: 100, overflow: 'truncate' } } : { type: 'value', show: showYAxis },
    series: defaultSeries
  }

  if (props.config.ml && props.config.ml.regressionType && props.config.ml.regressionType !== 'none' && !isHorizontal) {
    const regData = seriesData.map((val, idx) => [idx, Number(val)])
    baseResult.dataset = [
      { source: regData },
      {
        transform: {
          type: 'ecStat:regression',
          config: { method: props.config.ml.regressionType }
        }
      }
    ]
    baseResult.series.push({
      name: 'Regresión',
      type: 'line',
      datasetIndex: 1,
      symbolSize: 0.1,
      symbol: 'circle',
      label: { show: false }, // Ocultamos las etiquetas de puntos
      encode: { x: 0, y: 1, tooltip: 1 }
    })
  }

  return baseResult
}

const echartOptions = computed(() => {
  const ctype = props.config.type || 'bar'
  if (ctype === 'kpi' || ctype === 'scorecard' || ctype === 'image' || chartData.value.length === 0) return null
  
  const data = chartData.value
  const xAxisData = data.map(d => d.name)
  const seriesData = data.map(d => d.value)
  
  const baseOption = {
    color: props.config.styles?.customColors?.length ? props.config.styles.customColors : settingsStore.currentChartColors,
    title: {
      text: props.config.title || '',
      left: 'left',
      padding: [0, 0, 16, 0]
    },
    tooltip: { trigger: ctype === 'pie' || ctype === 'map' ? 'item' : 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
  }
  
  if (props.config.styles?.showLegend !== false) {
    baseOption.legend = { type: 'scroll', bottom: 0 }
  }

  const resolveMetricName = (yConfig) => {
    if (yConfig?.startsWith('__METRIC__')) {
      const metricId = yConfig.split('__METRIC__')[1]
      const metrics = formulaStore.getCorporateMetricsForDataset(props.config.dataset)
      const metric = metrics.find(m => m.id === metricId)
      if (metric) return metric.name
    }
    return yConfig
  }

  const resolvedProps = {
    ...props,
    config: {
      ...props.config,
      yAxis: resolveMetricName(props.config.yAxis),
      secondaryYAxis: resolveMetricName(props.config.secondaryYAxis)
    }
  }

  let finalOption = baseOption
  if (chartStrategies[ctype]) {
    finalOption = chartStrategies[ctype](baseOption, data, resolvedProps, xAxisData, seriesData)
  } else {
    finalOption = getDefaultStrategy(baseOption, data, resolvedProps, xAxisData, seriesData, ctype)
  }

  // Apply custom font family
  if (props.config.styles?.fontFamily) {
    finalOption.textStyle = {
      ...(finalOption.textStyle || {}),
      fontFamily: props.config.styles.fontFamily
    }
  }

  // Deep merge for advancedOptions
  const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item))
  const mergeDeep = (target, ...sources) => {
    if (!sources.length) return target
    const source = sources.shift()
    if (source === undefined) return target
    
    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} })
          mergeDeep(target[key], source[key])
        } else if (Array.isArray(source[key])) {
          if (!Array.isArray(target[key])) target[key] = []
          source[key].forEach((item, index) => {
            if (isObject(item)) {
              if (!isObject(target[key][index])) target[key][index] = {}
              mergeDeep(target[key][index], item)
            } else {
              target[key][index] = item
            }
          })
        } else {
          Object.assign(target, { [key]: source[key] })
        }
      }
    }
    return mergeDeep(target, ...sources)
  }

  if (props.config.advancedOptions && isObject(props.config.advancedOptions)) {
    // Deep clone finalOption to avoid mutating original objects unexpectedly, then merge
    finalOption = mergeDeep(JSON.parse(JSON.stringify(finalOption)), props.config.advancedOptions)
  }

  return finalOption
})
const handleChartClick = (params) => {
  if (params.name && currentXAxis.value && props.config.dataset) {
    const dsName = props.config.dataset
    const rawX = currentXAxis.value
    const colName = rawX.includes('].[') ? rawX : `[${dsName}].[${rawX}]`
    
    if (isDrillable.value) {
      // Drill Down
      drillPath.value.push({ colName, value: params.name })
      drillLevel.value++
      loadData()
    } else {
      // Cross Filter
      dashboardStore.addFilter(dsName, colName, params.name, `${rawX}: ${params.name}`)
    }
  }
}

const gridData = computed(() => {
  return chartData.value.map(row => {
    const obj = {
      [currentXAxis.value || 'X']: row.name,
      [props.config.yAxis || 'Y']: typeof row.value === 'number' ? Number(row.value.toFixed(2)) : row.value
    }
    if (props.config.secondaryYAxis) {
      obj[props.config.secondaryYAxis] = typeof row.value2 === 'number' ? Number(row.value2.toFixed(2)) : row.value2
    }
    return obj
  })
})

const gridSchema = computed(() => {
  const schema = [
    { name: currentXAxis.value || 'X', type: 'string' },
    { name: props.config.yAxis || 'Y', type: 'number' }
  ]
  if (props.config.secondaryYAxis) {
    schema.push({ name: props.config.secondaryYAxis, type: 'number' })
  }
  return schema
})

const exportToCSV = () => {
  if (!chartData.value || chartData.value.length === 0) {
    uiStore.addToast({ message: 'No hay datos para exportar', type: 'info' })
    return
  }
  const keys = Object.keys(chartData.value[0])
  const csvContent = [
    keys.join(','),
    ...chartData.value.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${props.config.title || 'export'}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

defineExpose({
  exportToCSV,
  widgetId: props.widgetId
})
</script>

<template>
  <div class="chart-wrapper">
    <div v-if="isLoading" class="chart-loading">
      <Loader class="spin-icon" size="32" />
      <span>Cargando...</span>
    </div>
    
    <!-- Drill Up Button -->
    <button v-if="drillLevel > 0 && !isLoading && !datasetMissing" class="drill-up-btn" @click="handleDrillUp" title="Subir nivel">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-left-up"><polyline points="14 9 9 4 4 9"/><path d="M20 20h-7a4 4 0 0 1-4-4V4"/></svg>
      Subir Nivel
    </button>
    <div v-else-if="datasetMissing" class="chart-empty">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--color-danger);">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-database-zap"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 15 21.84"/><path d="M21 5V8.5"/><path d="M21 12L18 17H22L19 22"/></svg>
        <p>Dataset original eliminado o no encontrado.</p>
      </div>
    </div>
    <div v-else-if="sqlError" class="chart-empty">
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; color: var(--color-danger); max-width: 80%; text-align: center;">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-alert-triangle"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <p style="font-size: 12px; font-family: monospace; opacity: 0.8; word-break: break-all;">{{ sqlError }}</p>
      </div>
    </div>
    <div v-else-if="!config.dataset || (!config.xAxis && config.type !== 'python') || (!config.yAxis && config.type !== 'image' && config.type !== 'python')" class="chart-empty">
      <p>Configura el widget para visualizar datos.</p>
    </div>
    
    <div v-else-if="config.type === 'kpi'" class="kpi-container">
      <div class="kpi-value">{{ formattedKpi }}</div>
      <div class="kpi-label">{{ config.yAxisLabel || config.yAxis }}</div>
    </div>
    
    <div v-else-if="config.type === 'scorecard'" class="kpi-container scorecard">
      <div class="kpi-value">{{ formattedKpi.value }}</div>
      <div class="kpi-label">{{ config.yAxisLabel || config.yAxis }}</div>
      
      <div class="scorecard-target">
        <span>Objetivo: {{ formattedKpi.target }}</span>
        <span class="scorecard-diff" :class="formattedKpi.isPositive ? 'text-success' : 'text-danger'">
          {{ formattedKpi.isPositive ? '+' : '' }}{{ formattedKpi.diff }} ({{ formattedKpi.isPositive ? '+' : '' }}{{ formattedKpi.pct }}%)
        </span>
      </div>
    </div>

    <div v-else-if="config.type === 'image'" class="image-container">
      <img v-if="config.imageUrl" :src="config.imageUrl" :style="{ objectFit: config.imageFit || 'contain' }" class="dashboard-img" />
      <div v-else class="chart-empty">Sin imagen seleccionada.</div>
    </div>

    <div v-else-if="config.type === 'python'" class="image-container" style="display: flex; justify-content: center; align-items: center;">
      <div v-if="pythonError" class="chart-empty" style="flex-direction: column; border: 1px solid var(--color-danger); color: var(--color-danger); background-color: var(--color-danger-light);">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 8px;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        <strong>Código Inválido</strong>
        <p style="font-size: 11px; font-family: monospace; opacity: 0.8; word-break: break-all; margin-top: 8px; max-height: 100px; overflow-y: auto;">{{ pythonError }}</p>
      </div>
      <img v-else-if="pythonImgBase64" :src="pythonImgBase64" style="max-width: 100%; max-height: 100%; width: 100%; height: 100%; object-fit: contain;" />
      <div v-else class="chart-empty">No hay gráfica para mostrar. Ejecuta el script.</div>
    </div>

    <div v-else-if="config.type === 'grid'" class="data-grid-container">
      <DataGrid :data="gridData" :schema="gridSchema" />
    </div>

    <MapRenderer 
      v-else-if="config.type === 'map'"
      :config="config" 
      :chartData="chartData" 
      @chart-click="handleChartClick" 
    />

    <v-chart 
      v-else-if="echartOptions" 
      class="echart-instance" 
      :option="echartOptions" 
      :theme="uiStore.isDarkMode ? 'business-dark' : 'business-light'" 
      autoresize 
      @click="handleChartClick"
    />
  </div>
</template>

<style scoped>
.chart-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.chart-loading {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(var(--color-bg-surface-rgb, 255, 255, 255), 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: var(--color-text-secondary);
  gap: var(--space-2);
  border-radius: var(--radius-md);
  backdrop-filter: blur(2px);
}

.drill-up-btn {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 5;
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--color-bg-primary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 4px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  transition: all 0.2s ease;
}

.drill-up-btn:hover {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.spin-icon {
  animation: spin 1s linear infinite;
  color: var(--color-accent);
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

.chart-empty {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-4);
  background-color: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
}

.echart-instance {
  width: 100%;
  height: 100%;
  min-height: 150px;
}

.kpi-container {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--space-4);
}

.kpi-label {
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 3rem;
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  line-height: 1.2;
}

.scorecard-target {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.scorecard-diff {
  font-weight: var(--font-bold);
  font-size: var(--text-base);
  margin-top: 4px;
}

.text-success {
  color: var(--color-success, #10b981);
}

.text-danger {
  color: var(--color-danger, #ef4444);
}

.image-container {
  flex-grow: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  padding: var(--space-2);
}

.dashboard-img {
  width: 100%;
  height: 100%;
}

.data-grid-container {
  flex-grow: 1;
  overflow: auto;
  padding: var(--space-2);
}

.simple-data-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.simple-data-grid th {
  text-align: left;
  padding: var(--space-2);
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  font-weight: var(--font-semibold);
  position: sticky;
  top: 0;
  border-bottom: 2px solid var(--color-border);
}

.simple-data-grid td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
}

.simple-data-grid tbody tr:hover {
  background-color: var(--color-bg-secondary);
}
</style>
