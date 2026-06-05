import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    ignores: ['dist/**', 'node_modules/**', '.vite/**', 'electron/**']
  },
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-undef': 'off',
      'no-unused-vars': 'warn',
      'preserve-caught-error': 'off'
    }
  }
]
