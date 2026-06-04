# Manual de Usuario: LiteBI

¡Bienvenido a LiteBI! Este manual te guiará paso a paso para que puedas importar tus datos, limpiarlos, generar métricas y construir tus propios cuadros de mando de forma sencilla y eficiente en tu navegador.

---

## Índice
1. [Primeros Pasos y Gestión de Proyectos](#1-primeros-pasos-y-gestión-de-proyectos)
2. [Carga de Datos](#2-carga-de-datos)
3. [Limpieza y Transformación (ETL)](#3-limpieza-y-transformación-etl)
4. [Creación de Fórmulas y Nuevas Columnas](#4-creación-de-fórmulas-y-nuevas-columnas)
5. [Modelado de Datos (Relaciones)](#5-modelado-de-datos-relaciones)
6. [Creación del Dashboard](#6-creación-del-dashboard)
7. [Exportación y Presentaciones](#7-exportación-y-presentaciones)

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

1. Haz clic en el botón **"Importar Archivo"**.
2. Arrastra o selecciona tu archivo Excel (`.xlsx`) o CSV (`.csv`).
3. El sistema reconocerá automáticamente los delimitadores y los tipos de columna. Confirma la importación.
4. *Opcional:* Si solo deseas probar el programa, puedes hacer clic en **"Cargar Datos de Ejemplo"** para generar rápidamente un dataset ficticio de ventas.
5. Usa la sección **Preview** (Vista previa) para explorar las primeras 100 líneas de tu tabla importada.

---

## 3. Limpieza y Transformación (ETL)

A menudo, los datos crudos traen imperfecciones. Ve a la vista **Preparación** (icono de la varita mágica) para arreglarlos:

*   **Eliminar Duplicados:** Quita filas repetidas idénticas de todo tu dataset.
*   **Transformar Texto:** Selecciona una columna de texto (string) y usa opciones como **Recortar espacios**, convertir a **MAYÚSCULAS** o **minúsculas**.
*   **Manejo de Nulos (Faltantes):** ¿Tienes celdas vacías? Puedes reemplazarlas rellenándolas hacia adelante (Valor Anterior), usando un Valor Fijo (ej. `0`), o métodos estadísticos si la columna es numérica (Media, Moda, Mediana).
*   **Extracción de Fechas:** Si tienes una columna con formato `YYYY-MM-DD`, LiteBI puede crear instantáneamente una nueva columna extrayendo el *Año*, *Mes*, *Día* o el *Trimestre*.

---

## 4. Creación de Fórmulas y Nuevas Columnas

Cuando necesitas cruzar métricas o calcular márgenes, dirígete a la vista **Fórmulas** (icono de la calculadora). LiteBI utiliza un motor SQL avanzado bajo el capó.

1.  **Ingresa un Nombre** para tu nueva columna (Ejemplo: `Impuestos`).
2.  **Elige el Tipo de Dato** esperado (Número, Texto, Booleano).
3.  **Escribe la Expresión:** Usa la sintaxis SQL tradicional y los nombres de las columnas en el lado izquierdo.
    *   *Suma de dos columnas:* `[Precio] + [Descuento]`
    *   *Condicional booleano:* `CASE WHEN [Cantidad] > 3 THEN true ELSE false END`
    *   *Ojo:* ¡El motor es estricto matemáticamente! Si el programa te arroja puros valores `false` en comparaciones, puedes forzar el motor agregando un casting explícito así: `([Cantidad]*1) > 3`.
4.  Presiona **"Probar Fórmula"** para ver qué ocurre con la primera fila del archivo, y presiona **"Guardar Columna"** para efectuar los cambios.

---

## 5. Modelado de Datos (Relaciones)

Si importaste múltiples tablas (por ejemplo, *Ventas* y *Clientes*), puedes unirlas en la pestaña **Modelado**:

1. Identifica el lienzo de las relaciones. Cada recuadro es una tabla que has importado.
2. Identifica la "Columna Clave" (Primary Key o Foreign Key) que conecta a ambas (ej. `id_cliente`).
3. Dibuja la conexión entre ambos puntos de anclaje.
4. Esta relación se usará automáticamente en el Dashboard para permitir que los gráficos se comuniquen entre tablas al aplicar segmentadores.

---

## 6. Creación del Dashboard

¡La mejor parte! Dirígete al apartado **Reportes** (icono del tablero visual). Aquí diseñarás tu cuadro de mando.

1. **Añadir Widgets:** Usa los botones en la parte inferior o flotantes para añadir un gráfico.
2. **Configurar el Gráfico:** 
    *   En la esquina del cuadro recién agregado haz clic en el engranaje (**Configurar**).
    *   **Dataset:** Selecciona de qué tabla sacarás la información.
    *   **Eje X (Dimensión):** La categoría que divide tus datos (ej. *Categoría*, *País*, *Año*).
    *   **Eje Y (Métrica):** La columna de valores (ej. *Ingresos*, *Cantidad*).
    *   **Agrupación:** Elige la operación que se realizará (Suma, Promedio, Conteo).
3. **Tipos de Gráficos:** LiteBI dispone de Múltiples visualizaciones:
    *   *Tarjetas KPI:* Muestra el número total (Suma, Promedio) central.
    *   *Líneas, Barras y Circulares:* Los clásicos para visualizar distribución y tendencias.
    *   *Gauge:* Muestra el alcance hacia una Meta objetiva.
    *   *Embudos (Funnel)* y *Boxplots (Estadística).*
    *   *Combo Chart:* Selecciona una columna secundaria de Eje Y para superponer barras y líneas.
    *   *Grid:* Para mostrar una mini tabla de datos filtrada.
4. **Filtros / Segmentadores:** Escoge agregar un "Slicer". En el configurador podrás decirle si es de tipo *Lista* (para filtrar textos como Países) o de tipo *Rango* (un Slider para deslizar rangos continuos de números y precios).

---

## 7. Exportación y Presentaciones

Una vez que tengas tu panel perfectamente acomodado:

*   **Exportar como Imagen:** En la parte superior derecha de tu Dashboard (solo cuando estás en la vista de Reportes), encontrarás el icono de Exportar a PNG (`Image`). Obtendrás una captura en altísima resolución perfecta para enviar en correos.
*   **Exportar como PDF:** El icono contiguo de "Hoja de Texto" genera un documento unificado PDF en formato paisajista (A4/16:9).
*   **Exportar a PPTX (PowerPoint):** Usa el botón **"PPTX"** general del Dashboard para descargar una presentación. LiteBI no solo tomará tu hoja visual, sino que capturará el Dashboard entero en una lámina interactiva de alta definición que puedes presentar directamente en la reunión de junta.

¡Disfruta analizando tus datos con LiteBI!
