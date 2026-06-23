import * as echarts from 'echarts'
import { useSettingsStore } from '@/stores/settingsStore'

import pieStrategy from './strategies/pie'
import scatterStrategy from './strategies/scatter'
import comboStrategy from './strategies/combo'
import funnelStrategy from './strategies/funnel'
import gaugeStrategy from './strategies/gauge'
import boxplotStrategy from './strategies/boxplot'
import heatmapStrategy from './strategies/heatmap'
import treemapStrategy from './strategies/treemap'
import radarStrategy from './strategies/radar'
import calendarStrategy from './strategies/calendar'
import wordcloudStrategy from './strategies/wordcloud'
import mapStrategy from './strategies/map'
import waterfallStrategy from './strategies/waterfall'
import gridStrategy from './strategies/grid'

export const formatAxisNumber = (value, styles) => {
  if (typeof value !== 'number') return value;
  const decimals = styles?.decimals !== undefined ? Number(styles.decimals) : 0;
  const useGrouping = styles?.thousandsSep !== false;
  let formatted = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: useGrouping
  }).format(value);
  if (styles?.numberFormat === 'currency') return `$${formatted}`;
  if (styles?.numberFormat === 'percent') return `${formatted}%`;
  return formatted;
}

export const getChartStrategies = (context) => ({
  pie: pieStrategy(context),
  scatter: scatterStrategy(context),
  combo: comboStrategy(context),
  funnel: funnelStrategy(context),
  gauge: gaugeStrategy(context),
  boxplot: boxplotStrategy(context),
  heatmap: heatmapStrategy(context),
  treemap: treemapStrategy(context),
  radar: radarStrategy(context),
  calendar: calendarStrategy(context),
  wordcloud: wordcloudStrategy(context),
  map: mapStrategy(context),
  waterfall: waterfallStrategy(context),
  grid: gridStrategy(context)
});

export const getDefaultStrategy = (baseOption, data, props, xAxisData, seriesData, ctype, context) => {
  const isHorizontal = props.config.orientation === 'horizontal'
  
  const showXAxis = props.config.styles?.showAxisLabels !== false
  const showYAxis = props.config.styles?.showAxisLabels !== false
  const isStacked = props.config.styles?.stacked
  
  const yAxes = Array.isArray(props.config.yAxis) ? props.config.yAxis.filter(Boolean) : (props.config.yAxis ? [props.config.yAxis] : [])
  let defaultSeries = []
  
  const evaluateRules = (val) => {
    if (!props.config.advanced?.conditionalRules || props.config.advanced.conditionalRules.length === 0) return null;
    const v = Number(val);
    if (isNaN(v)) return null;
    for (const r of props.config.advanced.conditionalRules) {
      if (!r.value || !r.color) continue;
      const rv = Number(r.value);
      if (isNaN(rv)) continue;
      if (r.operator === '=' && v === rv) return r.color;
      if (r.operator === '!=' && v !== rv) return r.color;
      if (r.operator === '>' && v > rv) return r.color;
      if (r.operator === '>=' && v >= rv) return r.color;
      if (r.operator === '<' && v < rv) return r.color;
      if (r.operator === '<=' && v <= rv) return r.color;
    }
    return null;
  }

  const hasCategory = data.length > 0 && 'category' in data[0]

  if (hasCategory) {
    const categories = [...new Set(data.map(d => d.category))]
    yAxes.forEach((yCol, idx) => {
      const valKey = idx === 0 ? 'value' : `value_${idx}`
      categories.forEach(cat => {
        const seriesName = categories.length > 1 || yAxes.length === 1 ? cat : `${yCol} - ${cat}`
        const dataForSeries = xAxisData.map(xVal => {
          const row = data.find(d => String(d.name) === String(xVal) && String(d.category) === String(cat))
          if (!row) return null
          const rawVal = row[valKey]
          const val = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null
          const color = evaluateRules(val)
          return color ? { value: val, itemStyle: { color } } : val
        })
        
        defaultSeries.push({
          name: seriesName,
          type: ctype,
          data: dataForSeries,
          label: { show: props.config.styles?.dataLabels === true, position: 'top' },
          areaStyle: (ctype === 'line' && (props.config.styles?.areaType === 'axis' || props.config.styles?.areaType === 'between')) ? { opacity: 0.2 } : undefined,
          stack: isStacked || (ctype === 'line' && props.config.styles?.areaType === 'between') ? (isStacked ? yCol : 'Total') : undefined,
          large: true,
          largeThreshold: 500,
          itemStyle: props.config.styles?.borderRadius ? { borderRadius: props.config.styles.borderRadius } : undefined
        })
      })
    })
  } else {
    defaultSeries = yAxes.map((yCol, idx) => {
      const valKey = idx === 0 ? 'value' : `value_${idx}`
      const seriesName = (Array.isArray(props.config.yAxisLabel) ? props.config.yAxisLabel[idx] : props.config.yAxisLabel) || yCol
      const dataForSeries = data.map(d => {
        const rawVal = d[valKey]
        const val = rawVal !== null && rawVal !== undefined ? Number(rawVal) : null
        const color = evaluateRules(val)
        return color ? { value: val, itemStyle: { color } } : val
      })
      
      return {
        name: seriesName,
        type: ctype,
        data: dataForSeries,
        label: { show: props.config.styles?.dataLabels === true, position: 'top' },
        areaStyle: (ctype === 'line' && (props.config.styles?.areaType === 'axis' || props.config.styles?.areaType === 'between')) ? { opacity: 0.2 } : undefined,
        stack: isStacked || (ctype === 'line' && props.config.styles?.areaType === 'between') ? 'Total' : undefined,
        large: true,
        largeThreshold: 500,
        itemStyle: props.config.styles?.borderRadius ? { borderRadius: props.config.styles.borderRadius } : undefined
      }
    })
  }

  let finalXAxisData = xAxisData

  if ((ctype === 'line' || ctype === 'bar') && props.config.ml?.forecasting && context.forecastData) {
    const forecast = context.forecastData
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
    xAxis: isHorizontal ? { 
      type: 'value', 
      show: showXAxis,
      axisLabel: { formatter: (value) => formatAxisNumber(value, props.config.styles) },
      splitLine: { show: props.config.styles?.gridlines !== false }
    } : { 
      type: 'category', 
      data: finalXAxisData, 
      show: showXAxis, 
      axisLabel: { 
        interval: 'auto', 
        rotate: 30,
        formatter: (value) => {
          if (!isNaN(value) && Number(value) > 1000000000000 && String(value).length >= 13) {
            const d = new Date(Number(value))
            if (!isNaN(d.getTime())) return d.toLocaleDateString()
          }
          return value
        }
      },
      splitLine: { show: props.config.styles?.gridlines !== false }
    },
    yAxis: isHorizontal ? { 
      type: 'category', 
      data: finalXAxisData, 
      show: showYAxis, 
      axisLabel: { 
        interval: 'auto', 
        width: 100, 
        overflow: 'truncate',
        formatter: (value) => {
          if (!isNaN(value) && Number(value) > 1000000000000 && String(value).length >= 13) {
            const d = new Date(Number(value))
            if (!isNaN(d.getTime())) return d.toLocaleDateString()
          }
          return value
        }
      },
      splitLine: { show: props.config.styles?.gridlines !== false }
    } : { 
      type: 'value', 
      show: showYAxis,
      axisLabel: { formatter: (value) => formatAxisNumber(value, props.config.styles) },
      splitLine: { show: props.config.styles?.gridlines !== false }
    },
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
