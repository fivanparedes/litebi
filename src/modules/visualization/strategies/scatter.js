export default () => (baseOption, data, props) => {
  const rawData = data.map(d => [d.name, d.value, d.cluster !== undefined ? d.cluster : 0])
  const result = {
    ...baseOption,
    tooltip: { trigger: 'item' },
    xAxis: { name: props.config.xAxis, type: 'value', scale: true },
    yAxis: { name: props.config.yAxis, type: 'value', scale: true },
    dataset: [{ source: rawData }],
    series: [{
      symbolSize: 10,
      datasetIndex: 0,
      type: 'scatter',
      large: true,
      largeThreshold: 500
    }]
  }

  if (props.config.ml) {
    if (props.config.ml.regressionType && props.config.ml.regressionType !== 'none' && data.regressionLine) {
      result.series.push({
        name: `Regresión ${props.config.ml.regressionType}`,
        type: 'line',
        data: data.regressionLine,
        symbolSize: 0.1,
        symbol: 'none',
        endLabel: {
          show: true,
          formatter: data.regressionFormula || 'Tendencia',
          fontSize: 14
        },
        lineStyle: {
          type: 'dashed',
          width: 2
        }
      })
    }

    if (props.config.ml.clusterCount && props.config.ml.clusterCount !== 'none' && data.some(d => d.cluster !== undefined)) {
      const k = Number(props.config.ml.clusterCount)
      
      result.series = [] // Override series to color by cluster
      for (let i = 0; i < k; i++) {
        result.dataset.push({
          transform: {
            type: 'filter',
            config: { dimension: 2, '=': i }
          }
        })
        result.series.push({
          type: 'scatter',
          datasetIndex: result.dataset.length - 1,
          symbolSize: 10,
          name: `Cluster ${i + 1}`
        })
      }
    }
  }

  return result
}
