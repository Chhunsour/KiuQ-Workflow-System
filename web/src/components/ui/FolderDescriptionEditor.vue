<template>
  <div class="folder-desc-editor">
    <!-- ── Toolbar ── -->
    <div class="fde-toolbar" v-if="editor">
      <!-- Text Style Group -->
      <div class="fde-btn-group">
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('heading', { level: 1 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
          :title="$t('Heading 1')"
        >{{ $t('H1') }}</button>
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('heading', { level: 2 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
          :title="$t('Heading 2')"
        >{{ $t('H2') }}</button>
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('heading', { level: 3 }) }"
          @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
          :title="$t('Heading 3')"
        >{{ $t('H3') }}</button>
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('paragraph') && !editor.isActive('heading') }"
          @click="editor.chain().focus().setParagraph().run()"
          :title="$t('Paragraph')"
        >P</button>
      </div>

      <span class="fde-divider"></span>

      <!-- Formatting Group -->
      <div class="fde-btn-group">
        <button
          type="button"
          class="fde-btn fde-btn--fmt"
          :class="{ 'fde-btn--active': editor.isActive('bold') }"
          @click="editor.chain().focus().toggleBold().run()"
          :title="$t('Bold')"
        ><strong>B</strong></button>
        <button
          type="button"
          class="fde-btn fde-btn--fmt"
          :class="{ 'fde-btn--active': editor.isActive('italic') }"
          @click="editor.chain().focus().toggleItalic().run()"
          :title="$t('Italic')"
        ><em>I</em></button>
        <button
          type="button"
          class="fde-btn fde-btn--fmt"
          :class="{ 'fde-btn--active': editor.isActive('underline') }"
          @click="editor.chain().focus().toggleUnderline().run()"
          :title="$t('Underline')"
        ><span style="text-decoration: underline">U</span></button>
      </div>

      <span class="fde-divider"></span>

      <!-- List Group -->
      <div class="fde-btn-group">
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('bulletList') }"
          @click="editor.chain().focus().toggleBulletList().run()"
          :title="$t('Bullet List')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
            <circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>
          </svg>
        </button>
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('orderedList') }"
          @click="editor.chain().focus().toggleOrderedList().run()"
          :title="$t('Ordered List')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
            <text x="2" y="8" font-size="8" fill="currentColor" stroke="none" font-weight="700">1</text>
            <text x="2" y="14" font-size="8" fill="currentColor" stroke="none" font-weight="700">2</text>
            <text x="2" y="20" font-size="8" fill="currentColor" stroke="none" font-weight="700">3</text>
          </svg>
        </button>
      </div>

      <span class="fde-divider"></span>

      <!-- Insert Group -->
      <div class="fde-btn-group">
        <button
          type="button"
          class="fde-btn"
          :class="{ 'fde-btn--active': editor.isActive('link') }"
          @click="toggleLinkDialog"
          :title="$t('Insert Link')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
        </button>
        <button
          type="button"
          class="fde-btn"
          @click="showImageDialog = true"
          :title="$t('Insert Image')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
          </svg>
        </button>
      </div>

      <span class="fde-divider"></span>

      <!-- History Group -->
      <div class="fde-btn-group">
        <button
          type="button"
          class="fde-btn"
          @click="editor.chain().focus().undo().run()"
          :disabled="!editor.can().undo()"
          :title="$t('Undo')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6.69 3L3 13"/>
          </svg>
        </button>
        <button
          type="button"
          class="fde-btn"
          @click="editor.chain().focus().redo().run()"
          :disabled="!editor.can().redo()"
          :title="$t('Redo')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6.69 3L21 13"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- ── Editor Content Area ── -->
    <div class="fde-content-wrap">
      <EditorContent :editor="editor" class="fde-content" />
    </div>

    <!-- ── Link Dialog ── -->
    <Teleport to="body">
      <div v-if="showLinkDialog" class="fde-dialog-overlay" @click.self="closeLinkDialog">
        <div class="fde-dialog">
          <div class="fde-dialog__header">
            <span class="fde-dialog__title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
              {{ editor?.isActive('link') ? 'Edit Link' : 'Insert Link' }}
            </span>
            <button type="button" class="fde-dialog__close" @click="closeLinkDialog" :title="$t('Close')">✕</button>
          </div>
          <div class="fde-dialog__body">
            <label class="fde-dialog__label">{{ $t('URL') }}</label>
            <input
              v-model="linkUrl"
              type="text"
              class="fde-dialog__input"
              placeholder="https://example.com"
              @keydown.enter.prevent="applyLink"
              ref="linkUrlInput"
            />
            <label class="fde-dialog__label" style="margin-top: 8px">
              <input type="checkbox" v-model="linkNewTab" class="fde-dialog__checkbox" />
              {{ $t('Open in new tab') }}
            </label>
          </div>
          <div class="fde-dialog__footer">
            <button
              v-if="editor?.isActive('link')"
              type="button"
              class="fde-dialog__btn fde-dialog__btn--danger"
              @click="removeLink"
            >{{ $t('Remove Link') }}</button>
            <div style="flex: 1"></div>
            <button type="button" class="fde-dialog__btn fde-dialog__btn--ghost" @click="closeLinkDialog">{{ $t('Cancel') }}</button>
            <button type="button" class="fde-dialog__btn fde-dialog__btn--primary" @click="applyLink">
              {{ editor?.isActive('link') ? 'Update' : 'Insert' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Image Dialog ── -->
    <Teleport to="body">
      <div v-if="showImageDialog" class="fde-dialog-overlay" @click.self="showImageDialog = false">
        <div class="fde-dialog">
          <div class="fde-dialog__header">
            <span class="fde-dialog__title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
              </svg>
              {{ $t('Insert Image') }}
            </span>
            <button type="button" class="fde-dialog__close" @click="showImageDialog = false" :title="$t('Close')">✕</button>
          </div>
          <div class="fde-dialog__body">
            <label class="fde-dialog__label">{{ $t('Image URL') }}</label>
            <input
              v-model="imageUrl"
              type="text"
              class="fde-dialog__input"
              placeholder="https://example.com/image.jpg"
              @keydown.enter.prevent="insertImage"
              ref="imageUrlInput"
            />
            <label class="fde-dialog__label" style="margin-top: 8px">{{ $t('Alt Text (optional)') }}</label>
            <input
              v-model="imageAlt"
              type="text"
              class="fde-dialog__input"
              :placeholder="$t('Product image description')"
            />
            <div v-if="imagePreviewUrl" class="fde-image-preview">
              <img :src="imagePreviewUrl" alt="Preview" />
            </div>
            <div v-if="imageError" class="fde-dialog__error">{{ imageError }}</div>
          </div>
          <div class="fde-dialog__footer">
            <div style="flex: 1"></div>
            <button type="button" class="fde-dialog__btn fde-dialog__btn--ghost" @click="showImageDialog = false">{{ $t('Cancel') }}</button>
            <button type="button" class="fde-dialog__btn fde-dialog__btn--primary" @click="insertImage">{{ $t('Insert Image') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount, nextTick, computed } from 'vue';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
}>();

// ── Link dialog state ──
const showLinkDialog = ref(false);
const linkUrl = ref('');
const linkNewTab = ref(true);
const linkUrlInput = ref<HTMLInputElement | null>(null);

// ── Image dialog state ──
const showImageDialog = ref(false);
const imageUrl = ref('');
const imageAlt = ref('');
const imageError = ref('');
const imageUrlInput = ref<HTMLInputElement | null>(null);

const imagePreviewUrl = computed(() => {
  const url = imageUrl.value.trim();
  if (!url) return '';
  if (/\.(jpg|jpeg|png|gif|webp|svg|avif|bmp|ico)(\?.*)?$/i.test(url)) return url;
  return '';
});

// ── Image URL regex for auto-detection on paste ──
const IMAGE_URL_RE = /^https?:\/\/\S+\.(jpg|jpeg|png|gif|webp|svg|avif)(\?\S*)?$/i;

// ── Tiptap Editor ──
const editor = useEditor({
  content: props.modelValue || '',
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', class: 'fde-link' },
    }),
    Image.configure({
      HTMLAttributes: { class: 'fde-image' },
      allowBase64: false,
    }),
    Placeholder.configure({
      placeholder: 'Write your product description here… Use the toolbar to add headings, formatting, images, and links.',
    }),
  ],
  editorProps: {
    handlePaste(view, event) {
      const text = event.clipboardData?.getData('text/plain')?.trim();
      if (text && IMAGE_URL_RE.test(text)) {
        editor.value?.chain().focus().setImage({ src: text, alt: '' }).run();
        return true;
      }
      return false;
    },
    attributes: {
      class: 'fde-prosemirror',
    },
  },
  onUpdate({ editor: e }) {
    const html = e.getHTML();
    emit('update:modelValue', html === '<p></p>' ? '' : html);
  },
});

