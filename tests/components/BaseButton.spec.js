import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BaseButton from '../../src/components/ui/BaseButton.vue'

describe('BaseButton', () => {
  it('renders a button with primary variant and md size by default', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Click me'
      }
    })
    
    expect(wrapper.find('button').exists()).toBe(true)
    expect(wrapper.classes()).toContain('btn--primary')
    expect(wrapper.classes()).toContain('btn--md')
    expect(wrapper.text()).toContain('Click me')
  })

  it('applies the correct variant class', () => {
    const wrapper = mount(BaseButton, {
      props: {
        variant: 'danger'
      }
    })
    expect(wrapper.classes()).toContain('btn--danger')
  })

  it('applies the correct size class', () => {
    const wrapper = mount(BaseButton, {
      props: {
        size: 'sm'
      }
    })
    expect(wrapper.classes()).toContain('btn--sm')
  })

  it('shows loading spinner and disables button when loading is true', () => {
    const wrapper = mount(BaseButton, {
      props: {
        loading: true
      }
    })
    
    expect(wrapper.find('.btn__spinner').exists()).toBe(true)
    expect(wrapper.classes()).toContain('btn--loading')
    expect(wrapper.classes()).toContain('btn--disabled')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(wrapper.attributes('aria-disabled')).toBe('true')
  })

  it('disables the button when disabled prop is true', () => {
    const wrapper = mount(BaseButton, {
      props: {
        disabled: true
      }
    })
    
    expect(wrapper.classes()).toContain('btn--disabled')
    expect(wrapper.attributes('disabled')).toBeDefined()
    expect(wrapper.attributes('aria-disabled')).toBe('true')
  })

  it('renders left and right slots properly', () => {
    const wrapper = mount(BaseButton, {
      slots: {
        default: 'Text',
        'icon-left': '<span class="left-icon">L</span>',
        'icon-right': '<span class="right-icon">R</span>'
      }
    })
    
    expect(wrapper.find('.left-icon').exists()).toBe(true)
    expect(wrapper.find('.right-icon').exists()).toBe(true)
    expect(wrapper.text()).toContain('L')
    expect(wrapper.text()).toContain('R')
  })
})
