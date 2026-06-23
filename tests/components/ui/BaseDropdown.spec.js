import { mount, config } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import BaseDropdown from '../../../src/components/ui/BaseDropdown.vue'

config.global.stubs = { Teleport: true }

describe('BaseDropdown.vue', () => {
  const options = [
    { value: 1, label: 'Option 1' },
    { value: 2, label: 'Option 2' },
    { value: 3, label: 'Option 3' }
  ]

  it('renders placeholder when no value is selected', () => {
    const wrapper = mount(BaseDropdown, {
      props: { options, placeholder: 'Custom placeholder' },
      global: { stubs: { Teleport: true } }
    })
    
    expect(wrapper.find('.dropdown__placeholder').text()).toBe('Custom placeholder')
    expect(wrapper.find('.dropdown__menu').exists()).toBe(false)
  })

  it('renders selected option label', () => {
    const wrapper = mount(BaseDropdown, {
      props: { options, modelValue: 2 }
    })
    
    expect(wrapper.find('.dropdown__selected').text()).toBe('Option 2')
    expect(wrapper.find('.dropdown__placeholder').exists()).toBe(false)
  })

  it('toggles dropdown menu on click', async () => {
    const wrapper = mount(BaseDropdown, {
      props: { options }
    })
    
    const trigger = wrapper.find('.dropdown__trigger')
    
    // Open
    await trigger.trigger('click')
    expect(wrapper.find('.dropdown__menu').exists()).toBe(true)
    
    // Close
    await trigger.trigger('click')
    expect(wrapper.find('.dropdown__menu').exists()).toBe(false)
  })

  it('does not toggle when disabled', async () => {
    const wrapper = mount(BaseDropdown, {
      props: { options, disabled: true }
    })
    
    const trigger = wrapper.find('.dropdown__trigger')
    await trigger.trigger('click')
    
    expect(wrapper.find('.dropdown__menu').exists()).toBe(false)
    expect(wrapper.classes()).toContain('dropdown--disabled')
  })

  it('emits update:modelValue and closes menu when option is clicked', async () => {
    const wrapper = mount(BaseDropdown, {
      props: { options }
    })
    
    await wrapper.find('.dropdown__trigger').trigger('click')
    
    const items = wrapper.findAll('.dropdown__item')
    expect(items.length).toBe(3)
    
    await items[1].trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([2])
    expect(wrapper.find('.dropdown__menu').exists()).toBe(false)
  })

  it('displays empty state when no options provided', async () => {
    const wrapper = mount(BaseDropdown, {
      props: { options: [] }
    })
    
    await wrapper.find('.dropdown__trigger').trigger('click')
    
    expect(wrapper.find('.dropdown__empty').exists()).toBe(true)
    expect(wrapper.find('.dropdown__empty').text()).toBe('Sin opciones')
  })

  it('closes dropdown when clicking outside', async () => {
    // We attach it to document body to test document click events
    const elem = document.createElement('div')
    document.body.appendChild(elem)
    
    const wrapper = mount(BaseDropdown, {
      props: { options },
      attachTo: elem
    })
    
    await wrapper.find('.dropdown__trigger').trigger('click')
    expect(wrapper.find('.dropdown__menu').exists()).toBe(true)
    
    // Click outside
    document.dispatchEvent(new Event('click'))
    await wrapper.vm.$nextTick()
    
    expect(wrapper.find('.dropdown__menu').exists()).toBe(false)
    
    wrapper.unmount()
  })

  it('applies compact size class', () => {
    const wrapper = mount(BaseDropdown, {
      props: { options, size: 'compact' }
    })
    
    expect(wrapper.classes()).toContain('dropdown--size-compact')
  })
})