// ── Sync external model changes ──
watch(
  () => props.modelValue,
  (newVal) => {
    if (!editor.value) return;
    const currentHtml = editor.value.getHTML();
    const empty = currentHtml === '<p></p>' ? '' : currentHtml;
    if (newVal !== empty) {
      editor.value.commands.setContent(newVal || '', { emitUpdate: false });
    }
  }
);

// ── Link dialog logic ──
function toggleLinkDialog() {
  if (!editor.value) return;
  if (editor.value.isActive('link')) {
    const attrs = editor.value.getAttributes('link');
    linkUrl.value = attrs.href || '';
    linkNewTab.value = attrs.target === '_blank';
  } else {
    linkUrl.value = '';
    linkNewTab.value = true;
  }
  showLinkDialog.value = true;
  nextTick(() => linkUrlInput.value?.focus());
}

function applyLink() {
  if (!editor.value) return;
  const url = linkUrl.value.trim();
  if (!url) {
    removeLink();
    return;
  }
  const target = linkNewTab.value ? '_blank' : null;
  editor.value
    .chain()
    .focus()
    .extendMarkRange('link')
    .setLink({ href: url, target })
    .run();
  closeLinkDialog();
}

function removeLink() {
  editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
  closeLinkDialog();
}

function closeLinkDialog() {
  showLinkDialog.value = false;
  linkUrl.value = '';
}

