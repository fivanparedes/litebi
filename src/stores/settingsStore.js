import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // Themes: 'light', 'dark'
  const theme = ref('light')
  
  // Collaboration
  const username = ref('Usuario ' + Math.floor(Math.random() * 1000))
  const roomName = ref('litebi-room-1')

  // Palettes
  const palettes = {
    corporate: {
      name: 'Corporativo',
      colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc']
    },
    vibrant: {
      name: 'Vibrante',
      colors: ['#ff0055', '#00ffcc', '#ffcc00', '#cc00ff', '#00ccff', '#ff3300', '#00ff33', '#ff00cc']
    },
    pastel: {
      name: 'Pastel',
      colors: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec']
    },
    monochrome: {
      name: 'Monocromático',
      colors: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9']
    },
    earthy: {
      name: 'Terrenal',
      colors: ['#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#c7eae5', '#80cdc1', '#35978f', '#01665e']
    },
    neon: {
      name: 'Neón Noche',
      colors: ['#39ff14', '#04d9ff', '#ff007f', '#bc13fe', '#ff073a', '#cfff04', '#00ff66', '#fe019a']
    }
  }

  const chartPaletteId = ref('corporate')

  const currentChartColors = computed(() => {
    return palettes[chartPaletteId.value].colors
  })

  // Setters
  const setTheme = (newTheme) => {
    theme.value = newTheme
    if (newTheme === 'dark') {
      document.body.classList.add('dark-theme')
    } else {
      document.body.classList.remove('dark-theme')
    }
  }

  const setChartPalette = (paletteId) => {
    if (palettes[paletteId]) {
      chartPaletteId.value = paletteId
    }
  }

  const setUsername = (name) => {
    username.value = name
  }

  const setRoomName = (room) => {
    roomName.value = room
  }

  return {
    theme,
    username,
    roomName,
    chartPaletteId,
    palettes,
    currentChartColors,
    setTheme,
    setChartPalette,
    setUsername,
    setRoomName
  }
})
