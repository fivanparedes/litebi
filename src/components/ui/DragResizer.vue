<template>
  <div 
    class="drag-resizer" 
    :class="{ 'drag-resizer--right': isRight, 'drag-resizer--left': !isRight }"
    @mousedown="startDrag"
  ></div>
</template>

<script setup>
import { onBeforeUnmount } from 'vue'

const props = defineProps({
  width: { type: Number, required: true },
  isRight: { type: Boolean, default: true }, // true si el resizer está a la derecha del panel
  minWidth: { type: Number, default: 200 },
  maxWidth: { type: Number, default: 800 }
})

const emit = defineEmits(['update:width'])

let startX = 0
let startWidth = 0

const startDrag = (e) => {
  e.preventDefault()
  startX = e.clientX
  startWidth = props.width
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

const onDrag = (e) => {
  const deltaX = e.clientX - startX
  // Si el resizer está a la derecha, mover el mouse a la derecha (deltaX positivo) aumenta el width
  // Si el resizer está a la izquierda (panel anclado a la derecha), mover a la izquierda (deltaX negativo) aumenta el width
  let newWidth = startWidth + (props.isRight ? deltaX : -deltaX)
  newWidth = Math.max(props.minWidth, Math.min(props.maxWidth, newWidth))
  emit('update:width', newWidth)
}

const stopDrag = () => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style scoped>
.drag-resizer {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 6px;
  background-color: transparent;
  cursor: col-resize;
  z-index: 50;
  transition: background-color 0.2s;
}

.drag-resizer:hover, .drag-resizer:active {
  background-color: var(--color-accent);
}

.drag-resizer--right {
  right: -3px;
}

.drag-resizer--left {
  left: -3px;
}
</style>
