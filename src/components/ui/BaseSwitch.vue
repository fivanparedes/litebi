<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  square: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const toggle = () => {
  if (!props.disabled) {
    emit('update:modelValue', !props.modelValue)
  }
}

const switchClasses = computed(() => {
  return [
    'relative inline-flex shrink-0 cursor-pointer transition-colors duration-200 ease-in-out focus:outline-none focus:ring-1 focus:ring-primary',
    props.square ? 'h-4 w-7 rounded-none border border-border bg-card' : 'h-5 w-9 rounded-full border-2 border-transparent',
    props.modelValue ? 'bg-primary' : (props.square ? 'bg-card' : 'bg-input'),
    props.disabled ? 'opacity-50 cursor-not-allowed' : ''
  ]
})

const thumbClasses = computed(() => {
  return [
    'pointer-events-none inline-block transform bg-foreground ring-0 transition duration-200 ease-in-out',
    props.square ? 'h-[10px] w-[10px] rounded-none m-[2px]' : 'h-4 w-4 rounded-full bg-background shadow-md',
    props.square 
      ? (props.modelValue ? 'translate-x-[10px] bg-primary-foreground' : 'translate-x-0 bg-muted-foreground') 
      : (props.modelValue ? 'translate-x-4' : 'translate-x-0')
  ]
})
</script>

<template>
  <button 
    type="button" 
    :class="switchClasses"
    role="switch" 
    :aria-checked="modelValue"
    :disabled="disabled"
    @click="toggle"
  >
    <span class="sr-only">Toggle switch</span>
    <span 
      aria-hidden="true" 
      :class="thumbClasses"
    ></span>
  </button>
</template>
