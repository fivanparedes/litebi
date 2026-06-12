<script setup>
import { ref, watch } from 'vue'
import { X, Check, FunctionSquare, ChevronDown } from '@lucide/vue'
import CodeEditor from '@/components/ui/CodeEditor.vue'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  columnName: {
    type: String,
    default: ''
  },
  lang: {
    type: String,
    default: 'M / SQL'
  }
})

const emit = defineEmits(['update:modelValue', 'update:columnName', 'apply', 'cancel', 'insert-function'])

const localValue = ref(props.modelValue)
const localColumnName = ref(props.columnName)

watch(() => props.modelValue, (newVal) => {
  localValue.value = newVal
})

watch(localValue, (newVal) => {
  if (newVal && newVal.includes('\n')) {
    localValue.value = newVal.replace(/\s*\n\s*/g, ' ').trim()
  }
})

watch(() => props.columnName, (newVal) => {
  localColumnName.value = newVal
})

const handleApply = () => {
  emit('update:modelValue', localValue.value)
  emit('update:columnName', localColumnName.value)
  emit('apply', { value: localValue.value, columnName: localColumnName.value })
}

const handleCancel = () => {
  localValue.value = props.modelValue
  localColumnName.value = props.columnName
  emit('cancel')
}
</script>

<template>
  <div class="flex items-stretch border border-border bg-card rounded shadow-sm overflow-hidden h-10 shrink-0">
    <!-- Column Name Input -->
    <div class="flex items-center border-r border-border bg-muted/10">
      <input 
        v-model="localColumnName"
        type="text" 
        class="h-full w-48 px-4 text-xs font-medium text-foreground bg-transparent focus:outline-none focus:bg-muted/30 transition-colors"
        placeholder="Column Name..."
        @keydown.enter="handleApply"
        @keydown.esc="handleCancel"
      />
    </div>
    
    <!-- Action Buttons -->
    <div class="flex items-center px-2 border-r border-border gap-1 bg-background text-muted-foreground shrink-0">
      <button class="w-6 h-6 flex items-center justify-center hover:bg-muted hover:text-destructive rounded transition-colors" title="Cancel" @click="handleCancel">
        <X class="w-3.5 h-3.5" />
      </button>
      <button class="w-6 h-6 flex items-center justify-center hover:bg-muted hover:text-primary rounded transition-colors" title="Apply" @click="handleApply">
        <Check class="w-3.5 h-3.5" />
      </button>
      <button class="w-6 h-6 flex items-center justify-center hover:bg-muted hover:text-foreground rounded transition-colors" title="Insert Function" @click="emit('insert-function')">
        <FunctionSquare class="w-3 h-3" />
      </button>
    </div>

    <!-- Formula Input -->
    <div class="flex-1 flex bg-background relative" @keydown.esc="handleCancel">
      <CodeEditor 
        v-model="localValue"
        :language="lang.toLowerCase().includes('python') ? 'python' : 'sql'" 
        single-line
        @enter="handleApply"
      />
    </div>

    <!-- Language Indicator -->
    <div class="flex items-center px-4 border-l border-border bg-muted/5 text-[10px] uppercase font-mono tracking-wider text-muted-foreground shrink-0">
      {{ lang }}
    </div>
  </div>
</template>

<style scoped>
:deep(.cm-editor-container) {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
:deep(.cm-editor) {
  height: auto !important;
}
:deep(.cm-scroller) {
  overflow: hidden !important;
}
</style>
