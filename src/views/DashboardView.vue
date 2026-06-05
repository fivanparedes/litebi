<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { LayoutDashboard, ArrowRight, Plus, X } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useUiStore } from '@/stores/uiStore'
import DashboardTabs from '@/modules/dashboard/DashboardTabs.vue'
import DashboardCanvas from '@/modules/dashboard/DashboardCanvas.vue'
import WidgetConfigurator from '@/modules/visualization/WidgetConfigurator.vue'

const { t } = useI18n()
const router = useRouter()
const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const uiStore = useUiStore()

const hasData = computed(() => !!dataStore.activeDatasetName)

const editingWidgetId = ref(null)

const editingWidgetConfig = computed({
  get() {
    if (!editingWidgetId.value) return {}
    const layout = dashboardStore.activeLayout
    const w = layout.find(x => x.id === editingWidgetId.value)
    return w?.config || { type: 'bar' }
  },
  set(val) {
    if (!editingWidgetId.value) return
    const layout = [...dashboardStore.activeLayout]
    const idx = layout.findIndex(x => x.id === editingWidgetId.value)
    if (idx !== -1) {
      layout[idx] = { ...layout[idx], config: val }
      dashboardStore.updateLayout(dashboardStore.activeTabId, layout)
    }
  }
})

const handleAddWidget = () => {
  const newConfig = { 
    type: 'bar', 
    dataset: dataStore.activeDatasetName 
  }
  dashboardStore.addWidget(dashboardStore.activeTabId, { config: newConfig })
}

const handleRemoveWidget = (widgetId) => {
  if (editingWidgetId.value === widgetId) editingWidgetId.value = null
  dashboardStore.removeWidget(dashboardStore.activeTabId, widgetId)
}

const handleUpdateLayout = (newLayout) => {
  dashboardStore.updateLayout(dashboardStore.activeTabId, newLayout)
}

const handleEditWidget = (widgetId) => {
  editingWidgetId.value = widgetId
}
</script>

<template>
  <div class="view-container">
    <div v-if="!hasData" class="empty-state-wrapper">
      <div class="empty-state">
        <div class="empty-state__icon-wrapper empty-state__icon-wrapper--info">
          <LayoutDashboard class="empty-state__icon" />
        </div>
        <h2 class="empty-state__title">{{ $t('dashboard.noData') }}</h2>
        <p class="empty-state__desc">{{ $t('dashboard.noDataDesc') }}</p>
        
        <div class="empty-state__actions">
          <BaseButton variant="secondary" @click="router.push('/data')">
            <template #icon-right><ArrowRight /></template>
            {{ $t('dashboard.goToData') }}
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div v-else id="dashboard-export-area" class="dashboard-workspace">
      <!-- Top Tabs -->
      <DashboardTabs />
      
      <!-- Toolbar -->
      <div class="dashboard-toolbar">
        <div class="toolbar-left">
          <span class="dataset-badge">Dataset: {{ dataStore.activeDatasetMeta?.originalName }}</span>
        </div>
        
        <!-- Active Filters Bar -->
        <div v-if="dashboardStore.globalFilters.length > 0" class="active-filters">
          <span class="filter-label">Filtros Activos:</span>
          <div 
            v-for="f in dashboardStore.globalFilters" 
            :key="f.id"
            class="filter-chip"
          >
            <span class="filter-chip-text">{{ f.label }}</span>
            <button class="filter-chip-close" @click="dashboardStore.removeFilter(f.id)">
              <X size="12" />
            </button>
          </div>
          <button class="clear-filters-btn" @click="dashboardStore.clearFilters()">Limpiar</button>
        </div>

        <div class="toolbar-right">
          <BaseButton v-if="!uiStore.isViewerMode" variant="primary" size="sm" @click="handleAddWidget">
            <template #icon-left><Plus /></template>
            Añadir Widget
          </BaseButton>
        </div>
      </div>
      
      <!-- Canvas & Configurator Area -->
      <div class="dashboard-body">
        <DashboardCanvas 
          :layout="dashboardStore.activeLayout"
          :tab-id="dashboardStore.activeTabId"
          @update:layout="handleUpdateLayout"
          @remove-widget="handleRemoveWidget"
          @edit-widget="handleEditWidget"
        />
        
        <WidgetConfigurator 
          v-if="editingWidgetId"
          :config="editingWidgetConfig"
          @update:config="val => editingWidgetConfig = val"
          @close="editingWidgetId = null"
        />
      </div>
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
.empty-state__icon-wrapper--info { background-color: var(--color-info-light); }
.empty-state__icon-wrapper--info .empty-state__icon { color: var(--color-info); }
.empty-state__icon { width: 40px; height: 40px; }
.empty-state__title { font-size: var(--text-xl); font-weight: var(--font-semibold); margin-bottom: var(--space-3); }
.empty-state__desc { font-size: var(--text-sm); color: var(--color-text-secondary); margin-bottom: var(--space-8); }
.empty-state__actions { display: flex; justify-content: center; width: 100%; }

/* Workspace */
.dashboard-workspace {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background-color: var(--color-bg-surface);
}

.dashboard-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background-color: transparent;
  border-bottom: 1px solid var(--color-border);
}

.dataset-badge {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-secondary);
  padding: 4px 12px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.active-filters {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  margin-left: var(--space-4);
}

.filter-label {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-weight: var(--font-medium);
}

.filter-chip {
  display: flex;
  align-items: center;
  background-color: var(--color-accent-light);
  color: var(--color-accent);
  border: 1px solid var(--color-accent);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.filter-chip-close {
  background: none;
  border: none;
  color: var(--color-accent);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin-left: 4px;
  opacity: 0.7;
}

.filter-chip-close:hover {
  opacity: 1;
}

.clear-filters-btn {
  background: none;
  border: none;
  color: var(--color-danger);
  font-size: var(--text-xs);
  cursor: pointer;
}

.clear-filters-btn:hover {
  text-decoration: underline;
}

.dashboard-body {
  display: flex;
  flex-grow: 1;
  overflow: hidden;
}

/* Hide UI on export */
.is-exporting .dashboard-toolbar { display: none !important; }
.is-exporting .active-filters { display: none !important; }

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
