export default () => (baseOption, data, props) => ({
  ...baseOption,
  legend: props.config.styles?.showLegend === false ? undefined : { orient: 'vertical', right: 0, top: 'center' },
  series: [
    {
      name: props.config.yAxis,
      type: 'pie',
      radius: [props.config.styles?.innerRadius ? `${props.config.styles.innerRadius}%` : '40%', '70%'],
      label: { show: props.config.styles?.dataLabels === true },
      avoidLabelOverlap: false,
      itemStyle: { borderRadius: 10 },
      data: data.map(d => ({ name: d.name, value: d.value }))
    }
  ]
})
