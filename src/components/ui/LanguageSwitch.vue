<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useUiStore } from '@/stores/uiStore'
import { Globe } from '@lucide/vue'
import BaseButton from './BaseButton.vue'

const { locale } = useI18n()
const uiStore = useUiStore()

const toggleLanguage = () => {
  const newLocale = locale.value === 'es' ? 'en' : 'es'
  locale.value = newLocale
  uiStore.setLocale(newLocale)
}

const currentLangLabel = computed(() => locale.value.toUpperCase())
</script>

<template>
  <BaseButton
    variant="ghost"
    size="sm"
    @click="toggleLanguage"
    class="language-switch"
    :title="$t('header.language')"
  >
    <template #icon-left>
      <Globe />
    </template>
    {{ currentLangLabel }}
  </BaseButton>
</template>

<style scoped>
.language-switch {
  font-weight: var(--font-medium);
}
</style>
