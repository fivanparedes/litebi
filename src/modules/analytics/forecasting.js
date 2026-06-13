import { pythonClient } from '@/modules/python/PythonClient'

/**
 * Genera el dataset predictivo combinando los datos originales y la predicción futura.
 * Ahora utiliza Pyodide (WebAssembly) para correr Machine Learning (Regresión Lineal con Numpy)
 * en un hilo secundario sin bloquear la UI.
 */
export const generateForecastDataset = async (originalData, xAxisData, periodsToForecast = 3) => {
  const values = new Float64Array(originalData.map(d => Number(d.value)))
  
  const pythonCode = `
import numpy as np

def forecast(series, periods):
    n = len(series)
    if n < 2:
        return [series[0]] * periods
    x = np.arange(n)
    y = np.asarray(series)
    
    # ML: Regresión polinomial de grado 1 (Línea de tendencia)
    coeffs = np.polyfit(x, y, 1)
    poly = np.poly1d(coeffs)
    
    # Pronóstico futuro
    x_future = np.arange(n, n + periods)
    return poly(x_future).tolist()

forecast(input_data, ${periodsToForecast})
`

  let forecastValues
  try {
    // Llamada asíncrona al Worker de WebAssembly (Python)
    forecastValues = await pythonClient.runPython(pythonCode, values)
  } catch (err) {
    console.error('Python ML Forecasting Failed, fallback to flatline:', err)
    forecastValues = Array(periodsToForecast).fill(values[values.length - 1] || 0)
  }

  const extendedXAxis = [...xAxisData]
  
  // Generar falsos nombres en el eje X para el futuro
  const lastX = xAxisData[xAxisData.length - 1]
  const isDate = !isNaN(Date.parse(lastX))

  for (let i = 1; i <= periodsToForecast; i++) {
    if (isDate) {
      const date = new Date(lastX)
      date.setDate(date.getDate() + i)
      extendedXAxis.push(date.toISOString().split('T')[0])
    } else {
      extendedXAxis.push(`F+${i}`)
    }
  }

  // Alinear datos
  const baseSeries = [...values, ...Array(periodsToForecast).fill(null)]
  
  const predictionSeries = Array(values.length - 1).fill(null)
  predictionSeries.push(values[values.length - 1]) // Conecta con el último punto real
  predictionSeries.push(...forecastValues)

  return { extendedXAxis, baseSeries, predictionSeries }
}
