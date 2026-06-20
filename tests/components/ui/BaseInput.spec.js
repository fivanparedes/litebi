import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BaseInput from '../../../src/components/ui/BaseInput.vue'

describe('BaseInput.vue', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(BaseInput)
    const input = wrapper.find('input')
    
    expect(input.exists()).toBe(true)
    expect(input.attributes('type')).toBe('text')
    expect(wrapper.find('.input-label').exists()).toBe(false)
    expect(wrapper.find('.input-error-text').exists()).toBe(false)
  })

  it('renders label when provided', () => {
    const wrapper = mount(BaseInput, {
      props: { label: 'Username' }
    })
    
    const label = wrapper.find('.input-label')
    expect(label.exists()).toBe(true)
    expect(label.text()).toBe('Username')
    
    // Check if label for attribute matches input id
    const inputId = wrapper.find('input').attributes('id')
    expect(label.attributes('for')).toBe(inputId)
  })

  it('emits update:modelValue on input', async () => {
    const wrapper = mount(BaseInput, {
      props: { modelValue: '' }
    })
    
    const input = wrapper.find('input')
    await input.setValue('new value')
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['new value'])
  })

  it('displays error message and applies error class', () => {
    const wrapper = mount(BaseInput, {
      props: { error: 'Invalid input' }
    })
    
    const errorText = wrapper.find('.input-error-text')
    expect(errorText.exists()).toBe(true)
    expect(errorText.text()).toBe('Invalid input')
    
    expect(wrapper.classes()).toContain('input-wrapper--error')
  })

  it('disables input when disabled prop is true', () => {
    const wrapper = mount(BaseInput, {
      props: { disabled: true }
    })
    
    const input = wrapper.find('input')
    expect(input.element.disabled).toBe(true)
    expect(wrapper.classes()).toContain('input-wrapper--disabled')
  })

  it('renders prefix and suffix slots', () => {
    const wrapper = mount(BaseInput, {
      slots: {
        prefix: '<span class="test-prefix">Pre</span>',
        suffix: '<span class="test-suffix">Suf</span>'
      }
    })
    
    expect(wrapper.find('.test-prefix').exists()).toBe(true)
    expect(wrapper.find('.test-prefix').text()).toBe('Pre')
    
    expect(wrapper.find('.test-suffix').exists()).toBe(true)
    expect(wrapper.find('.test-suffix').text()).toBe('Suf')
  })

  it('applies compact size class', () => {
    const wrapper = mount(BaseInput, {
      props: { size: 'compact' }
    })
    
    expect(wrapper.classes()).toContain('input-wrapper--size-compact')
  })
})
