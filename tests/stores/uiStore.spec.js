import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { nextTick } from 'vue'
import { useUiStore } from '../../src/stores/uiStore'

describe('uiStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('initializes with default values', () => {
    const store = useUiStore()
    expect(store.sidebarCollapsed).toBe(false)
    expect(store.locale).toBe('es')
    expect(store.isViewerMode).toBe(false)
    expect(store.toasts.length).toBe(0)
    expect(store.activeModal).toBe(null)
    expect(store.activeViewTitle).toBe('')
    expect(store.runPipelineTrigger).toBe(0)
  })

  it('toggles sidebar', () => {
    const store = useUiStore()
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(true)
    store.toggleSidebar()
    expect(store.sidebarCollapsed).toBe(false)
  })

  it('sets locale and updates localStorage/document', async () => {
    const store = useUiStore()
    
    store.setLocale('en')
    await nextTick()
    expect(store.locale).toBe('en')
    expect(localStorage.getItem('litebi_locale')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
  })

  it('sets viewer mode', () => {
    const store = useUiStore()
    store.setViewerMode(true)
    expect(store.isViewerMode).toBe(true)
  })

  it('adds and removes toasts', () => {
    const store = useUiStore()
    const id = store.addToast({ message: 'Hello' })
    expect(store.toasts.length).toBe(1)
    expect(store.toasts[0].message).toBe('Hello')
    expect(store.toasts[0].id).toBe(id)

    store.removeToast(id)
    expect(store.toasts.length).toBe(0)
  })

  it('auto-removes toasts after duration', () => {
    const store = useUiStore()
    store.addToast({ message: 'Hello', duration: 1000 })
    expect(store.toasts.length).toBe(1)
    
    vi.advanceTimersByTime(1001)
    expect(store.toasts.length).toBe(0)
  })

  it('does not auto-remove toast if duration is 0', () => {
    const store = useUiStore()
    store.addToast({ message: 'Hello', duration: 0 })
    expect(store.toasts.length).toBe(1)
    
    vi.advanceTimersByTime(5000)
    expect(store.toasts.length).toBe(1) // Still there
  })

  it('opens and closes modals', () => {
    const store = useUiStore()
    store.openModal('MyModal', { id: 1 })
    expect(store.activeModal).toBe('MyModal')
    expect(store.modalProps).toEqual({ id: 1 })

    store.closeModal()
    expect(store.activeModal).toBe(null)
    expect(store.modalProps).toEqual({})
  })

  it('triggers pipeline run', () => {
    const store = useUiStore()
    expect(store.runPipelineTrigger).toBe(0)
    store.triggerRunPipeline()
    expect(store.runPipelineTrigger).toBe(1)
    store.triggerRunPipeline()
    expect(store.runPipelineTrigger).toBe(2)
  })
})
