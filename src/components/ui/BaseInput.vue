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
  }
})

const emit = defineEmits(['update:modelValue'])

const onInput = (event) => {
  emit('update:modelValue', event.target.value)
}

const id = computed(() => `input-${Math.random().toString(36).substr(2, 9)}`)
</script>

<template>
  <div class="input-wrapper" :class="{ 'input-wrapper--error': error, 'input-wrapper--disabled': disabled }">
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
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.input-container {
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg-surface);
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
  color: var(--color-text-primary);
  outline: none;
}

.input-field::placeholder {
  color: var(--color-text-tertiary);
}

.input-field:disabled {
  cursor: not-allowed;
  color: var(--color-text-secondary);
}

.input-prefix,
.input-suffix {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-secondary);
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
  margin-top: 4px;
}

/* Disabled State */
.input-wrapper--disabled .input-container {
  background-color: var(--color-bg-secondary);
  border-color: var(--color-border);
}
</style>
