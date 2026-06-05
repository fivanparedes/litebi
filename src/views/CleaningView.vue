<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Sparkles, ArrowRight } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDataStore } from '@/stores/dataStore'
import { useProjectStore } from '@/stores/projectStore'
import { TransformPipeline } from '@/modules/cleaning/TransformPipeline'
import DataGrid from '@/modules/cleaning/DataGrid.vue'
import TransformPanel from '@/modules/cleaning/TransformPanel.vue'

const { t } = useI18n()
const router = useRouter()
const dataStore = useDataStore()
const projectStore = useProjectStore()

const hasData = computed(() => !!dataStore.activeDatasetName)

// Pipeline state
const pipeline = ref(null)
const previewData = ref([])
const currentSchema = ref([])
const pipelineSteps = ref([])

const updatePreview = async () => {
  if (pipeline.value) {
    // For large datasets, Tabulator pagination + getPreviewData is safer
    // In MVP, we pass the full transformed dataset to Tabulator since AlaSQL is fast
    const result = await pipeline.value.executePipeline()
    previewData.value = result.data
    currentSchema.value = result.schema
    pipelineSteps.value = [...pipeline.value.steps]
    
    // Persist to store
    const meta = dataStore.activeDatasetMeta
    if (meta) {
      meta.transformations = JSON.parse(JSON.stringify(pipeline.value.steps))
      projectStore.markDirty()
    }
  }
}

// Initialize pipeline when dataset changes
watch(() => dataStore.activeDatasetName, async (newName) => {
  if (newName) {
    const meta = dataStore.activeDatasetMeta
    pipeline.value = new TransformPipeline(newName, meta.schema)
    if (meta.transformations && meta.transformations.length > 0) {
      pipeline.value.steps = JSON.parse(JSON.stringify(meta.transformations))
    }
    await updatePreview()
  } else {
    pipeline.value = null
    previewData.value = []
    currentSchema.value = []
    pipelineSteps.value = []
  }
}, { immediate: true })

const handleAddStep = async (transformId, config) => {
  await pipeline.value.addStep(transformId, config)
  await updatePreview()
}

const handleRemoveStep = async (stepId) => {
  await pipeline.value.removeStep(stepId)
  await updatePreview()
}

const handleToggleStep = async (stepId) => {
  await pipeline.value.toggleStep(stepId)
  await updatePreview()
}

// TODO: In a real app, there would be a 'Save' button to persist the transformed
// data back to the main data store as a new view/table.
</script>

<template>
  <div class="view-container">
    <div v-if="!hasData" class="empty-state-wrapper">
      <div class="empty-state">
        <div class="empty-state__icon-wrapper empty-state__icon-wrapper--success">
          <Sparkles class="empty-state__icon" />
        </div>
        <h2 class="empty-state__title">{{ $t('cleaning.noData') }}</h2>
        <p class="empty-state__desc">{{ $t('cleaning.noDataDesc') }}</p>
        
        <div class="empty-state__actions">
          <BaseButton variant="secondary" @click="router.push('/data')">
            <template #icon-right><ArrowRight /></template>
            {{ $t('cleaning.goToData') }}
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div v-else class="cleaning-workspace">
      <!-- Left Panel: Transform Pipeline -->
      <aside class="cleaning-sidebar">
        <TransformPanel 
          :pipeline-steps="pipelineSteps"
          :schema="currentSchema"
          @add-step="handleAddStep"
          @remove-step="handleRemoveStep"
          @toggle-step="handleToggleStep"
        />
      </aside>
      
      <!-- Right Panel: Data Grid -->
      <main class="cleaning-main">
        <div class="cleaning-main__header">
          <div class="dataset-info">
            <span class="dataset-name">{{ dataStore.activeDatasetMeta?.originalName }}</span>
            <span class="dataset-stats">{{ previewData.length }} filas • {{ currentSchema.length }} columnas</span>
          </div>
        </div>
        
        <div class="cleaning-main__grid">
          <DataGrid 
            v-if="currentSchema.length > 0"
            :data="previewData" 
            :schema="currentSchema" 
          />
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
.empty-state-wrapper {
  flex-grow: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
}

.empty-state {
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  animation: slideUpFade 0.5s ease-out forwards;
}

.empty-state__icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--space-6);
}

.empty-state__icon-wrapper--success { background-color: var(--color-success-light); }
.empty-state__icon-wrapper--success .empty-state__icon { color: var(--color-success); }
.empty-state__icon { width: 40px; height: 40px; }
.empty-state__title { font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-3); }
.empty-state__desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8); }
.empty-state__actions { display: flex; justify-content: center; width: 100%; }

/* Workspace */
.cleaning-workspace {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.cleaning-sidebar {
  width: 300px;
  flex-shrink: 0;
  height: 100%;
}

.cleaning-main {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: var(--space-4);
  gap: var(--space-4);
  background-color: var(--color-bg-primary);
}

.cleaning-main__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}

.dataset-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.dataset-name {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
}

.dataset-stats {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  background-color: var(--color-bg-secondary);
  padding: 2px 8px;
  border-radius: var(--radius-full);
}

.cleaning-main__grid {
  flex-grow: 1;
  overflow: hidden;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
