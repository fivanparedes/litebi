<script setup>
import { getChartStrategies, getDefaultStrategy } from './ChartStrategies'
import { computed, ref, shallowRef, watch, onMounted, markRaw } from 'vue'
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

const getSafeOperator = (op) => {
  const allowed = ['=', '!=', '<', '<=', '>', '>=', 'LIKE', 'ILIKE', 'BETWEEN', 'IN', 'NOT IN', 'IS NULL', 'IS NOT NULL']
  const clean = String(op || '=').trim().toUpperCase()
  return allowed.includes(clean) ? clean : '='
}

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

const forecastData = ref(null)

watch([() => chartData.value, () => props.config.ml?.forecasting, () => props.config.ml?.forecastPeriods], async ([data, isForecasting, periods]) => {
  if (isForecasting && data && data.length > 0) {
    const xAxisData = data.map(d => d.name)
    try {
      const result = await generateForecastDataset(data, xAxisData, periods || 3)
      forecastData.value = markRaw(result)
    } catch (e) {
      console.error("Forecasting failed:", e)
      forecastData.value = null
    }
  } else {
    forecastData.value = null
  }
}, { deep: true })

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
    const rawY = Array.isArray(props.config.yAxis) ? props.config.yAxis[0] : props.config.yAxis
    const rawY2 = Array.isArray(props.config.secondaryYAxis) ? props.config.secondaryYAxis[0] : props.config.secondaryYAxis
    const agg = props.config.aggregation || 'SUM'

    const parseCol = (colStr, fallbackTable = dsName) => {
      if (typeof colStr !== 'string') return colStr;
      if (colStr.includes('"."')) return colStr;
      if (colStr.startsWith('[') && colStr.includes('].[')) {
        const parts = colStr.split('].[');
        return `"${parts[0].replace('[', '')}"."${parts[1].replace(']', '')}"`;
      }
      if (colStr.startsWith('[') && colStr.endsWith(']')) {
        return `"${fallbackTable}"."${colStr.slice(1, -1)}"`;
      }
      return `"${fallbackTable}"."${colStr}"`;
    }
    const extractTable = (colStr) => {
      if (!colStr || typeof colStr !== 'string') return dsName;
      if (colStr.includes('"."')) return colStr.split('"."')[0].replace('"', '');
      if (colStr.startsWith('[') && colStr.includes('].[')) return colStr.split('].[')[0].replace('[', '');
      return dsName;
    }
    
    const resolveY = (yConfig, defaultAgg) => {
      if (yConfig?.startsWith('__METRIC__')) {
        const metricId = yConfig.split('__METRIC__')[1]
        const metrics = formulaStore.getCorporateMetricsForDataset(dsName)
        const metric = metrics.find(m => m.id === metricId)
        if (metric) {
          const compiledExpr = metric.expression.replace(/\[([^\]]+)\]\.\[([^\]]+)\]/g, '"$1"."$2"').replace(/\[([^\]]+)\]/g, '"$1"');
          return `(${compiledExpr})`
        }
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
      const colName = parseCol(f.column, f.dataset)
      requiredTables.push(extractTable(f.column) || f.dataset)
      
      if (f.operator === 'BETWEEN') {
        const safeVal2 = typeof f.value2 === 'string' ? String(f.value2).replace(/'/g, "''") : f.value2
        const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
        const v2 = typeof f.value2 === 'number' ? f.value2 : `'${safeVal2}'`
        globalWhere += ` AND ${colName} BETWEEN ${v1} AND ${v2}`
      } else {
        const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
        globalWhere += ` AND ${colName} ${getSafeOperator(f.operator)} ${v1}`
      }
    })

    // Apply local widget filters
    if (Array.isArray(props.config.filters)) {
      props.config.filters.forEach(f => {
        if (!f.column || !f.operator || f.value === undefined || f.value === '') return
        const safeVal = typeof f.value === 'string' ? String(f.value).replace(/'/g, "''") : f.value
        const colName = parseCol(f.column, dsName)
        requiredTables.push(extractTable(f.column) || dsName)
        
        const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
        if (f.operator.toUpperCase() === 'LIKE') {
          globalWhere += ` AND ${colName} LIKE '%${safeVal}%'`
        } else {
          globalWhere += ` AND ${colName} ${getSafeOperator(f.operator)} ${v1}`
        }
      })
    }

    try {
      const ySafeExp = resolveY(rawY, agg)
      const uniqueRequiredTables = [...new Set(requiredTables)]
      const fromClause = dataStore.buildJoinQuery(dsName, uniqueRequiredTables)

      if (props.config.type === 'scorecard' && rawY2) {
        const y2SafeExp = resolveY(rawY2, agg)
        const q = `SELECT ${ySafeExp} as "total", ${y2SafeExp} as "target" FROM ${fromClause} WHERE 1=1 ${globalWhere}`
        const res = markRaw(await sqlClient.query(q))
        kpiValue.value = {
          total: res[0]?.total || 0,
          target: res[0]?.target || 0
        }
      } else {
        // Find main column for IS NOT NULL check
        const baseColExp = rawY.startsWith('__METRIC__') ? '1' : parseCol(rawY)
        const nullCheck = baseColExp === '1' ? '' : ` AND ${baseColExp} IS NOT NULL`
        const q = `SELECT ${ySafeExp} as "total" FROM ${fromClause} WHERE 1=1${nullCheck}${globalWhere}`
        const res = markRaw(await sqlClient.query(q))
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
  const rawY = Array.isArray(props.config.yAxis) ? props.config.yAxis[0] : props.config.yAxis
  const rawY2 = Array.isArray(props.config.secondaryYAxis) ? props.config.secondaryYAxis[0] : props.config.secondaryYAxis
  const agg = props.config.aggregation || 'SUM'
  
  const parseCol = (colStr, fallbackTable = dsName) => {
    if (typeof colStr !== 'string') return colStr;
    if (colStr.includes('"."')) return colStr;
    if (colStr.startsWith('[') && colStr.includes('].[')) {
      const parts = colStr.split('].[');
      return `"${parts[0].replace('[', '')}"."${parts[1].replace(']', '')}"`;
    }
    if (colStr.startsWith('[') && colStr.endsWith(']')) {
      return `"${fallbackTable}"."${colStr.slice(1, -1)}"`;
    }
    return `"${fallbackTable}"."${colStr}"`;
  }
  const extractTable = (colStr) => {
    if (!colStr || typeof colStr !== 'string') return dsName;
    if (colStr.includes('"."')) return colStr.split('"."')[0].replace('"', '');
    if (colStr.startsWith('[') && colStr.includes('].[')) return colStr.split('].[')[0].replace('[', '');
    return dsName;
  }

  const extractColStr = (colStr) => {
    if (!colStr || typeof colStr !== 'string') return '';
    if (colStr.includes('"."')) return colStr.split('"."')[1].replace('"', '');
    if (colStr.startsWith('[') && colStr.includes('].[')) return colStr.split('].[')[1].replace(']', '');
    if (colStr.startsWith('[') && colStr.endsWith(']')) return colStr.slice(1, -1);
    return colStr;
  }
  
  const resolveY = (yConfig, defaultAgg) => {
    if (yConfig?.startsWith('__METRIC__')) {
      const metricId = yConfig.split('__METRIC__')[1]
      const metrics = formulaStore.getCorporateMetricsForDataset(dsName)
      const metric = metrics.find(m => m.id === metricId)
      if (metric) {
        const compiledExpr = metric.expression.replace(/\[([^\]]+)\]\.\[([^\]]+)\]/g, '"$1"."$2"').replace(/\[([^\]]+)\]/g, '"$1"');
        return `(${compiledExpr})`
      }
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
    const colName = parseCol(f.column, f.dataset)
    requiredTables.push(extractTable(f.column) || f.dataset)
    
    if (f.operator === 'BETWEEN') {
      const safeVal2 = typeof f.value2 === 'string' ? String(f.value2).replace(/'/g, "''") : f.value2
      const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
      const v2 = typeof f.value2 === 'number' ? f.value2 : `'${safeVal2}'`
      globalWhere += ` AND ${colName} BETWEEN ${v1} AND ${v2}`
    } else {
      const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
      globalWhere += ` AND ${colName} ${getSafeOperator(f.operator)} ${v1}`
    }
  })

  // Apply drill-down path filters
  drillPath.value.forEach(dFilter => {
    const safeVal = typeof dFilter.value === 'string' ? String(dFilter.value).replace(/'/g, "''") : dFilter.value
    const colName = parseCol(dFilter.colName, dsName)
    requiredTables.push(extractTable(dFilter.colName) || dsName)
    const v1 = typeof dFilter.value === 'number' ? dFilter.value : `'${safeVal}'`
    globalWhere += ` AND ${colName} = ${v1}`
  })

  // Apply local widget filters
  if (Array.isArray(props.config.filters)) {
    props.config.filters.forEach(f => {
      if (!f.column || !f.operator || f.value === undefined || f.value === '') return
      const safeVal = typeof f.value === 'string' ? String(f.value).replace(/'/g, "''") : f.value
      const colName = parseCol(f.column, dsName)
      requiredTables.push(extractTable(f.column) || dsName)
      
      const v1 = typeof f.value === 'number' ? f.value : `'${safeVal}'`
      if (f.operator.toUpperCase() === 'LIKE') {
        globalWhere += ` AND ${colName} LIKE '%${safeVal}%'`
      } else {
        globalWhere += ` AND ${colName} ${getSafeOperator(f.operator)} ${v1}`
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
        const arrowBuffer = await sqlClient.queryToArrowIPC(q)
        
        if (props.config.pythonCode) {
          const b64 = await pythonClient.runPythonPlot(props.config.pythonCode, null, arrowBuffer, dsName)
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
    
    const dsMeta = dataStore.datasets.get(dsName)
    const xColName = extractColStr(rawX)
    const xColMeta = dsMeta?.schema?.find(c => c.name === xColName)
    const isXDate = xColMeta?.type?.toLowerCase() === 'date' || xColMeta?.type?.toLowerCase() === 'timestamp'
    const xSelect = isXDate ? `CAST(${xSafe} AS VARCHAR)` : xSafe
    
    const y2ColName = rawY2 ? extractColStr(rawY2) : ''
    const y2ColMeta = dsMeta?.schema?.find(c => c.name === y2ColName)
    const isY2Date = y2ColMeta?.type?.toLowerCase() === 'date' || y2ColMeta?.type?.toLowerCase() === 'timestamp'
    const y2Select = rawY2 ? (isY2Date ? `CAST(${resolveY(rawY2, agg)} AS VARCHAR)` : resolveY(rawY2, agg)) : ''
    
    if (props.config.type === 'boxplot') {
      const q = `SELECT ${xSelect} as "name", min(${ySafeExp}) as min_val, quantile_cont(${ySafeExp}, 0.25) as q1, quantile_cont(${ySafeExp}, 0.5) as median, quantile_cont(${ySafeExp}, 0.75) as q3, max(${ySafeExp}) as max_val FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere} GROUP BY ${xSafe} LIMIT 100`
      chartData.value = markRaw(await sqlClient.query(q))
      isLoading.value = false
      return
    }

    if ((props.config.type === 'map' && props.config.mapMode === 'scatter') || props.config.type === 'scatter') {
      const isMapScatter = props.config.type === 'map'
      const selectY2 = (isMapScatter && rawY2) ? `, ${y2Select} as "value2"` : ''
      const groupByMap = (isMapScatter && rawY2) ? `GROUP BY ${xSafe}, ${ySafeExp}` : ''
      
      const q = isMapScatter && rawY2 
        ? `SELECT ${xSelect} as "name", ${ySafeExp} as "value" ${selectY2} FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere} ${groupByMap} LIMIT 2000`
        : `SELECT ${xSelect} as "name", ${ySafeExp} as "value" FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere} LIMIT 2000`
        
      const rawData = await sqlClient.query(q)
      
      if (props.config.type === 'scatter' && props.config.ml?.regressionType === 'linear') {
        const regQ = `SELECT regr_slope(${ySafeExp}, ${xSafe}) as slope, regr_intercept(${ySafeExp}, ${xSafe}) as intercept, min(${xSafe}) as min_x, max(${xSafe}) as max_x FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere}`
        const regRes = await sqlClient.query(regQ)
        if (regRes && regRes.length > 0 && regRes[0].slope !== null) {
          rawData.regressionLine = [
            [regRes[0].min_x, regRes[0].slope * regRes[0].min_x + regRes[0].intercept],
            [regRes[0].max_x, regRes[0].slope * regRes[0].max_x + regRes[0].intercept]
          ]
          rawData.regressionFormula = `Y = ${regRes[0].slope.toFixed(2)} X + ${regRes[0].intercept.toFixed(2)}`
        }
      }
      
      chartData.value = markRaw(rawData)
      isLoading.value = false
      return
    }

    if (props.config.type === 'heatmap' && rawY2) {
      const ySafe2Exp = resolveY(rawY2, agg)
      const q = `SELECT ${xSelect} as "name", ${y2Select} as "name2", ${ySafeExp} as "value" FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${yNullCheck}${globalWhere} GROUP BY ${xSafe}, ${ySafe2Exp} LIMIT 1000`
      chartData.value = markRaw(await sqlClient.query(q))
      isLoading.value = false
      return
    }

    const getSortAndLimitClause = () => {
      let orderClause = 'ORDER BY "value" DESC'
      if (props.config.sortBy) {
        let sortCol = '"value"'
        const sortByClean = props.config.sortBy
        if (sortByClean === props.config.xAxis || sortByClean === rawX) {
          sortCol = '"name"'
        } else if (sortByClean === props.config.yAxis || sortByClean === rawY) {
          sortCol = '"value"'
        } else if (sortByClean === props.config.secondaryYAxis || sortByClean === rawY2) {
          sortCol = '"value2"'
        }
        
        const dir = String(props.config.sortDir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC'
        orderClause = `ORDER BY ${sortCol} ${dir}`
      }
      
      const limitVal = props.config.topN ? parseInt(props.config.topN, 10) : 100
      const safeLimit = !isNaN(limitVal) && limitVal > 0 ? limitVal : 100
      
      return `${orderClause} LIMIT ${safeLimit}`
    }

    if ((props.config.type === 'combo' || props.config.type === 'line' || props.config.type === 'bar') && rawY2) {
      const q = `SELECT ${xSelect} as "name", ${ySafeExp} as "value", ${y2Select} as "value2" FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ${getSortAndLimitClause()}`
      chartData.value = markRaw(await sqlClient.query(q))
      isLoading.value = false
      return
    }

    if (props.config.type === 'gauge') {
      const q = `SELECT ${ySafeExp} as "value" FROM ${fromClause} WHERE 1=1${yNullCheck}${globalWhere}`
      chartData.value = markRaw(await sqlClient.query(q))
      isLoading.value = false
      return
    }

    if (props.config.type === 'calendar') {
      const q = `SELECT ${xSelect} as "name", ${ySafeExp} as "value" FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} LIMIT 2000`
      chartData.value = markRaw(await sqlClient.query(q))
      isLoading.value = false
      return
    }
    
    const q = `SELECT ${xSelect} as "name", ${ySafeExp} as "value" FROM ${fromClause} WHERE ${xSafe} IS NOT NULL${globalWhere} GROUP BY ${xSafe} ${getSortAndLimitClause()}`
    chartData.value = markRaw(await sqlClient.query(q))
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
const customMapLoaded = ref(0)

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
          let fetchUrl = custom.url
          // Convert github.com/user/repo/blob/master/file to raw.githubusercontent.com/user/repo/master/file
          if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
            fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
          }
          const res = await fetch(fetchUrl)
          const data = await res.json()
          registerMap(mapName, data)
          customMapLoaded.value++
        } catch (e) {
          console.error('Error fetching custom GeoJSON:', e)
        }
      } else {
        customMapLoaded.value++
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

const echartOptions = computed(() => {
  const ctype = props.config.type || 'bar'
  if (ctype === 'kpi' || ctype === 'scorecard' || ctype === 'image' || ctype === 'python' || ctype === 'grid') return null
  
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

  if (chartData.value.length === 0) {
    return {
      ...baseOption,
      title: {
        text: 'Sin datos para los filtros actuales',
        left: 'center',
        top: 'middle',
        textStyle: { color: 'var(--muted-foreground)', fontWeight: 'normal', fontSize: 14 }
      },
      series: []
    }
  }

  const data = chartData.value
  const xAxisData = data.map(d => d.name)
  const seriesData = data.map(d => d.value)

  const resolveMetricName = (yConfig) => {
    const rawVal = Array.isArray(yConfig) ? yConfig[0] : yConfig;
    if (rawVal?.startsWith('__METRIC__')) {
      const metricId = rawVal.split('__METRIC__')[1]
      const metrics = formulaStore.getCorporateMetricsForDataset(props.config.dataset)
      const metric = metrics.find(m => m.id === metricId)
      if (metric) return metric.name
    }
    return rawVal
  }

  const resolvedProps = {
    ...props,
    config: {
      ...props.config,
      yAxis: resolveMetricName(props.config.yAxis),
      secondaryYAxis: resolveMetricName(props.config.secondaryYAxis)
    }
  }

  const context = {
    get customMapLoaded() { return customMapLoaded.value },
    get forecastData() { return forecastData.value },
    getMap
  }
  const strategies = getChartStrategies(context)

  let finalOption;
  if (strategies[ctype]) {
    finalOption = strategies[ctype](baseOption, data, resolvedProps, xAxisData, seriesData)
  } else {
    finalOption = getDefaultStrategy(baseOption, data, resolvedProps, xAxisData, seriesData, ctype, context)
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

  return markRaw(finalOption)
})
const handleChartClick = (params) => {
  if (params.name && currentXAxis.value && props.config.dataset) {
    const dsName = props.config.dataset
    const rawX = currentXAxis.value
    
    if (isDrillable.value) {
      // Drill Down
      drillPath.value.push({ colName: rawX, value: params.name })
      drillLevel.value++
      loadData()
    } else {
      // Cross Filter
      dashboardStore.addFilter(dsName, rawX, params.name, `${rawX}: ${params.name}`)
    }
  }
}

const gridData = computed(() => {
  return chartData.value.map(row => {
    const rawY = Array.isArray(props.config.yAxis) ? props.config.yAxis[0] : props.config.yAxis
    const rawY2 = Array.isArray(props.config.secondaryYAxis) ? props.config.secondaryYAxis[0] : props.config.secondaryYAxis
    const obj = {
      [currentXAxis.value || 'X']: row.name,
      [rawY || 'Y']: typeof row.value === 'number' ? Number(row.value.toFixed(2)) : row.value
    }
    if (rawY2) {
      obj[rawY2] = typeof row.value2 === 'number' ? Number(row.value2.toFixed(2)) : row.value2
    }
    return obj
  })
})

const gridSchema = computed(() => {
  const rawY = Array.isArray(props.config.yAxis) ? props.config.yAxis[0] : props.config.yAxis
  const rawY2 = Array.isArray(props.config.secondaryYAxis) ? props.config.secondaryYAxis[0] : props.config.secondaryYAxis
  const schema = [
    { name: currentXAxis.value || 'X', type: 'string' },
    { name: rawY || 'Y', type: 'number' }
  ]
  if (rawY2) {
    schema.push({ name: rawY2, type: 'number' })
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
    <button v-if="drillLevel > 0 && !isLoading && !datasetMissing" class="drill-up-btn" title="Subir nivel" @click="handleDrillUp">
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
      v-else-if="config.type === 'maplibre'"
      :config="config" 
      :chart-data="chartData" 
      @chart-click="handleChartClick" 
    />

    <v-chart 
      v-else-if="echartOptions" 
      class="echart-instance" 
      :option="echartOptions" 
      :theme="settingsStore.theme === 'dark' ? 'business-dark' : 'business-light'" 
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
  color: var(--muted-foreground);
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
  background-color: var(--card);
  color: var(--foreground);
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
  background-color: var(--muted);
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
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  text-align: center;
  padding: var(--space-4);
  background-color: var(--muted);
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
  color: var(--muted-foreground);
  font-weight: var(--font-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.kpi-value {
  font-size: 3rem;
  font-weight: var(--font-bold);
  color: var(--foreground);
  line-height: 1.2;
}

.scorecard-target {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--muted);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  color: var(--muted-foreground);
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
  background-color: var(--muted);
  color: var(--muted-foreground);
  font-weight: var(--font-semibold);
  position: sticky;
  top: 0;
  border-bottom: 2px solid var(--color-border);
}

.simple-data-grid td {
  padding: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  color: var(--foreground);
}

.simple-data-grid tbody tr:hover {
  background-color: var(--muted);
}
</style>
