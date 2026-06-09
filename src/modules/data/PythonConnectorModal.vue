<script setup>
import { ref } from 'vue'
import { Terminal, Loader2, Play, AlertTriangle } from '@lucide/vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { pythonClient } from '@/modules/python/PythonClient'
import { inferSchema } from '@/modules/data/SchemaManager'

const props = defineProps({
  modelValue: Boolean
})
const emit = defineEmits(['update:modelValue', 'preview'])

const datasetName = ref('Dataset_Python')
const scriptCode = ref(`# Escribe un script en Python que genere datos
# El script debe retornar un array de diccionarios (registros)
# Ejemplo usando pandas:
import pandas as pd
import urllib.request
import io

# Podemos descargar un CSV de prueba de github
url = "https://raw.githubusercontent.com/fivanparedes/litebi/main/public/sample-data/ventas_ejemplo.csv"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
response = urllib.request.urlopen(req)
csv_data = response.read()

df = pd.read_csv(io.BytesIO(csv_data))

# Convertir el DataFrame a una lista de diccionarios que Javascript puede interpretar
df.to_dict(orient="records")
`)

const isExecuting = ref(false)
const error = ref(null)

const handleExecuteAndPreview = async () => {
  if (!datasetName.value.trim()) {
    error.value = "El nombre del dataset es requerido"
    return
  }

  isExecuting.value = true
  error.value = null

  try {
    const rawResult = await pythonClient.runPython(scriptCode.value)
    
    // Result should be an array of objects
    let dataArray = rawResult
    if (!Array.isArray(rawResult)) {
      if (typeof rawResult === 'object' && rawResult !== null) {
        // Podría ser un solo objeto o dict de dicts
        const arrayProp = Object.values(rawResult).find(val => Array.isArray(val))
        if (arrayProp) {
          dataArray = arrayProp
        } else {
          dataArray = [rawResult]
        }
      } else {
         throw new Error("El resultado del script no es un array o tabla válida.")
      }
    }

    if (dataArray.length === 0) {
      throw new Error("El dataset generado está vacío.")
    }

    const schema = inferSchema(dataArray)
    
    emit('preview', {
      datasetName: datasetName.value.trim(),
      parsedData: { data: dataArray, schema },
      connectorConfig: { type: 'python', script: scriptCode.value }
    })
    
  } catch (err) {
    console.error(err)
    error.value = err.message || "Error al ejecutar el script de Python."
  } finally {
    isExecuting.value = false
  }
}

const handleClose = () => {
  emit('update:modelValue', false)
  error.value = null
}
</script>

<template>
  <BaseModal 
    :modelValue="modelValue" 
    @update:modelValue="emit('update:modelValue', $event)"
    title="Origen de Datos: Script Python"
    size="lg"
  >
    <div class="python-connector">
      <div class="form-group">
        <label>Nombre del Dataset</label>
        <BaseInput v-model="datasetName" placeholder="ej. Ventas_Pandas" />
      </div>
      
      <div class="form-group">
        <label>Script Python (Debe retornar una lista de diccionarios)</label>
        <textarea 
          class="code-editor" 
          v-model="scriptCode" 
          spellcheck="false"
        ></textarea>
      </div>

      <div v-if="error" class="error-msg">
        <AlertTriangle class="error-icon" />
        <span>{{ error }}</span>
      </div>

      <div class="actions">
        <BaseButton variant="ghost" @click="handleClose">Cancelar</BaseButton>
        <BaseButton variant="primary" @click="handleExecuteAndPreview" :disabled="isExecuting">
          <Loader2 v-if="isExecuting" class="spinner" />
          <Play v-else />
          {{ isExecuting ? 'Ejecutando script...' : 'Ejecutar y Previsualizar' }}
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.python-connector {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.code-editor {
  width: 100%;
  min-height: 250px;
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-family: 'Fira Code', 'Courier New', Courier, monospace;
  font-size: var(--text-sm);
  resize: vertical;
  line-height: 1.5;
}

.code-editor:focus {
  outline: none;
  border-color: var(--color-accent);
}

.error-msg {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: var(--color-danger-light);
  color: var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.error-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  margin-top: var(--space-4);
}

.spinner {
  animation: spin 1s linear infinite;
  margin-right: 8px;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
