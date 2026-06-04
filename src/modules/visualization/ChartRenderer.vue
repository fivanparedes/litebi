<script setup>
import { computed } from 'vue'
import alasql from 'alasql'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { use, registerTheme } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart, LineChart, PieChart, ScatterChart, BoxplotChart, FunnelChart, GaugeChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
} from 'echarts/components'
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
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent
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

const chartData = computed(() => {
  if (props.config.type === 'kpi') return [] // KPI no usa chartData
  if (!props.config.dataset || !props.config.xAxis || !props.config.yAxis) return []
  
  const dsName = props.config.dataset
  const rawX = props.config.xAxis
  const rawY = props.config.yAxis
  const rawY2 = props.config.secondaryYAxis
  const agg = props.config.aggregation || 'SUM'
  
  const parseCol = (colStr) => {
    if (colStr.includes('].[')) return colStr
    return `[${dsName}].[${colStr}]`
  }
  
  const extractTable = (colStr) => {
    if (!colStr) return dsName
    if (colStr.includes('].[')) {
      return colStr.split('].[')[0].replace('[', '')
    }
    return dsName
  }

  // Inject global filters
  const dashboardStore = useDashboardStore()
  let globalWhere = ''
  const requiredTables = [dsName, extractTable(rawX), extractTable(rawY)]
  if (rawY2) requiredTables.push(extractTable(rawY2))
  
  dashboardStore.globalFilters.forEach(f => {
    // Escape single quotes for SQL safety
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

  // Dedup tables
  const uniqueRequiredTables = [...new Set(requiredTables)]

  // Need to execute AlaSQL to group the data
  try {
    const xSafe = parseCol(rawX)
    const ySafe = parseCol(rawY)
    
    const fromClause = dataStore.buildJoinQuery(dsName, uniqueRequiredTables)
    
    if (props.config.type === 'scatter' || props.config.type === 'boxplot') {
      const q = `SELECT TOP 2000 ${xSafe} as [name], ${ySafe} as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL AND ${ySafe} IS NOT NULL${globalWhere}`
      return alasql(q)
    }

    if (props.config.type === 'combo' && rawY2) {
      const ySafe2 = parseCol(rawY2)
      const q = `SELECT ${xSafe} as [name], ${agg}(${ySafe}) as [value], ${agg}(${ySafe2}) as [value2] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ORDER BY [value] DESC LIMIT 100`
      return alasql(q)
    }

    if (props.config.type === 'gauge') {
      const q = `SELECT ${agg}(${ySafe}) as [value] FROM ${fromClause} WHERE ${ySafe} IS NOT NULL${globalWhere}`
      return alasql(q)
    }
    
    // Grouping query for normal charts
    const q = `SELECT ${xSafe} as [name], ${agg}(${ySafe}) as [value] FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ORDER BY [value] DESC LIMIT 100`
    return alasql(q)
  } catch (e) {
    console.error("Error generating chart data:", e)
    return []
  }
})

const kpiValue = computed(() => {
  if (props.config.type !== 'kpi' || !props.config.yAxis || !props.config.dataset) return 0
  
  // KPI aggregates all rows into a single number
  const rawY = props.config.yAxis
  const agg = props.config.aggregation || 'SUM'
  const dsName = props.config.dataset

  const parseCol = (colStr) => {
    if (colStr.includes('].[')) return colStr
    return `[${dsName}].[${colStr}]`
  }
  
  const extractTable = (colStr) => {
    if (colStr.includes('].[')) {
      return colStr.split('].[')[0].replace('[', '')
    }
    return dsName
  }
  
  const dashboardStore = useDashboardStore()
  let globalWhere = ''
  const requiredTables = [dsName, extractTable(rawY)]
  
  dashboardStore.globalFilters.forEach(f => {
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
    const res = alasql(q)
    return res[0]?.total || 0
  } catch (e) {
    return 0
  }
})

const formattedKpi = computed(() => {
  const val = kpiValue.value
  if (typeof val !== 'number') return val
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(val)
})

const echartOptions = computed(() => {
  const ctype = props.config.type || 'bar'
  if (ctype === 'kpi' || chartData.value.length === 0) return null
  
  const data = chartData.value
  const xAxisData = data.map(d => d.name)
  const seriesData = data.map(d => d.value)
  
  const baseOption = {
    color: settingsStore.currentChartColors,
    title: {
      text: props.config.title || '',
      left: 'left',
      padding: [0, 0, 16, 0]
    },
    tooltip: { trigger: ctype === 'pie' ? 'item' : 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
  }

  if (ctype === 'pie') {
    return {
      ...baseOption,
      legend: { orient: 'vertical', right: 0, top: 'center' },
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
    }
  }

  if (ctype === 'scatter') {
    return {
      ...baseOption,
      tooltip: { trigger: 'item' },
      xAxis: { name: props.config.xAxis, type: 'value', scale: true },
      yAxis: { name: props.config.yAxis, type: 'value', scale: true },
      series: [{
        symbolSize: 10,
        data: data.map(d => [d.name, d.value]),
        type: 'scatter'
      }]
    }
  }

  if (ctype === 'combo') {
    const data2 = data.map(d => d.value2)
    return {
      ...baseOption,
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: xAxisData },
      yAxis: [{ type: 'value', name: props.config.yAxis }, { type: 'value', name: props.config.secondaryYAxis }],
      series: [
        { name: props.config.yAxis, type: 'bar', data: seriesData },
        { name: props.config.secondaryYAxis, type: 'line', yAxisIndex: 1, data: data2 }
      ]
    }
  }

  if (ctype === 'funnel') {
    return {
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
    }
  }

  if (ctype === 'gauge') {
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
  }

  if (ctype === 'boxplot') {
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
  }

  if (ctype === 'grid') return null // Grid no usa echarts

  const isHorizontal = props.config.orientation === 'horizontal'
  
  return {
    ...baseOption,
    xAxis: isHorizontal ? { type: 'value' } : { type: 'category', data: xAxisData, axisLabel: { interval: 'auto', rotate: 30 } },
    yAxis: isHorizontal ? { type: 'category', data: xAxisData, axisLabel: { interval: 'auto', width: 100, overflow: 'truncate' } } : { type: 'value' },
    series: [
      {
        name: props.config.yAxis,
        type: ctype,
        data: seriesData,
        areaStyle: ctype === 'line' ? { opacity: 0.1 } : undefined
      }
    ]
  }
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