// ── Image dialog logic ──
watch(showImageDialog, (v) => {
  if (v) {
    imageUrl.value = '';
    imageAlt.value = '';
    imageError.value = '';
    nextTick(() => imageUrlInput.value?.focus());
  }
});

function insertImage() {
  if (!editor.value) return;
  const url = imageUrl.value.trim();
  if (!url) {
    imageError.value = 'Please enter an image URL.';
    return;
  }
  try {
    new URL(url);
  } catch {
    imageError.value = 'Please enter a valid URL.';
    return;
  }
  editor.value.chain().focus().setImage({ src: url, alt: imageAlt.value.trim() || '' }).run();
  showImageDialog.value = false;
}

onBeforeUnmount(() => {
  editor.value?.destroy();
});
</script>

<style>
/* ═══════════════════════════════════════════════════════════════════════════
   FolderDescriptionEditor — Word-style rich text editor
   ═══════════════════════════════════════════════════════════════════════════ */

.folder-desc-editor {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--card);
  transition: border-color 0.2s;
}
.folder-desc-editor:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.12);
}

/* ── Toolbar ── */
.fde-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--soft);
  border-bottom: 1px solid var(--border);
}
.fde-btn-group {
  display: flex;
  align-items: center;
  gap: 1px;
}
.fde-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 5px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-soft);
  font-size: 11px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.15s;
  line-height: 1;
}
.fde-btn:hover {
  background: var(--border);
  color: var(--text-main);
}
.fde-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.fde-btn--active {
  background: var(--primary) !important;
  color: #f8fbff !important;
}
.fde-btn--fmt strong { font-size: 12px; }
.fde-btn--fmt em { font-size: 12px; font-style: italic; }

.fde-divider {
  display: inline-block;
  width: 1px;
  height: 18px;
  background: var(--border);
  margin: 0 4px;
  opacity: 0.5;
}

/* ── Content Area ── */
.fde-content-wrap {
  min-height: 220px;
  max-height: 420px;
  overflow-y: auto;
  background: var(--card);
}

/* ProseMirror — editing area styles */
.fde-prosemirror {
  outline: none;
  padding: 14px 16px;
  min-height: 200px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-main);
}

.fde-prosemirror p {
  margin: 0 0 8px 0;
}
.fde-prosemirror p:last-child {
  margin-bottom: 0;
}

