# Manual de Usuario: LiteBI

¡Bienvenido a LiteBI! Este manual te guiará paso a paso para que puedas importar tus datos, limpiarlos, generar métricas y construir tus propios cuadros de mando de forma sencilla y eficiente en tu navegador.

---

## 1. Primeros Pasos y Gestión de Proyectos

LiteBI maneja todo tu trabajo dentro de un **Proyecto**. En la barra superior (cabecera) de la aplicación, encontrarás controles útiles:

*   **Renombrar Proyecto:** Haz clic sobre el título (por defecto "Proyecto sin título") para cambiar el nombre. Presiona Enter para confirmar.
*   **Nuevo Proyecto:** Haz clic en el ícono de "Archivo con un Más" (`FilePlus`) para limpiar el entorno actual y comenzar desde cero.
*   **Abrir Proyecto:** Haz clic en el ícono de la carpeta para cargar un archivo `.litebi` que hayas guardado previamente.
*   **Guardar Proyecto:** Guarda tu estado actual. Si es la primera vez, el navegador te pedirá un lugar donde descargar el archivo `.litebi`.
*   **Guardar Como:** Usa el icono del disquete múltiple (`SaveAll`) para guardar una copia paralela de tu proyecto actual sin sobreescribir el archivo original.

---

## 2. Carga de Datos

El primer paso para usar LiteBI es traer tu información a la herramienta. En la barra lateral izquierda, selecciona la vista **Datos**.

1. Haz clic en el botón **"Importar Archivo"** o **"Conexión en Vivo"** (para bases de datos SQL Server, MySQL, Postgres).
2. Arrastra o selecciona tu archivo Excel (`.xlsx`) o CSV (`.csv`), o configura los credenciales de tu conexión externa.
3. El sistema reconocerá automáticamente los delimitadores y los tipos de columna. Confirma la importación. Para conexiones externas, puedes configurar el **Intervalo de Actualización Automática (Scheduled Refresh)** para mantener tus datos vivos.
4. *Opcional:* Si solo deseas probar el programa, puedes importar los datos de ejemplo que vienen en la carpeta `examples/`.
5. Usa la sección **Preview** (Vista previa) para explorar las primeras 100 líneas de tu tabla importada.

---

## 3. Limpieza y Transformación (ETL)

A menudo, los datos crudos traen imperfecciones. Ve a la vista **Preparación** (icono de la varita mágica) para arreglarlos:

*   **Perfilado de Datos (Data Profiling):** Al visualizar la tabla, LiteBI calculará automáticamente estadísticas rápidas en la cabecera (porcentaje de completitud, número de nulos, valores únicos y tipo de dato detectado).
*   **Eliminar Duplicados:** Quita filas repetidas idénticas de todo tu dataset.
*   **Transformar Texto:** Selecciona una columna de texto (string) y usa opciones como **Recortar espacios**, convertir a **MAYÚSCULAS** o **minúsculas**.
*   **Manejo de Nulos (Faltantes):** ¿Tienes celdas vacías? Puedes reemplazarlas rellenándolas hacia adelante (Valor Anterior), usando un Valor Fijo (ej. `0`), o métodos estadísticos si la columna es numérica (Media, Moda, Mediana).
*   **Extracción de Fechas:** Si tienes una columna con formato `YYYY-MM-DD`, LiteBI puede crear instantáneamente una nueva columna extrayendo el *Año*, *Mes*, *Día* o el *Trimestre*.

---

## 4. Creación de Fórmulas y Nuevas Columnas

Cuando necesitas cruzar métricas o calcular márgenes, dirígete a la vista **Fórmulas** (icono de la calculadora). LiteBI utiliza un motor SQL avanzado bajo el capó.

### Guía de Creación
1.  **Ingresa un Nombre** para tu nueva columna (Ejemplo: `Impuestos`).
2.  **Elige el Tipo de Dato** esperado (Número, Texto, Booleano).
3.  **Escribe la Expresión:** Usa la sintaxis SQL tradicional y los nombres de las columnas en el lado izquierdo.
4.  Presiona **"Probar Fórmula"** para ver qué ocurre con la primera fila del archivo, y presiona **"Guardar Columna"** para efectuar los cambios.

