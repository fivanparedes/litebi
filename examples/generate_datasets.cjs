const fs = require('fs');
const path = require('path');

// Helper to write CSV
function writeCsv(filename, headers, rows) {
  const filepath = path.join(__dirname, filename);
  const content = [headers.join(',')].concat(rows.map(r => r.join(','))).join('\n');
  fs.writeFileSync(filepath, content, 'utf8');
  console.log(`Generated ${filename} with ${rows.length} rows.`);
}

// 1. Embudo de Conversión (Funnel)
function generateFunnel() {
  const headers = ['etapa', 'visitantes', 'tasa_conversion'];
  const rows = [
    ['Visitas Web', 15000, 1.0],
    ['Registros', 8500, 0.56],
    ['Añadidos al Carrito', 3200, 0.37],
    ['Checkout Iniciado', 1800, 0.56],
    ['Compras Exitosas', 450, 0.25]
  ];
  writeCsv('embudo_conversion.csv', headers, rows);
}

// 2. Cascada Financiera (Waterfall / Treemap / Boxplot)
function generateFinancial() {
  const headers = ['mes', 'categoria', 'subcategoria', 'departamento', 'monto', 'tipo_flujo'];
  const rows = [];
  const depts = ['Ventas', 'Marketing', 'Operaciones', 'IT'];
  
  for (let mes = 1; mes <= 12; mes++) {
    // Ingresos
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Ingresos', 'Venta Directa', 'Ventas', Math.floor(Math.random() * 50000 + 100000), 'Positivo']);
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Ingresos', 'Suscripciones', 'Ventas', Math.floor(Math.random() * 20000 + 50000), 'Positivo']);
    
    // Costos Directos
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Costos', 'Costo de Bienes', 'Operaciones', -Math.floor(Math.random() * 15000 + 30000), 'Negativo']);
    
    // Gastos Operativos
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Gastos', 'Salarios', 'RRHH', -Math.floor(Math.random() * 5000 + 40000), 'Negativo']);
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Gastos', 'Publicidad', 'Marketing', -Math.floor(Math.random() * 8000 + 10000), 'Negativo']);
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Gastos', 'Software', 'IT', -Math.floor(Math.random() * 2000 + 5000), 'Negativo']);
    
    // Impuestos
    rows.push([`2023-${mes.toString().padStart(2, '0')}`, 'Impuestos', 'IVA', 'Finanzas', -Math.floor(Math.random() * 4000 + 8000), 'Negativo']);
  }
  
  writeCsv('cascada_financiera.csv', headers, rows);
}

// 3. Evaluacion Desempeño (Radar / Heatmap)
function generateHR() {
  const headers = ['empleado', 'departamento', 'comunicacion', 'trabajo_equipo', 'conocimiento_tecnico', 'resolucion_problemas', 'liderazgo', 'productividad'];
  const rows = [];
  const depts = ['Ventas', 'Ingenieria', 'Soporte', 'Marketing'];
  
  for (let i = 1; i <= 50; i++) {
    const dept = depts[Math.floor(Math.random() * depts.length)];
    // Ingenieria tiene mejor conocimiento tecnico, ventas mejor comunicacion, etc
    let baseTec = dept === 'Ingenieria' ? 7 : 4;
    let baseCom = dept === 'Ventas' ? 8 : 5;
    
    rows.push([
      `Empleado ${i}`,
      dept,
      Math.min(10, Math.floor(Math.random() * 4 + baseCom)),
      Math.min(10, Math.floor(Math.random() * 5 + 5)),
      Math.min(10, Math.floor(Math.random() * 4 + baseTec)),
      Math.min(10, Math.floor(Math.random() * 5 + 5)),
      Math.min(10, Math.floor(Math.random() * 6 + 3)),
      Math.floor(Math.random() * 40 + 60) // 60 a 100
    ]);
  }
  writeCsv('recursos_humanos.csv', headers, rows);
}

// 4. Geografía Mundial (Map / Map Scatter / Dispersión y Regresión)
function generateGeo() {
  const headers = ['pais', 'codigo_iso', 'continente', 'latitud', 'longitud', 'poblacion_millones', 'pbi_per_capita', 'indice_felicidad'];
  const countries = [
    ['Argentina', 'ARG', 'America', -38.4161, -63.6167, 45, 12000, 6.1],
    ['Brazil', 'BRA', 'America', -14.235, -51.9253, 214, 8500, 6.3],
    ['United States', 'USA', 'America', 37.0902, -95.7129, 331, 65000, 7.0],
    ['Canada', 'CAN', 'America', 56.1304, -106.3468, 38, 52000, 7.2],
    ['Mexico', 'MEX', 'America', 23.6345, -102.5528, 128, 10000, 6.5],
    ['Spain', 'ESP', 'Europe', 40.4637, -3.7492, 47, 30000, 6.4],
    ['France', 'FRA', 'Europe', 46.2276, 2.2137, 67, 40000, 6.7],
    ['Germany', 'DEU', 'Europe', 51.1657, 10.4515, 83, 50000, 7.1],
    ['Italy', 'ITA', 'Europe', 41.8719, 12.5674, 59, 35000, 6.5],
    ['United Kingdom', 'GBR', 'Europe', 55.3781, -3.4360, 67, 45000, 6.8],
    ['China', 'CHN', 'Asia', 35.8617, 104.1954, 1412, 12000, 5.8],
    ['India', 'IND', 'Asia', 20.5937, 78.9629, 1393, 2500, 4.0],
    ['Japan', 'JPN', 'Asia', 36.2048, 138.2529, 125, 40000, 6.0],
    ['Australia', 'AUS', 'Oceania', -25.2744, 133.7751, 25, 55000, 7.1],
    ['South Africa', 'ZAF', 'Africa', -30.5595, 22.9375, 60, 6000, 5.1],
    ['Nigeria', 'NGA', 'Africa', 9.0820, 8.6753, 211, 2000, 4.5],
    ['Egypt', 'EGY', 'Africa', 26.8206, 30.8025, 104, 3500, 4.2],
    ['Russia', 'RUS', 'Europe', 61.5240, 105.3188, 143, 11000, 5.5],
    ['Saudi Arabia', 'SAU', 'Asia', 23.8859, 45.0792, 35, 23000, 6.5],
    ['South Korea', 'KOR', 'Asia', 35.9078, 127.7669, 51, 35000, 5.9]
  ];
  
  writeCsv('geografia_mundial.csv', headers, countries);
}

generateFunnel();
generateFinancial();
generateHR();
generateGeo();

console.log('Todos los datasets generados exitosamente.');
