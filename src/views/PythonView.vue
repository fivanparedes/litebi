<script setup>
import { ref, onMounted } from 'vue'
import { pythonClient } from '@/modules/python/PythonClient'
import { useUiStore } from '@/stores/uiStore'
import { Play, Loader2 } from '@lucide/vue'

const uiStore = useUiStore()

const code = ref(`# Escribe código Python aquí
# Tienes 'pandas' y 'numpy' preinstalados.

import pandas as pd
import numpy as np

# Ejemplo simple:
data = {
    'A': np.random.rand(5),
    'B': np.random.rand(5)
}
df = pd.DataFrame(data)
df.describe().to_json()  # El último valor evaluado se retorna como resultado
`)

const isExecuting = ref(false)
const result = ref('')
const error = ref('')

const executeCode = async () => {
  isExecuting.value = true
  result.value = ''
  error.value = ''
  
  try {
    const res = await pythonClient.runPython(code.value)
    // Formatear JSON si es posible, si no, usar string
    if (typeof res === 'object' && res !== null) {
      result.value = JSON.stringify(res, null, 2)
    } else if (typeof res === 'string') {
      try {
        result.value = JSON.stringify(JSON.parse(res), null, 2)
      } catch {
        result.value = res
      }
    } else {
      result.value = String(res)
    }
    uiStore.addToast({ message: 'Código ejecutado exitosamente', type: 'success' })
  } catch (err) {
    error.value = err.message
    uiStore.addToast({ message: 'Error de ejecución en Python', type: 'error' })
  } finally {
    isExecuting.value = false
  }
}
</script>

<template>
  <div class="python-view">
    <div class="view-header">
      <div class="title-group">
        <h1>Consola Python (Pyodide)</h1>
        <p>Ejecuta análisis de datos avanzados directamente en tu navegador usando WebAssembly.</p>
      </div>
      <div class="actions">
        <button class="btn btn-primary" @click="executeCode" :disabled="isExecuting">
          <Loader2 v-if="isExecuting" class="spinner" />
          <Play v-else />
          {{ isExecuting ? 'Ejecutando (Puede tardar la 1ra vez)...' : 'Ejecutar Script' }}
        </button>
      </div>
    </div>
    
    <div class="editor-container">
      <div class="editor-pane">
        <div class="pane-header">Editor de Código</div>
        <textarea 
          class="code-editor" 
          v-model="code" 
          spellcheck="false"
          placeholder="Escribe aquí tu script en Python..."
        ></textarea>
      </div>
      
      <div class="result-pane">
        <div class="pane-header">Resultado / Salida</div>
        <div class="result-box" :class="{ 'has-error': !!error }">
          <pre v-if="error" class="error-text">{{ error }}</pre>
          <pre v-else-if="result">{{ result }}</pre>
          <div v-else class="empty-state">
            El resultado de la última línea evaluada aparecerá aquí.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.python-view {
  padding: var(--space-6);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-group h1 {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.title-group p {
  color: var(--color-text-secondary);
}

.editor-container {
  display: flex;
  flex: 1;
  gap: var(--space-4);
  min-height: 0; /* Necesario para overflow */
}

.editor-pane, .result-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.pane-header {
  background-color: var(--color-bg-secondary);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
}

.code-editor {
  flex: 1;
  width: 100%;
  border: none;
  resize: none;
  padding: var(--space-4);
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: var(--text-sm);
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
  outline: none;
  line-height: 1.5;
}

.result-box {
  flex: 1;
  padding: var(--space-4);
  overflow: auto;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: var(--text-sm);
  background-color: var(--color-bg-secondary);
}

.result-box pre {
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.has-error {
  background-color: var(--color-danger-light);
}

.error-text {
  color: var(--color-danger);
}

.empty-state {
  color: var(--color-text-tertiary);
  font-style: italic;
}

.btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  border: none;
  cursor: pointer;
}

.btn-primary {
  background-color: var(--color-accent);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
</style>
