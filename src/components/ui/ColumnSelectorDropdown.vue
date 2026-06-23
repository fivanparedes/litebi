<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { ChevronDown, Check, Search, Sigma, Database, Hash, Type, Calendar, ToggleLeft, GripVertical } from '@lucide/vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  groupedOptions: {
    type: Array,
    default: () => [] // { category, isMeasure, isDataset, count, items: [{ value, label, type }] }
  },
  placeholder: {
    type: String,
    default: 'Select column...'
  },
  disabled: {
    type: Boolean,
    default: false
  },
  size: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'compact'].includes(v)
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const dropdownRef = ref(null)
const searchInputRef = ref(null)
const searchQuery = ref('')

const menuStyle = ref({})

// Get icon component by data type
const getTypeIcon = (type) => {
  if (!type) return Hash
  const lowerType = type.toLowerCase()
  if (lowerType.includes('measure')) return Sigma
  if (lowerType.includes('num') || lowerType.includes('int') || lowerType.includes('float') || lowerType.includes('double')) return Hash
  if (lowerType.includes('str') || lowerType.includes('char') || lowerType.includes('text') || lowerType.includes('varchar')) return Type
  if (lowerType.includes('date') || lowerType.includes('time')) return Calendar
  if (lowerType.includes('bool')) return ToggleLeft
  return Hash // default
}

const selectedLabel = computed(() => {
  if (!props.modelValue) return null
  for (const group of props.groupedOptions) {
    const item = group.items.find(i => i.value === props.modelValue)
    if (item) return item.label
  }
  return props.modelValue
})

const selectedIcon = computed(() => {
  if (!props.modelValue) return null
  for (const group of props.groupedOptions) {
    const item = group.items.find(i => i.value === props.modelValue)
    if (item) return getTypeIcon(item.type)
  }
  return Hash
})

const filteredGroups = computed(() => {
  if (!searchQuery.value) return props.groupedOptions

  const query = searchQuery.value.toLowerCase()
  return props.groupedOptions.map(group => {
    // If the category matches, include all items
    if (group.category.toLowerCase().includes(query)) {
      return group
    }
    // Otherwise filter items
    const filteredItems = group.items.filter(item => 
      item.label.toLowerCase().includes(query) || 
      item.value.toString().toLowerCase().includes(query)
    )
    
    if (filteredItems.length > 0) {
      return {
        ...group,
        items: filteredItems,
        count: filteredItems.length
      }
    }
    return null
  }).filter(Boolean)
})

const totalAvailable = computed(() => {
  return filteredGroups.value.reduce((total, group) => total + group.items.length, 0)
})

const updatePosition = () => {
  if (dropdownRef.value && isOpen.value) {
    const rect = dropdownRef.value.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const menuHeight = 350 // max-height in css
    
    let top, bottom
    if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
      // Render above
      bottom = `${window.innerHeight - rect.top + 4}px`
      top = 'auto'
    } else {
      // Render below
      top = `${rect.bottom + 4}px`
      bottom = 'auto'
    }
    
    // Ancho mínimo para acomodar el contenido del menú, pero que alinee con el trigger si es grande
    const minWidth = Math.max(rect.width, 260)
    
    menuStyle.value = {
      position: 'fixed',
      top,
      bottom,
      left: `${rect.left}px`,
      width: `${minWidth}px`
    }
  }
}

const toggleDropdown = async () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value
    if (isOpen.value) {
      searchQuery.value = ''
      await nextTick()
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)
      
      // Auto-focus search input
      if (searchInputRef.value) {
        searchInputRef.value.focus()
      }
    } else {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }
}

const selectOption = (item) => {
  emit('update:modelValue', item.value)
  isOpen.value = false
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    isOpen.value = false
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
}

// Click outside handler
const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    if (event.target.closest('.col-dropdown__menu')) return
    isOpen.value = false
    window.removeEventListener('scroll', updatePosition, true)
    window.removeEventListener('resize', updatePosition)
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleKeydown)
})
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
})
</script>

