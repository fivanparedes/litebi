export default () => (baseOption, data, props) => {
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
}
