import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import i18n from './i18n'

import './index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)

// Directiva global para autofocus
app.directive('focus', {
  mounted(el) {
    setTimeout(() => {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.focus()
      } else {
        const input = el.querySelector('input, textarea')
        if (input) input.focus()
      }
    }, 50)
  }
})

app.mount('#app')
