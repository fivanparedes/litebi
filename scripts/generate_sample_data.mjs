import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', 'examples')

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir)
}

// Helper to get a random int between min and max (inclusive)
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Generate Historical Sales (2 years of daily data)
function generateHistoricalSales() {
  const headers = ['Id', 'Fecha', 'Producto', 'Categoria', 'Canal', 'Cantidad', 'PrecioUnitario', 'CostoUnitario']
  const rows = [headers.join(',')]
  
  const products = [
    { name: 'Laptop Pro', category: 'Electrónica', price: 1200, cost: 900 },
    { name: 'Monitor 27"', category: 'Electrónica', price: 300, cost: 200 },
    { name: 'Mouse Inalámbrico', category: 'Accesorios', price: 50, cost: 20 },
    { name: 'Teclado Mecánico', category: 'Accesorios', price: 100, cost: 50 },
    { name: 'Silla Ergonómica', category: 'Mobiliario', price: 250, cost: 150 },
    { name: 'Escritorio', category: 'Mobiliario', price: 400, cost: 250 }
  ]
  const channels = ['Online', 'Tienda Física', 'Mayorista']

  const startDate = new Date(2022, 0, 1)
  const endDate = new Date(2023, 11, 31)
  
  let id = 1
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    // Generate 1 to 5 orders per day
    const ordersToday = randomInt(1, 5)
    
    // Add some seasonality (higher sales in November/December)
    const month = d.getMonth()
    const seasonalityMultiplier = (month === 10 || month === 11) ? 2 : 1
    
    for (let o = 0; o < ordersToday * seasonalityMultiplier; o++) {
      const product = products[randomInt(0, products.length - 1)]
      const channel = channels[randomInt(0, channels.length - 1)]
      const qty = randomInt(1, 4)
      const dateStr = d.toISOString().split('T')[0]
      
      rows.push(`${id},${dateStr},${product.name},${product.category},${channel},${qty},${product.price},${product.cost}`)
      id++
    }
  }
  
  fs.writeFileSync(path.join(outDir, 'ventas_historicas.csv'), rows.join('\n'))
  console.log(`Generated ventas_historicas.csv with ${id - 1} rows.`)
}

// Generate Sales Goals (Monthly)
function generateSalesGoals() {
  const headers = ['Mes', 'Año', 'Categoria', 'MetaVentas', 'PresupuestoMarketing']
  const rows = [headers.join(',')]
  
  const categories = ['Electrónica', 'Accesorios', 'Mobiliario']
  
  for (let year = 2022; year <= 2023; year++) {
    for (let month = 1; month <= 12; month++) {
      categories.forEach(cat => {
        const goal = randomInt(5000, 20000)
        const budget = Math.floor(goal * 0.1)
        rows.push(`${month},${year},${cat},${goal},${budget}`)
      })
    }
  }
  
  fs.writeFileSync(path.join(outDir, 'metas_ventas.csv'), rows.join('\n'))
  console.log('Generated metas_ventas.csv.')
}

generateHistoricalSales()
generateSalesGoals()