.fde-prosemirror h1 {
  font-size: 22px;
  font-weight: 800;
  margin: 16px 0 8px 0;
  line-height: 1.3;
  color: var(--text-main);
}
.fde-prosemirror h1:first-child { margin-top: 0; }

.fde-prosemirror h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 14px 0 6px 0;
  line-height: 1.35;
  color: var(--text-main);
}
.fde-prosemirror h2:first-child { margin-top: 0; }

.fde-prosemirror h3 {
  font-size: 15px;
  font-weight: 700;
  margin: 12px 0 4px 0;
  line-height: 1.4;
  color: var(--text-main);
}
.fde-prosemirror h3:first-child { margin-top: 0; }

.fde-prosemirror ul,
.fde-prosemirror ol {
  padding-left: 22px;
  margin: 6px 0 10px 0;
}
.fde-prosemirror ul { list-style-type: disc; }
.fde-prosemirror ol { list-style-type: decimal; }
.fde-prosemirror li { margin-bottom: 3px; }
.fde-prosemirror li p { margin: 0; }

.fde-prosemirror strong { font-weight: 700; }
.fde-prosemirror em { font-style: italic; }
.fde-prosemirror u { text-decoration: underline; }

/* Links inside the editor */
.fde-prosemirror .fde-link,
.fde-prosemirror a {
  color: var(--primary);
  text-decoration: underline;
  cursor: pointer;
  transition: opacity 0.15s;
}
.fde-prosemirror a:hover { opacity: 0.8; }

/* Images inside the editor */
.fde-prosemirror .fde-image,
.fde-prosemirror img {
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  margin: 8px 0;
  display: block;
}
.fde-prosemirror img.ProseMirror-selectednode {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  border-radius: 8px;
}

/* Placeholder */
.fde-prosemirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted);
  opacity: 0.6;
  pointer-events: none;
  height: 0;
  font-style: italic;
  font-size: 12px;
}

/* ── Dialog Overlay ── */
.fde-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  animation: fde-fade-in 0.15s ease-out;
}
@keyframes fde-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fde-dialog {
  width: 380px;
  max-width: 92vw;
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
  animation: fde-dialog-pop 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes fde-dialog-pop {
  from { transform: scale(0.95) translateY(8px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.fde-dialog__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.fde-dialog__title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-main);
  display: flex;
  align-items: center;
  gap: 6px;
}
.fde-dialog__close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  transition: all 0.15s;
}
.fde-dialog__close:hover {
  background: var(--border);
  color: var(--text-main);
}

.fde-dialog__body {
  padding: 14px 16px;
}
.fde-dialog__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 4px;
}
.fde-dialog__input {
  width: 100%;
  padding: 7px 10px;
  font-size: 12px;
  color: var(--text-main);
  background: var(--soft);
  border: 1px solid var(--border);
  border-radius: 8px;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}
.fde-dialog__input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb, 59, 130, 246), 0.12);
}
.fde-dialog__checkbox {
  accent-color: var(--primary);
}
.fde-dialog__error {
  margin-top: 6px;
  font-size: 11px;
  color: var(--status-needs-fix-fg, #ef4444);
  font-weight: 600;
}

.fde-dialog__footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
}
.fde-dialog__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 6px 14px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 8px;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  font-family: inherit;
}
.fde-dialog__btn--primary {
  background: var(--primary);
  color: #f8fbff;
}
.fde-dialog__btn--primary:hover { filter: brightness(1.1); }
.fde-dialog__btn--ghost {
  background: transparent;
  color: var(--text-soft);
  border: 1px solid var(--border);
}
.fde-dialog__btn--ghost:hover {
  background: var(--soft);
  color: var(--text-main);
}
.fde-dialog__btn--danger {
  background: rgba(239, 68, 68, 0.12);
  color: #ef4444;
}
.fde-dialog__btn--danger:hover { background: rgba(239, 68, 68, 0.22); }

/* ── Image Preview in dialog ── */
.fde-image-preview {
  margin-top: 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  overflow: hidden;
  max-height: 140px;
}
.fde-image-preview img {
  width: 100%;
  height: 100%;
  max-height: 140px;
  object-fit: contain;
  display: block;
  background: var(--soft);
}
</style>
