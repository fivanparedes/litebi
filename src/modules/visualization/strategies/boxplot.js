export default () => (baseOption, data, props) => {
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
}
