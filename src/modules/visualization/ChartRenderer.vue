<script setup>
import { computed, ref, watch, onMounted } from 'vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { sqlClient } from '@/modules/data/SqlWorkerClient'
import { use, registerTheme, registerMap, getMap } from 'echarts/core'
import { Loader } from '@lucide/vue'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart, BoxplotChart, FunnelChart, GaugeChart, HeatmapChart, TreemapChart, RadarChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  VisualMapComponent,
  GeoComponent
} from 'echarts/components'
import { MapChart } from 'echarts/charts'
import VChart from 'vue-echarts'
import { businessTheme } from './themes/businessTheme'

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
  VisualMapComponent,
  GeoComponent
])

// Register custom theme
registerTheme('business', businessTheme)

const props = defineProps({
  config: {
    type: Object,
    required: true,
    // Expected: { title: '', type: 'bar', dataset: 'dataset1', xAxis: 'col1', yAxis: 'col2', aggregation: 'SUM', orientation: 'vertical' }
  }
})

const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const settingsStore = useSettingsStore()

const chartData = ref([])
const kpiValue = ref(0)
const isLoading = ref(false)

const loadData = async () => {
  if (!props.config) return

  isLoading.value = true
  // Permitir que el hilo de UI se libere antes de cálculos pesados
  await new Promise(resolve => setTimeout(resolve, 0))

  if (props.config.type === 'kpi') {
    if (!props.config.yAxis || !props.config.dataset) {
      kpiValue.value = 0
      isLoading.value = false
      return
    }
    
    const rawY = props.config.yAxis
    const agg = props.config.aggregation || 'SUM'
    const dsName = props.config.dataset

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

      const q = `SELECT ${agg}(${ySafe}) as [total] FROM ${fromClause} WHERE ${ySafe} IS NOT NULL${globalWhere}`
      const res = await sqlClient.query(q)
      kpiValue.value = res[0]?.total || 0
    } catch (e) {
      kpiValue.value = 0
    }
    chartData.value = []
    isLoading.value = false
    return
  }

  // Not KPI
  if (!props.config.dataset || !props.config.xAxis || !props.config.yAxis) {
    chartData.value = []
    isLoading.value = false
    return
  }
  
  const dsName = props.config.dataset
  const rawX = props.config.xAxis
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
  const val = kpiValue.value
  if (typeof val !== 'number') return val
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(val)
})

const chartStrategies = {
  pie: (baseOption, data, props) => ({
    ...baseOption,
    legend: props.config.styles?.showLegend === false ? undefined : { orient: 'vertical', right: 0, top: 'center' },
    series: [
      {
        name: props.config.yAxis,
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 10 },
        label: { show: false },
        data: data.map(d => ({ name: d.name, value: d.value }))
      }
    ]
  }),
  scatter: (baseOption, data, props) => ({
    ...baseOption,
    tooltip: { trigger: 'item' },
    xAxis: { name: props.config.xAxis, type: 'value', scale: true },
    yAxis: { name: props.config.yAxis, type: 'value', scale: true },
    series: [{
      symbolSize: 10,
      data: data.map(d => [d.name, d.value]),
      type: 'scatter',
      large: true,
      largeThreshold: 500
    }]
  }),
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
      areaStyle: (ctype === 'line' && props.config.styles?.fillArea) ? { opacity: 0.2 } : undefined,
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
      areaStyle: (ctype === 'line' && props.config.styles?.fillArea) ? { opacity: 0.2 } : undefined,
      large: true,
      largeThreshold: 500
    })
  }

  return {
    ...baseOption,
    xAxis: isHorizontal ? { type: 'value', show: showXAxis } : { type: 'category', data: xAxisData, show: showXAxis, axisLabel: { interval: 'auto', rotate: 30 } },
    yAxis: isHorizontal ? { type: 'category', data: xAxisData, show: showYAxis, axisLabel: { interval: 'auto', width: 100, overflow: 'truncate' } } : { type: 'value', show: showYAxis },
    series: defaultSeries
  }
}

const echartOptions = computed(() => {
  const ctype = props.config.type || 'bar'
  if (ctype === 'kpi' || chartData.value.length === 0) return null
  
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
  if (params.name && props.config.xAxis) {
    const dsName = props.config.dataset
    const rawX = props.config.xAxis
    const colName = rawX.includes('].[') ? rawX : `[${dsName}].[${rawX}]`
    dashboardStore.addFilter(dsName, colName, params.name, `${rawX}: ${params.name}`)
  }
}
</script>

<template>
  <div class="chart-wrapper">
    <div v-if="isLoading" class="chart-loading">
      <Loader class="spin-icon" size="24" />
      <span>Cargando datos...</span>
    </div>

    <div v-if="(!config.xAxis && config.type !== 'kpi' && config.type !== 'gauge') || !config.yAxis" class="chart-empty">
      <p>Configura los ejes del widget para visualizar los datos.</p>
    </div>
    
    <div v-else-if="config.type === 'kpi'" class="kpi-card">
      <h4 class="kpi-title">{{ config.title || config.yAxis }}</h4>
      <div class="kpi-value">{{ formattedKpi }}</div>
      <div class="kpi-subtitle">{{ config.aggregation }}</div>
    </div>

    <div v-else-if="config.type === 'grid'" class="data-grid-container">
      <table class="simple-data-grid">
        <thead>
          <tr>
            <th>{{ config.xAxis }}</th>
            <th>{{ config.yAxis }}</th>
            <th v-if="config.secondaryYAxis">{{ config.secondaryYAxis }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, idx) in chartData" :key="idx">
            <td>{{ row.name }}</td>
            <td>{{ typeof row.value === 'number' ? row.value.toFixed(2) : row.value }}</td>
            <td v-if="config.secondaryYAxis">{{ typeof row.value2 === 'number' ? row.value2.toFixed(2) : row.value2 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <v-chart 
      v-else 
      class="echart-instance" 
      :option="echartOptions" 
      theme="business" 
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

.kpi-card {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: var(--space-4);
}

.kpi-title {
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

.kpi-subtitle {
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  background: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
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
