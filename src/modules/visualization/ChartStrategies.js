import { useSettingsStore } from '@/stores/settingsStore'

export const getChartStrategies = (context) => ({

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
      if (props.config.ml.regressionType === 'linear' && data.regressionLine) {
        result.series.push({
          name: 'Regresión Lineal',
          type: 'line',
          data: data.regressionLine,
          symbolSize: 0.1,
          symbol: 'none',
          endLabel: {
            show: true,
            formatter: data.regressionFormula || 'Tendencia',
            fontSize: 14
          },
          lineStyle: {
            type: 'dashed',
            width: 2
          }
        })
      } else if (props.config.ml.regressionType && props.config.ml.regressionType !== 'none') {
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
    const cats = data.map(d => d.name)
    const boxData = data.map(d => [d.min_val, d.q1, d.median, d.q3, d.max_val])
    
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
        color: 'var(--muted-foreground)',
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
    // Depend on reactive trigger
    context.customMapLoaded;
    
    const getMapName = () => {
      if (props.config.mapMode === 'custom' && props.config.customGeoJson) {
        return props.config.customGeoJson.type === 'file' ? props.config.customGeoJson.name : props.config.customGeoJson.url
      }
      return 'world'
    }
    const currentMap = getMapName()
    
    // Si el mapa aún no está registrado (porque se está descargando el GeoJSON), mostramos "Cargando"
    // para evitar que ECharts intente buscar geometrías inexistentes y crashee.
    if (currentMap !== 'world' && !context.getMap(currentMap)) {
      return {
        ...baseOption,
        title: {
          text: 'Cargando geometría del mapa...',
          left: 'center',
          top: 'middle',
          textStyle: { color: 'var(--muted-foreground)', fontWeight: 'normal', fontSize: 14 }
        },
        series: []
      }
    }

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
          nameProperty: (props.config.customGeoJson?.featureKey || 'name').trim(),
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
      const numSeriesData = seriesData.map(v => Number(v))
      let maxVal = Math.max(...numSeriesData, 1)
      let minVal = Math.min(...numSeriesData, 0)
      if (maxVal === minVal) {
        maxVal += 1
        minVal -= 1
      }
      return {
        ...baseOption,
        visualMap: {
          left: 'right',
          min: minVal,
          max: maxVal,
          inRange: { color: ['#f1f5f9', baseOption.color?.[0] || '#3b82f6'] },
          text: [props.config.yAxisLabel || props.config.yAxis || 'High', 'Low'],
          calculable: true
        },
        series: [{
          name: props.config.yAxisLabel || props.config.yAxis,
          type: 'map',
          map: currentMap,
          roam: true,
          nameProperty: (props.config.customGeoJson?.featureKey || 'name').trim(),
          data: data.map(d => ({ name: String(d.name).trim(), value: Number(d.value) }))
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
});

export const getDefaultStrategy = (baseOption, data, props, xAxisData, seriesData, ctype, context) => {
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
