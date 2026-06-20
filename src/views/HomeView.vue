<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDataStore } from '@/stores/dataStore'
import { useUiStore } from '@/stores/uiStore'
import { Plus, RefreshCw, Database, FileSpreadsheet, FileText, Cloud, Server, Globe } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const dataStore = useDataStore()
const uiStore = useUiStore()
const { t } = useI18n()

const datasets = computed(() => Array.from(dataStore.datasets.values()))

const totalRows = computed(() => {
  return datasets.value.reduce((sum, ds) => sum + (ds.rowCount || 0), 0)
})

const activeConnections = computed(() => {
  return datasets.value.length
})

const failedSyncs = computed(() => {
  return datasets.value.reduce((sum, ds) => sum + (ds.failedSyncCount || 0), 0)
})

const lastRefresh = computed(() => {
  if (datasets.value.length === 0) return null
  const times = datasets.value.map(ds => ds.importedAt).filter(Boolean).map(d => new Date(d).getTime())
  if (times.length === 0) return null
  return new Date(Math.max(...times)).toLocaleString()
})

function getIconForSource(sourceType) {
  if (sourceType === 'local') return Database
  if (sourceType === 'api') return Globe
  if (sourceType === 'database') return Server
  return FileText
}

function handleManage(name) {
  dataStore.setActiveDataset(name)
  router.push('/data')
}

function handleNewConnection() {
  router.push({ path: '/data', query: { action: 'new' } })
}

const isRefreshing = ref(false)
async function handleRefreshAll() {
  isRefreshing.value = true
  try {
    await dataStore.refreshAll()
    uiStore.addToast({ message: t('home.refreshSuccess', 'Todas las conexiones han sido actualizadas'), type: 'success' })
  } catch (error) {
    uiStore.addToast({ message: t('home.refreshError', 'Hubo un error al actualizar'), type: 'error' })
  } finally {
    isRefreshing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header Area -->
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-xl font-semibold tracking-tight">{{ $t('home.title') }}</h2>
        <p class="text-sm text-muted-foreground">{{ $t('home.subtitle') }}</p>
      </div>
      <BaseButton variant="primary" class="px-6 min-w-[200px]" @click="handleNewConnection">
        <template #icon-left><Plus /></template>
        {{ $t('home.newConnection') }}
      </BaseButton>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="border border-border bg-card p-4 rounded shadow-sm">
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{{ $t('home.activeConnections') }}</div>
        <div class="text-3xl font-bold tracking-tight">{{ activeConnections }}</div>
        <div class="mt-2 flex items-center text-xs text-success font-medium">
          OK
        </div>
      </div>
      <div class="border border-border bg-card p-4 rounded shadow-sm">
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{{ $t('home.totalRows') }}</div>
        <div class="text-3xl font-bold tracking-tight">{{ totalRows > 1000000 ? (totalRows / 1000000).toFixed(1) + 'M' : totalRows > 1000 ? (totalRows / 1000).toFixed(1) + 'K' : totalRows }}</div>
      </div>
      <div class="border border-border bg-card p-4 rounded shadow-sm">
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{{ $t('home.lastRefresh') }}</div>
        <div class="text-3xl font-bold tracking-tight">{{ lastRefresh || '--' }}</div>
      </div>
      <div class="border border-border bg-card p-4 rounded shadow-sm">
        <div class="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{{ $t('home.failedSyncs') }}</div>
        <div class="text-3xl font-bold tracking-tight">{{ failedSyncs }}</div>
        <div v-if="failedSyncs === 0" class="mt-2 flex items-center text-xs text-success font-medium">
          ALL OK
        </div>
        <div v-else class="mt-2 flex items-center text-xs text-destructive font-medium">
          NEEDS ATTENTION
        </div>
      </div>
    </div>

    <!-- Registered Sources Panel -->
    <div class="border border-border bg-card rounded shadow-sm overflow-hidden">
      <div class="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <div>
          <h3 class="font-semibold">{{ $t('home.registeredSources') }}</h3>
          <p class="text-xs text-muted-foreground">{{ $t('home.registeredDesc') }}</p>
        </div>
        <div class="flex gap-2">
          <BaseButton variant="outline" size="sm" :disabled="isRefreshing" @click="handleRefreshAll">
            <RefreshCw class="w-3.5 h-3.5 mr-2" :class="{ 'animate-spin': isRefreshing }" /> {{ $t('home.refreshAll') }}
          </BaseButton>
        </div>
      </div>
      
      <div class="p-4">
        <div v-if="datasets.length === 0" class="text-center py-12 text-muted-foreground">
          <Database class="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p>{{ $t('home.noSources') }}</p>
          <p class="text-sm">{{ $t('home.noSourcesHint') }}</p>
        </div>
        <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div v-for="ds in datasets" :key="ds.name" class="border border-border bg-card hover:border-primary/60 transition-colors flex flex-col rounded shadow-sm">
            <div class="p-3 flex items-start justify-between border-b border-border">
              <div class="flex items-start gap-3 min-w-0">
                <div class="w-9 h-9 bg-muted border border-border grid place-items-center shrink-0 rounded">
                  <component :is="getIconForSource(ds.sourceType)" class="w-4 h-4 text-foreground" />
                </div>
                <div class="min-w-0">
                  <div class="text-sm font-semibold truncate">{{ ds.name }}</div>
                  <div class="text-[11px] text-muted-foreground">{{ ds.sourceType || 'Local' }}</div>
                </div>
              </div>
              <span class="bg-success/20 text-success text-[10px] uppercase font-bold px-2 py-0.5 rounded">{{ $t('home.connected') }}</span>
            </div>
            
            <div class="p-3 grid grid-cols-2 gap-2 text-[11px] flex-1">
              <div>
                <div class="text-muted-foreground uppercase tracking-wider text-[10px]">{{ $t('home.rows') }}</div>
                <div class="font-medium">{{ ds.rowCount || 0 }}</div>
              </div>
              <div>
                <div class="text-muted-foreground uppercase tracking-wider text-[10px]">{{ $t('home.columns') }}</div>
                <div class="font-medium">{{ ds.columns?.length || 0 }}</div>
              </div>
              <div class="col-span-2 truncate text-muted-foreground" :title="ds.lastRefresh ? new Date(ds.lastRefresh).toLocaleString() : $t('home.never')">
                {{ $t('home.lastSync') }}{{ ds.lastRefresh ? new Date(ds.lastRefresh).toLocaleString() : $t('home.never') }}
              </div>
            </div>
            
            <div class="px-3 py-2 border-t border-border flex items-center justify-between bg-muted/40 rounded-b">
              <button class="text-xs text-primary hover:underline font-medium" @click="handleManage(ds.name)">
                {{ $t('home.profileData') }} &rarr;
              </button>
              <button class="text-xs text-muted-foreground hover:text-foreground" @click="handleManage(ds.name)">
                {{ $t('home.manage') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
