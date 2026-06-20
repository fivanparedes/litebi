import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // Sidebar
  const sidebarCollapsed = ref(false)
  
  // Command Palette
  const isCommandPaletteOpen = ref(false)
  function toggleCommandPalette(val) {
    if (val !== undefined) {
      isCommandPaletteOpen.value = val
    } else {
      isCommandPaletteOpen.value = !isCommandPaletteOpen.value
    }
  }

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // Locale
  const locale = ref(localStorage.getItem('litebi_locale') || 'es')
  document.documentElement.lang = locale.value

  watch(locale, (newLocale) => {
    localStorage.setItem('litebi_locale', newLocale)
  })

  function setLocale(newLocale) {
    locale.value = newLocale
    document.documentElement.lang = newLocale
  }

  // Viewer Mode
  const isViewerMode = ref(false)
  
  function setViewerMode(val) {
    isViewerMode.value = val
  }

  // Toasts
  const toasts = ref([])
  let toastId = 0

  function addToast({ message, type = 'info', duration = 4000 }) {
    const id = ++toastId
    toasts.value.push({ id, message, type, duration })

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration)
    }

    return id
  }

  function removeToast(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  // Modal
  const activeModal = ref(null)
  const modalProps = ref({})

  function openModal(name, props = {}) {
    activeModal.value = name
    modalProps.value = props
  }

  function closeModal() {
    activeModal.value = null
    modalProps.value = {}
  }

  // Active view title (for header)
  const activeViewTitle = ref('')

  // Pipeline Execution Trigger
  const runPipelineTrigger = ref(0)
  
  function triggerRunPipeline() {
    runPipelineTrigger.value++
  }

  return {
    // Sidebar
    sidebarCollapsed,
    toggleSidebar,
    // Command Palette
    isCommandPaletteOpen,
    toggleCommandPalette,
    // Locale
    locale,
    setLocale,
    // Viewer
    isViewerMode,
    setViewerMode,
    // Toasts
    toasts,
    addToast,
    removeToast,
    // Modal
    activeModal,
    modalProps,
    openModal,
    closeModal,
    // View
    activeViewTitle,
    // Pipeline
    runPipelineTrigger,
    triggerRunPipeline
  }
})
