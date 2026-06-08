<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { use, registerTheme, registerMap, getMap, registerTransform } from 'echarts/core'
import { Loader } from '@lucide/vue'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart, BoxplotChart, FunnelChart, GaugeChart, HeatmapChart, TreemapChart, RadarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  GeoComponent
} from 'echarts/components'
import { MapChart } from 'echarts/charts'
import VChart from 'vue-echarts'
import { businessTheme } from './themes/businessTheme'
import { businessThemeDark } from './themes/businessThemeDark'
import ecStat from 'echarts-stat'
import DataGrid from '@/modules/cleaning/DataGrid.vue'
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
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TransformComponent,
  VisualMapComponent,
  GeoComponent
])

// Register custom themes
registerTheme('business-light', businessTheme)
registerTheme('business-dark', businessThemeDark)

const props = defineProps({
  config: {
    type: Object,
    required: true,
  }
})

const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

const chartData = ref([])
const kpiValue = ref(0)
const isLoading = ref(false)

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
  // Permitir que el hilo de UI se libere antes de cálculos pesados
  await new Promise(resolve => setTimeout(resolve, 0))

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
    
    let globalWhere = ''
    const requiredTables = [dsName, extractTable(rawY)]
    
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

    try {
      const ySafe = parseCol(rawY)
      const uniqueRequiredTables = [...new Set(requiredTables)]
      const fromClause = dataStore.buildJoinQuery(dsName, uniqueRequiredTables)

      if (props.config.type === 'scorecard' && rawY2) {
        const y2Safe = parseCol(rawY2)
        const q = `SELECT ${agg}(${ySafe}) as [total], ${agg}(${y2Safe}) as [target] FROM ${fromClause} WHERE 1=1 ${globalWhere}`
        const res = await sqlClient.query(q)
        kpiValue.value = {
          total: res[0]?.total || 0,
          target: res[0]?.target || 0
        }
      } else {
        const q = `SELECT ${agg}(${ySafe}) as [total] FROM ${fromClause} WHERE ${ySafe} IS NOT NULL${globalWhere}`
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
  if (!props.config.dataset || !currentXAxis.value || !props.config.yAxis) {
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

  const uniqueRequiredTables = [...new Set(requiredTables)]

  try {
    const xSafe = parseCol(rawX)
    const ySafe = parseCol(rawY)
    
    const fromClause = dataStore.buildJoinQuery(dsName, uniqueRequiredTables)
    
    if ((props.config.type === 'map' && props.config.mapMode === 'scatter') || props.config.type === 'scatter' || props.config.type === 'boxplot') {
      const isMapScatter = props.config.type === 'map'
      const selectY2 = (isMapScatter && rawY2) ? `, ${agg}(${parseCol(rawY2)}) as [value2]` : ''
      const groupByMap = (isMapScatter && rawY2) ? `GROUP BY ${xSafe}, ${ySafe}` : ''
      
      const q = isMapScatter && rawY2 
        ? `SELECT TOP 2000 ${xSafe} as [name], ${ySafe} as [value] ${selectY2} FROM ${fromClause} WHERE ${xSafe} IS NOT NULL AND ${ySafe} IS NOT NULL${globalWhere} ${groupByMap}`
        : `SELECT TOP 2000 ${xSafe} as [name], ${ySafe} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL AND ${ySafe} IS NOT NULL${globalWhere}`
        
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if (props.config.type === 'heatmap' && rawY2) {
      const ySafe2 = parseCol(rawY2)
      const q = `SELECT ${xSafe} as [name], ${ySafe2} as [name2], ${agg}(${ySafe}) as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL AND ${ySafe2} IS NOT NULL${globalWhere} GROUP BY ${xSafe}, ${ySafe2} LIMIT 1000`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if ((props.config.type === 'combo' || props.config.type === 'line' || props.config.type === 'bar') && rawY2) {
      const ySafe2 = parseCol(rawY2)
      const q = `SELECT ${xSafe} as [name], ${agg}(${ySafe}) as [value], ${agg}(${ySafe2}) as [value2] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ORDER BY [value] DESC LIMIT 100`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }

    if (props.config.type === 'gauge') {
      const q = `SELECT ${agg}(${ySafe}) as [value] FROM ${fromClause} WHERE ${ySafe} IS NOT NULL${globalWhere}`
      chartData.value = await sqlClient.query(q)
      isLoading.value = false
      return
    }
    
    const q = `SELECT ${xSafe} as [name], ${agg}(${ySafe}) as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ORDER BY [value] DESC LIMIT 100`
    chartData.value = await sqlClient.query(q)
  } catch (e) {
    console.error("Error generating chart data:", e)
    chartData.value = []
  }
  isLoading.value = false
}

// Watch global filters and config to recalculate data
let filterTimeout
watch(() => [props.config, dashboardStore.globalFilters, dataStore.dataVersion], () => {
  clearTimeout(filterTimeout)
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
})

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
    return {
      ...baseOption,
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxisData },
      yAxis: [{ type: 'value', name: props.config.yAxis }, { type: 'value', name: props.config.secondaryYAxis }],
      series: [
        { name: props.config.yAxis, type: 'bar', data: seriesData, large: true, largeThreshold: 500 },
        { name: props.config.secondaryYAxis, type: 'line', yAxisIndex: 1, data: data2, large: true, largeThreshold: 500 }
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
  map: (baseOption, data, props, xAxisData, seriesData) => {
    if (props.config.mapMode === 'scatter') {
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
          map: 'world',
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
          map: 'world',
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
  
  const defaultSeries = [
    {
      name: props.config.yAxisLabel || props.config.yAxis,
      type: ctype,
      data: seriesData,
      areaStyle: (ctype === 'line' && (props.config.styles?.areaType === 'axis' || props.config.styles?.areaType === 'between')) ? { opacity: 0.2 } : undefined,
      stack: (ctype === 'line' && props.config.styles?.areaType === 'between') ? 'Total' : undefined,
      large: true,
      largeThreshold: 500,
      itemStyle: props.config.styles?.borderRadius ? { borderRadius: props.config.styles.borderRadius } : undefined
    }
  ]

  if ((ctype === 'line' || ctype === 'bar') && props.config.secondaryYAxis && data[0] && 'value2' in data[0]) {
    const data2 = data.map(d => d.value2)
    defaultSeries.push({
      name: props.config.secondaryYAxisLabel || props.config.secondaryYAxis,
      type: ctype,
      data: data2,
      areaStyle: (ctype === 'line' && (props.config.styles?.areaType === 'axis' || props.config.styles?.areaType === 'between')) ? { opacity: 0.2 } : undefined,
      stack: (ctype === 'line' && props.config.styles?.areaType === 'between') ? 'Total' : undefined,
      large: true,
    })
  }

  const baseResult = {
    ...baseOption,
    xAxis: isHorizontal ? { type: 'value', show: showXAxis } : { type: 'category', data: xAxisData, show: showXAxis, axisLabel: { interval: 'auto', rotate: 30 } },
    yAxis: isHorizontal ? { type: 'category', data: xAxisData, show: showYAxis, axisLabel: { interval: 'auto', width: 100, overflow: 'truncate' } } : { type: 'value', show: showYAxis },
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

  if (chartStrategies[ctype]) {
    return chartStrategies[ctype](baseOption, data, props, xAxisData, seriesData)
  }

  return getDefaultStrategy(baseOption, data, props, xAxisData, seriesData, ctype)
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
</script>

<template>
  <div class="chart-wrapper">
    <div v-if="isLoading" class="chart-loading">
      <Loader class="spin-icon" size="32" />
      <span>Cargando...</span>
    </div>
    
    <!-- Drill Up Button -->
    <button v-if="drillLevel > 0 && !isLoading" class="drill-up-btn" @click="handleDrillUp" title="Subir nivel">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-corner-left-up"><polyline points="14 9 9 4 4 9"/><path d="M20 20h-7a4 4 0 0 1-4-4V4"/></svg>
      Subir Nivel
    </button>
    <div v-else-if="!config.dataset || !config.xAxis || (!config.yAxis && config.type !== 'image')" class="chart-empty">
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

    <v-chart
      v-else-if="echartOptions"
      class="echart-instance"
      :option="echartOptions"
      autoresize
    />

    <div v-else-if="config.type === 'grid'" class="data-grid-container">
      <DataGrid :data="gridData" :schema="gridSchema" />
    </div>
    
    <v-chart 
      v-else 
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