<template>
  <div ref="dropdownRef" class="col-dropdown" :class="[{ 'col-dropdown--disabled': disabled }, `col-dropdown--size-${size}`]">
    <div 
      class="col-dropdown__trigger" 
      role="combobox"
      aria-haspopup="listbox"
      :aria-expanded="isOpen"
      tabindex="0"
      @click="toggleDropdown"
      @keydown.enter="toggleDropdown"
      @keydown.space.prevent="toggleDropdown"
    >
      <span v-if="selectedLabel" class="col-dropdown__selected">
        <component :is="selectedIcon" class="col-dropdown__icon" />
        {{ selectedLabel }}
      </span>
      <span v-else class="col-dropdown__placeholder">{{ placeholder }}</span>
      <ChevronDown class="col-dropdown__chevron" :class="{ 'col-dropdown__chevron--open': isOpen }" />
    </div>

    <Teleport to="body">
      <Transition name="scale">
        <div v-if="isOpen" class="col-dropdown__menu" role="listbox" :style="menuStyle">
          
          <!-- Search Header -->
          <div class="col-dropdown__search-box">
            <Search class="col-dropdown__search-icon" />
            <input 
              ref="searchInputRef"
              v-model="searchQuery" 
              type="text" 
              class="col-dropdown__search-input" 
              placeholder="Search fields & measures..."
              @keydown.esc.stop="isOpen = false"
            />
          </div>

          <!-- Options List -->
          <div class="col-dropdown__list">
            <template v-for="(group, gIdx) in filteredGroups" :key="group.category || gIdx">
              <!-- Group Header -->
              <div class="col-dropdown__group-header">
                <div class="col-dropdown__group-title">
                  <Database v-if="group.isDataset" class="col-dropdown__group-icon" />
                  <span v-if="group.isMeasure" class="col-dropdown__group-label">Measure - Number</span>
                  <span v-else class="col-dropdown__group-label">{{ group.category }}</span>
                </div>
                <span v-if="group.count !== undefined" class="col-dropdown__group-count">{{ group.count }}</span>
              </div>
              
              <!-- Items -->
              <div 
                v-for="item in group.items" 
                :key="item.value"
                class="col-dropdown__item"
                role="option"
                :aria-selected="item.value === modelValue"
                :class="{ 'col-dropdown__item--selected': item.value === modelValue }"
                @click="selectOption(item)"
              >
                <component :is="getTypeIcon(item.type)" class="col-dropdown__item-type-icon" :class="{ 'text-primary': item.type === 'measure' }" />
                <span class="col-dropdown__item-label">{{ item.label }}</span>
                <Check v-if="item.value === modelValue" class="col-dropdown__item-check" />
              </div>
            </template>
            
            <div v-if="filteredGroups.length === 0" class="col-dropdown__empty">
              No fields found
            </div>
          </div>

          <!-- Footer -->
          <div class="col-dropdown__footer">
            <span class="col-dropdown__footer-count">{{ totalAvailable }} available</span>
            <span class="col-dropdown__footer-esc">Esc to close</span>
          </div>

        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.col-dropdown {
  position: relative;
  width: 100%;
}

.col-dropdown__trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  padding: 0 var(--space-3);
  background-color: var(--card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--foreground);
  transition: all var(--transition-fast);
}

.col-dropdown:not(.col-dropdown--disabled) .col-dropdown__trigger:hover {
  border-color: var(--color-border-hover);
}

.col-dropdown__trigger:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
}

.col-dropdown--disabled {
  opacity: 0.6;
  pointer-events: none;
}

.col-dropdown__placeholder {
  color: var(--muted-foreground);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-dropdown__selected {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-dropdown__icon {
  width: 14px;
  height: 14px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.col-dropdown__chevron {
  width: 14px;
  height: 14px;
  color: var(--muted-foreground);
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.col-dropdown__chevron--open {
  transform: rotate(180deg);
}

/* Menu */
.col-dropdown__menu {
  background-color: var(--card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  z-index: 99999;
  display: flex;
  flex-direction: column;
}

/* Search Box */
.col-dropdown__search-box {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  background-color: var(--muted);
  gap: var(--space-2);
}

.col-dropdown__search-icon {
  width: 14px;
  height: 14px;
  color: var(--muted-foreground);
}

.col-dropdown__search-input {
  flex-grow: 1;
  background: transparent;
  border: none;
  font-size: var(--text-xs);
  color: var(--foreground);
  outline: none;
}
.col-dropdown__search-input::placeholder {
  color: var(--muted-foreground);
}

/* List */
.col-dropdown__list {
  max-height: 280px;
  overflow-y: auto;
  padding: var(--space-1) 0;
}

/* Group */
.col-dropdown__group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  background-color: var(--muted);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  margin-top: var(--space-1);
}
.col-dropdown__list > .col-dropdown__group-header:first-child {
  margin-top: 0;
  border-top: none;
}

.col-dropdown__group-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.col-dropdown__group-icon {
  width: 12px;
  height: 12px;
  color: var(--muted-foreground);
}

.col-dropdown__group-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--muted-foreground);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.col-dropdown__group-count {
  font-size: 10px;
  color: var(--muted-foreground);
}

/* Item */
.col-dropdown__item {
  display: flex;
  align-items: center;
  padding: var(--space-1-5) var(--space-3);
  cursor: pointer;
  font-size: var(--text-xs);
  color: var(--foreground);
  transition: background-color var(--transition-fast);
  gap: var(--space-2);
}

.col-dropdown__item:hover {
  background-color: var(--muted);
}

.col-dropdown__item--selected {
  background-color: var(--primary-50);
}
:root[class~="dark"] .col-dropdown__item--selected {
  background-color: var(--primary-900);
}

.col-dropdown__item-type-icon {
  width: 14px;
  height: 14px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.col-dropdown__item-label {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-dropdown__item-check {
  width: 14px;
  height: 14px;
  color: var(--color-primary);
  flex-shrink: 0;
}

.col-dropdown__empty {
  padding: var(--space-3);
  text-align: center;
  font-size: var(--text-xs);
  color: var(--muted-foreground);
}

/* Footer */
.col-dropdown__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  background-color: var(--muted);
  font-size: 10px;
  color: var(--muted-foreground);
}

/* Compact overrides */
.col-dropdown--size-compact .col-dropdown__trigger {
  height: 28px;
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
}
</style>
