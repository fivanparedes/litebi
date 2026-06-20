<script setup>
import { HelpCircle, Database, LayoutDashboard, Calculator, Wand2, Terminal, FileText, Command, ShieldCheck, Network } from '@lucide/vue'
</script>

<template>
  <div class="flex-1 flex flex-col h-screen overflow-hidden bg-background text-foreground">
    
    <div class="h-14 border-b border-border flex items-center justify-between px-6 bg-card shrink-0 shadow-sm z-10">
      <div class="flex items-center gap-3">
        <HelpCircle class="w-5 h-5 text-primary" />
        <h1 class="text-base font-semibold">Manual de Usuario LiteBI</h1>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth">
      <div class="max-w-4xl mx-auto space-y-12 pb-20">
        
        <!-- Intro -->
        <section class="space-y-4">
          <h2 class="text-3xl font-bold tracking-tight">Bienvenido a LiteBI</h2>
          <p class="text-lg text-muted-foreground leading-relaxed">
            LiteBI es una plataforma de <strong>Business Intelligence</strong> que se ejecuta completamente en tu navegador. 
            Gracias a tecnologías como WebAssembly y DuckDB, todos los datos que procesas se mantienen de manera privada y rápida en tu dispositivo.
          </p>
        </section>

        <!-- Navegación Rápida -->
        <section class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <a href="#data" class="p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all group">
            <Database class="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 class="font-semibold mb-1">1. Conexiones y Datos</h3>
            <p class="text-sm text-muted-foreground">Importa desde CSV, SQL, API o conectores nativos.</p>
          </a>
          <a href="#cleaning" class="p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all group">
            <Wand2 class="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 class="font-semibold mb-1">2. Limpieza de Datos</h3>
            <p class="text-sm text-muted-foreground">Limpia y transforma tus columnas fácilmente.</p>
          </a>
          <a href="#formulas" class="p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all group">
            <Calculator class="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 class="font-semibold mb-1">3. Fórmulas SQL</h3>
            <p class="text-sm text-muted-foreground">Crea columnas calculadas usando sintaxis SQL estándar.</p>
          </a>
          <a href="#modeling" class="p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all group">
            <Network class="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 class="font-semibold mb-1">4. Modelado</h3>
            <p class="text-sm text-muted-foreground">Relaciona diferentes tablas mediante claves primarias.</p>
          </a>
          <a href="#dashboards" class="p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all group">
            <LayoutDashboard class="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 class="font-semibold mb-1">5. Dashboards</h3>
            <p class="text-sm text-muted-foreground">Visualiza datos interactivos con ECharts y Gridstack.</p>
          </a>
          <a href="#python" class="p-4 border border-border rounded-xl bg-card hover:border-primary/50 hover:shadow-md transition-all group">
            <Terminal class="w-6 h-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
            <h3 class="font-semibold mb-1">6. Python Scripts</h3>
            <p class="text-sm text-muted-foreground">Ejecuta Pandas y NumPy directo en el navegador.</p>
          </a>
        </section>

        <hr class="border-border" />

        <!-- Secciones de Contenido -->
        <section id="data" class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <Database class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">1. Conexiones y Datos</h2>
          </div>
          <p class="text-muted-foreground">
            El módulo de <strong>Datos</strong> es el punto de entrada. Aquí puedes cargar archivos locales o conectarte a bases de datos remotas.
          </p>
          <div class="bg-muted p-4 rounded-lg text-sm border border-border">
            <h4 class="font-semibold mb-2">💡 ¿Cómo agregar un dataset?</h4>
            <ol class="list-decimal list-inside space-y-1">
              <li>Navega a <strong>Datos</strong> en el menú lateral.</li>
              <li>Haz clic en el botón <strong>Nuevo Dataset</strong>.</li>
              <li>Selecciona si es un <strong>Archivo Local</strong> (CSV, JSON, Excel, Parquet) o una <strong>Conexión Remota</strong> (PostgreSQL, MySQL, SQL Server, API, Salesforce).</li>
              <li>Completa las credenciales o arrastra el archivo. El motor SQL interno (DuckDB) cargará la información y quedará disponible para consultas.</li>
            </ol>
          </div>
        </section>

        <section id="cleaning" class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <Wand2 class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">2. Limpieza de Datos</h2>
          </div>
          <p class="text-muted-foreground">
            A menudo los datos vienen con valores nulos, formatos incorrectos o errores tipográficos. El módulo de <strong>Limpieza</strong> te permite arreglar estos problemas antes de analizarlos.
          </p>
          <ul class="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li><strong>Imputación de Nulos:</strong> Puedes rellenar los datos faltantes con la media, mediana o un valor fijo.</li>
            <li><strong>Cambio de Tipo:</strong> Convierte cadenas de texto en números o fechas válidas.</li>
            <li><strong>Filtros:</strong> Excluye filas que no cumplan ciertos criterios.</li>
          </ul>
        </section>

        <section id="formulas" class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <Calculator class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">3. Fórmulas (SQL Engine)</h2>
          </div>
          <p class="text-muted-foreground">
            LiteBI utiliza <strong>DuckDB</strong> bajo el capó. En el módulo de <strong>Fórmulas</strong>, puedes crear medidas y dimensiones calculadas utilizando SQL estándar.
          </p>
          <div class="bg-card border border-border rounded-lg overflow-hidden text-sm">
            <div class="bg-muted px-4 py-2 border-b border-border font-mono text-xs font-semibold text-muted-foreground">Ejemplo de Fórmulas SQL</div>
            <div class="p-4 space-y-3">
              <div>
                <strong>Margen de Ganancia (%):</strong>
                <code class="block mt-1 bg-muted p-2 rounded text-primary">SELECT (Ventas - Costos) / Ventas * 100 AS Margen FROM ventas_historicas</code>
              </div>
              <div>
                <strong>Agrupación Condicional (CASE):</strong>
                <code class="block mt-1 bg-muted p-2 rounded text-primary">SELECT CASE WHEN edad >= 18 THEN 'Adulto' ELSE 'Menor' END AS grupo_etario</code>
              </div>
            </div>
          </div>
        </section>

        <section id="modeling" class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <Network class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">4. Modelado y Relaciones</h2>
          </div>
          <p class="text-muted-foreground">
            Si tienes tablas separadas (ej. <code>ventas</code> y <code>clientes</code>), necesitas relacionarlas para poder visualizarlas juntas en un Dashboard.
          </p>
          <p class="text-sm text-muted-foreground">
            Ve a <strong>Modelado</strong>, selecciona la tabla principal, haz clic en "Añadir Relación" y conecta las columnas que actúen como clave (ej. <code>cliente_id = id</code>).
          </p>
        </section>

        <section id="dashboards" class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <LayoutDashboard class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">5. Dashboards y Visualizaciones</h2>
          </div>
          <p class="text-muted-foreground">
            Aquí ocurre la magia. Crea tableros interactivos arrastrando y soltando widgets de distintos tipos (Barras, Líneas, Mapa, KPI).
          </p>
          <div class="bg-muted p-4 rounded-lg text-sm border border-border">
            <h4 class="font-semibold mb-2">⭐ Tipos de Interacción Soportados:</h4>
            <ul class="list-disc list-inside space-y-1">
              <li><strong>Cross-filtering:</strong> Al hacer clic en una barra, el resto de los gráficos se filtrarán por esa categoría.</li>
              <li><strong>Drill-through:</strong> Permite configurar un salto hacia otra pestaña del dashboard pasando un contexto de filtro.</li>
              <li><strong>Tooltips Avanzados:</strong> Visualiza comparaciones contra periodos anteriores o métricas secundarias al hacer hover.</li>
            </ul>
          </div>
          <p class="text-sm text-muted-foreground mt-4">
            <em>Ejemplo:</em> Para crear un gráfico circular, haz clic en <strong>+ Widget</strong>, selecciona "Torta", elige tu dataset, pon la categoría en el "Eje X" y la métrica de suma en el "Eje Y".
          </p>
        </section>

        <section id="python" class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <Terminal class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">6. Python Scripts (Pyodide)</h2>
          </div>
          <p class="text-muted-foreground">
            Para transformaciones de datos complejas o modelos estadísticos que SQL no puede manejar fácilmente, LiteBI integra un entorno Python local.
          </p>
          <div class="bg-card border border-border rounded-lg overflow-hidden text-sm">
            <div class="p-4">
              <code class="block whitespace-pre bg-muted p-3 rounded text-xs">import pandas as pd
import numpy as np

# 'input_data' es inyectado automáticamente desde el dataset seleccionado
df = pd.DataFrame(input_data)

# Aplicamos una normalización
df['columna_normalizada'] = (df['col'] - df['col'].min()) / (df['col'].max() - df['col'].min())

# El último valor devuelto se pasa de vuelta al entorno JS
df.to_dict(orient='records')</code>
            </div>
          </div>
        </section>

        <hr class="border-border" />

        <section class="space-y-4 pt-4">
          <div class="flex items-center gap-3">
            <Command class="w-6 h-6 text-primary" />
            <h2 class="text-2xl font-bold">Navegación Rápida (Command Palette)</h2>
          </div>
          <p class="text-muted-foreground">
            Presiona <kbd class="bg-muted border border-border rounded px-1 text-xs">Ctrl</kbd> + <kbd class="bg-muted border border-border rounded px-1 text-xs">K</kbd> en cualquier momento para abrir la paleta de comandos. 
            Te permitirá saltar rápidamente entre distintas vistas, buscar dashboards o seleccionar datasets sin usar el mouse.
          </p>
        </section>

      </div>
    </div>
  </div>
</template>
