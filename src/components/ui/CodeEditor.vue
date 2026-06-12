<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorState, Compartment } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { sql } from '@codemirror/lang-sql'
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  language: {
    type: String,
    default: 'sql'
  },
  singleLine: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'enter'])

const editorRef = ref(null)
let view = null
const themeCompartment = new Compartment()
let observer = null

onMounted(() => {
  if (!editorRef.value) return
  
  const isDark = document.documentElement.classList.contains('dark')
  
  const langExtension = props.language === 'python' ? python() : sql()
  
  // Custom transparent theme so it inherits wrapper colors
  const customTheme = EditorView.theme({
    "&": {
      backgroundColor: "transparent",
      color: "var(--foreground)"
    },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--muted-foreground)",
      borderRight: "1px solid var(--color-border)"
    },
    "&.cm-focused .cm-cursor": {
      borderLeftColor: "var(--foreground)"
    },
    "&.cm-focused .cm-selectionBackground, ::selection": {
      backgroundColor: "var(--color-primary-light)"
    }
  })

  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      ...(props.singleLine ? [] : [lineNumbers()]),
      EditorView.lineWrapping,
      history(),
      bracketMatching(),
      keymap.of([
        ...(props.singleLine ? [{ key: "Enter", run: () => { emit('enter'); return true; } }] : []),
        ...defaultKeymap, 
        ...historyKeymap
      ]),
      langExtension,
      customTheme,
      themeCompartment.of(isDark ? oneDark : syntaxHighlighting(defaultHighlightStyle)),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          emit('update:modelValue', update.state.doc.toString())
        }
      })
    ]
  })
  
  view = new EditorView({
    state: startState,
    parent: editorRef.value
  })

  // Watch for theme changes
  observer = new MutationObserver(() => {
    if (view) {
      const darkNow = document.documentElement.classList.contains('dark')
      view.dispatch({
        effects: themeCompartment.reconfigure(darkNow ? oneDark : syntaxHighlighting(defaultHighlightStyle))
      })
    }
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})

// External update to code (e.g. inserting column name)
watch(() => props.modelValue, (newVal) => {
  if (view && newVal !== view.state.doc.toString()) {
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: newVal }
    })
  }
})

onUnmounted(() => {
  if (view) {
    view.destroy()
  }
  if (observer) {
    observer.disconnect()
  }
})
</script>

<template>
  <div class="code-editor-wrapper">
    <div ref="editorRef" class="cm-editor-container"></div>
  </div>
</template>

<style scoped>
.code-editor-wrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--background);
}

.cm-editor-container {
  height: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

:deep(.cm-editor) {
  height: 100%;
  outline: none !important;
}

:deep(.cm-scroller) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
</style>
