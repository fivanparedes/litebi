<script setup>
import { ref, onErrorCaptured } from 'vue'
import { AlertTriangle, RefreshCw } from '@lucide/vue'
import BaseButton from '@/components/ui/BaseButton.vue'

const hasError = ref(false)
const errorMessage = ref('')

// Interceptar cualquier error en los hijos
onErrorCaptured((err, instance, info) => {
  console.error('[ErrorBoundary] Atrapado error en widget:', err, info)
  hasError.value = true
  errorMessage.value = err.message || 'Error desconocido'
  // Evitar que el error se propague hacia arriba (y crashee la app principal)
  return false
})

const resetError = () => {
  hasError.value = false
  errorMessage.value = ''
}
</script>

<template>
  <div v-if="hasError" class="error-boundary-wrapper">
    <div class="error-content">
      <AlertTriangle class="error-icon" />
      <h3 class="error-title">Error al cargar widget</h3>
      <p class="error-message" :title="errorMessage">{{ errorMessage }}</p>
      <BaseButton variant="ghost" size="sm" class="retry-btn" @click="resetError">
        <template #icon-left><RefreshCw size="14" /></template>
        Reintentar
      </BaseButton>
    </div>
  </div>
  <slot v-else></slot>
</template>

<style scoped>
.error-boundary-wrapper {
  width: 100%;
  height: 100%;
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--muted);
  border: 1px dashed var(--color-danger);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
}

.error-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.error-icon {
  color: var(--color-danger);
  width: 32px;
  height: 32px;
}

.error-title {
  color: var(--foreground);
  font-size: var(--text-sm);
  font-weight: 600;
  margin: 0;
}

.error-message {
  color: var(--muted-foreground);
  font-size: var(--text-xs);
  margin: 0;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.retry-btn {
  margin-top: var(--space-2);
}
</style>
