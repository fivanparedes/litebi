<script setup>
import { defineProps, defineEmits } from 'vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const close = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Manual de Fórmulas y SQL"
    size="lg"
    @update:model-value="val => emit('update:modelValue', val)"
  >
    <div class="manual-container">
      <div class="manual-section">
        <h3>1. Introducción al Editor de Fórmulas</h3>
        <p>
          LiteBI utiliza un motor SQL (DuckDB) interno que procesa las expresiones en tiempo real en tu navegador. El editor de fórmulas <strong>solamente espera la expresión o el cálculo</strong>, no debes incluir el nombre de la variable ni el signo igual inicial.
        </p>
        <div class="example-box correct">
          <strong>✅ Correcto:</strong> <code>[Ingresos] - [Costos]</code>
        </div>
        <div class="example-box incorrect">
          <strong>❌ Incorrecto:</strong> <code>Beneficio = [Ingresos] - [Costos]</code>
        </div>
      </div>

      <div class="manual-section">
        <h3>2. Tipos de Creación</h3>
        <ul>
          <li><strong>Nueva Columna Computada:</strong> Se evalúa fila por fila. Se añade físicamente a los datos de la tabla. <em>Ejemplo: <code>[Precio] * [Cantidad]</code></em></li>
          <li><strong>Nueva Métrica Agrupada:</strong> Se evalúa virtualmente inyectando la fórmula en las agrupaciones (agregaciones) del gráfico. Útil para ratios dinámicos. <em>Ejemplo: <code>SUM([Ingresos]) / SUM([Visitantes])</code></em></li>
        </ul>
      </div>

      <div class="manual-section">
        <h3>3. Reglas de Sintaxis</h3>
        <ul>
          <li><strong>Nombres de Columnas:</strong> Siempre deben estar encerrados entre corchetes rectos <code>[Nombre de Columna]</code> para evitar problemas con espacios o caracteres especiales.</li>
          <li><strong>Cadenas de Texto (Strings):</strong> Deben encerrarse siempre con comillas simples <code>'texto'</code>.</li>
          <li><strong>Operadores lógicos:</strong> Utiliza el estándar de SQL (<code>AND</code>, <code>OR</code>, <code>NOT</code>).</li>
        </ul>
      </div>

      <div class="manual-section">
        <h3>4. Funciones Soportadas</h3>
        
        <h4>Matemáticas y Agrupación</h4>
        <p><code>SUM(col)</code>, <code>AVG(col)</code>, <code>MAX(col)</code>, <code>MIN(col)</code>, <code>COUNT(col)</code>, <code>ROUND(col, decimales)</code>, <code>ABS(col)</code></p>
        
        <h4>Cadenas de Texto</h4>
        <p><code>UPPER(col)</code>, <code>LOWER(col)</code>, <code>CONCAT(col1, col2)</code> o <code>col1 || ' ' || col2</code></p>
        
        <h4>Fechas y Tiempos</h4>
        <p>
          <code>YEAR(col)</code>, <code>MONTH(col)</code>, <code>DAY(col)</code><br>
          <code>DATE_DIFF(unidad, fecha1, fecha2)</code>: Donde "unidad" puede ser <code>'day'</code>, <code>'month'</code>, <code>'year'</code>. <em>Ejemplo: <code>DATE_DIFF('day', [Fecha_Inicio], [Fecha_Fin])</code></em>
        </p>
      </div>

      <div class="manual-section">
        <h3>5. Lógica Condicional (IF / CASE)</h3>
        <p>Puedes escribir condicionales complejos usando la estructura <code>CASE WHEN ... THEN ... ELSE ... END</code>.</p>
        <div class="example-box correct">
          <pre><code>CASE 
  WHEN [Edad] >= 18 THEN 'Adulto'
  WHEN [Edad] >= 13 THEN 'Adolescente'
  ELSE 'Niño'
END</code></pre>
        </div>
        <p>Para manejar valores nulos, usa <code>IFNULL(col, valor_por_defecto)</code>.</p>
      </div>
      
      <div class="manual-section">
        <h3>6. Solución a Errores Comunes</h3>
        <ul>
          <li><strong>"Parse error":</strong> Faltan paréntesis de cierre, comillas simples sin cerrar, o escribiste <code>[Columna]</code> sin corchetes.</li>
          <li><strong>"Column no encontrada":</strong> Asegúrate de que el nombre de la columna es exactamente el mismo que en tu conjunto de datos, respetando las mayúsculas/minúsculas dentro de los corchetes.</li>
        </ul>
      </div>
    </div>
    
    <template #footer>
      <BaseButton v-focus variant="primary" @click="close">Entendido</BaseButton>
    </template>
  </BaseModal>
</template>

<style scoped>
.manual-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  max-height: 60vh;
  overflow-y: auto;
  padding-right: var(--space-2);
}

.manual-section h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--foreground);
  margin-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-1);
}

.manual-section h4 {
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  margin-top: var(--space-3);
  margin-bottom: var(--space-1);
}

.manual-section p, .manual-section li {
  font-size: var(--text-sm);
  color: var(--muted-foreground);
  line-height: 1.5;
}

.manual-section ul {
  margin-top: var(--space-2);
  padding-left: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

code {
  background-color: var(--muted);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 0.9em;
  color: var(--foreground);
}

.example-box {
  margin-top: var(--space-2);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.example-box.correct {
  background-color: var(--color-success-light);
  border: 1px solid var(--color-success);
}

.example-box.incorrect {
  background-color: var(--color-danger-light);
  border: 1px solid var(--color-danger);
}

.example-box pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--font-mono);
}
</style>
