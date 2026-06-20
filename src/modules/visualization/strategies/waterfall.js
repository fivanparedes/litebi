import { formatAxisNumber } from '../ChartStrategies'

export default () => (baseOption, data, props, xAxisData) => {
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
    xAxis: { 
      type: 'category', 
      splitLine: { show: props.config.styles?.gridlines !== false }, 
      data: xAxisData 
    },
    yAxis: { 
      type: 'value',
      axisLabel: { formatter: (value) => formatAxisNumber(value, props.config.styles) },
      splitLine: { show: props.config.styles?.gridlines !== false }
    },
    series: [
      { name: 'Placeholder', type: 'bar', stack: 'Total', itemStyle: { borderColor: 'transparent', color: 'transparent' }, emphasis: { itemStyle: { borderColor: 'transparent', color: 'transparent' } }, data: helpData },
      { name: props.config.yAxis, type: 'bar', stack: 'Total', label: { show: true, position: 'top' }, data: barData }
    ]
  }
}
