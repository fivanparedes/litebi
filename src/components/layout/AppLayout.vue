<script setup>
import { useUiStore } from '@/stores/uiStore'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'

const uiStore = useUiStore()
</script>

<template>
  <div class="flex min-h-screen bg-background text-foreground overflow-hidden">
    <!-- Sidebar -->
    <AppSidebar v-if="!uiStore.isViewerMode" class="shrink-0" />
    
    <!-- Main -->
    <div class="flex-1 flex flex-col min-w-0 h-screen">
      <!-- Header -->
      <AppHeader />
      
      <!-- Content Area -->
      <main class="flex-1 overflow-auto p-6 relative">
        <router-view v-slot="{ Component, route }">
          <transition name="fade" mode="out-in">
            <component :is="Component" v-if="Component" :key="route.path" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<style scoped>
/* Transiciones y comportamientos específicos si es necesario, 
   pero la mayoría del layout ahora es manejado por Tailwind CSS */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
