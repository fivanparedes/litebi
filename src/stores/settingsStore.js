import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'

export const useSettingsStore = defineStore('settings', () => {
  // Themes: 'light', 'dark'
  const theme = ref(localStorage.getItem('litebi_theme') || 'light')
  
  // Collaboration
  const username = ref('Usuario ' + Math.floor(Math.random() * 1000))
  const roomName = ref('litebi-room-1')

  // Brand Kit
  const companyLogo = ref(null)

  const palettes = {
    corporate: {
      name: 'Corporativo',
      colors: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
      dashboardBgLight: 'var(--color-bg-surface)',
      dashboardBgDark: 'var(--color-bg-surface)'
    },
    vibrant: {
      name: 'Vibrante',
      colors: ['#ff0055', '#00ffcc', '#ffcc00', '#cc00ff', '#00ccff', '#ff3300', '#00ff33', '#ff00cc'],
      dashboardBgLight: '#fdfbfb',
      dashboardBgDark: '#140c14'
    },
    pastel: {
      name: 'Pastel',
      colors: ['#fbb4ae', '#b3cde3', '#ccebc5', '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'],
      dashboardBgLight: '#fffdf9',
      dashboardBgDark: '#1c1a17'
    },
    monochrome: {
      name: 'Monocromático',
      colors: ['#1e293b', '#334155', '#475569', '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9'],
      dashboardBgLight: '#f8fafc',
      dashboardBgDark: '#0f172a'
    },
    earthy: {
      name: 'Terrenal',
      colors: ['#8c510a', '#bf812d', '#dfc27d', '#f6e8c3', '#c7eae5', '#80cdc1', '#35978f', '#01665e'],
      dashboardBgLight: '#fcfaf6',
      dashboardBgDark: '#1e1a14'
    },
    neon: {
      name: 'Neón Noche',
      colors: ['#39ff14', '#04d9ff', '#ff007f', '#bc13fe', '#ff073a', '#cfff04', '#00ff66', '#fe019a'],
      dashboardBgLight: '#f4f6f9',
      dashboardBgDark: '#090a0f'
    },
    ocean: {
      name: 'Océano',
      colors: ['#0077b6', '#00b4d8', '#90e0ef', '#caf0f8', '#03045e', '#023e8a', '#48cae4', '#ade8f4'],
      dashboardBgLight: '#f0f8ff',
      dashboardBgDark: '#010b14'
    },
    paper: {
      name: 'Papel Antiguo',
      colors: ['#5c4033', '#8b5a2b', '#cd853f', '#deb887', '#d2b48c', '#bc8f8f', '#f4a460', '#da8a67'],
      dashboardBgLight: '#fdf5e6',
      dashboardBgDark: '#2b2118'
    },
    dark_tech: {
      name: 'Dark Tech',
      colors: ['#00f2fe', '#4facfe', '#00c6fb', '#005bea', '#0b8793', '#360033', '#b224ef', '#7579ff'],
      dashboardBgLight: '#f0f4f8',
      dashboardBgDark: '#0d1117'
    }
  }

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
    // En lugar de usar CSS 'zoom' que escala todo literalmente y rompe los layouts,
    // cambiamos el font-size base del documento. Todo el diseño en index.css
    // usa 'rem' para márgenes, paddings y fuentes, por lo que se ajustará proporcionalmente,
    // pero los componentes estructurados que usan 'px' (barras, navbars) mantendrán su forma.
    document.documentElement.style.zoom = '' // Limpiar cualquier zoom residual
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
