<script setup>
import { computed } from 'vue'
import { X } from '@lucide/vue'
import BaseButton from './BaseButton.vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  title: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  closable: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'close'])

const close = () => {
  if (props.closable) {
    emit('update:modelValue', false)
    emit('close')
  }
}

const handleBackdropClick = (e) => {
  if (e.target === e.currentTarget) {
    close()
  }
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    close()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div 
        v-if="modelValue" 
        class="modal-overlay" 
        @click="handleBackdropClick"
        @keydown="handleKeydown"
        tabindex="0"
      >
        <Transition name="scale">
          <div v-if="modelValue" class="modal-card" :class="`modal-card--${size}`" role="dialog" aria-modal="true">
            
            <header class="modal-header">
              <h2 class="modal-title">{{ title }}</h2>
              <BaseButton 
                v-if="closable"
                variant="ghost" 
                size="sm" 
                icon 
                @click="close"
                aria-label="Cerrar modal"
              >
                <X />
              </BaseButton>
            </header>

            <main class="modal-body">
              <slot></slot>
            </main>

            <footer v-if="$slots.footer" class="modal-footer">
              <slot name="footer"></slot>
            </footer>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--color-bg-overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal-backdrop);
  padding: var(--space-4);
}

.modal-card {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
  width: 100%;
  z-index: var(--z-modal);
}

.modal-card--sm { max-width: 400px; }
.modal-card--md { max-width: 560px; }
.modal-card--lg { max-width: 720px; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-text-primary);
  margin: 0;
}

.modal-body {
  padding: var(--space-6);
  overflow-y: auto;
  max-height: 70vh;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
}

/* Ensure focus doesn't outline the overlay unnecessarily */
.modal-overlay:focus {
  outline: none;
}
</style>
