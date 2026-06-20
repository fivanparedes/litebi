export default () => (baseOption, data, props) => {
  const val = data[0]?.value || 0
  const target = props.config.targetValue || 100
  return {
    ...baseOption,
    series: [
      {
        type: 'gauge',
        progress: { show: true, width: 18 },
        axisLine: { lineStyle: { width: 18 } },
        axisTick: { show: false },
        splitLine: { length: 15, lineStyle: { width: 2, color: '#999' } },
        axisLabel: { distance: 25, color: '#999', fontSize: 14 },
        anchor: { show: true, showAbove: true, size: 25, itemStyle: { borderWidth: 10 } },
        title: { show: false },
        detail: { valueAnimation: true, fontSize: 30, offsetCenter: [0, '70%'] },
        data: [{ value: val, name: props.config.yAxis }],
        max: Math.max(val, target) * 1.2
      }
    ]
  }
}
