<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { Search, Database, LayoutDashboard, Calculator, Zap, Home, Table } from '@lucide/vue'
import { useDataStore } from '@/stores/dataStore'
import { useDashboardStore } from '@/stores/dashboardStore'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()
const router = useRouter()
const dataStore = useDataStore()
const dashboardStore = useDashboardStore()

const searchQuery = ref('')
const selectedIndex = ref(0)
const inputRef = ref(null)

const isOpen = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

// Acciones globales
const globalActions = [
  { id: 'nav-home', title: t('navigation.home'), icon: Home, route: '/' },
  { id: 'nav-data', title: t('navigation.data'), icon: Database, route: '/data' },
  { id: 'nav-cleaning', title: t('navigation.cleaning'), icon: Table, route: '/cleaning' },
  { id: 'nav-formulas', title: t('navigation.formulas'), icon: Calculator, route: '/formulas' },
  { id: 'nav-dashboard', title: t('navigation.dashboard'), icon: LayoutDashboard, route: '/dashboard' }
]

// Elementos disponibles (navegación, datasets, pestañas)
const allItems = computed(() => {
  const items = []
  
  // 1. Añadir Navegación Global
  items.push({ header: 'Navegación' })
  globalActions.forEach(action => {
    items.push({ ...action, type: 'nav' })
  })

  // 2. Añadir Datasets
  const datasets = Array.from(dataStore.datasets.keys())
  if (datasets.length > 0) {
    items.push({ header: 'Datasets' })
    datasets.forEach(dsName => {
      items.push({
        id: `ds-${dsName}`,
        title: dsName,
        icon: Database,
        type: 'dataset',
        action: () => {
          dataStore.setActive(dsName)
          router.push('/data')
        }
      })
    })
  }

  // 3. Añadir Pestañas de Dashboard
  const tabs = dashboardStore.tabs
  if (tabs.length > 0) {
    items.push({ header: 'Pestañas de Dashboard' })
    tabs.forEach(tab => {
      items.push({
        id: `tab-${tab.id}`,
        title: tab.name,
        icon: LayoutDashboard,
        type: 'tab',
        action: () => {
          dashboardStore.activeTabId = tab.id
          router.push('/dashboard')
        }
      })
    })
  }

  // 4. Acciones Rápidas
  items.push({ header: 'Acciones' })
  items.push({
    id: 'action-new-dashboard',
    title: 'Nuevo Dashboard',
    icon: Zap,
    type: 'action',
    action: () => {
      const newTabId = dashboardStore.addTab('Nuevo Tab')
      dashboardStore.activeTabId = newTabId
      router.push('/dashboard')
    }
  })

  return items
})

const filteredItems = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return allItems.value

  const results = []
  let currentHeader = null

  allItems.value.forEach(item => {
    if (item.header) {
      currentHeader = item
    } else {
      if (item.title.toLowerCase().includes(q)) {
        if (currentHeader) {
          if (!results.includes(currentHeader)) results.push(currentHeader)
        }
        results.push(item)
      }
    }
  })

  return results
})

// Solo los elementos seleccionables (ignorando headers)
const selectableItems = computed(() => {
  return filteredItems.value.filter(item => !item.header)
})

watch(isOpen, async (newVal) => {
  if (newVal) {
    searchQuery.value = ''
    selectedIndex.value = 0
    await nextTick()
    if (inputRef.value) {
      inputRef.value.focus()
    }
  }
})

watch(searchQuery, () => {
  selectedIndex.value = 0
})

const handleKeydown = (e) => {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    if (selectedIndex.value < selectableItems.value.length - 1) {
      selectedIndex.value++
      scrollToSelected()
    }
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    if (selectedIndex.value > 0) {
      selectedIndex.value--
      scrollToSelected()
    }
  } else if (e.key === 'Enter') {
    e.preventDefault()
    executeSelected()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

const scrollToSelected = () => {
  nextTick(() => {
    const activeEl = document.querySelector('.command-item.selected')
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' })
    }
  })
}

