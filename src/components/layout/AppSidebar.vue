<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/uiStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { 
  Database, 
  Sparkles, 
  Calculator, 
  LayoutDashboard, 
  PanelLeftClose, 
  PanelLeftOpen,
  Network,
  Presentation,
  Terminal,
  HelpCircle,
  Info,
  Settings,
  ScanSearch,
  Wand2,
  FunctionSquare,
  FileText,
  Zap
} from '@lucide/vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const { t } = useI18n()
const route = useRoute()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()

const isAboutModalOpen = ref(false)

const navItems = computed(() => [
  { name: 'home', icon: Database, label: t('sidebar.nav.home') },
  { name: 'data', icon: Database, label: t('sidebar.nav.data') },
  { name: 'profile', icon: ScanSearch, label: t('sidebar.nav.profile') },
  { name: 'cleaning', icon: Wand2, label: t('sidebar.nav.cleaning') },
  { name: 'modeling', icon: Network, label: t('sidebar.nav.modeling') },
  { name: 'formulas', icon: FunctionSquare, label: t('sidebar.nav.formulas') },
  { name: 'dashboard', icon: LayoutDashboard, label: t('sidebar.nav.dashboard') },
  { name: 'reports', icon: FileText, label: t('sidebar.nav.reports') },
  { name: 'python', icon: Terminal, label: t('sidebar.nav.python') }
])
</script>

<template>
  <aside class="w-[220px] shrink-0 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border transition-all duration-300" :class="{ 'w-[60px]': uiStore.sidebarCollapsed }">
    <div class="h-14 flex items-center gap-2 px-4 border-b border-sidebar-border overflow-hidden shrink-0">
      <div class="w-7 h-7 bg-primary flex items-center justify-center rounded-none">
        <Zap class="w-4 h-4 text-primary-foreground" :stroke-width="2.5" />
      </div>
      <div v-if="!uiStore.sidebarCollapsed" class="leading-tight truncate">
        <div class="text-sm font-semibold tracking-tight">LiteBI</div>
        <div class="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
          {{ $t('sidebar.workspace') }}
        </div>
      </div>
    </div>

    <nav class="flex-1 py-3 overflow-y-auto overflow-x-hidden">
      <div v-if="!uiStore.sidebarCollapsed" class="px-4 pb-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50">
        {{ $t('sidebar.modules') }}
      </div>
      <router-link 
        v-for="item in navItems" 
        :key="item.name"
        :to="{ name: item.name }"
        class="flex items-center gap-3 px-4 py-2 text-sm border-l-2 transition-colors"
        :class="[
          route.name === item.name || route.path.startsWith('/' + item.name)
            ? 'border-primary bg-sidebar-accent text-sidebar-accent-foreground'
            : 'border-transparent text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground'
        ]"
        :title="uiStore.sidebarCollapsed ? item.label : ''"
      >
        <component :is="item.icon" class="w-4 h-4 shrink-0" />
        <span v-if="!uiStore.sidebarCollapsed" class="truncate">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="p-3 border-t border-sidebar-border text-[11px] text-sidebar-foreground/60 space-y-2">
      <div class="flex flex-col gap-1">
        <router-link to="/settings" class="flex items-center gap-3 px-2 py-1.5 rounded-none hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors" :title="uiStore.sidebarCollapsed ? $t('sidebar.settings') : ''">
          <Settings class="w-4 h-4 shrink-0" />
          <span v-if="!uiStore.sidebarCollapsed">{{ $t('sidebar.settings') }}</span>
        </router-link>
        
        <button class="flex items-center gap-3 px-2 py-1.5 rounded-none hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors w-full text-left" :title="uiStore.sidebarCollapsed ? $t('sidebar.collapse') : ''" @click="uiStore.toggleSidebar">
          <PanelLeftOpen v-if="uiStore.sidebarCollapsed" class="w-4 h-4 shrink-0" />
          <PanelLeftClose v-else class="w-4 h-4 shrink-0" />
          <span v-if="!uiStore.sidebarCollapsed">{{ $t('sidebar.collapse') }}</span>
        </button>
      </div>

      <div v-if="!uiStore.sidebarCollapsed" class="flex items-center justify-between pt-2 border-t border-sidebar-border/20">
        <span>v1.4.2</span>
        <span class="flex items-center gap-1">
          <span class="w-1.5 h-1.5 bg-success rounded-full"></span>
          {{ $t('sidebar.engineReady') }}
        </span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* Tailwind CSS handled styles */
</style>
