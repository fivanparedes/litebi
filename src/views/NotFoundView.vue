<script setup>
import { useRouter } from 'vue-router'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Home } from '@lucide/vue'

const router = useRouter()
</script>

<template>
  <div class="not-found-view">
    <div class="not-found-content">
      <h1 class="error-code">404</h1>
      <h2 class="error-title">{{ $t('error.notFound') || 'Página no encontrada' }}</h2>
      <p class="error-desc">{{ $t('error.notFoundDesc') || 'Lo sentimos, la página que estás buscando no existe o ha sido movida.' }}</p>
      <BaseButton @click="router.push('/')">
        <template #icon-left><Home size="16" /></template>
        {{ $t('action.goHome') || 'Volver al Inicio' }}
      </BaseButton>
    </div>
  </div>
</template>

<style scoped>
.not-found-view {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-primary);
}

.not-found-content {
  text-align: center;
  max-width: 400px;
  padding: var(--space-6);
}

.error-code {
  font-size: 6rem;
  font-weight: var(--font-bold);
  color: var(--color-accent);
  line-height: 1;
  margin: 0 0 var(--space-2) 0;
}

.error-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0 0 var(--space-3) 0;
}

.error-desc {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
  margin: 0 0 var(--space-6) 0;
  line-height: 1.5;
}
</style>