### Ejemplos Prácticos de SQL

**Operaciones Matemáticas Básicas:**
```sql
-- Calcular un margen de ganancia
([Ingresos] - [Costos]) / [Ingresos]
```

**Condicionales Lógicos (CASE WHEN):**
```sql
-- Clasificar a los clientes en rangos
CASE 
  WHEN [Edad] < 18 THEN 'Menor'
  WHEN [Edad] >= 18 AND [Edad] < 65 THEN 'Adulto'
  ELSE 'Mayor'
END
```

**Manejo de Textos (Cadenas):**
```sql
-- Concatenar nombre y apellido
[Nombre] || ' ' || [Apellido]
```

**Forzar Operaciones de Tipos:**
Si el programa te arroja valores `false` en comparaciones, puedes forzar el motor agregando un casting implícito:
```sql
-- Forzar numérico multiplicando por 1
([Cantidad]*1) > 3
```

---

## 5. Modelado de Datos (Relaciones)

Si importaste múltiples tablas (por ejemplo, *Ventas* y *Clientes*), puedes unirlas en la pestaña **Modelado**:

1. Identifica el lienzo de las relaciones. Cada recuadro es una tabla que has importado.
2. Identifica la "Columna Clave" (Primary Key o Foreign Key) que conecta a ambas (ej. `id_cliente`).
3. Dibuja la conexión entre ambos puntos de anclaje.
4. Esta relación se usará automáticamente en el Dashboard para permitir que los gráficos se comuniquen entre tablas al aplicar segmentadores.

---

## 6. Creación del Dashboard

¡La mejor parte! Dirígete al apartado **Reportes** (icono del tablero visual). Aquí diseñarás tu cuadro de mando interactivo.

### Ajustes Globales del Dashboard (Nuevo)
En la barra de herramientas superior encontrarás el botón **Ajustes**. Al hacer clic, podrás personalizar la estética de la pestaña actual de tu reporte:
*   **Color de Fondo:** Define un color de lienzo personalizado.
*   **Imagen de Fondo:** Pega la URL de una imagen para usarla como tapiz. Puedes elegir si la imagen debe "Cubrir" toda la pantalla, "Contenerse", o "Repetirse".
*   **Tipografía General:** Selecciona entre familias tipográficas modernas como Inter, Roboto o Poppins para cambiar el estilo de todos los widgets.

### Pasos Generales
1. **Añadir Widgets:** Usa el botón **Añadir Widget** en la barra superior.
2. **Configurar el Gráfico:** En la esquina del cuadro recién agregado haz clic en el engranaje (**Configurar**). Verás un panel dividido en secciones colapsables o pestañas (Datos, Estilos, Avanzado).
3. **Seleccionar Datos:** 
    *   **Dataset:** Selecciona la tabla de origen.
    *   **Eje X (Jerarquías):** Configura la dimensión (categoría). Puedes añadir **múltiples niveles de jerarquía** para habilitar el *Drill-Down* (ej. Continente > País > Ciudad).
    *   **Eje Y:** Configura la métrica numérica a graficar.
    *   **Eje Y Secundario:** Permite cruzar una métrica adicional.
    *   **Agrupación:** Elige la operación que se realizará (Suma, Promedio, Conteo).
4. **Apariencia:** Modifica los colores y nombres de leyenda de tu visualización.
    *   **Gráficos Apilados (Stacked):** Al usar múltiples métricas o dimensiones, puedes activar el interruptor "Apilar Datos" para que las barras o áreas se acumulen una encima de la otra, mostrando el volumen total y la contribución de cada parte.
5. **Avanzado (Sobrescritura JSON):** Puedes inyectar código JSON directamente al motor de ECharts para modificar cualquier aspecto gráfico (bordes, sombras, animaciones). 

