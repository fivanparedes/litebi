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
import DashboardTabSettingsModal from '@/modules/dashboard/DashboardTabSettingsModal.vue'
import { useSettingsStore } from '@/stores/settingsStore'

const { t } = useI18n()
const router = useRouter()
const dataStore = useDataStore()
const dashboardStore = useDashboardStore()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()

const hasData = computed(() => !!dataStore.activeDatasetName)

const isTabSettingsModalOpen = ref(false)

const workspaceStyle = computed(() => {
  const tab = dashboardStore.tabs.find(t => t.id === dashboardStore.activeTabId)
  if (!tab || !tab.settings) return {}
  
  const styles = {}
  if (tab.settings.backgroundColor) {
    styles.backgroundColor = tab.settings.backgroundColor
  }
  if (tab.settings.backgroundImage) {
    // If it's a raw URL (http...) or data URI (data:...) we wrap it in url()
    // if it doesn't already have it
    let bgUrl = tab.settings.backgroundImage
    if (!bgUrl.startsWith('url(')) {
      bgUrl = `url("${bgUrl}")`
    }
    styles.backgroundImage = bgUrl
    styles.backgroundSize = tab.settings.backgroundSize || 'cover'
    styles.backgroundPosition = 'center'
    styles.backgroundRepeat = 'no-repeat'
  }
  
  // Fallback to palette specific dashboardBg if no custom background is set
  if (!styles.backgroundColor && !styles.backgroundImage) {
    const palette = settingsStore.palettes[settingsStore.chartPaletteId]
    if (palette) {
      const isDark = settingsStore.theme === 'dark'
      styles.backgroundColor = isDark ? palette.dashboardBgDark : palette.dashboardBgLight
    }
  }
  
  return styles
})

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
  const currentLayout = dashboardStore.activeLayout || []
  const visualNumber = currentLayout.length + 1
  const newConfig = { 
    title: `Visual_${visualNumber}`,
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
  <div class="flex flex-col h-full bg-background overflow-hidden relative">
    <div v-if="!hasData" class="flex-1 flex items-center justify-center p-6">
      <div class="max-w-[480px] flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div class="w-20 h-20 rounded-full bg-info-light flex items-center justify-center mb-6">
          <LayoutDashboard class="w-10 h-10 text-info" />
        </div>
        <h2 class="text-xl font-semibold mb-3">{{ $t('dashboard.noData') }}</h2>
        <p class="text-sm text-muted-foreground mb-8">{{ $t('dashboard.noDataDesc') }}</p>
        
        <div class="flex justify-center w-full">
          <BaseButton variant="outline" @click="router.push('/data')">
            <template #icon-right><ArrowRight /></template>
            {{ $t('dashboard.goToData') }}
          </BaseButton>
        </div>
      </div>
    </div>
    
    <div v-else id="dashboard-export-area" class="flex flex-col w-full h-full bg-background">
      <!-- Top Tabs -->
      <DashboardTabs />
      
      <!-- Toolbar -->
      <div class="flex justify-between items-center px-4 py-3 bg-transparent border-b border-border [html.is-exporting_&]:hidden">
        <div class="flex items-center gap-4">
          <!-- Active Filters Bar -->
          <div v-if="dashboardStore.globalFilters.length > 0" class="flex items-center gap-2 flex-wrap">
            <span class="text-xs text-muted-foreground font-medium">{{ $t('dashboardView.activeFilters') }}</span>
            <div 
              v-for="f in dashboardStore.globalFilters" 
              :key="f.id"
              class="flex items-center bg-accent-light text-accent border border-accent px-2 py-0.5 rounded-full text-xs font-medium"
            >
              <span class="mr-1">{{ f.label }}</span>
              <button class="hover:opacity-100 opacity-70 transition-opacity" @click="dashboardStore.removeFilter(f.id)">
                <X class="w-3 h-3" />
              </button>
            </div>
            <button class="text-xs text-danger hover:underline ml-2" @click="dashboardStore.clearFilters()">{{ $t('dashboardView.clear') }}</button>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <BaseButton v-if="!uiStore.isViewerMode" variant="outline" size="sm" @click="isTabSettingsModalOpen = true">
            {{ $t('dashboardView.settings') }}
          </BaseButton>
          <BaseButton v-if="!uiStore.isViewerMode" variant="primary" size="sm" @click="handleAddWidget">
            <template #icon-left><Plus class="w-4 h-4" /></template>
            {{ $t('dashboardView.addWidget') }}
          </BaseButton>
        </div>
      </div>
      
      <!-- Canvas & Configurator Area -->
      <div class="flex flex-1 overflow-hidden relative" :style="workspaceStyle">
        <DashboardCanvas 
          class="flex-1 overflow-auto"
          :layout="dashboardStore.activeLayout"
          :tab-id="dashboardStore.activeTabId"
          @update:layout="handleUpdateLayout"
          @remove-widget="handleRemoveWidget"
          @edit-widget="handleEditWidget"
        />
        
        <WidgetConfigurator 
          v-if="editingWidgetId"
          :config="editingWidgetConfig"
          :tab-id="dashboardStore.activeTabId"
          @update:config="val => editingWidgetConfig = val"
          @close="editingWidgetId = null"
        />
        
        <DashboardTabSettingsModal 
          v-if="isTabSettingsModalOpen"
          :tab-id="dashboardStore.activeTabId"
          @close="isTabSettingsModalOpen = false"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Tailwind handles the styling */
</style>
