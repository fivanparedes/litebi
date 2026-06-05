<script setup>
import { useUiStore } from '@/stores/uiStore'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const uiStore = useUiStore()
</script>

<template>
  <div class="app-layout" :class="{ 'app-layout--collapsed': uiStore.sidebarCollapsed && !uiStore.isViewerMode, 'app-layout--viewer': uiStore.isViewerMode }">
    <AppSidebar v-if="!uiStore.isViewerMode" class="app-layout__sidebar" />
    <div class="app-layout__main">
      <AppHeader class="app-layout__header" />
      <main class="app-layout__content">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" :key="route.path" v-if="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
.app-layout {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  height: 100vh;
  width: 100vw;
  transition: grid-template-columns var(--transition-normal);
}

.app-layout--collapsed {
  grid-template-columns: var(--sidebar-collapsed-width) 1fr;
}

.app-layout--viewer {
  grid-template-columns: 0 1fr;
}

.app-layout__sidebar {
  grid-column: 1 / 2;
  height: 100%;
  overflow: hidden;
}

.app-layout__main {
  grid-column: 2 / 3;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-bg-primary);
}

.app-layout__header {
  flex-shrink: 0;
}

.app-layout__content {
  flex-grow: 1;
  overflow-y: auto;
  position: relative;
}
</style>
