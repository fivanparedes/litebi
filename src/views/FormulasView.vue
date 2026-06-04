<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Calculator, ArrowRight, Play, Save } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import { useDataStore } from '@/stores/dataStore'
import { useFormulaStore } from '@/stores/formulaStore'
import { testSqlExpression } from '@/modules/formulas/SqlEngine'
import FormulaEditor from '@/modules/formulas/FormulaEditor.vue'
import ColumnList from '@/modules/formulas/ColumnList.vue'

const { t } = useI18n()
const router = useRouter()
const dataStore = useDataStore()
const formulaStore = useFormulaStore()

const hasData = computed(() => !!dataStore.activeDatasetName)
const activeDatasetMeta = computed(() => dataStore.activeDatasetMeta)

// Editor State
const expression = ref('')
const columnName = ref('')
const columnType = ref('number')
const testResult = ref(null)

const typeOptions = [
  { value: 'number', label: 'Número' },
  { value: 'string', label: 'Texto' },
  { value: 'boolean', label: 'Booleano' },
  { value: 'date', label: 'Fecha' }
]

const handleInsertColumn = (colStr) => {
  expression.value = expression.value ? `${expression.value} ${colStr}` : colStr
}

const handleEditColumn = (col) => {
  columnName.value = col.name
  columnType.value = col.type || 'number'
  expression.value = col.expression || ''
}

const handleTest = () => {
  if (!expression.value || !dataStore.activeDatasetName) return
  testResult.value = testSqlExpression(dataStore.activeDatasetName, expression.value)
}

const handleSave = () => {
  if (!columnName.value || !expression.value) return
  
  try {
    formulaStore.addFormula(
      dataStore.activeDatasetName, 
      columnName.value, 
      expression.value, 
      columnType.value
    )
    // Clear form on success
    columnName.value = ''
    expression.value = ''
    testResult.value = null
  } catch (e) {
    // Error is handled in store (Toast)
  }
}
</script>

<template>
  <div class="view-container">
    <div v-if="!hasData" class="empty-state-wrapper">
      <div class="empty-state">
        <div class="empty-state__icon-wrapper empty-state__icon-wrapper--warning">
          <Calculator class="empty-state__icon" />
        </div>
        <h2 class="empty-state__title">{{ $t('formulas.noData') }}</h2>
        <p class="empty-state__desc">{{ $t('formulas.noDataDesc') }}</p>
        
        <div class="empty-state__actions">
          <BaseButton variant="secondary" @click="router.push('/data')">
            <template #icon-right><ArrowRight /></template>
            {{ $t('formulas.goToData') }}
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div v-else class="formulas-workspace">
      <!-- Left Panel: Columns -->
      <aside class="formulas-sidebar">
        <ColumnList 
          :schema="activeDatasetMeta?.schema || []"
          @insert-column="handleInsertColumn"
          @edit-column="handleEditColumn"
        />
      </aside>
      
      <!-- Right Panel: Editor -->
      <main class="formulas-main">
        <div class="editor-header">
          <h2>Nueva Columna Calculada</h2>
          <div class="dataset-badge">
            {{ activeDatasetMeta?.originalName }}
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Nombre de la columna</label>
            <BaseInput v-model="columnName" placeholder="Ej: Ingresos Totales" />
          </div>
          <div class="form-group flex-1">
            <label>Tipo de dato</label>
            <BaseDropdown v-model="columnType" :options="typeOptions" />
          </div>
        </div>
        
        <div class="editor-container">
          <label class="editor-label">Expresión SQL / Fórmulas</label>
          <div class="cm-wrapper">
            <FormulaEditor 
              v-model="expression"
              :schema="activeDatasetMeta?.schema || []"
            />
          </div>
          <div class="editor-help">
            Ejemplos: <code>[Precio] * [Cantidad]</code>, <code>UPPER([Categoria])</code>, <code>CASE WHEN [Edad] > 18 THEN 'Mayor' ELSE 'Menor' END</code>
          </div>
        </div>
        
        <!-- Action Bar -->
        <div class="action-bar">
          <div class="test-results">
            <div v-if="testResult" class="result-box" :class="testResult.success ? 'result-box--success' : 'result-box--error'">
              <span class="result-label">Resultado de prueba (fila 1):</span>
              <span class="result-value">{{ testResult.success ? testResult.sampleResult : testResult.error }}</span>
            </div>
          </div>
          
          <div class="action-buttons">
            <BaseButton variant="secondary" @click="handleTest" :disabled="!expression">
              <template #icon-left><Play /></template>
              Probar Fómula
            </BaseButton>
            <BaseButton variant="primary" @click="handleSave" :disabled="!expression || !columnName">
              <template #icon-left><Save /></template>
              Guardar Columna
            </BaseButton>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  display: flex;
}

/* Empty State */
.empty-state-wrapper { flex-grow: 1; display: flex; align-items: center; justify-content: center; padding: var(--space-6); }
.empty-state { max-width: 480px; display: flex; flex-direction: column; align-items: center; text-align: center; animation: slideUpFade 0.5s ease-out forwards; }
.empty-state__icon-wrapper { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: var(--space-6); }
.empty-state__icon-wrapper--warning { background-color: var(--color-warning-light); }
.empty-state__icon-wrapper--warning .empty-state__icon { color: var(--color-warning); }
.empty-state__icon { width: 40px; height: 40px; }
.empty-state__title { font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-3); }
.empty-state__desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8); }
.empty-state__actions { display: flex; justify-content: center; width: 100%; }

/* Workspace */
.formulas-workspace {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.formulas-sidebar {
  width: 280px;
  flex-shrink: 0;
  height: 100%;
}

.formulas-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  padding: var(--space-6) var(--space-8);
  gap: var(--space-6);
  background-color: var(--color-bg-primary);
  overflow-y: auto;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-header h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
}

.dataset-badge {
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.form-row {
  display: flex;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label, .editor-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-primary);
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.editor-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex-grow: 1;
  min-height: 250px;
}

.cm-wrapper {
  flex-grow: 1;
  min-height: 200px;
}

.editor-help {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.editor-help code {
  background-color: var(--color-bg-secondary);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: var(--font-mono);
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-border);
  gap: var(--space-4);
}

.test-results {
  flex-grow: 1;
}

.result-box {
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.result-box--success {
  background-color: var(--color-success-light);
  border: 1px solid var(--color-success);
}

.result-box--error {
  background-color: var(--color-danger-light);
  border: 1px solid var(--color-danger);
  color: var(--color-danger);
}

.result-label {
  font-weight: var(--font-medium);
}

.result-value {
  font-family: var(--font-mono);
  font-weight: var(--font-bold);
}

.action-buttons {
  display: flex;
  gap: var(--space-3);
  flex-shrink: 0;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
