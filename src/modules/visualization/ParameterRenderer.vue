<script setup>
import { ref, watch, onMounted } from 'vue'
import { useDashboardStore } from '@/stores/dashboardStore'

const props = defineProps({
  config: {
    type: Object,
    required: true
  }
})

const dashboardStore = useDashboardStore()
const currentValue = ref(props.config.defaultValue || 0)

const handleChange = () => {
  if (props.config.parameterName) {
    dashboardStore.setParameter(props.config.parameterName, Number(currentValue.value))
    // Trigger reactivity for charts
    dashboardStore.globalFilters = [...dashboardStore.globalFilters]
  }
}

watch(() => props.config.defaultValue, (newVal) => {
  if (currentValue.value !== newVal) {
    currentValue.value = newVal || 0
    handleChange()
  }
})

onMounted(() => {
  if (props.config.parameterName) {
    dashboardStore.setParameter(props.config.parameterName, Number(currentValue.value))
  }
})

</script>

<template>
  <div class="parameter-container">
    <div class="parameter-label">
      {{ config.parameterName ? `@${config.parameterName}` : 'Parámetro' }}: 
      <strong>{{ currentValue }}</strong>
    </div>
    <input 
      v-model="currentValue" 
      type="range" 
      class="parameter-slider" 
      :min="config.min || 0" 
      :max="config.max || 100" 
      :step="config.step || 1" 
      @input="handleChange"
    />
    <div class="parameter-bounds">
      <span>{{ config.min || 0 }}</span>
      <span>{{ config.max || 100 }}</span>
    </div>
  </div>
</template>

<style scoped>
.parameter-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 100%;
  padding: var(--space-4);
  background-color: var(--card);
  border-radius: var(--radius-md);
}

.parameter-label {
  font-size: var(--text-sm);
  color: var(--foreground);
  margin-bottom: var(--space-2);
  text-align: center;
}

.parameter-slider {
  width: 100%;
  accent-color: var(--color-accent);
}

.parameter-bounds {
  display: flex;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--muted-foreground);
  margin-top: 4px;
}
</style>
