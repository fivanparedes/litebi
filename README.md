# LiteBI

LiteBI es una herramienta ágil y moderna de Business Intelligence (BI) diseñada para funcionar completamente en tu navegador (y en el escritorio mediante Electron). Creada para permitirte conectar, limpiar, modelar y visualizar tus datos de manera intuitiva y sin depender de servidores pesados ni bases de datos complejas.

## Características Principales

*   **100% Client-Side:** Tus datos nunca abandonan tu máquina. Todo el procesamiento se realiza localmente utilizando un motor SQL en memoria de alto rendimiento.
*   **Importación Rápida:** Soporte nativo para importar archivos `.csv` y `.xlsx`.
*   **Preparación de Datos (ETL Ligero):**
    *   Limpieza de nulos (imputación estadística: media, mediana, moda o valor fijo).
    *   Transformación de texto (mayúsculas, minúsculas, recortes espaciales).
    *   Eliminación de duplicados y filtros condicionales.
*   **Editor de Fórmulas y Columnas Calculadas:** Crea nuevas métricas usando un editor avanzado con validación SQL nativa y autocompletado (basado en CodeMirror).
*   **Modelado Visual:** Define relaciones estructuradas (1:1, 1:N) entre múltiples tablas de datos usando una interfaz gráfica Drag & Drop.
*   **Dashboards Interactivos:**
    *   Crea lienzos (canvas) dinámicos y tableros multi-página.
    *   Amplia galería de gráficos renderizados con Apache ECharts (Barras, Líneas, Torta, Dispersión, Embudos, Gauge, Boxplots, Gráficos Combinados).
    *   Filtros interactivos y Segmentadores de datos (Slicers tipo lista y tipo slider continuo).
*   **Exportación Profesional:** Exporta tus cuadros de mando interactivos a PDF, PNG o directamente como presentaciones interactivas `.pptx` de alta calidad.
*   **Proyectos Portables:** Guarda todo tu trabajo (datos, limpieza, modelos y gráficos) en un solo archivo `.litebi` que puedes compartir o continuar editando más tarde.
*   **Colaboración en Tiempo Real (WebRTC):** Únete a una sala y edita el tablero simultáneamente con otros usuarios en red local o por internet (P2P descentralizado sin servidor). Observa los cursores de tus compañeros moviéndose en vivo por la pantalla.

## Tecnologías Utilizadas

*   **Frontend:** Vue 3 (Composition API), Vite, Pinia.
*   **Motor de Datos & SQL:** AlaSQL.
*   **Gráficos & Visualizaciones:** Apache ECharts (`vue-echarts`).
*   **Colaboración P2P:** Yjs, y-webrtc.
*   **Análisis y Procesamiento:** PapaParse (CSV), SheetJS (Excel).
*   **Exportación:** html2canvas, jsPDF, PptxGenJS.
*   **Estilizado y UI:** CSS Variables (Vanilla), Lucide Icons, Gridstack.js.
*   **Empaquetado (Desktop):** Electron.

## Instalación y Ejecución Local

### Prerrequisitos
- Node.js (v18+)
- npm o yarn

### Pasos
1. Clona este repositorio.
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Ejecuta el servidor de desarrollo en tu navegador:
   ```bash
   npm run dev
   ```
4. O ejecuta la versión de escritorio mediante Electron:
   ```bash
   npm run electron:dev
   ```

### Construcción para Producción
Para compilar la aplicación web estática:
```bash
npm run build
```

Para empaquetar la aplicación de escritorio (generando el ejecutable para tu sistema operativo):
```bash
npm run electron:build
```

## Licencia

Este proyecto está licenciado bajo la **Licencia Pública General de GNU v3.0 (GPLv3)**.

LiteBI utiliza diversas librerías de código abierto amparadas bajo licencias permisivas (MIT, Apache 2.0 e ISC) que son 100% compatibles con GPLv3. 

Consulta el archivo `LICENSE` para ver los detalles completos.