### Mapas y GeoJSON Personalizados
Cuando eliges el tipo de gráfico "Mapa", el panel te permite cargar geografías personalizadas:
*   **Por URL:** Pega la dirección de un archivo `.json` de formato GeoJSON (ej. mapa de provincias, departamentos o polígonos de ventas).
*   **Subir Archivo:** Carga un archivo `.json` local.
*   *Nota:* Para que los datos se vinculen con el mapa, los nombres de tu tabla deben coincidir con la propiedad de nombre del GeoJSON (típicamente `properties.name`). Si tu JSON utiliza otra propiedad (ej. `departamento`), puedes usar la sección **Avanzado** para enlazarla.

**Ejemplo Práctico - Avanzado JSON en Mapas:**
```json
{
  "series": [
    {
      "nameProperty": "departamento",
      "itemStyle": {
        "borderColor": "#ffffff",
        "borderWidth": 1.5
      },
      "emphasis": {
        "itemStyle": {
          "areaColor": "#ffcc00",
          "shadowBlur": 10
        },
        "label": {
          "show": true,
          "fontWeight": "bold"
        }
      }
    }
  ]
}
```

### Interacciones de Usuario en el Dashboard

*   **Filtros Cruzados (Cross-Filtering):** Haz clic sobre cualquier barra, segmento de torta o punto en un gráfico. Inmediatamente el resto del dashboard se filtrará para mostrar los datos relativos a tu selección. Verás los filtros activos en la parte superior del lienzo.
*   **Drill-Down (Profundización):** Si configuraste múltiples niveles en el Eje X, al hacer clic en un dato, el gráfico "bajará" al siguiente nivel de granularidad. Aparecerá un botón "Subir Nivel" para regresar.

### Catálogo de Visualizaciones Implementadas

LiteBI dispone de un amplio abanico de gráficos profesionales:

*   **Tarjetas KPI / Scorecard:** Muestran un número agregado central. El *Scorecard* permite definir un "Target" (valor meta del Eje Y Secundario) para ver el progreso, la diferencia y el porcentaje.
*   **Barras, Líneas y Torta:** Clásicos para visualizar distribución y tendencias. Soportan apilamiento (Stack).
*   **Combo Chart:** Combina barras y líneas usando un *Eje Y Secundario*. Ideal para comparar Valores Absolutos vs Porcentajes.
*   **Dispersión (Scatter):** Compara la correlación entre dos variables numéricas en el Eje X y Eje Y.
*   **Heatmap (Mapa de Calor):** Muestra la densidad y magnitud de datos mediante el color.
*   **Mapa de Árbol (Treemap):** Ideal para desglosar jerarquías visualizando cajas.
*   **Radar:** Muestra variables múltiples distribuidas radialmente.
*   **Cascada (Waterfall):** Demuestra cómo un valor inicial se ve afectado positiva o negativamente hasta llegar a un valor final.
*   **Embudo (Funnel):** Ilustra etapas de un proceso y la tasa de retención.
*   **Cajas y Bigotes (Boxplot):** Gráfico estadístico para representar la distribución.
*   **Mapas (Personalizables):** Importa cualquier GeoJSON para armar mapas coropléticos.

---

## 7. Analítica Avanzada y Machine Learning

LiteBI te permite superponer análisis probabilístico y estadístico a tus reportes sin necesidad de programación compleja. Dentro del panel de configuración de gráficos como Scatter, Líneas o Barras, encontrarás la sección **Machine Learning (Avanzado)**.

### Modelos de Regresión Rápidos
Predice la línea de tendencia de tu serie temporal o dispersión de datos. Los resultados se dibujan automáticamente como una línea extra sobre tu gráfico, incluyendo una tooltip con la fórmula matemática y el r-cuadrado (r²).
*   **Lineal:** Busca el mejor ajuste recto.
*   **Exponencial:** Ideal para datos que crecen o decrecen a ritmo acelerado (ej. crecimiento viral).
*   **Polinómica:** Se curva para ajustarse a fluctuaciones estacionales o de mayor complejidad geométrica.

### Agrupamiento (Clustering K-Means)
Disponible para los gráficos de **Dispersión (Scatter)**. LiteBI procesará tus datos y agrupará tus puntos numéricos en conjuntos estadísticamente similares.
*   **Uso:** Selecciona 2, 3 o hasta 6 Clusters. LiteBI coloreará y delimitará los grupos automáticamente, siendo ideal para segmentar arquetipos de clientes basados en sus comportamientos (ej. Recencia vs Frecuencia de Compra).

