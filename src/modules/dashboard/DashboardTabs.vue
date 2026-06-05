<script setup>
import { Plus, X, Pencil } from '@lucide/vue'
import { useDashboardStore } from '@/stores/dashboardStore'
import { useUiStore } from '@/stores/uiStore'
import { ref, nextTick } from 'vue'

const dashboardStore = useDashboardStore()
const uiStore = useUiStore()

const editingTabId = ref(null)
const editingName = ref('')
const inputRef = ref(null)

const startEdit = (tab) => {
  editingTabId.value = tab.id
  editingName.value = tab.name
  nextTick(() => {
    if (inputRef.value && inputRef.value[0]) {
      inputRef.value[0].focus()
      inputRef.value[0].select()
    }
  })
}

const saveEdit = (tabId) => {
  if (editingName.value.trim()) {
    dashboardStore.renameTab(tabId, editingName.value.trim())
  }
  editingTabId.value = null
}

const handleKeydown = (e, tabId) => {
  if (e.key === 'Enter') saveEdit(tabId)
  if (e.key === 'Escape') editingTabId.value = null
}
</script>

<template>
  <div class="dashboard-tabs">
    <div 
      v-for="tab in dashboardStore.tabs" 
      :key="tab.id"
      class="tab-item"
      :class="{ 'tab-item--active': dashboardStore.activeTabId === tab.id }"
      @click="dashboardStore.setActiveTab(tab.id)"
    >
      <div v-if="editingTabId === tab.id" class="tab-edit">
        <input 
          ref="inputRef"
          v-model="editingName"
          class="tab-input"
          @blur="saveEdit(tab.id)"
          @keydown="(e) => handleKeydown(e, tab.id)"
        />
      </div>
      <template v-else>
        <span class="tab-name" @dblclick="!uiStore.isViewerMode && startEdit(tab)">{{ tab.name }}</span>
        <button 
          v-if="dashboardStore.tabs.length > 1 && !uiStore.isViewerMode"
          class="tab-close" 
          title="Eliminar pestaña"
          @click.stop="dashboardStore.removeTab(tab.id)"
        >
          <X />
        </button>
      </template>
    </div>
    
    <button v-if="!uiStore.isViewerMode" class="add-tab-btn" title="Nuevo Dashboard" @click="dashboardStore.addTab">
      <Plus />
    </button>
  </div>
</template>

<style scoped>
.dashboard-tabs {
  display: flex;
  background-color: var(--color-bg-primary);
  border-bottom: 1px solid var(--color-border);
  padding: var(--space-2) var(--space-2) 0 var(--space-2);
  gap: var(--space-1);
  overflow-x: auto;
  position: relative;
  z-index: 2;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background-color: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-bottom: none;
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  cursor: pointer;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: all var(--transition-fast);
  min-width: 120px;
  max-width: 200px;
}

.tab-item:hover {
  background-color: var(--color-bg-surface);
  color: var(--color-text-primary);
}

.tab-item--active {
  background-color: var(--color-bg-surface);
  color: var(--color-accent);
  border-bottom: 1px solid var(--color-bg-surface);
  margin-bottom: -1px;
}

.tab-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  user-select: none;
  flex-grow: 1;
}

.tab-close {
  background: none;
  border: none;
  color: var(--color-text-tertiary);
  cursor: pointer;
  padding: 2px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background-color: var(--color-danger-light);
  color: var(--color-danger);
}

.tab-close svg {
  width: 14px;
  height: 14px;
}

.tab-edit {
  display: flex;
  width: 100%;
}

.tab-input {
  width: 100%;
  background: transparent;
  border: none;
  color: var(--color-text-primary);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  font-family: inherit;
  outline: none;
  border-bottom: 1px solid var(--color-accent);
}

.add-tab-btn {
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md) var(--radius-md) 0 0;
  display: flex;
  align-items: center;
}

.add-tab-btn:hover {
  background-color: var(--color-bg-secondary);
  color: var(--color-text-primary);
}

.add-tab-btn svg {
  width: 16px;
  height: 16px;
}
</style>
