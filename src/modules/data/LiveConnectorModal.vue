<script setup>
import { ref, computed, watch } from 'vue'
import { AlertTriangle, Loader2, Play } from '@lucide/vue'
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import { LiveConnector } from './LiveConnector'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  connectorType: {
    type: String,
    default: 'postgres'
  }
})

const emit = defineEmits(['update:modelValue', 'imported', 'preview'])

const dataStore = useDataStore()
const uiStore = useUiStore()

const isLoading = ref(false)
const error = ref(null)
const previewData = ref(null)
const isFastImport = ref(false)
const refreshInterval = ref(0)

const credentials = ref({
  datasetName: '',
  host: 'localhost',
  port: '',
  database: '',
  user: 'admin',
  password: '',
  query: 'SELECT * FROM public.sales LIMIT 1000',
  url: 'https://api.example.com/v1/data',
  method: 'GET',
  headers: '{\n  "Authorization": "Bearer TOKEN"\n}',
  useCorsProxy: true
})

// Initialize defaults based on connector
watch(() => props.connectorType, (type) => {
  error.value = null
  if (type === 'postgres') credentials.value.port = '5432'
  if (type === 'mysql') credentials.value.port = '3306'
  if (type === 'sqlserver') credentials.value.port = '1433'
  
  if (type === 'postgres') credentials.value.datasetName = 'Postgres_Query'
  if (type === 'mysql') credentials.value.datasetName = 'MySQL_Query'
  if (type === 'api') credentials.value.datasetName = 'REST_API_Data'
  if (type === 'google-analytics') credentials.value.datasetName = 'GA_Traffic'
}, { immediate: true })

const isApi = computed(() => ['api', 'salesforce', 'google-analytics'].includes(props.connectorType))

const title = computed(() => {
  const map = {
    postgres: 'Conectar a PostgreSQL',
    mysql: 'Conectar a MySQL',
    sqlserver: 'Conectar a SQL Server',
    api: 'Importar desde REST API',
    salesforce: 'Integración con Salesforce',
    'google-analytics': 'Google Analytics'
  }
  return map[props.connectorType] || 'Conectar Origen de Datos'
})

const handleConnect = async () => {
  if (!credentials.value.datasetName) {
    error.value = "Por favor, asigne un nombre al dataset."
    return
  }
  
  isLoading.value = true
  error.value = null
  previewData.value = null
  
  try {
    const resultData = await LiveConnector.query(props.connectorType, credentials.value)
    
    if (resultData && (resultData instanceof File || resultData.length > 0)) {
      const config = { type: props.connectorType, credentials: { ...credentials.value } }
      if (isFastImport.value || resultData instanceof File) {
        if (resultData instanceof File) {
          await dataStore.addDatasetFromFile(credentials.value.datasetName, resultData, config, refreshInterval.value)
        } else {
          await dataStore.addDataset(credentials.value.datasetName, resultData, null, config, refreshInterval.value)
        }
        uiStore.addToast({
          message: resultData instanceof File ? 'Importación de datos completada exitosamente.' : `Importados ${resultData.length} registros exitosamente.`,
          type: 'success'
        })
        emit('imported', credentials.value.datasetName)
      } else {
        emit('preview', { 
          datasetName: credentials.value.datasetName, 
          parsedData: { data: resultData, schema: null },
          connectorConfig: config,
          refreshInterval: refreshInterval.value
        })
      }
      emit('update:modelValue', false)
    } else {
      error.value = "La consulta no arrojó resultados."
    }
  } catch (err) {
    error.value = err.message
  } finally {
    isLoading.value = false
  }
}

