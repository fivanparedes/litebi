# LiteBI — Progress Tracking

> Este archivo rastrea el progreso de implementación de LiteBI para que cualquier LLM pueda continuarla.
> Última actualización: 2026-06-04

## Estado General: 🟢 Todas las etapas completadas — MVP de LiteBI finalizado

---

## Decisiones Confirmadas

| Decisión | Elección | Estado |
|:---|:---|:---|
| Framework | **Vue 3** (Composition API + Vite) | ✅ Confirmado |
| State Management | **Pinia** | ✅ Confirmado |
| Router | **Vue Router 4** | ✅ Confirmado |
| Motor de fórmulas | **SQL** vía **AlaSQL** | ✅ Confirmado |
| Grid de datos | **Tabulator** (~99KB, MIT) | ✅ Confirmado |
| Gráficos | **Apache ECharts** + vue-echarts (tree-shaking) | ✅ Confirmado |
| Dashboard layout | **GridStack.js** | ✅ Confirmado |
| CSV parsing | **PapaParse** (~7KB) | ✅ Confirmado |
| XLSX parsing | **SheetJS** (~600KB, lazy-loaded) | ✅ Confirmado |
| Editor fórmulas | **CodeMirror 6** + vue-codemirror | ✅ Confirmado |
| Iconos | **Lucide Vue** | ✅ Confirmado |
| Tipografía | **Inter** (Google Fonts) | ✅ Confirmado |
| i18n | **vue-i18n** (ES/EN bilingüe) | ✅ Confirmado |
| Export | **PNG + PDF** (html2canvas + jsPDF) | ✅ Confirmado |
| Dashboard tabs | **Múltiples tabs** soportados | ✅ Confirmado |
| Datos de ejemplo | **CSV incluido** (~100 filas ventas) | ✅ Confirmado |
| Cross-filtering | **Post-MVP** | ✅ Diferido |
| Relaciones/JOINs | **Post-MVP** | ✅ Diferido |
| Tema oscuro | **Pendiente** | ❓ Sin decidir |

---

## Etapas de Implementación

### Etapa 1: Fundación, UI Shell e i18n
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/main.js`, `src/App.vue`, `src/index.css`
  - `src/i18n/index.js`, `src/i18n/es.json`, `src/i18n/en.json`
  - `src/router/index.js`
  - `src/stores/uiStore.js`
  - `src/components/layout/AppLayout.vue`, `AppSidebar.vue`, `AppHeader.vue`
  - `src/components/ui/BaseButton.vue`, `BaseModal.vue`, etc.
  - `src/views/DataView.vue`, `CleaningView.vue`, `FormulasView.vue`, `DashboardView.vue`
- **Dependencias npm**: `vue`, `vue-router`, `pinia`, `vue-i18n`, `lucide-vue-next`
- **Criterio de completitud**: App navegable con 4 vistas, sidebar, header, i18n ES↔EN funcional

### Etapa 2: Data Engine
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/stores/dataStore.js`
  - `src/modules/data/CsvParser.js`, `XlsxParser.js`, `SchemaManager.js`
  - `src/modules/data/ImportWizard.vue`, `DatasetList.vue`, `DataPreview.vue`
  - `public/sample-data/ventas_ejemplo.csv`
- **Dependencias npm**: `papaparse`, `xlsx`, `alasql`
- **Criterio de completitud**: Import CSV/XLSX con preview, dataset de ejemplo, datos en AlaSQL

### Etapa 3: Data Cleaning
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/modules/cleaning/DataGrid.vue`, `DataProfiler.vue`
  - `src/modules/cleaning/TransformPipeline.js`, `TransformPanel.vue`
  - `src/modules/cleaning/transforms/` (8 archivos)
- **Dependencias npm**: `tabulator-tables`
- **Criterio de completitud**: Grid editable virtualizado, profiling, 8 transformaciones con preview

### Etapa 4: Formula Engine
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/stores/formulaStore.js`
  - `src/modules/formulas/SqlEngine.js`, `FormulaEditor.vue`
  - `src/modules/formulas/FunctionReference.vue`, `CalculatedColumns.vue`, `MeasuresList.vue`
