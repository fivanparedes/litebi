<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    default: 'text',
    validator: (v) => ['text', 'number', 'email', 'password'].includes(v)
  },
  error: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'compact'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue'])

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const id = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)
</script>

<template>
  <div class="input-wrapper" :class="[{ 'input-wrapper--error': error, 'input-wrapper--disabled': disabled }, `input-wrapper--size-${size}`]">
    <label v-if="label" :for="id" class="input-label">{{ label }}</label>
    
    <div class="input-container">
      <div v-if="$slots.prefix" class="input-prefix">
        <slot name="prefix"></slot>
      </div>
      
      <input
        :id="id"
        :type="type"
        :value="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        class="input-field"
        v-bind="$attrs"
        @input="onInput"
      >
      
      <div v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix"></slot>
      </div>
    </div>
    
    <span v-if="error" class="input-error-text">{{ error }}</span>
  </div>
</template>

<style scoped>
.input-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.input-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--foreground);
  margin-bottom: var(--space-1);
}

.input-container {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--background);
  height: 36px;
  transition: all var(--transition-fast);
  overflow: hidden;
}

.input-container:focus-within {
  border-color: var(--color-border-focus);
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}

.input-field {
  flex-grow: 1;
  height: 100%;
  border: none;
  background: transparent;
  padding: 0 var(--space-3);
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--foreground);
  outline: none;
}

.input-field::placeholder {
  color: var(--muted-foreground);
}

.input-field:disabled {
  cursor: not-allowed;
  color: var(--muted-foreground);
}

.input-prefix,
.input-suffix {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted-foreground);
  padding: 0 var(--space-3);
}

.input-prefix {
  padding-right: 0;
}

.input-suffix {
  padding-left: 0;
}

/* Error State */
.input-wrapper--error .input-container {
  border-color: var(--color-danger);
}
.input-wrapper--error .input-container:focus-within {
  outline-color: var(--color-danger);
}

.input-error-text {
  color: var(--color-danger);
  font-size: var(--text-xs);
  margin-top: var(--space-1);
}

/* Compact input styles */
.input-wrapper--size-compact .input-container {
  height: 28px;
}
.input-wrapper--size-compact .input-field {
  font-size: var(--text-xs);
  padding: 0 var(--space-2);
}
.input-wrapper--size-compact .input-prefix,
.input-wrapper--size-compact .input-suffix {
  padding: 0 var(--space-2);
}
.input-wrapper--size-compact .input-label {
  font-size: var(--text-xs);
}

/* Disabled State */
.input-wrapper--disabled .input-container {
  background-color: var(--muted);
  border-color: var(--color-border);
}
</style>
