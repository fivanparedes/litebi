<script setup>
const props = defineProps({
  modelValue: {
    type: [String, Number],
    required: true
  },
  tabs: {
    type: Array,
    required: true // { key, label, icon? }
  }
})

const emit = defineEmits(['update:modelValue'])

const selectTab = (key) => {
  emit('update:modelValue', key)
}
</script>

<template>
  <div class="tabs-container">
    <div class="tabs-header" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab-btn"
        :class="{ 'tab-btn--active': tab.key === modelValue }"
        role="tab"
        :aria-selected="tab.key === modelValue"
        @click="selectTab(tab.key)"
      >
        <component :is="tab.icon" v-if="tab.icon" class="tab-icon" />
        {{ tab.label }}
      </button>
    </div>
    <div class="tabs-content" role="tabpanel">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.tabs-header {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  position: relative;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  padding: var(--space-2) 0;
  font-family: var(--font-family);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  position: relative;
  transition: color var(--transition-fast);
}

.tab-btn:hover {
  color: var(--color-text-primary);
}

.tab-btn--active {
  color: var(--color-accent);
  font-weight: var(--font-medium);
}

.tab-btn--active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--color-accent);
  border-radius: 2px 2px 0 0;
}

.tab-icon {
  width: 16px;
  height: 16px;
}
</style>
