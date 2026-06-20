import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import BaseTabs from '../../../src/components/ui/BaseTabs.vue'

describe('BaseTabs.vue', () => {
  const tabs = [
    { key: 'tab1', label: 'Tab 1' },
    { key: 'tab2', label: 'Tab 2' },
    { key: 'tab3', label: 'Tab 3' }
  ]

  it('renders tabs correctly', () => {
    const wrapper = mount(BaseTabs, {
      props: { tabs, modelValue: 'tab1' }
    })
    
    const buttons = wrapper.findAll('.tab-btn')
    expect(buttons.length).toBe(3)
    expect(buttons[0].text()).toBe('Tab 1')
    expect(buttons[1].text()).toBe('Tab 2')
  })

  it('applies active class to the selected tab', () => {
    const wrapper = mount(BaseTabs, {
      props: { tabs, modelValue: 'tab2' }
    })
    
    const buttons = wrapper.findAll('.tab-btn')
    expect(buttons[0].classes()).not.toContain('tab-btn--active')
    expect(buttons[1].classes()).toContain('tab-btn--active')
    expect(buttons[2].classes()).not.toContain('tab-btn--active')
  })

  it('emits update:modelValue when a tab is clicked', async () => {
    const wrapper = mount(BaseTabs, {
      props: { tabs, modelValue: 'tab1' }
    })
    
    const buttons = wrapper.findAll('.tab-btn')
    await buttons[2].trigger('click') // Click on 'tab3'
    
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')[0]).toEqual(['tab3'])
  })

  it('renders default slot content', () => {
    const wrapper = mount(BaseTabs, {
      props: { tabs, modelValue: 'tab1' },
      slots: { default: '<div class="tab-content">Content</div>' }
    })
    
    expect(wrapper.find('.tab-content').exists()).toBe(true)
    expect(wrapper.find('.tab-content').text()).toBe('Content')
  })
})
