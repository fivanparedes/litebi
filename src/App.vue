<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import CommandPalette from '@/components/ui/CommandPalette.vue'
import { useProjectStore } from '@/stores/projectStore'
import { useSettingsStore } from '@/stores/settingsStore'
import { useUiStore } from '@/stores/uiStore'

const projectStore = useProjectStore()
const settingsStore = useSettingsStore()
const uiStore = useUiStore()

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
</template>

<style>
/* Global styles imported in main.js via index.css */
</style>
