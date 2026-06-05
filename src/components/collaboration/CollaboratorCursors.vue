<script setup>
import { useCollaborationStore } from '@/stores/collaborationStore'
import { MousePointer2 } from '@lucide/vue'

const collabStore = useCollaborationStore()
</script>

<template>
  <div v-if="collabStore.isConnected" class="cursors-container">
    <template v-for="[id, user] in collabStore.collaborators" :key="id">
      <div 
        v-if="user.cursor"
        class="remote-cursor"
        :style="{ 
          transform: `translate(${user.cursor.x}px, ${user.cursor.y}px)`,
          color: user.color
        }"
      >
        <MousePointer2 class="cursor-icon" />
        <div class="cursor-label" :style="{ backgroundColor: user.color }">
          {{ user.name }}
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.cursors-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.remote-cursor {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  transition: transform 0.1s linear;
  pointer-events: none;
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
}

.cursor-icon {
  width: 20px;
  height: 20px;
  fill: currentColor;
  stroke: white;
  stroke-width: 2px;
  transform: rotate(-15deg);
  transform-origin: top left;
}

.cursor-label {
  margin-top: 4px;
  margin-left: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  border-top-left-radius: 0;
  color: white;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
