<script setup>
import { computed } from 'vue'
import { Palette, Settings, Moon, Sun } from '@lucide/vue'
import { useSettingsStore } from '@/stores/settingsStore'

const settingsStore = useSettingsStore()

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
</script>

<template>
  <div class="view-container">
    <div class="settings-header">
      <h2><Settings class="icon-h2" /> Configuración</h2>
    </div>

    <div class="settings-section">
      <h3><Moon class="icon-h3" /> Apariencia del Sistema</h3>
      <p class="section-desc">Cambia entre el modo claro y oscuro para toda la aplicación.</p>

      <div class="theme-toggle">
        <button 
          class="theme-btn" 
          :class="{ 'theme-btn--active': settingsStore.theme === 'light' }"
          @click="settingsStore.setTheme('light')"
        >
          <Sun class="icon-sm" /> Claro
        </button>
        <button 
          class="theme-btn" 
          :class="{ 'theme-btn--active': settingsStore.theme === 'dark' }"
          @click="settingsStore.setTheme('dark')"
        >
          <Moon class="icon-sm" /> Oscuro
        </button>
      </div>
    </div>

    <div class="settings-section">
      <h3><Palette class="icon-h3" /> Paleta de Gráficos</h3>
      <p class="section-desc">Selecciona la paleta de colores por defecto que utilizarán los gráficos de tus tableros y reportes.</p>

      <div class="palettes-grid">
        <div 
          v-for="palette in palettesArray" 
          :key="palette.id" 
          class="palette-card"
          :class="{ 'palette-card--active': settingsStore.chartPaletteId === palette.id }"
          @click="selectPalette(palette.id)"
        >
          <div class="palette-name">{{ palette.name }}</div>
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
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  padding: var(--space-8);
  background-color: var(--color-bg-primary);
  overflow-y: auto;
}

.settings-header h2 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-8);
  color: var(--color-text-primary);
}

.icon-h2 {
  width: 28px;
  height: 28px;
  color: var(--color-accent);
}

.icon-h3 {
  width: 20px;
  height: 20px;
  color: var(--color-text-secondary);
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
  background-color: var(--color-bg-primary);
  color: var(--color-text-secondary);
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
  background-color: var(--color-bg-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.settings-section h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 0;
  margin-bottom: var(--space-2);
  color: var(--color-text-primary);
}

.section-desc {
  color: var(--color-text-secondary);
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
  background-color: var(--color-bg-primary);
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
  color: var(--color-text-primary);
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
