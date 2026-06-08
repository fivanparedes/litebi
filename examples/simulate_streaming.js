/**
 * simulate_streaming.js
 * 
 * Este script es un ejemplo de cómo puedes simular y probar la ingesta 
 * de datos en tiempo real (streaming) en LiteBI.
 * 
 * INSTRUCCIONES DE USO (Vía Consola del Navegador):
 * 1. Abre tu Dashboard en LiteBI.
 * 2. Asegúrate de tener un dataset importado (Ej. llamado "Ventas").
 * 3. En el código fuente de tu aplicación (ej. en `main.js` o `App.vue`), 
 *    expón la tienda de datos a la ventana global para poder probarlo:
 *    
 *    import { useDataStore } from '@/stores/dataStore'
 *    window.dataStore = useDataStore()
 * 
 * 4. Abre la consola de desarrollo (F12) y pega el siguiente código:
 */

function startStreamingSimulation(datasetName) {
  if (!window.dataStore) {
    console.error("dataStore no está expuesto en window. Ejecuta 'window.dataStore = useDataStore()' en tu app.");
    return;
  }

  console.log(`Iniciando simulación de streaming para el dataset: ${datasetName}`);
  console.log("Se inyectará 1 fila nueva cada 2 segundos. Pausa tus gráficos para ver el efecto de los controles.");

  let counter = 0;
  
  // Crea un intervalo que inyecta datos cada 2 segundos
  const intervalId = setInterval(async () => {
    counter++;
    
    // Generamos datos ficticios (Ajusta los nombres de columnas a tu dataset real)
    const newDataRow = {
      // Usamos la fecha y hora actual para simular datos en tiempo real
      Fecha: new Date().toISOString().split('T')[0],
      // Simulamos ventas o valores numéricos aleatorios
      Valor: Math.floor(Math.random() * 1000) + 100,
      Categoria: `Streaming ${counter}`,
      // Puedes añadir más campos según tu esquema
    };

    // Usamos la nueva API appendData
    const success = await window.dataStore.appendData(datasetName, newDataRow);
    
    if (success) {
      console.log(`[Simulador] Fila #${counter} inyectada:`, newDataRow);
    } else {
      console.warn("[Simulador] Falló la inyección. Verifica el nombre del dataset.");
      clearInterval(intervalId); // Detiene si hay error
    }
    
  }, 2000);

  // Retorna una función para detener el streaming
  return function stopStreaming() {
    clearInterval(intervalId);
    console.log("Simulación de streaming detenida.");
  };
}

// EJECUCIÓN (Ejemplo)
// const stop = startStreamingSimulation("Mi_Dataset");
// Para detener: stop();
