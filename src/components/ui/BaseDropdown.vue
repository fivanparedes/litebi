<script setup>
import { ref, computed } from 'vue'
import { ChevronDown, Check } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  options: {
    type: Array,
    default: () => [] // { value, label, icon? }
  },
  placeholder: {
    type: String,
    default: 'Seleccionar...'
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const dropdownRef = ref(null)

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
  }
}

const selectOption = (option) => {
  emit('update:modelValue', option.value)
  isOpen.value = false
}

// Click outside handler
import { onMounted, onUnmounted } from 'vue'
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div class="dropdown" ref="dropdownRef" :class="{ 'dropdown--disabled': disabled }">
    <div 
      class="dropdown__trigger" 
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      @click="toggleDropdown"
      tabindex="0"
      @keydown.enter="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
    >
      <span v-if="selectedOption" class="dropdown__selected">
        <component v-if="selectedOption.icon" :is="selectedOption.icon" class="dropdown__icon" />
        {{ selectedOption.label }}
      </span>
      <span v-else class="dropdown__placeholder">{{ placeholder }}</span>
      <ChevronDown class="dropdown__chevron" :class="{ 'dropdown__chevron--open': isOpen }" />
    </div>

    <Transition name="scale">
      <div v-if="isOpen" class="dropdown__menu" role="listbox">
        <div 
          v-for="option in options" 
          :key="option.value"
          class="dropdown__item"
          role="option"
          :aria-selected="option.value === modelValue"
          :class="{ 'dropdown__item--selected': option.value === modelValue }"
          @click="selectOption(option)"
        >
          <component v-if="option.icon" :is="option.icon" class="dropdown__item-icon" />
          <span class="dropdown__item-label">{{ option.label }}</span>
          <Check v-if="option.value === modelValue" class="dropdown__item-check" />
        </div>
        <div v-if="options.length === 0" class="dropdown__empty">
          Sin opciones
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.dropdown {
  position: relative;
  width: 100%;
}

.dropdown__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 var(--space-3);
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  transition: all var(--transition-fast);
}

.dropdown:not(.dropdown--disabled) .dropdown__trigger:hover {
  border-color: var(--color-border-hover);
}

.dropdown__trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}

.dropdown--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.dropdown__placeholder {
  color: var(--color-text-secondary);
}

.dropdown__selected {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.dropdown__chevron {
  width: 16px;
  height: 16px;
  color: var(--color-text-secondary);
  transition: transform var(--transition-fast);
}

.dropdown__chevron--open {
  transform: rotate(180deg);
}

.dropdown__menu {
  position: absolute;
  top: calc(100% + var(--space-1));
  left: 0;
  width: 100%;
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: var(--z-dropdown);
  max-height: 250px;
  overflow-y: auto;
  padding: var(--space-1) 0;
}

.dropdown__item {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  transition: background-color var(--transition-fast);
}

.dropdown__item:hover {
  background-color: var(--color-bg-secondary);
}

.dropdown__item--selected {
  color: var(--color-accent);
  background-color: var(--color-accent-light);
}
.dropdown__item--selected:hover {
  background-color: var(--color-accent-light);
}

.dropdown__item-icon {
  width: 16px;
  height: 16px;
  margin-right: var(--space-2);
  color: currentColor;
}

.dropdown__item-label {
  flex-grow: 1;
}

.dropdown__item-check {
  width: 16px;
  height: 16px;
  color: var(--color-accent);
}

.dropdown__empty {
  padding: var(--space-2) var(--space-3);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  text-align: center;
}
</style>
