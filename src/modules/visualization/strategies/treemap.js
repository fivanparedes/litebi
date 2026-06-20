export default () => (baseOption, data) => ({
  ...baseOption,
  series: [{
    type: 'treemap',
    data: data.map(d => ({ name: d.name, value: d.value })),
    roam: false,
    label: { show: true, formatter: '{b}\n{c}' }
  }]
})
