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
  <div class="dashboard-tabs px-4 py-2 bg-card border-b border-border flex items-center gap-2">
    <div 
      v-for="tab in dashboardStore.tabs" 
      :key="tab.id"
      class="tab-item text-sm font-medium transition-colors"
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
  background-color: var(--card);
  border-bottom: 1px solid var(--color-border);
  padding: 0 var(--space-4);
  display: flex;
  align-items: flex-end;
  gap: var(--space-2);
  height: 36px;
  z-index: 2;
}

.tab-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-3);
  color: var(--muted-foreground);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: -0.025em;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  margin-bottom: -1px;
}

.tab-item:hover {
  color: var(--foreground);
}

.tab-item--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-edit {
  display: flex;
}

.tab-input {
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--color-primary);
  color: var(--foreground);
  font-size: 11px;
  font-weight: 500;
  outline: none;
  width: 100px;
}

.tab-name {
  user-select: none;
}

.tab-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 0;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
}

.tab-item:hover .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background-color: var(--muted);
  color: var(--foreground);
}

.tab-close svg {
  width: 12px;
  height: 12px;
}

.add-tab-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 0;
  border: none;
  background: transparent;
  color: var(--muted-foreground);
  cursor: pointer;
  transition: all 0.2s;
  margin-left: var(--space-2);
  margin-bottom: 4px;
}

.add-tab-btn:hover {
  background-color: var(--muted);
  color: var(--foreground);
}

.add-tab-btn svg {
  width: 14px;
  height: 14px;
}
</style>
