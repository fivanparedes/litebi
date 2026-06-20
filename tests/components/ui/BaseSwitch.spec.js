import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BaseSwitch from '../../../src/components/ui/BaseSwitch.vue'

describe('BaseSwitch.vue', () => {
  it('renders correctly', () => {
    const wrapper = mount(BaseSwitch)
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.attributes('aria-checked')).toBe('false')
  })

  it('toggles value when clicked', async () => {
    const wrapper = mount(BaseSwitch, {
      props: { modelValue: false }
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual([true])
  })

  it('does not toggle when disabled', async () => {
    const wrapper = mount(BaseSwitch, {
      props: { modelValue: false, disabled: true }
    })
    
    await wrapper.find('button').trigger('click')
    
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
    expect(wrapper.find('button').element.disabled).toBe(true)
  })

  it('applies classes based on modelValue', () => {
    const wrapperFalse = mount(BaseSwitch, {
      props: { modelValue: false }
    })
    expect(wrapperFalse.find('button').classes()).toContain('bg-input')
    
    const wrapperTrue = mount(BaseSwitch, {
      props: { modelValue: true }
    })
    expect(wrapperTrue.find('button').classes()).toContain('bg-primary')
  })

  it('applies square styling when square prop is true', () => {
    const wrapper = mount(BaseSwitch, {
      props: { square: true, modelValue: false }
    })
    
    const button = wrapper.find('button')
    expect(button.classes()).toContain('rounded-none')
  })
})
