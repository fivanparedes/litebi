import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { palettes } from '@/config/palettes.js'

export const useSettingsStore = defineStore('settings', () => {
  // Themes: 'light', 'dark'
  const theme = ref(localStorage.getItem('litebi_theme') || 'light')
  
  // Collaboration
  const username = ref('Usuario ' + Math.floor(Math.random() * 1000))
  const roomName = ref('litebi-room-1')

  // Brand Kit
  const companyLogo = ref(null)


  const chartPaletteId = ref(localStorage.getItem('litebi_chartPalette') || 'corporate')

  const currentChartColors = computed(() => {
    return palettes[chartPaletteId.value].colors
  })

  // Escala de Interfaz
  const uiScale = ref(parseInt(localStorage.getItem('litebi_uiScale')) || 100) // Percentage

  // Setters
  const setTheme = (newTheme) => {
    theme.value = newTheme
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
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

  const setCompanyLogo = (base64) => {
    companyLogo.value = base64
  }

  const setUiScale = (scale) => {
    uiScale.value = scale
    // cambiamos el font-size base del documento. Todo el diseño en index.css
    // usa 'rem' para márgenes, paddings y fuentes, por lo que se ajustará proporcionalmente,
    // pero los componentes estructurados que usan 'px' (barras, navbars) mantendrán su forma.
    document.documentElement.style.fontSize = `${(16 * scale) / 100}px`
  }

  // Watchers and Initialization
  watch(theme, (newTheme) => {
    localStorage.setItem('litebi_theme', newTheme)
  })
  if (theme.value === 'dark') {
    document.documentElement.classList.add('dark')
  }

  watch(uiScale, (newScale) => {
    localStorage.setItem('litebi_uiScale', newScale)
  })
  document.documentElement.style.fontSize = `${(16 * uiScale.value) / 100}px`

  watch(chartPaletteId, (newPalette) => {
    localStorage.setItem('litebi_chartPalette', newPalette)
  })

  return {
    theme,
    username,
    roomName,
    companyLogo,
    chartPaletteId,
    palettes,
    currentChartColors,
    uiScale,
    setTheme,
    setChartPalette,
    setUsername,
    setRoomName,
    setCompanyLogo,
    setUiScale
  }
})
