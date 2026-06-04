<script setup>
import { computed } from 'vue'
import { marked } from 'marked'
import manualMarkdown from '../../docs/MANUAL.md?raw'

const htmlContent = computed(() => {
  return marked.parse(manualMarkdown)
})
</script>

<template>
  <div class="view-container">
    <div class="manual-container">
      <div class="markdown-body" v-html="htmlContent"></div>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  padding: var(--space-6);
  overflow-y: auto;
  background-color: var(--color-bg-primary);
}

.manual-container {
  max-width: 800px;
  margin: 0 auto;
  background-color: var(--color-bg-surface);
  padding: var(--space-8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
}

/* Basic Markdown styling */
.markdown-body :deep(h1) {
  margin-top: 0;
  color: var(--color-text-primary);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: var(--space-2);
}

.markdown-body :deep(h2) {
  color: var(--color-accent);
  margin-top: var(--space-6);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-1);
}

.markdown-body :deep(h3) {
  color: var(--color-text-primary);
  margin-top: var(--space-4);
}

.markdown-body :deep(p) {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin: var(--space-3) 0;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  color: var(--color-text-secondary);
  line-height: 1.6;
  padding-left: var(--space-6);
  margin: var(--space-3) 0;
}

.markdown-body :deep(li) {
  margin-bottom: var(--space-1);
}

.markdown-body :deep(code) {
  background-color: var(--color-bg-secondary);
  padding: 0.2em 0.4em;
  border-radius: var(--radius-sm);
  font-family: monospace;
  color: var(--color-accent);
}

.markdown-body :deep(hr) {
  border: 0;
  border-top: 1px solid var(--color-border);
  margin: var(--space-6) 0;
}

.markdown-body :deep(a) {
  color: var(--color-accent);
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}
</style>
