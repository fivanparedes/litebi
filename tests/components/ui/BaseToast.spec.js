import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import BaseToast from '../../../src/components/ui/BaseToast.vue'
import { useUiStore } from '../../../src/stores/uiStore'

describe('BaseToast.vue', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('renders nothing when there are no toasts', () => {
    const wrapper = mount(BaseToast)
    expect(wrapper.findAll('.toast').length).toBe(0)
  })

  it('renders a toast when added to store', async () => {
    const wrapper = mount(BaseToast)
    const uiStore = useUiStore()
    
    uiStore.addToast({ message: 'Test message', type: 'success' })
    await wrapper.vm.$nextTick()
    
    const toasts = wrapper.findAll('.toast')
    expect(toasts.length).toBe(1)
    expect(toasts[0].text()).toContain('Test message')
    expect(toasts[0].classes()).toContain('toast--success')
  })

  it('renders multiple toasts', async () => {
    const wrapper = mount(BaseToast)
    const uiStore = useUiStore()
    
    uiStore.addToast({ message: 'Msg 1', type: 'info' })
    uiStore.addToast({ message: 'Msg 2', type: 'error' })
    await wrapper.vm.$nextTick()
    
    const toasts = wrapper.findAll('.toast')
    expect(toasts.length).toBe(2)
  })

  it('removes toast when close button is clicked', async () => {
    const wrapper = mount(BaseToast)
    const uiStore = useUiStore()
    
    uiStore.addToast({ message: 'Msg 1', type: 'info' })
    await wrapper.vm.$nextTick()
    
    const closeBtn = wrapper.find('.toast__close')
    await closeBtn.trigger('click')
    
    expect(uiStore.toasts.length).toBe(0)
  })

  it('applies correct class based on type', async () => {
    const wrapper = mount(BaseToast)
    const uiStore = useUiStore()
    
    uiStore.addToast({ message: 'Error msg', type: 'error' })
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.toast').classes()).toContain('toast--error')
  })
})
