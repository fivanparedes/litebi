<script setup>
import { computed } from 'vue'
import { Palette, Settings, Moon, Sun, Users, Image as ImageIcon, ZoomIn } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settingsStore'
import BaseInput from '@/components/ui/BaseInput.vue'
import BaseDropdown from '@/components/ui/BaseDropdown.vue'
import BaseButton from '@/components/ui/BaseButton.vue'
import { Logger } from '@/utils/Logger'
import { FileText } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const settingsStore = useSettingsStore()
const { t } = useI18n()

const palettesArray = computed(() => {
  return Object.entries(settingsStore.palettes).map(([id, data]) => ({
    id,
    name: data.name,
    colors: data.colors
  }))
})

const selectPalette = (id) => {
  settingsStore.setChartPalette(id)
}

const toggleTheme = () => {
  settingsStore.setTheme(settingsStore.theme === 'light' ? 'dark' : 'light')
}

const scaleOptions = computed(() => [
  { value: 80, label: `80% (${t('settings.scaleSmall')})` },
  { value: 90, label: '90%' },
  { value: 100, label: `100% (${t('settings.scaleDefault')})` },
  { value: 110, label: '110%' },
  { value: 120, label: `120% (${t('settings.scaleLarge')})` }
])

const handleLogoUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (evt) => {
    settingsStore.setCompanyLogo(evt.target.result)
  }
  reader.readAsDataURL(file)
}

const removeLogo = () => settingsStore.setCompanyLogo(null)
</script>

<template>
  <div class="view-container">
    <div class="settings-header">
      <h2><Settings class="icon-h2" /> {{ $t('settings.title') }}</h2>
    </div>

    <div class="settings-section">
      <h3><Users class="icon-h3" /> {{ $t('settings.collaboration') }}</h3>
      <p class="section-desc">{{ $t('settings.collabDesc') }}</p>

      <div style="display: flex; gap: 16px; max-width: 500px; margin-bottom: 16px;">
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">{{ $t('settings.username') }}</label>
          <BaseInput 
            :model-value="settingsStore.username" 
            :placeholder="$t('settings.usernamePlaceholder')" 
            @update:model-value="settingsStore.setUsername" 
          />
        </div>
        <div style="flex: 1;">
          <label style="display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500;">{{ $t('settings.roomId') }}</label>
          <BaseInput 
            :model-value="settingsStore.roomName" 
            :placeholder="$t('settings.roomIdPlaceholder')" 
            @update:model-value="settingsStore.setRoomName" 
          />
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3><Moon class="icon-h3" /> {{ $t('settings.appearance') }}</h3>
      <p class="section-desc">{{ $t('settings.appearanceDesc') }}</p>

      <div class="theme-toggle">
        <button 
          class="theme-btn" 
          :class="{ 'theme-btn--active': settingsStore.theme === 'light' }"
          @click="settingsStore.setTheme('light')"
        >
          <Sun class="icon-sm" /> {{ $t('settings.light') }}
        </button>
        <button 
          class="theme-btn" 
          :class="{ 'theme-btn--active': settingsStore.theme === 'dark' }"
          @click="settingsStore.setTheme('dark')"
        >
          <Moon class="icon-sm" /> {{ $t('settings.dark') }}
        </button>
      </div>
    </div>

    <div class="settings-section">
      <h3><ZoomIn class="icon-h3" /> {{ $t('settings.uiScale') }}</h3>
      <p class="section-desc">{{ $t('settings.uiScaleDesc') }}</p>

      <div style="max-width: 300px;">
        <BaseDropdown 
          :model-value="settingsStore.uiScale" 
          :options="scaleOptions" 
          @update:model-value="settingsStore.setUiScale"
        />
      </div>
    </div>

    <div class="settings-section">
      <h3><ImageIcon class="icon-h3" /> {{ $t('settings.brandKit') }}</h3>
      <p class="section-desc">{{ $t('settings.brandKitDesc') }}</p>

      <div class="brand-kit-container">
        <div v-if="settingsStore.companyLogo" class="logo-preview">
          <img :src="settingsStore.companyLogo" alt="Logo de Empresa" />
          <BaseButton variant="danger" size="sm" @click="removeLogo">{{ $t('settings.removeLogo') }}</BaseButton>
        </div>
        <div v-else class="logo-upload">
          <label class="upload-btn">
            {{ $t('settings.uploadLogo') }}
            <input type="file" accept="image/*" style="display: none;" @change="handleLogoUpload" />
          </label>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3><Palette class="icon-h3" /> {{ $t('settings.chartPalette') }}</h3>
      <p class="section-desc">{{ $t('settings.chartPaletteDesc') }}</p>

      <div class="palettes-grid">
        <div 
          v-for="palette in palettesArray" 
          :key="palette.id" 
          class="palette-card"
          :class="{ 'palette-card--active': settingsStore.chartPaletteId === palette.id }"
          @click="selectPalette(palette.id)"
        >
          <div class="palette-name">{{ $t('settings.palette.' + palette.id) }}</div>
          <div class="palette-colors">
            <div 
              v-for="color in palette.colors" 
              :key="color" 
              class="color-swatch" 
              :style="{ backgroundColor: color }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-section">
      <h3><FileText class="icon-h3" /> {{ $t('settings.systemLogs') }}</h3>
      <p class="section-desc">{{ $t('settings.systemLogsDesc') }}</p>
      
      <div style="display: flex; gap: 16px;">
        <BaseButton variant="outline" @click="Logger.downloadLogs()">
          <template #icon-left><FileText /></template>
          {{ $t('settings.downloadLogs') }}
        </BaseButton>
        <BaseButton variant="ghost" @click="Logger.clear()">{{ $t('settings.clearLogs') }}</BaseButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  padding: var(--space-8);
  background-color: var(--card);
  overflow-y: auto;
}

