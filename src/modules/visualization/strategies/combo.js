export default () => (baseOption, data, props, xAxisData, seriesData) => {
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
}
