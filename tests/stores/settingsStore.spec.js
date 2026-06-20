import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useSettingsStore } from '../../src/stores/settingsStore'

describe('settingsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    document.documentElement.style.fontSize = ''
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('initializes with default values', () => {
    const store = useSettingsStore()
    expect(store.theme).toBe('light')
    expect(store.username).toContain('Usuario')
    expect(store.roomName).toBe('litebi-room-1')
    expect(store.companyLogo).toBe(null)
    expect(store.chartPaletteId).toBe('corporate')
    expect(store.uiScale).toBe(100)
    expect(store.currentChartColors.length).toBeGreaterThan(0)
  })

  it('sets theme and updates document/localStorage', async () => {
    const store = useSettingsStore()
    
    store.setTheme('dark')
    await nextTick()
    expect(store.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('litebi_theme')).toBe('dark')

    store.setTheme('light')
    await nextTick()
    expect(store.theme).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('litebi_theme')).toBe('light')
  })

  it('sets chart palette and updates localStorage', async () => {
    const store = useSettingsStore()
    
    store.setChartPalette('vibrant')
    await nextTick()
    expect(store.chartPaletteId).toBe('vibrant')
    expect(localStorage.getItem('litebi_chartPalette')).toBe('vibrant')
    expect(store.currentChartColors).toEqual(store.palettes.vibrant.colors)

    // Ignore invalid palettes
    store.setChartPalette('non-existent')
    await nextTick()
    expect(store.chartPaletteId).toBe('vibrant')
  })

  it('sets username, roomName, and companyLogo', () => {
    const store = useSettingsStore()
    
    store.setUsername('John Doe')
    expect(store.username).toBe('John Doe')

    store.setRoomName('room-2')
    expect(store.roomName).toBe('room-2')

    store.setCompanyLogo('data:image/png;base64,...')
    expect(store.companyLogo).toBe('data:image/png;base64,...')
  })

  it('sets UI scale and updates document font-size', async () => {
    const store = useSettingsStore()
    
    store.setUiScale(150)
    await nextTick()
    expect(store.uiScale).toBe(150)
    expect(localStorage.getItem('litebi_uiScale')).toBe('150')
    // 16 * 1.5 = 24px
    expect(document.documentElement.style.fontSize).toBe('24px')
  })
})
