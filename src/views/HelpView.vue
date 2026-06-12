<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { marked } from 'marked'
import manualMarkdown from '../../docs/MANUAL.md?raw'

// Parse markdown to HTML
const htmlContent = computed(() => {
  return marked.parse(manualMarkdown)
})

// Extract headings for sidebar TOC
const toc = computed(() => {
  const tokens = marked.lexer(manualMarkdown)
  const headings = tokens.filter(t => t.type === 'heading' && t.depth === 2)
  return headings.map((h, index) => {
    // Generate a simple ID based on text
    const id = `heading-${index}`
    return {
      text: h.text,
      id: id
    }
  })
})

const contentRef = ref(null)

onMounted(() => {
  // Wait for the HTML to be rendered
  nextTick(() => {
    if (contentRef.value) {
      const h2Elements = contentRef.value.querySelectorAll('h2')
      h2Elements.forEach((el, index) => {
        el.id = `heading-${index}`
      })
    }
  })
})

const scrollTo = (id) => {
  const el = document.getElementById(id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' })
  }
}
</script>

<template>
  <div class="view-container">
    <div class="help-layout">
      <!-- Sidebar TOC -->
      <aside class="help-sidebar">
        <h3 class="sidebar-title">Índice</h3>
        <nav class="toc-nav">
          <ul>
            <li v-for="item in toc" :key="item.id">
              <a href="#" @click.prevent="scrollTo(item.id)">{{ item.text }}</a>
            </li>
          </ul>
        </nav>
      </aside>

      <!-- Main Content -->
      <main class="help-content">
        <div class="manual-container">
          <div ref="contentRef" class="markdown-body" v-html="htmlContent"></div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.view-container {
  height: 100%;
  background-color: var(--card);
  overflow: hidden; /* Let the layout manage scrolling */
}

.help-layout {
  display: flex;
  height: 100%;
  max-width: 1400px;
  margin: 0 auto;
}

.help-sidebar {
  width: 300px;
  flex-shrink: 0;
  background-color: var(--background);
  border-right: 1px solid var(--color-border);
  padding: var(--space-6);
  overflow-y: auto;
}

.sidebar-title {
  font-size: var(--text-lg);
  font-weight: var(--font-bold);
  color: var(--foreground);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-accent);
  padding-bottom: var(--space-2);
  display: inline-block;
}

.toc-nav ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.toc-nav a {
  text-decoration: none;
  color: var(--muted-foreground);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  transition: color var(--transition-fast);
  display: block;
  line-height: 1.4;
}

.toc-nav a:hover {
  color: var(--color-accent);
}

.help-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: var(--space-6);
}

.manual-container {
  max-width: 900px;
  background-color: var(--background);
  padding: var(--space-8);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--color-border);
  margin-bottom: var(--space-8);
}

/* Basic Markdown styling */
.markdown-body :deep(h1) {
  margin-top: 0;
  color: var(--foreground);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: var(--space-2);
}

.markdown-body :deep(h2) {
  color: var(--color-accent);
  margin-top: var(--space-8);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-2);
}

.markdown-body :deep(h3) {
  color: var(--foreground);
  margin-top: var(--space-6);
}

.markdown-body :deep(p) {
  color: var(--muted-foreground);
  line-height: 1.6;
  margin: var(--space-3) 0;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  color: var(--muted-foreground);
  line-height: 1.6;
  padding-left: var(--space-6);
  margin: var(--space-3) 0;
}

.markdown-body :deep(li) {
  margin-bottom: var(--space-1);
}

.markdown-body :deep(code) {
  background-color: var(--muted);
  padding: 0.2em 0.4em;
  border-radius: var(--radius-sm);
  font-family: monospace;
  color: var(--color-accent);
}

.markdown-body :deep(pre) {
  background-color: var(--muted);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  overflow-x: auto;
  margin: var(--space-4) 0;
  border: 1px solid var(--color-border);
}

.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
  color: var(--foreground);
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
