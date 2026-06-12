<script setup>
import { ref, onMounted } from 'vue'
import { pythonClient } from '@/modules/python/PythonClient'
import { useUiStore } from '@/stores/uiStore'
import { Play, Loader2 } from '@lucide/vue'
import CodeEditor from '@/components/ui/CodeEditor.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useI18n } from 'vue-i18n'

const uiStore = useUiStore()
const { t } = useI18n()

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
    uiStore.addToast({ message: t('python.success'), type: 'success' })
  } catch (err) {
    error.value = err.message
    uiStore.addToast({ message: t('python.error'), type: 'error' })
  } finally {
    isExecuting.value = false
  }
}
</script>

<template>
  <div class="python-view">
    <div class="view-header">
      <div class="title-group">
        <h1>{{ $t('python.title') }}</h1>
        <p>{{ $t('python.subtitle') }}</p>
      </div>
      <div class="actions">
        <BaseButton variant="primary" :loading="isExecuting" @click="executeCode">
          <template v-if="!isExecuting" #icon-left><Play /></template>
          {{ isExecuting ? $t('python.running') : $t('python.runScript') }}
        </BaseButton>
      </div>
    </div>
    
    <div class="editor-container">
      <div class="editor-pane">
        <div class="pane-header">{{ $t('python.codeEditor') }}</div>
        <div class="code-editor-container">
          <CodeEditor v-model="code" language="python" />
        </div>
      </div>
      
      <div class="result-pane">
        <div class="pane-header">{{ $t('python.resultOutput') }}</div>
        <div class="result-box" :class="{ 'has-error': !!error }">
          <pre v-if="error" class="error-text">{{ error }}</pre>
          <pre v-else-if="result">{{ result }}</pre>
          <div v-else class="empty-state">
            {{ $t('python.emptyResult') }}
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
  color: var(--foreground);
  margin-bottom: var(--space-1);
}

.title-group p {
  color: var(--muted-foreground);
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
  background-color: var(--background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.pane-header {
  background-color: var(--muted);
  padding: var(--space-2) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  color: var(--foreground);
}

.code-editor-container {
  flex: 1;
  width: 100%;
  min-height: 0;
  position: relative;
}

.result-box {
  flex: 1;
  padding: var(--space-4);
  overflow: auto;
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: var(--text-sm);
  background-color: var(--muted);
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
  color: var(--muted-foreground);
  font-style: italic;
}


</style>
