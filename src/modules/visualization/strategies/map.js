export default (context) => (baseOption, data, props, xAxisData, seriesData) => {
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
}