- **Dependencias npm**: `vue-codemirror`, `@codemirror/lang-sql`, `@codemirror/autocomplete`
- **Criterio de completitud**: SQL editor con autocompletado, columnas calculadas, medidas/KPIs

### Etapa 5: Dashboard Core (Grid & Layout)
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/stores/dashboardStore.js`
  - `src/modules/dashboard/DashboardCanvas.vue`, `DashboardTabs.vue`
- **Dependencias npm**: `gridstack`
- **Criterio de completitud**: GridStack inicializado, pestañas funcionales, agregar/remover/redimensionar widgets

### Etapa 6: Visualization Engine
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/modules/visualization/ChartRenderer.vue`, `WidgetConfigurator.vue`
  - `src/modules/visualization/themes/businessTheme.js`
- **Dependencias npm**: `echarts`, `vue-echarts`
- **Criterio de completitud**: Gráficos básicos funcionales (barras, líneas, torta, dispersión), KPIs.

### Etapa 7: Project Manager & File Export
- **Estado**: ✅ Completada
- **Archivos clave**:
  - `src/stores/projectStore.js`
  - `src/modules/project/Serializer.js`, `ProjectManager.vue`, `ExportManager.js`
- **Dependencias npm**: `html2canvas`, `jspdf`, `file-saver`
- **Criterio de completitud**: Guardar/cargar proyectos en un solo archivo JSON, exportar dashboard a PDF/PNG./PDF, undo/redo, autosave

### Etapa 8: Polish y Electron
- **Estado**: ✅ Completada
- **Archivos clave**: `electron/main.js`, `electron/preload.js`, tests
- **Dependencias npm**: `electron`, `electron-builder`, `vitest`, `@vue/test-utils`
- **Criterio de completitud**: Tests passing, Electron build funcional, UX pulida

### Etapa 9: Relaciones y Modelado de Datos (Data Modeling & JOINs)
- **Estado**: ✅ Completada
- **Descripción**: Permitir importar múltiples tablas independientes (ej. Ventas, Clientes, Productos) y establecer relaciones (1:N, N:M) entre ellas mediante una interfaz visual de diagramas de entidad-relación (ER).
- **Criterio de completitud**: Interfaz visual de conexiones tipo "nodos", generación automática de JOINs en el motor `AlaSQL` por debajo al generar gráficos.

### Etapa 10: Filtros Cruzados y Tableros Dinámicos (Cross-filtering)
- **Estado**: ✅ Completada
- **Descripción**: Al hacer clic en una barra de un gráfico, automáticamente se filtra la información en todos los demás gráficos del dashboard. Se añadirán también widgets tipo "Segmentador de Datos" (Slicers) para fechas y categorías.
- **Criterio de completitud**: Sistema de estado de filtros global en `dashboardStore` y recálculo reactivo en tiempo real de los gráficos.

### Etapa 11: Exportación Avanzada y Paginación (Advanced Reports)
- **Estado**: ✅ Completada
- **Descripción**: Expansión del ExportManager actual. Creación de una vista de "Reporte" tipo A4 para maquetar documentos estáticos multipágina de alta calidad, combinando gráficos y narrativa.
- **Criterio de completitud**: Exportación a PDF multipágina sin cortes de gráficos, generación de presentaciones (.pptx).

### Etapa 12: Inteligencia de Tiempo y Funciones Analíticas (Time Intelligence)
- **Estado**: ✅ Completada
- **Descripción**: Librería de funciones pre-cargadas en el editor para cálculos comunes de negocios como: Acumulados Anuales (YTD), Comparativas de mes anterior (MoM) y Promedios móviles.
- **Criterio de completitud**: Botones de "Quick Measure" para inyectar plantillas de SQL complejas al editor de forma guiada.

