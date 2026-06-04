<script setup>
import { computed } from 'vue'
import { Loader2 } from '@lucide/vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost'].includes(v)
  },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg'].includes(v)
  },
  disabled: {
    type: Boolean,
    default: false
  },
  loading: {
    type: Boolean,
    default: false
  },
  icon: {
    type: Boolean,
    default: false
  }
})

const classes = computed(() => {
  return [
    'btn',
    `btn--${props.variant}`,
    `btn--${props.size}`,
    {
      'btn--icon-only': props.icon,
      'btn--loading': props.loading,
      'btn--disabled': props.disabled || props.loading
    }
  ]
})
</script>

<template>
  <button 
    :class="classes" 
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <Loader2 v-if="loading" class="btn__spinner" />
    <span v-if="$slots['icon-left'] && !loading" class="btn__icon-left">
      <slot name="icon-left"></slot>
    </span>
    <span class="btn__content" :class="{ 'sr-only': loading && icon }">
      <slot></slot>
    </span>
    <span v-if="$slots['icon-right'] && !loading" class="btn__icon-right">
      <slot name="icon-right"></slot>
    </span>
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-family);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  user-select: none;
  text-decoration: none;
}

/* Sizes */
.btn--sm {
  height: 28px;
  padding: 0 var(--space-3);
  font-size: var(--text-xs);
}
.btn--md {
  height: 36px;
  padding: 0 var(--space-4);
  font-size: var(--text-sm);
}
.btn--lg {
  height: 44px;
  padding: 0 var(--space-6);
  font-size: var(--text-base);
}

.btn--icon-only.btn--sm {
  width: 28px;
  padding: 0;
}
.btn--icon-only.btn--md {
  width: 36px;
  padding: 0;
}
.btn--icon-only.btn--lg {
  width: 44px;
  padding: 0;
}

/* Variants */
.btn--primary {
  background-color: var(--color-accent);
  color: var(--color-text-inverse);
}
.btn--primary:hover:not(.btn--disabled) {
  background-color: var(--color-accent-hover);
}

.btn--secondary {
  background-color: transparent;
  color: var(--color-text-primary);
  border: 1px solid var(--color-border);
}
.btn--secondary:hover:not(.btn--disabled) {
  background-color: var(--color-bg-secondary);
}

.btn--danger {
  background-color: var(--color-danger);
  color: var(--color-text-inverse);
}
.btn--danger:hover:not(.btn--disabled) {
  background-color: #B91C1C; /* darker red */
}

.btn--ghost {
  background-color: transparent;
  color: var(--color-text-secondary);
}
.btn--ghost:hover:not(.btn--disabled) {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

/* States */
.btn--disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn__spinner {
  animation: spin 1s linear infinite;
  width: 1em;
  height: 1em;
}

.btn__icon-left,
.btn__icon-right {
  display: flex;
  align-items: center;
}
.btn__icon-left :deep(svg),
.btn__icon-right :deep(svg) {
  width: 1.2em;
  height: 1.2em;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
