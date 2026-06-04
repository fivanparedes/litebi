<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, bracketMatching } from '@codemirror/language'
import { sql } from '@codemirror/lang-sql'
import { oneDark } from '@codemirror/theme-one-dark'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  schema: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['update:modelValue'])

const editorRef = ref(null)
let view = null

onMounted(() => {
  if (!editorRef.value) return
  
  // Custom completions based on schema could be injected here via sql language dialect config
  // For MVP we just use generic SQL + our oneDark theme
  
  const startState = EditorState.create({
    doc: props.modelValue,
    extensions: [
      lineNumbers(),
      history(),
      bracketMatching(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      sql(),
      oneDark,
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
})
</script>

<template>
  <div class="formula-editor-wrapper">
    <div ref="editorRef" class="cm-editor-container"></div>
  </div>
</template>

<style scoped>
.formula-editor-wrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
}

.cm-editor-container {
  height: 100%;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
}
</style>
