<script setup>
import { onMounted } from 'vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import BaseToast from '@/components/ui/BaseToast.vue'
import { useProjectStore } from '@/stores/projectStore'

const projectStore = useProjectStore()

onMounted(() => {
  projectStore.autoLoad()
})
</script>

<template>
  <AppLayout />
  <BaseToast />
</template>

<style>
/* Global styles imported in main.js via index.css */
</style>
