<script setup>
import { onMounted, onUnmounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import { useProjectStore } from '@/stores/projectStore'

const projectStore = useProjectStore()

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

onMounted(() => {
  projectStore.autoLoad()
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <AppLayout />
  <BaseToast />
</template>

<style>
/* Global styles imported in main.js via index.css */
</style>
