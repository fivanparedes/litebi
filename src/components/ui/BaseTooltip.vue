<script setup>
const props = defineProps({
  text: {
    type: String,
    required: true
  },
  position: {
    type: String,
    default: 'top',
    validator: (v) => ['top', 'bottom', 'left', 'right'].includes(v)
  }
})
</script>

<template>
  <div class="tooltip-wrapper">
    <slot></slot>
    <div class="tooltip" :class="`tooltip--${position}`">
      {{ text }}
    </div>
  </div>
</template>

<style scoped>
.tooltip-wrapper {
  position: relative;
  display: inline-flex;
}

.tooltip {
  position: absolute;
  background-color: var(--color-bg-sidebar);
  color: var(--color-text-inverse);
  font-size: var(--text-xs);
  padding: 4px 8px;
  border-radius: var(--radius-md);
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  z-index: var(--z-tooltip);
  transition: opacity 0.2s ease 0.3s, transform 0.2s ease 0.3s;
}

/* Arrow using CSS borders */
.tooltip::after {
  content: '';
  position: absolute;
  border-style: solid;
}

/* Positions */
.tooltip--top {
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
}
.tooltip--top::after {
  top: 100%;
  left: 50%;
  margin-left: -4px;
  border-width: 4px 4px 0;
  border-color: var(--color-bg-sidebar) transparent transparent transparent;
}

.tooltip--bottom {
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%) translateY(-4px);
}
.tooltip--bottom::after {
  bottom: 100%;
  left: 50%;
  margin-left: -4px;
  border-width: 0 4px 4px;
  border-color: transparent transparent var(--color-bg-sidebar) transparent;
}

.tooltip--left {
  right: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%) translateX(4px);
}
.tooltip--left::after {
  left: 100%;
  top: 50%;
  margin-top: -4px;
  border-width: 4px 0 4px 4px;
  border-color: transparent transparent transparent var(--color-bg-sidebar);
}

.tooltip--right {
  left: calc(100% + 8px);
  top: 50%;
  transform: translateY(-50%) translateX(-4px);
}
.tooltip--right::after {
  right: 100%;
  top: 50%;
  margin-top: -4px;
  border-width: 4px 4px 4px 0;
  border-color: transparent var(--color-bg-sidebar) transparent transparent;
}

/* Hover state */
.tooltip-wrapper:hover .tooltip {
  opacity: 1;
}
.tooltip-wrapper:hover .tooltip--top { transform: translateX(-50%) translateY(0); }
.tooltip-wrapper:hover .tooltip--bottom { transform: translateX(-50%) translateY(0); }
.tooltip-wrapper:hover .tooltip--left { transform: translateY(-50%) translateX(0); }
.tooltip-wrapper:hover .tooltip--right { transform: translateY(-50%) translateX(0); }
</style>
