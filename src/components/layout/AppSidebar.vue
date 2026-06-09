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
  Settings
} from '@lucide/vue'
import BaseModal from '@/components/ui/BaseModal.vue'

const { t } = useI18n()
const route = useRoute()
const uiStore = useUiStore()
const settingsStore = useSettingsStore()

const isAboutModalOpen = ref(false)

const navItems = computed(() => [
  { name: 'data', icon: Database, label: t('nav.data') },
  { name: 'cleaning', icon: Sparkles, label: t('nav.cleaning') },
  { name: 'modeling', icon: Network, label: t('nav.modeling') },
  { name: 'formulas', icon: Calculator, label: t('nav.formulas') },
  { name: 'dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
  { name: 'reports', icon: Presentation, label: t('nav.reports') },
  { name: 'python', icon: Terminal, label: 'Consola Python' }
])
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar__top">
      <div class="sidebar__logo">
        <img v-if="settingsStore.companyLogo" :src="settingsStore.companyLogo" class="sidebar__custom-logo" alt="Company Logo" />
        <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" class="sidebar__logo-icon">
          <rect width="32" height="32" rx="6" fill="#2563EB"/>
          <path d="M8 22V14h4v8H8zm6 0V10h4v12h-4zm6 0V17h4v5h-4z" fill="white"/>
        </svg>
        <span v-if="!uiStore.sidebarCollapsed && !settingsStore.companyLogo" class="sidebar__logo-text">LiteBI</span>
      </div>
    </div>

    <nav class="sidebar__nav">
      <router-link 
        v-for="item in navItems" 
        :key="item.name"
        :to="{ name: item.name }"
        class="nav-item"
        :class="{ 'nav-item--active': route.name === item.name }"
        :title="uiStore.sidebarCollapsed ? item.label : ''"
      >
        <component :is="item.icon" class="nav-item__icon" />
        <span v-if="!uiStore.sidebarCollapsed" class="nav-item__label">{{ item.label }}</span>
      </router-link>
    </nav>

    <div class="sidebar__bottom">
      <router-link to="/settings" class="nav-item" :class="{ 'nav-item--active': route.name === 'settings' }" :title="uiStore.sidebarCollapsed ? 'Configuración' : ''">
        <Settings class="nav-item__icon" />
        <span v-if="!uiStore.sidebarCollapsed" class="nav-item__label">Configuración</span>
      </router-link>

      <router-link to="/help" class="nav-item" :class="{ 'nav-item--active': route.name === 'help' }" :title="uiStore.sidebarCollapsed ? 'Manual de Usuario' : ''">
        <HelpCircle class="nav-item__icon" />
        <span v-if="!uiStore.sidebarCollapsed" class="nav-item__label">Manual de Usuario</span>
      </router-link>
      
      <button class="nav-item collapse-btn" :title="uiStore.sidebarCollapsed ? 'Acerca de' : ''" @click="isAboutModalOpen = true">
        <Info class="nav-item__icon" />
        <span v-if="!uiStore.sidebarCollapsed" class="nav-item__label">Acerca de</span>
      </button>

      <div class="sidebar__divider"></div>

      <button class="nav-item collapse-btn" :title="uiStore.sidebarCollapsed ? t('nav.expand') : t('nav.collapse')" @click="uiStore.toggleSidebar">
        <PanelLeftOpen v-if="uiStore.sidebarCollapsed" class="nav-item__icon" />
        <PanelLeftClose v-else class="nav-item__icon" />
        <span v-if="!uiStore.sidebarCollapsed" class="nav-item__label">Contraer</span>
      </button>
    </div>

    <!-- About Modal -->
    <BaseModal v-model="isAboutModalOpen" title="Acerca de LiteBI" size="sm">
      <div class="about-content" style="max-height: 400px; overflow-y: auto;">
        <div class="about-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none" class="about-logo-icon">
            <rect width="32" height="32" rx="6" fill="#2563EB"/>
            <path d="M8 22V14h4v8H8zm6 0V10h4v12h-4zm6 0V17h4v5h-4z" fill="white"/>
          </svg>
          <h2>LiteBI</h2>
          <p class="version">v0.1.0</p>
        </div>
        
        <div class="about-info" style="margin-bottom: 16px;">
          <p>Desarrollado por:</p>
          <h3>Fernando Ivan Paredes</h3>
          <a href="https://github.com/fivanparedes" target="_blank" rel="noopener noreferrer">github.com/fivanparedes</a>
        </div>

        <div class="about-tech" style="text-align: left; font-size: 12px; border-top: 1px solid var(--color-border); padding-top: 12px;">
          <p style="font-weight: 600; margin-bottom: 8px;">Tecnologías Open Source:</p>
          <ul style="padding-left: 20px; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 16px;">
            <li><strong>Vue 3</strong> (MIT License)</li>
            <li><strong>Apache ECharts</strong> (Apache 2.0 License)</li>
            <li><strong>AlaSQL</strong> (MIT License)</li>
            <li><strong>Pyodide & Python</strong> (MPL 2.0 / PSF License)</li>
            <li><strong>MapLibre GL JS</strong> (BSD 3-Clause License)</li>
            <li><strong>Vite</strong> (MIT License)</li>
            <li><strong>Lucide Icons</strong> (ISC License)</li>
          </ul>
        </div>
        
        <div class="about-footer">
          <p>Licencia GPL v3</p>
        </div>
      </div>
    </BaseModal>
  </aside>
</template>

<style scoped>
.sidebar {
  background-color: var(--color-bg-sidebar);
  color: var(--color-text-sidebar);
  display: flex;
  flex-direction: column;
  transition: width var(--transition-normal);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar__top {
  height: var(--header-height);
  display: flex;
  align-items: center;
  padding: 0 var(--space-4);
  flex-shrink: 0;
}

.sidebar__logo {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  overflow: hidden;
}

.sidebar__custom-logo {
  max-height: 32px;
  max-width: 100%;
  object-fit: contain;
}

.sidebar__logo-icon {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
}

.sidebar__logo-text {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--color-text-inverse);
  white-space: nowrap;
}

.sidebar__nav {
  flex-grow: 1;
  padding: var(--space-4) var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-y: auto;
  overflow-x: hidden;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-sidebar);
  text-decoration: none;
  transition: all var(--transition-fast);
  border-left: 3px solid transparent;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: var(--color-bg-sidebar-hover);
}