.settings-header h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
  color: var(--foreground);
}

.icon-h2 {
  width: 28px;
  height: 28px;
  color: var(--color-accent);
}

.icon-h3 {
  width: 20px;
  height: 20px;
  color: var(--muted-foreground);
}

.icon-sm {
  width: 16px;
  height: 16px;
}

.theme-toggle {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.theme-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-6);
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--card);
  color: var(--muted-foreground);
  font-weight: var(--font-medium);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.theme-btn:hover {
  border-color: var(--color-accent);
}

.theme-btn--active {
  border-color: var(--color-accent);
  color: var(--color-accent);
  background-color: rgba(37, 99, 235, 0.05);
}

.settings-section {
  background-color: var(--background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.brand-kit-container {
  margin-bottom: var(--space-4);
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.logo-preview img {
  max-height: 60px;
  max-width: 200px;
  object-fit: contain;
  background: var(--muted);
  padding: var(--space-2);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
}

.upload-btn {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  background-color: var(--muted);
  color: var(--foreground);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  transition: all var(--transition-fast);
}

.upload-btn:hover {
  background-color: var(--card);
  border-color: var(--color-accent);
}

.settings-section h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 0;
  margin-bottom: var(--space-2);
  color: var(--foreground);
}

.section-desc {
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  margin-bottom: var(--space-6);
}

.palettes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--space-4);
}

.palette-card {
  border: 2px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  cursor: pointer;
  transition: all var(--transition-fast);
  background-color: var(--card);
}

.palette-card:hover {
  border-color: var(--color-accent);
}

.palette-card--active {
  border-color: var(--color-accent);
  background-color: rgba(37, 99, 235, 0.05); /* very light blue for active */
}

.palette-name {
  font-weight: var(--font-semibold);
  color: var(--foreground);
  margin-bottom: var(--space-3);
}

.palette-colors {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.color-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(0,0,0,0.1);
}
</style>