### Etapa 13: Temas Personalizados y Modo Oscuro (Theming)
- **Estado**: ✅ Completada
- **Descripción**: Implementar soporte total para el Modo Oscuro del sistema operativo y permitir a los usuarios crear "Paletas de Colores" corporativas (Subir su propio logo y configurar los colores de los gráficos).
- **Criterio de completitud**: Variables CSS reactivas gestionadas en el store y sincronizadas con los temas de ECharts.

### Etapa 14: Colaboración Peer-to-Peer (WebRTC)
- **Estado**: ✅ Completada
- **Descripción**: Ya que los datos viven en el navegador, implementar WebRTC (Yjs) para que dos personas puedan editar un mismo proyecto `.litebi` a la vez en la misma red o mediante enlaces temporales sin servidor central.
- **Criterio de completitud**: Cursores múltiples en pantalla y cambios sincronizados en vivo usando CRDTs.

### Etapa 15: Persistencia Local Avanzada (IndexedDB)
- **Estado**: ✅ Completada
- **Descripción**: Transicionar el guardado de estado en memoria (RAM) a IndexedDB utilizando librerías como `localForage`. Esto permitirá a los usuarios trabajar con archivos pesados sin perder sus avances si el navegador se refresca inesperadamente.
- **Criterio de completitud**: Al recargar la pestaña (F5), el dashboard y los datos importados permanecen intactos sin necesidad de guardar en `.litebi` manualmente.

### Etapa 16: Multithreading con Web Workers
- **Estado**: ✅ Completada
- **Descripción**: Mover el motor de procesamiento de AlaSQL, parseo de CSV/XLSX y cálculos matemáticos pesados a Web Workers. Esto evitará que la UI se congele (UI Blocking) mientras se procesan datasets masivos o consultas complejas.
- **Criterio de completitud**: Importación de archivos >50MB y agrupación (GROUP BY) sin trabar las animaciones de la UI.

### Etapa 17: Query Caching y Lazy Loading
- **Estado**: ✅ Completada
- **Descripción**: Implementar un sistema de caché de consultas para los widgets (si la data y los filtros no cambiaron, usar el caché) y garantizar que librerías pesadas (ej: exportadores PDF, mapas detallados) se carguen dinámicamente (`import()`) solo cuando sean requeridas. Además de añadir *Error Boundaries* en los componentes de Vue para contener fallos.
- **Criterio de completitud**: Reducción del tamaño inicial del bundle y navegación instantánea entre pestañas de dashboards complejos.

### Etapa 18: Conectores a Bases de Datos Externas (Live Data)
- **Estado**: ✅ Completada
- **Descripción**: Ampliar LiteBI para que no solo dependa de archivos locales. Desarrollar conectores API (o un micro-backend puente) para traer datos en vivo desde fuentes SQL (PostgreSQL, MySQL, SQL Server) y APIs empresariales (Salesforce, Google Analytics). Se ha rediseñado la interfaz de Data con una Grid de Conectores.
- **Criterio de completitud**: Componente de nueva conexión ("Conectar a BDD") permitiendo queries directas o programadas.

### Etapa 19: Quick Machine Learning (Regresión y Clustering)
- **Estado**: ✅ Completada
- **Descripción**: Añadir capacidades analíticas avanzadas sin depender de lenguajes o servidores externos. Integración de la librería `echarts-stat` para calcular algoritmos matemáticos en tiempo real sobre el navegador.
- **Criterio de completitud**: Botones/Selectores en el panel de configuración de widgets que habiliten el cálculo de K-Means (Agrupación) y Regresión (Lineal, Polinómica, etc.) directamente sobre los gráficos de dispersión o líneas.

