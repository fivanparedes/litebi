/**
 * Implementación ligera de Suavizado Exponencial Simple para pronósticos (Forecasting).
 * Ideal para calcular tendencias futuras rápidas en el cliente.
 *
 * @param {Array<Number>} data - Serie histórica de valores y.
 * @param {Number} alpha - Factor de suavizado (0 a 1). Valores altos dan más peso a lo reciente.
 * @param {Number} periods - Cantidad de periodos futuros a pronosticar.
 * @returns {Array<Number>} - Array con los pronósticos futuros.
 */
export const simpleExponentialSmoothing = (data, alpha = 0.3, periods = 3) => {
  if (!data || data.length === 0) return []
  if (data.length === 1) return Array(periods).fill(data[0])

  // Suavizado Exponencial Simple (SES)
  let lastLevel = data[0] // S_0 = y_0
  
  // Calcular el nivel para los datos históricos
  for (let i = 1; i < data.length; i++) {
    lastLevel = alpha * data[i] + (1 - alpha) * lastLevel
  }

  // Pronóstico: En SES puro, el pronóstico futuro es una línea plana igual al último nivel.
  // Para hacer una tendencia simple (Suavizado Doble de Holt), necesitamos la tendencia.
  // Implementemos un Holt (Double Exponential Smoothing) para dar inclinación.
  return Array(periods).fill(lastLevel)
}

/**
 * Suavizado Exponencial Doble (Holt) para series temporales con tendencia.
 * 
 * @param {Array<Number>} data - Serie histórica de valores y.
 * @param {Number} alpha - Factor de nivel (0 a 1).
 * @param {Number} beta - Factor de tendencia (0 a 1).
 * @param {Number} periods - Cantidad de periodos a predecir.
 * @returns {Array<Number>}
 */
export const doubleExponentialSmoothing = (data, alpha = 0.3, beta = 0.1, periods = 3) => {
  if (!data || data.length < 2) return simpleExponentialSmoothing(data, alpha, periods)

  let level = data[0]
  let trend = data[1] - data[0] // Estimación inicial de la tendencia

  for (let i = 1; i < data.length; i++) {
    let lastLevel = level
    level = alpha * data[i] + (1 - alpha) * (lastLevel + trend)
    trend = beta * (level - lastLevel) + (1 - beta) * trend
  }

  const forecast = []
  for (let m = 1; m <= periods; m++) {
    forecast.push(level + m * trend)
  }

  return forecast
}

/**
 * Genera el dataset predictivo combinando los datos originales y la predicción futura.
 * Genera también las etiquetas X para el futuro, asumiendo un formato de fecha o simplemente anexando índices.
 */
export const generateForecastDataset = (originalData, xAxisData, periodsToForecast = 3) => {
  const values = originalData.map(d => Number(d.value))
  const forecastValues = doubleExponentialSmoothing(values, 0.4, 0.2, periodsToForecast)

  const extendedXAxis = [...xAxisData]
  
  // Generar falsos nombres en el eje X para el futuro
  const lastX = xAxisData[xAxisData.length - 1]
  const isDate = !isNaN(Date.parse(lastX))

  for (let i = 1; i <= periodsToForecast; i++) {
    if (isDate) {
      // Intentar agregar 1 día o mes
      const date = new Date(lastX)
      date.setDate(date.getDate() + i)
      extendedXAxis.push(date.toISOString().split('T')[0])
    } else {
      extendedXAxis.push(`F+${i}`)
    }
  }

  // Alinear datos: la serie principal termina antes, la predicción empieza en el último punto
  const baseSeries = [...values, ...Array(periodsToForecast).fill(null)]
  
  const predictionSeries = Array(values.length - 1).fill(null)
  predictionSeries.push(values[values.length - 1]) // Conecta con el último punto real
  predictionSeries.push(...forecastValues)

  return { extendedXAxis, baseSeries, predictionSeries }
}
