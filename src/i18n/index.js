import { createI18n } from 'vue-i18n'
import es from './es.json'
import en from './en.json'

const savedLocale = localStorage.getItem('litebi_locale')
const browserLang = navigator.language?.split('-')[0] || 'es'
const defaultLocale = savedLocale || (['es', 'en'].includes(browserLang) ? browserLang : 'es')

const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'es',
  messages: { es, en }
})

export default i18n
