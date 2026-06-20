import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: './',
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    open: true
  },
  optimizeDeps: {
    exclude: ['pyodide']
  },
  assetsInclude: ['**/*.whl'],
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'echarts': ['echarts'],
          'duckdb': ['@duckdb/duckdb-wasm'],
          'xlsx': ['xlsx'],
          'gridstack': ['gridstack'],
          'export': ['jspdf', 'html2canvas', 'pptxgenjs']
        }
      }
    }
  },
  define: {
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
  }
})