.nav-item--active {
  background-color: var(--color-bg-sidebar-active);
  color: var(--color-text-sidebar-active);
  border-left-color: var(--color-accent);
}

.nav-item__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.nav-item__label {
  font-weight: var(--font-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sidebar__bottom {
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sidebar__divider {
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  margin: var(--space-2) 0;
}

.collapse-btn {
  background: transparent;
  border: none;
  width: 100%;
  cursor: pointer;
  outline: none;
}

/* About Modal Styles */
.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: var(--space-4) 0;
}

.about-logo {
  margin-bottom: var(--space-6);
}

.about-logo-icon {
  width: 64px;
  height: 64px;
  margin-bottom: var(--space-2);
}

.about-logo h2 {
  margin: 0;
  color: var(--color-text-primary);
  font-size: var(--text-2xl);
}

.version {
  color: var(--color-text-tertiary);
  margin: 0;
  font-size: var(--text-sm);
}

.about-info {
  margin-bottom: var(--space-6);
}

.about-info p {
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-1) 0;
}

.about-info h3 {
  color: var(--color-text-primary);
  margin: 0 0 var(--space-2) 0;
  font-size: var(--text-lg);
}

.about-info a {
  color: var(--color-accent);
  text-decoration: none;
}

.about-info a:hover {
  text-decoration: underline;
}

.about-footer {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
  border-top: 1px solid var(--color-border);
  padding-top: var(--space-4);
  width: 100%;
}
</style>