const executeSelected = () => {
  const item = selectableItems.value[selectedIndex.value]
  if (item) {
    if (item.route) {
      router.push(item.route)
    } else if (item.action) {
      item.action()
    }
    close()
  }
}

const close = () => {
  isOpen.value = false
}

// Global shortcut para Ctrl+K
const handleGlobalKeydown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    isOpen.value = !isOpen.value
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})

</script>

<template>
  <div v-if="isOpen" class="command-palette-overlay" @click.self="close">
    <div class="command-palette-modal">
      
      <div class="search-header">
        <Search class="search-icon" :size="20" />
        <input 
          ref="inputRef"
          v-model="searchQuery" 
          type="text" 
          placeholder="Buscar comandos, datasets o pestañas... (Esc para salir)"
          class="search-input"
          @keydown="handleKeydown"
        />
        <div class="search-shortcuts">
          <span class="shortcut-key">ESC</span>
        </div>
      </div>

      <div class="results-container">
        <div v-if="filteredItems.length === 0" class="no-results">
          No se encontraron resultados para "{{ searchQuery }}"
        </div>

        <template v-for="item in filteredItems" :key="item.id || item.header">
          
          <div v-if="item.header" class="result-header">
            {{ item.header }}
          </div>

          <div 
            v-else 
            class="command-item" 
            :class="{ 'selected': selectableItems[selectedIndex]?.id === item.id }"
            @mouseover="selectedIndex = selectableItems.findIndex(i => i.id === item.id)"
            @click="executeSelected"
          >
            <component :is="item.icon" class="item-icon" :size="18" />
            <span class="item-title">{{ item.title }}</span>
            <span v-if="item.type !== 'nav'" class="item-type-badge">{{ item.type }}</span>
            
            <div v-if="item.id === 'action-new-dashboard'" class="item-shortcut">
              <span class="shortcut-key">Ctrl+N</span>
            </div>
          </div>
          
        </template>
      </div>
      
    </div>
  </div>
</template>

<style scoped>
.command-palette-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
}

.command-palette-modal {
  width: 100%;
  max-width: 600px;
  background-color: var(--color-bg-surface);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0,0,0,0.05);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

.dark .command-palette-modal {
  border: 1px solid var(--color-border);
}

@keyframes modal-pop {
  from { opacity: 0; transform: scale(0.95) translateY(-10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.search-header {
  display: flex;
  align-items: center;
  padding: 0 1rem;
  border-bottom: 1px solid var(--color-border);
  height: 60px;
}

.search-icon {
  color: var(--color-text-secondary);
  flex-shrink: 0;
  margin-right: 12px;
}

.search-input {
  flex: 1;
  height: 100%;
  border: none;
  background: transparent;
  font-size: 1.125rem;
  color: var(--color-text-primary);
  outline: none;
  width: 100%;
}

.search-input::placeholder {
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.search-shortcuts {
  display: flex;
  align-items: center;
}

.shortcut-key {
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.results-container {
  max-height: 400px;
  overflow-y: auto;
  padding: 0.5rem;
}

/* Scrollbar estilizada */
.results-container::-webkit-scrollbar {
  width: 6px;
}
.results-container::-webkit-scrollbar-track {
  background: transparent;
}
.results-container::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 10px;
}

.no-results {
  padding: 2rem;
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 0.95rem;
}

.result-header {
  padding: 0.75rem 1rem 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-secondary);
}

.command-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s ease;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.command-item.selected {
  background-color: var(--color-accent-light);
}

.dark .command-item.selected {
  background-color: rgba(37, 99, 235, 0.2);
}

.item-icon {
  color: var(--color-text-secondary);
  margin-right: 12px;
  flex-shrink: 0;
}

.command-item.selected .item-icon {
  color: var(--color-accent);
}

.item-title {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-type-badge {
  font-size: 0.65rem;
  text-transform: uppercase;
  font-weight: 600;
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid var(--color-border);
  margin-left: 12px;
}

.item-shortcut {
  margin-left: 12px;
}
</style>
