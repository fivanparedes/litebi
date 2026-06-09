<script setup>
import { computed } from 'vue'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { useDashboardStore } from '@/stores/dashboardStore'

const props = defineProps({
  tabId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['close'])

const dashboardStore = useDashboardStore()

const tab = computed(() => dashboardStore.tabs.find(t => t.id === props.tabId))
const settings = computed(() => tab.value?.settings || {})

const updateSetting = (key, value) => {
  dashboardStore.updateTabSettings(props.tabId, { [key]: value })
}

const handleImageUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    alert("La imagen es demasiado grande. Máximo 5MB.")
    return
  }
  const reader = new FileReader()
  reader.onload = (e) => {
    updateSetting('backgroundImage', e.target.result)
  }
  reader.readAsDataURL(file)
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Ajustes de Pestaña</h3>
        <button class="close-btn" @click="emit('close')">&times;</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>Nombre de la Pestaña</label>
          <BaseInput 
            v-focus
            :model-value="tab?.name || ''" 
            @update:model-value="val => dashboardStore.renameTab(tabId, val)"
            @keyup.enter="emit('close')"
          />
        </div>
        
        <hr class="divider" />
        
        <h4>Fondo del Dashboard</h4>
        
        <div class="form-group">
          <label>Color de Fondo</label>
          <BaseInput 
            :model-value="settings.backgroundColor || ''" 
            placeholder="Ej: #f0f2f5, transparent"
            @update:model-value="val => updateSetting('backgroundColor', val)"
          />
        </div>
        
        <div class="form-group">
          <label>Imagen de Fondo (URL)</label>
          <BaseInput 
            :model-value="settings.backgroundImage || ''" 
            placeholder="https://..."
            @update:model-value="val => updateSetting('backgroundImage', val)"
          />
          
          <label style="margin-top: 8px;">O subir imagen (Max 5MB):</label>
          <input type="file" accept="image/*" @change="handleImageUpload" />
        </div>
        
        <div class="form-group" v-if="settings.backgroundImage">
          <label>Ajuste de Imagen</label>
          <BaseDropdown 
            :model-value="settings.backgroundSize || 'cover'" 
            :options="[
              {value: 'cover', label: 'Cubrir (Cover)'},
              {value: 'contain', label: 'Contener (Contain)'},
              {value: 'auto', label: 'Original'}
            ]"
            @update:model-value="val => updateSetting('backgroundSize', val)" 
          />
        </div>
      </div>
      
      <div class="modal-footer">
        <BaseButton variant="primary" @click="emit('close')">Listo</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: var(--color-bg-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 450px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
}

.modal-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-group label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-text-secondary);
}

.divider {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: var(--space-2) 0;
}

h4 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}
</style>