### Etapa 20: Modo de Solo-Lectura y Compartir (Viewer Mode)
- **Estado**: ✅ Completada
- **Descripción**: Crear una vista especial donde la barra lateral y opciones de configuración estén bloqueadas. Permite empaquetar el dashboard actual en un enlace o archivo `.litebi-view` para compartirlo con gerentes/stakeholders, dándoles capacidad de filtrar, pero no de editar/romper el modelo de datos.
- **Criterio de completitud**: Nuevo botón "Share a Visor", generando un layout simplificado que bloquea los menús al cargarlo.

### Etapa 21: Plantillas y Temas Corporativos
- **Estado**: ✅ Completada
- **Descripción**: Poder guardar un dashboard como "Template" para futuros proyectos y establecer un "Brand Kit" (subir Logo de la empresa, paleta de colores corporativa obligatoria) que todos los gráficos heredarán por defecto.
- **Criterio de completitud**: Editor de temas globales y capacidad de guardar un `.litebi-template`.

---

## Stores Pinia — APIs Públicas

### dataStore (`src/stores/dataStore.js`)
```js
// State
datasets: Map<string, DatasetMeta>  // nombre → metadata
activeDataset: string | null        // dataset seleccionado

// Actions
addDataset(name, data, schema)      // Crea tabla AlaSQL
removeDataset(name)                 // Elimina tabla
setActive(name)                     // Selecciona dataset
getPreview(name, n)                 // Primeras n filas como objetos

// Getters
datasetNames                        // Lista de nombres
activeSchema                        // Schema del dataset activo
```

### formulaStore (`src/stores/formulaStore.js`)
```js
// State
calculatedColumns: Map<dataset, Column[]>
measures: Measure[]

// Actions
addCalculatedColumn(dataset, name, sqlExpr)
addMeasure(name, sqlExpr, dataset)
updateFormula(id, sqlExpr)
removeFormula(id)

// Getters
getColumnsForDataset(dataset)
getMeasureValue(id)
```

### dashboardStore (`src/stores/dashboardStore.js`)
```js
// State
tabs: DashboardTab[]
activeTabId: string
selectedWidgetId: string | null
editMode: boolean

// Actions
addTab(name?)
removeTab(id)
renameTab(id, name)
addWidget(type, config?, gridPos?)
removeWidget(id)
updateWidget(id, config)
duplicateWidget(id)
setEditMode(bool)
```

### projectStore (`src/stores/projectStore.js`)
```js
// State
projectName: string
isDirty: boolean
lastSaved: Date | null
undoStack: Snapshot[]
redoStack: Snapshot[]

// Actions
save()     // Descarga .litebi
load()     // Carga .litebi
newProject()
undo()
redo()
```

---

## Paleta de Colores

```css
--color-bg-primary: #F8FAFC;
--color-bg-sidebar: #1E293B;
--color-bg-surface: #FFFFFF;
--color-text-primary: #0F172A;
--color-text-secondary: #64748B;
--color-text-sidebar: #CBD5E1;
--color-accent: #2563EB;
--color-accent-hover: #1D4ED8;
--color-accent-light: #EFF6FF;
--color-success: #059669;
--color-danger: #DC2626;
--color-warning: #D97706;
--color-info: #0891B2;
--color-border: #E2E8F0;
--color-border-hover: #CBD5E1;
```

**Paleta de gráficos**: `#2563EB, #7C3AED, #059669, #D97706, #DC2626, #0891B2, #4F46E5, #65A30D`

---

## Convenciones de Código

- **Vue SFC**: `<script setup>` con Composition API
- **Naming**: componentes PascalCase, composables `use*`, stores `*Store`
- **CSS**: Scoped styles en SFC, BEM para clases globales, custom properties para tokens
- **i18n**: Todas las cadenas de UI en `es.json`/`en.json`, acceso vía `$t('key')` o `t('key')`
- **AlaSQL**: Tablas nombradas como datasets, queries parametrizados
- **Tests**: archivos `.test.js` junto al módulo, Vitest + Vue Test Utils
- **Comentarios**: JSDoc para funciones y APIs públicas de los stores/composables
