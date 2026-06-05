<script setup>
import { useUiStore } from '@/stores/uiStore'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from '@lucide/vue'

const uiStore = useUiStore()

const getIcon = (type) => {
  switch (type) {
    case 'success': return CheckCircle
    case 'error': return XCircle
    case 'warning': return AlertTriangle
    case 'info':
    default: return Info
  }
}
</script>

<template>
  <div class="toast-container" aria-live="polite">
    <TransitionGroup name="toast-list">
      <div 
        v-for="toast in uiStore.toasts" 
        :key="toast.id" 
        class="toast"
        :class="`toast--${toast.type}`"
        role="alert"
      >
        <component :is="getIcon(toast.type)" class="toast__icon" />
        <span class="toast__message">{{ toast.message }}</span>
        <button 
          class="toast__close" 
          aria-label="Cerrar notificación"
          @click="uiStore.removeToast(toast.id)"
        >
          <X />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: var(--space-6);
  right: var(--space-6);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  z-index: var(--z-toast);
  pointer-events: none; /* So clicks pass through if empty */
}

.toast {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background-color: var(--color-bg-surface);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: max-content;
  max-width: 400px;
  border-left: 4px solid transparent;
}

.toast__message {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  flex-grow: 1;
}

.toast__icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.toast__close {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 2px;
  display: flex;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.toast__close:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.toast__close :deep(svg) {
  width: 16px;
  height: 16px;
}

/* Colors based on type */
.toast--success {
  border-left-color: var(--color-success);
}
.toast--success .toast__icon {
  color: var(--color-success);
}

.toast--error {
  border-left-color: var(--color-danger);
}
.toast--error .toast__icon {
  color: var(--color-danger);
}

.toast--warning {
  border-left-color: var(--color-warning);
}
.toast--warning .toast__icon {
  color: var(--color-warning);
}

.toast--info {
  border-left-color: var(--color-info);
}
.toast--info .toast__icon {
  color: var(--color-info);
}

/* Transition Group Animations */
.toast-list-enter-active,
.toast-list-leave-active {
  transition: all var(--transition-normal);
}
.toast-list-enter-from {
  opacity: 0;
  transform: translateY(20px);
}
.toast-list-leave-to {
  opacity: 0;
  transform: scale(0.9);
}
</style>
