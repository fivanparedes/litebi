import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BaseModal from '../../../src/components/ui/BaseModal.vue'
import BaseButton from '../../../src/components/ui/BaseButton.vue'

describe('BaseModal.vue', () => {
  const globalConfig = {
    stubs: {
      teleport: true
    }
  }

  it('does not render when modelValue is false', () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: false, title: 'Test Modal' },
      global: globalConfig
    })
    
    expect(wrapper.find('.modal-overlay').exists()).toBe(false)
  })

  it('renders correctly when modelValue is true', () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal' },
      slots: { default: '<div class="test-content">Content</div>' },
      global: globalConfig
    })
    
    expect(wrapper.find('.modal-overlay').exists()).toBe(true)
    expect(wrapper.find('.modal-title').text()).toBe('Test Modal')
    expect(wrapper.find('.test-content').text()).toBe('Content')
    expect(wrapper.find('.modal-footer').exists()).toBe(false)
  })

  it('renders footer slot when provided', () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal' },
      slots: { footer: '<div class="test-footer">Footer</div>' },
      global: globalConfig
    })
    
    expect(wrapper.find('.modal-footer').exists()).toBe(true)
    expect(wrapper.find('.test-footer').text()).toBe('Footer')
  })

  it('emits close and update:modelValue on close button click', async () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal' },
      global: globalConfig
    })
    
    const closeBtn = wrapper.findComponent(BaseButton)
    await closeBtn.trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([false])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('does not emit close if closable is false', async () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal', closable: false },
      global: globalConfig
    })
    
    // Close button should not exist
    expect(wrapper.findComponent(BaseButton).exists()).toBe(false)
    
    // Try to close via backdrop click
    await wrapper.find('.modal-overlay').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })

  it('emits close on backdrop click if closable is true', async () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal' },
      global: globalConfig
    })
    
    // Click on overlay directly
    await wrapper.find('.modal-overlay').trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('emits close on Escape keydown', async () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal' },
      global: globalConfig
    })
    
    await wrapper.find('.modal-overlay').trigger('keydown', { key: 'Escape' })
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('applies correct size class', () => {
    const wrapper = mount(BaseModal, {
      props: { modelValue: true, title: 'Test Modal', size: 'lg' },
      global: globalConfig
    })
    
    expect(wrapper.find('.modal-card').classes()).toContain('modal-card--lg')
  })
})
