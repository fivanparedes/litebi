export default () => (baseOption, data, props) => {
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
}