const handleTest = async () => {
  isLoading.value = true
  error.value = null
  previewData.value = null
  try {
    const resultData = await LiveConnector.query(props.connectorType, credentials.value)
    
    let targetData = resultData
    
    if (resultData instanceof File) {
      // Si es un archivo (Parquet), por ahora no podemos previsualizarlo tan fácil
      // sin cargarlo a DuckDB, así que simularemos que fue exitoso o mostraremos metadatos.
      previewData.value = [{ 
        Estado: 'Conexión Exitosa',
        Origen: `${credentials.value.host}:${credentials.value.port}`,
        'Base de Datos': credentials.value.database,
        Usuario: credentials.value.user,
        Archivo: resultData.name, 
        Tamaño: (resultData.size / 1024).toFixed(2) + ' KB',
        Formato: 'Parquet Binario' 
      }]
      uiStore.addToast({ message: '¡Conexión exitosa y datos recibidos!', type: 'success' })
      isLoading.value = false
      return
    }

    if (!Array.isArray(resultData) && resultData && typeof resultData === 'object') {
      const arrayProp = Object.values(resultData).find(val => Array.isArray(val))
      if (arrayProp) {
        targetData = arrayProp
      } else {
        targetData = [resultData]
      }
    }
    
    if (Array.isArray(targetData) && targetData.length > 0) {
      previewData.value = targetData.slice(0, 5)
    } else {
      previewData.value = []
    }
    
    uiStore.addToast({
      message: '¡Conexión establecida exitosamente!',
      type: 'success'
    })
  } catch (err) {
    error.value = "Error de conexión: " + err.message
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <BaseModal 
    :model-value="modelValue" 
    :title="title" 
    size="md"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="connector-form">
      <div v-if="error" class="error-banner">
        <AlertTriangle size="16" />
        <span>{{ error }}</span>
      </div>
      
      <BaseInput 
        v-model="credentials.datasetName"
        v-focus 
        label="Nombre del Dataset Resultante" 
        placeholder="Ej: Ventas_Actuales" 
        @keyup.enter="handleConnect"
      />
      
      <!-- SQL Form -->
      <template v-if="!isApi">
        <div class="form-row">
          <BaseInput v-model="credentials.host" label="Host / IP" placeholder="localhost o 192.168.x.x" />
          <BaseInput v-model="credentials.port" label="Puerto" />
        </div>
        
        <BaseInput v-model="credentials.database" label="Nombre de la Base de Datos" />
        
        <div class="form-row">
          <BaseInput v-model="credentials.user" label="Usuario" />
          <BaseInput v-model="credentials.password" type="password" label="Contraseña" />
        </div>
        
        <div class="form-group">
          <label class="form-label">Consulta SQL (Query)</label>
          <textarea v-model="credentials.query" class="sql-textarea" rows="4"></textarea>
        </div>
      </template>
      
      <!-- API Form -->
      <template v-else>
        <BaseInput v-model="credentials.url" label="Endpoint URL" placeholder="https://api..." />
        
        <div class="form-group">
          <label class="form-label">Headers (JSON)</label>
          <textarea v-model="credentials.headers" class="sql-textarea" rows="3"></textarea>
        </div>
        
        <div class="form-group checkbox-group">
          <label class="checkbox-label">
            <input v-model="credentials.useCorsProxy" type="checkbox" />
            <span class="custom-checkbox"></span>
            Usar Proxy CORS (Evita bloqueos del navegador)
          </label>
        </div>
        
        <p v-if="props.connectorType === 'google-analytics'" class="help-text">
          Nota: En modo de demostración, esto recuperará un dataset simulado de tráfico web de los últimos 30 días independientemente del endpoint ingresado.
        </p>
      </template>

      <!-- Data Preview Table -->
      <div v-if="previewData" class="preview-section">
        <label class="form-label">Vista Previa de Datos</label>
        <div v-if="previewData.length > 0" class="preview-table-wrapper">
          <table class="preview-table">
            <thead>
              <tr>
                <th v-for="key in Object.keys(previewData[0])" :key="key">{{ key }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, i) in previewData" :key="i">
                <td v-for="key in Object.keys(previewData[0])" :key="key">{{ row[key] }}</td>
              </tr>
            </tbody>
          </table>
          <p class="help-text" style="margin-top: 4px;">Mostrando las primeras {{ previewData.length }} filas resultantes.</p>
        </div>
        <div v-else class="preview-empty">
          El origen no retornó datos o no tiene un formato tabular.
        </div>
      </div>
      
      <div style="display: flex; gap: var(--space-4); margin-top: var(--space-2); align-items: center; justify-content: space-between;">
        <div style="flex: 1;">
          <label style="font-size: var(--text-sm); font-weight: 500; display: block; margin-bottom: 4px;">Actualización Automática (minutos)</label>
          <BaseInput v-model.number="refreshInterval" type="number" min="0" placeholder="0 = Sin actualización" />
        </div>
        
        <div style="display: flex; align-items: center; gap: var(--space-2); flex: 1; justify-content: flex-end; margin-top: 18px;">
          <input id="fast-import-live" v-model="isFastImport" type="checkbox" />
          <label for="fast-import-live" style="font-size: var(--text-sm); color: var(--muted-foreground); cursor: pointer;">
            Importación Rápida
          </label>
        </div>
      </div>

    </div>

    <template #footer>
      <div class="footer-actions">
        <BaseButton variant="ghost" :disabled="isLoading" @click="handleTest">
          Probar Conexión
        </BaseButton>
        <BaseButton variant="primary" :disabled="isLoading" @click="handleConnect">
          <template #icon-left>
            <Loader2 v-if="isLoading" class="spin" />
            <Play v-else />
          </template>
          Importar Datos
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.connector-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-2) 0;
}

.form-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: var(--space-3);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--foreground);
}

.sql-textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--card);
  color: var(--foreground);
  font-family: monospace;
  font-size: var(--text-sm);
  resize: vertical;
}

.sql-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 2px var(--color-accent-light);
}

.error-banner {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  background-color: var(--color-danger-light);
  color: var(--color-danger);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.checkbox-group {
  margin-top: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--foreground);
  cursor: pointer;
  user-select: none;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-accent);
}

.help-text {
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  font-style: italic;
  margin: 0;
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  width: 100%;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-top: var(--space-2);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
}

.preview-table-wrapper {
  overflow-x: auto;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background-color: var(--card);
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-xs);
}

.preview-table th,
.preview-table td {
  padding: 6px 8px;
  border-bottom: 1px solid var(--color-border);
  border-right: 1px solid var(--color-border);
  white-space: nowrap;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-table th {
  background-color: var(--muted);
  font-weight: 600;
  text-align: left;
}

.preview-empty {
  padding: var(--space-4);
  text-align: center;
  background-color: var(--muted);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  color: var(--muted-foreground);
}
</style>