---

## 8. Inteligencia de Tiempo (Time Intelligence)

Analizar datos a lo largo del tiempo (comparar meses, años, trimestres) es una de las tareas más comunes en Business Intelligence. LiteBI simplifica este proceso mediante la generación automática de un **Calendario Maestro**.

### 1. Generar Tabla Calendario
En la vista **Datos**, encontrarás un botón especial para "Generar Calendario". Al pulsarlo, el sistema te pedirá un rango de años (por ejemplo, 2023 a 2025).
LiteBI creará una nueva tabla llamada `Calendario` que contendrá una fila por cada día de ese período, con columnas pre-calculadas como:
*   `Fecha` (YYYY-MM-DD)
*   `Año` y `Mes` (Numéricos)
*   `NombreMes` (Enero, Febrero...)
*   `Trimestre` (1, 2, 3, 4)
*   `NombreDia` (Lunes, Martes...)
*   `AnioMes` (Ej. 2024-01)

### 2. Conectar el Calendario a tus Datos
Para que el calendario funcione, debes relacionarlo con tu tabla de hechos (ej. tus Ventas).
1. Ve a la vista de **Modelado**.
2. Conecta la columna `Fecha` de la tabla `Calendario` con la columna de fecha de tu tabla principal (por ejemplo, `fecha_venta` de la tabla `Ventas`).

### 3. Ejemplo: Análisis de Ventas Trimestrales
Una vez conectados, dirígete al **Dashboard**:
1. Crea un gráfico de Barras.
2. En **Dataset**, selecciona tu tabla de `Ventas`.
3. En el **Eje X (Jerarquías)**, selecciona las columnas de la tabla *Calendario* para crear un *Drill-Down* temporal. Por ejemplo, agrega primero `[Calendario].[Año]` y luego `[Calendario].[Trimestre]`.
4. En el **Eje Y**, selecciona `[Ventas].[monto_total]` con agrupación `SUMA`.

¡Listo! Ahora verás tus ventas agrupadas por Año. Si haces clic en "2024", el gráfico profundizará (Drill-Down) automáticamente para mostrarte las ventas desglosadas por cada uno de los 4 Trimestres de ese año, permitiendo un análisis temporal dinámico sin tener que escribir ninguna fórmula compleja.

---

## 9. Exportación y Presentaciones

Una vez que tengas tu panel perfectamente acomodado:

*   **Exportar como Imagen:** En la parte superior derecha de tu Dashboard (solo cuando estás en la vista de Reportes), encontrarás el icono de Exportar a PNG (`Image`). Obtendrás una captura en altísima resolución.
*   **Exportar como PDF:** El icono contiguo de "Hoja de Texto" genera un documento unificado PDF en formato paisajista (A4/16:9).
*   **Exportar a PPTX (PowerPoint):** Usa el botón **"PPTX"** general del Dashboard para descargar una presentación. LiteBI no solo tomará tu hoja visual, sino que capturará el Dashboard entero en una lámina interactiva de alta definición que puedes presentar directamente en la reunión de junta.

---

## 9. Colaboración Multijugador (WebRTC)

LiteBI permite conectar a múltiples analistas en un mismo proyecto sin necesidad de subir los datos a un servidor externo gracias a la tecnología descentralizada Peer-to-Peer (WebRTC).

1. **Configurar tu Identidad**: Ve a **Configuración** (icono de engranaje) en el menú lateral.
2. Ingresa tu **Nombre de Usuario** y el **ID de la Sala**.
3. **Colaborar**: Pídele a tu compañero que ingrese exactamente el mismo **ID de la Sala** en su programa. Inmediatamente verás aparecer su avatar circular en la barra superior derecha de tu ventana.
4. Si ambos entran a la vista de **Reportes/Dashboard**, podrán mover gráficos y agregar filtros. Verás cómo el ratón fantasma de tu compañero se mueve por el lienzo en tiempo real y cómo los gráficos se acomodan por arte de magia cuando él los arrastra.
