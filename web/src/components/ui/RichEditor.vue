<template>
  <div class="rich-editor flex flex-col border border-border rounded-btn bg-input overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition duration-150">
    <!-- Toolbar -->
    <div class="toolbar flex flex-wrap items-center gap-1 p-1.5 bg-soft border-b border-border select-none">
      <button
        type="button"
        class="tool-btn"
        :title="$t('Bold')"
        @click="format('bold')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
          <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>
        </svg>
      </button>

      <button
        type="button"
        class="tool-btn"
        :title="$t('Italic')"
        @click="format('italic')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="19" y1="4" x2="10" y2="4"/>
          <line x1="14" y1="20" x2="5" y2="20"/>
          <line x1="15" y1="4" x2="9" y2="20"/>
        </svg>
      </button>

      <button
        type="button"
        class="tool-btn text-xs font-bold px-1"
        :title="$t('Heading 2')"
        @click="formatBlock('h2')"
      >
        {{ $t('H2') }}
      </button>

      <button
        type="button"
        class="tool-btn text-xs font-bold px-1"
        :title="$t('Heading 3')"
        @click="formatBlock('h3')"
      >
        {{ $t('H3') }}
      </button>

      <button
        type="button"
        class="tool-btn"
        :title="$t('Bullet List')"
        @click="format('insertUnorderedList')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      </button>

      <button
        type="button"
        class="tool-btn"
        :title="$t('Clear Format')"
        @click="format('removeFormat')"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 6L6 18M6 6l12 12"/>
        </svg>
      </button>

      <span class="text-[10px] text-text-muted ml-auto mr-2 font-mono hidden sm:inline" v-if="saving">
        {{ $t('Saving...') }}
      </span>
      <span class="text-[10px] text-text-muted ml-auto mr-2 font-mono hidden sm:inline" v-else-if="modelValue">
        {{ $t('Saved') }}
      </span>
    </div>

    <!-- Edit Area -->
    <div
      ref="editorRef"
      contenteditable="true"
      class="editor-area p-4 min-h-[160px] text-sm text-text-main focus:outline-none overflow-y-auto"
      :data-:placeholder="$t('placeholder || \'Type your notes here...\'')"
      @input="handleInput"
      @blur="handleBlur"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';

const props = defineProps<{
  modelValue: string;
  placeholder?: string;
  saving?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
  (e: 'change', val: string): void;
  (e: 'blur'): void;
}>();

const editorRef = ref<HTMLDivElement | null>(null);
let lastHTML = '';

watch(() => props.modelValue, (newVal) => {
  if (editorRef.value && newVal !== lastHTML) {
    editorRef.value.innerHTML = newVal;
    lastHTML = newVal;
  }
});

onMounted(() => {
  if (editorRef.value) {
    editorRef.value.innerHTML = props.modelValue || '';
    lastHTML = props.modelValue || '';
  }
});

const handleInput = () => {
  if (!editorRef.value) return;
  const html = editorRef.value.innerHTML;
  lastHTML = html;
  emit('update:modelValue', html);
  emit('change', html);
};

const handleBlur = () => {
  emit('blur');
};

const format = (command: string) => {
  document.execCommand(command, false, undefined);
  handleInput();
  if (editorRef.value) {
    editorRef.value.focus();
  }
};

const formatBlock = (tag: string) => {
  // Check if current format is already the tag, if so, turn back to div
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const parent = selection.anchorNode?.parentElement;
    if (parent && parent.tagName.toLowerCase() === tag) {
      document.execCommand('formatBlock', false, 'div');
    } else {
      document.execCommand('formatBlock', false, tag);
    }
  } else {
    document.execCommand('formatBlock', false, tag);
  }
  handleInput();
  if (editorRef.value) {
    editorRef.value.focus();
  }
};
</script>

<style scoped>
.rich-editor {
  min-height: 200px;
}

.tool-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 100ms ease;
}

.tool-btn:hover {
  background: var(--border);
  color: var(--text-main);
}

.editor-area {
  outline: none;
  position: relative;
}

/* Custom placeholder logic for contenteditable */
.editor-area:empty::before {
  content: attr(data-placeholder);
  position: absolute;
  color: var(--text-soft);
  opacity: 0.7;
  pointer-events: none;
}

/* Styling headers and lists inside editor area */
.editor-area :deep(h2) {
  font-size: 1.25rem;
  font-weight: 700;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
  color: var(--text-main);
}

.editor-area :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 0.8rem;
  margin-bottom: 0.4rem;
  color: var(--text-main);
}

.editor-area :deep(ul) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.editor-area :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.editor-area :deep(p) {
  margin-bottom: 0.5rem;
}
</style>
