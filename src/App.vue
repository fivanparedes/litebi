<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import CommandPalette from '@/components/ui/CommandPalette.vue'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'
import { Loader2 } from '@lucide/vue'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

const isBooting = ref(true)

const handleKeydown = (e) => {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    projectStore.saveProject()
  } else if (e.ctrlKey && e.key === 'y') {
    e.preventDefault()
    projectStore.redo()
  } else if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    projectStore.redo()
  } else if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
    e.preventDefault()
    projectStore.undo()
  }
}

onMounted(async () => {
  const removeLoaders = () => {
    const loader = document.getElementById('global-loader')
    if (loader) {
      loader.classList.add('fade-out')
      setTimeout(() => {
        if (loader.parentNode) loader.remove()
      }, 400)
    }
    if (window.electronAPI && window.electronAPI.appReady) {
      window.electronAPI.appReady()
    }
  }

  // Failsafe timer: always hide loaders after 10 seconds, regardless of hangs
  const failsafeTimer = setTimeout(removeLoaders, 10000)

  try {
    await projectStore.autoLoad()
  } catch (error) {
    console.error("Error durante autoLoad en inicio:", error)
  } finally {
    clearTimeout(failsafeTimer)
    settingsStore.setTheme(settingsStore.theme)
    settingsStore.setUiScale(settingsStore.uiScale)
    window.addEventListener('keydown', handleKeydown)
    removeLoaders()
    setTimeout(() => { isBooting.value = false }, 300)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <AppLayout />
  <CommandPalette v-model="uiStore.isCommandPaletteOpen" />
  <BaseToast />
  
  <div v-if="isBooting" class="fixed inset-0 z-[9999] bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center transition-opacity duration-300">
    <Loader2 class="w-12 h-12 text-primary animate-spin mb-4" />
    <h2 class="text-xl font-semibold text-foreground tracking-tight">{{ $t('header.loadingProject', 'Loading Project...') }}</h2>
    <p class="text-sm text-muted-foreground mt-2">{{ $t('header.loadingMetadata', 'Loading metadata and preparing workspace') }}</p>
  </div>
</template>

<style>
/* Global styles imported in main.js via index.css */
</style>
