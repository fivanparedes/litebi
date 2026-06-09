const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, 'public', 'sample_data');

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// 1. Productos
const categories = ['Electrónica', 'Hogar', 'Deportes', 'Ropa', 'Alimentos'];
const subCategories = {
  'Electrónica': ['Teléfonos', 'Laptops', 'Audio', 'TV'],
  'Hogar': ['Muebles', 'Decoración', 'Cocina'],
  'Deportes': ['Calzado', 'Equipamiento', 'Ropa Deportiva'],
  'Ropa': ['Camisas', 'Pantalones', 'Accesorios'],
  'Alimentos': ['Bebidas', 'Snacks', 'Congelados']
};

const productos = [];
for (let i = 1; i <= 200; i++) {
  const cat = randomItem(categories);
  const sub = randomItem(subCategories[cat]);
  productos.push({
    ProductoID: `P-${i.toString().padStart(4, '0')}`,
    NombreProducto: `${sub} Modelo ${String.fromCharCode(65 + randomInt(0, 25))}${randomInt(10, 99)}`,
    Categoria: cat,
    SubCategoria: sub,
    CostoBase: (Math.random() * 500 + 10).toFixed(2),
    PrecioUnitario: (Math.random() * 800 + 50).toFixed(2)
  });
}

// 2. Tiendas
const regions = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];
const cities = ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Malaga', 'Murcia', 'Palma', 'Las Palmas', 'Bilbao'];
const tiendas = [];
for (let i = 1; i <= 50; i++) {
  tiendas.push({
    TiendaID: `T-${i.toString().padStart(3, '0')}`,
    Region: randomItem(regions),
    Ciudad: randomItem(cities),
    TipoTienda: randomItem(['Mall', 'Calle Principal', 'Outlet', 'Aeropuerto'])
  });
}

// 3. Ventas (Hechos - 15000 rows)
const ventas = [];
const startDate = new Date('2023-01-01');
const endDate = new Date('2024-12-31');

for (let i = 1; i <= 15000; i++) {
  const p = randomItem(productos);
  const t = randomItem(tiendas);
  const qty = randomInt(1, 15);
  const unitPrice = parseFloat(p.PrecioUnitario);
  const discount = Math.random() > 0.8 ? randomInt(5, 30) : 0; // 20% of sales have discount
  const total = (qty * unitPrice * (1 - discount/100)).toFixed(2);
  
  // Create some artificial anomalies (nulls)
  const isAnomaly = Math.random() > 0.99;
  
  ventas.push({
    TransaccionID: `TRX-${i.toString().padStart(6, '0')}`,
    Fecha: isAnomaly ? '' : randomDate(startDate, endDate).toISOString().split('T')[0],
    ProductoID: p.ProductoID,
    TiendaID: t.TiendaID,
    UnidadesVendidas: qty,
    PrecioUnitarioAplicado: unitPrice,
    DescuentoPorcentaje: isAnomaly ? null : discount,
    PrecioTotal: total
  });
}

// 4. Marketing (Mensual)
const marketing = [];
for (let year = 2023; year <= 2024; year++) {
  for (let month = 1; month <= 12; month++) {
    for (const region of regions) {
      marketing.push({
        Periodo: `${year}-${month.toString().padStart(2, '0')}-01`,
        Region: region,
        Campania: randomItem(['Verano', 'Navidad', 'Black Friday', 'Vuelta a Clases', 'San Valentin']),
        InversionUSD: randomInt(5000, 50000),
        Impresiones: randomInt(100000, 2000000)
      });
    }
  }
}

// Write CSVs
function toCSV(data) {
  if (data.length === 0) return '';
  const header = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).map(val => val === null || val === undefined ? '' : val).join(','));
  return [header, ...rows].join('\n');
}

fs.writeFileSync(path.join(targetDir, 'productos.csv'), toCSV(productos));
fs.writeFileSync(path.join(targetDir, 'tiendas.csv'), toCSV(tiendas));
fs.writeFileSync(path.join(targetDir, 'ventas.csv'), toCSV(ventas));
fs.writeFileSync(path.join(targetDir, 'marketing.csv'), toCSV(marketing));

console.log('Datasets generated successfully in ' + targetDir);
