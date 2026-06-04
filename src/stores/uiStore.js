import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUiStore = defineStore('ui', () => {
  // Sidebar
  const sidebarCollapsed = ref(false)

  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value
  }

  // Locale
  const locale = ref('es')

  function setLocale(newLocale) {
    locale.value = newLocale
    document.documentElement.lang = newLocale
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

  return {
    // Sidebar
    sidebarCollapsed,
    toggleSidebar,
    // Locale
    locale,
    setLocale,
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
    activeViewTitle
  }
})
