<script setup>
import { computed } from 'vue'
import { Loader2 } from '@lucide/vue'

const props = defineProps({
  variant: {
    type: String,
    default: 'primary',
    validator: (v) => ['primary', 'secondary', 'danger', 'ghost', 'outline'].includes(v)
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
  const base = 'inline-flex items-center justify-center gap-2 border font-medium transition-colors whitespace-nowrap rounded-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 tracking-tight cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'
  
  const variants = {
    primary: 'bg-primary text-primary-foreground shadow hover:bg-primary/90 border-transparent',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border-border',
    outline: 'border border-border bg-card text-foreground hover:bg-muted hover:text-foreground',
    danger: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 border-transparent',
    ghost: 'hover:bg-accent hover:text-accent-foreground border-transparent'
  }
  
  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-9 px-4 py-2 text-sm',
    lg: 'h-10 px-8 text-sm'
  }
  
  const iconSizes = {
    sm: 'h-8 w-8 px-0',
    md: 'h-9 w-9 px-0',
    lg: 'h-10 w-10 px-0'
  }
  
  return [
    base,
    `btn btn--${props.variant} btn--${props.size}`,
    props.disabled || props.loading ? 'btn--disabled' : '',
    props.loading ? 'btn--loading' : '',
    variants[props.variant],
    props.icon ? iconSizes[props.size] : sizes[props.size]
  ]
})
</script>

<template>
  <button 
    :class="classes"
    :disabled="disabled || loading"
    :aria-disabled="disabled || loading ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    v-bind="$attrs"
  >
    <Loader2 v-if="loading" class="btn__spinner w-4 h-4 animate-spin" />
    
    <span v-if="!loading && $slots['icon-left']" class="btn__icon btn__icon--left">
      <slot name="icon-left"></slot>
    </span>
    
    <span :class="{ 'opacity-0': loading && !icon, 'sr-only': icon }">
      <slot></slot>
    </span>
    
    <span v-if="!loading && $slots['icon-right']" class="btn__icon btn__icon--right">
      <slot name="icon-right"></slot>
    </span>
  </button>
</template>

<style scoped>
/* Tailwind classes handle everything */
.btn__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn__icon :deep(svg) {
  width: 1em;
  height: 1em;
}
</style>
