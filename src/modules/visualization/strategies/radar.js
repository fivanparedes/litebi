export default () => (baseOption, data, props, xAxisData, seriesData) => {
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
}
