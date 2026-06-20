export default () => (baseOption, data, props, xAxisData, seriesData) => ({
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
})
