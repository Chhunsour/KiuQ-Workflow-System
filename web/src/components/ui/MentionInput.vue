<template>
  <div class="mi-wrap">
    <textarea
      ref="taRef"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      :disabled="disabled"
      class="mi-textarea"
      @input="onInput"
      @keydown="onKeydown"
      @blur="onBlur"
    />

    <!-- Suggestion dropdown -->
    <ul v-if="dropdownOpen && suggestions.length" class="mi-dropdown" role="listbox">
      <li
        v-for="(s, i) in suggestions"
        :key="s.id"
        class="mi-option"
        :class="{ 'mi-option--active': i === activeIndex }"
        role="option"
        :aria-selected="i === activeIndex"
        @mousedown.prevent="pick(s)"
        @mousemove="activeIndex = i"
      >
        <span class="mi-avatar">
          <img v-if="s.avatarUrl" :src="s.avatarUrl" :alt="s.name" />
          <span v-else>{{ initials(s.name) }}</span>
        </span>
        <span class="mi-option-text">
          <span class="mi-option-name">{{ s.name }}</span>
          <span class="mi-option-handle">@{{ s.handle }}</span>
        </span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';

export interface Mentionable {
  id: string;
  name: string;
  handle: string;
  avatarUrl?: string;
}

const props = withDefaults(defineProps<{
  modelValue: string;
  mentionables: Mentionable[];
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
}>(), {
  placeholder: '',
  rows: 2,
  disabled: false,
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'submit'): void;
}>();

const taRef = ref<HTMLTextAreaElement | null>(null);
const dropdownOpen = ref(false);
const activeIndex = ref(0);
const token = ref('');          // text typed after the active "@"
const tokenStart = ref(-1);     // index of the "@" in the textarea value

const suggestions = computed<Mentionable[]>(() => {
  if (!dropdownOpen.value) return [];
  const q = token.value.toLowerCase();
  return props.mentionables
    .filter((m) => !q || m.handle.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
    .slice(0, 6);
});

const initials = (name: string) =>
  (name || '?').split(/[\s@.]+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();

// Detect an "@token" immediately before the caret and open the menu.
const refreshToken = () => {
  const el = taRef.value;
  if (!el) return;
  const caret = el.selectionStart ?? el.value.length;
  const before = el.value.slice(0, caret);
  const match = before.match(/(?:^|\s)@([A-Za-z0-9_.]*)$/);
  if (match) {
    token.value = match[1];
    tokenStart.value = caret - match[1].length - 1; // position of '@'
    dropdownOpen.value = true;
    activeIndex.value = 0;
  } else {
    dropdownOpen.value = false;
    tokenStart.value = -1;
  }
};

const onInput = (e: Event) => {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value);
  void nextTick(refreshToken);
};

const pick = (m: Mentionable) => {
  const el = taRef.value;
  if (!el || tokenStart.value < 0) return;
  const caret = el.selectionStart ?? el.value.length;
  const value = props.modelValue;
  const insert = `@${m.handle} `;
  const next = value.slice(0, tokenStart.value) + insert + value.slice(caret);
  emit('update:modelValue', next);
  dropdownOpen.value = false;
  void nextTick(() => {
    const pos = tokenStart.value + insert.length;
    el.focus();
    el.setSelectionRange(pos, pos);
  });
};

const onKeydown = (e: KeyboardEvent) => {
  if (dropdownOpen.value && suggestions.value.length) {
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex.value = (activeIndex.value + 1) % suggestions.value.length; return; }
    if (e.key === 'ArrowUp')   { e.preventDefault(); activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length; return; }
    if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); pick(suggestions.value[activeIndex.value]); return; }
    if (e.key === 'Escape') { e.preventDefault(); dropdownOpen.value = false; return; }
  }
  // Enter (no Shift) submits when the mention menu is closed.
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    emit('submit');
  }
};

const onBlur = () => {
  // Delay so a mousedown on an option still registers.
  setTimeout(() => { dropdownOpen.value = false; }, 120);
};
</script>

<style scoped>
.mi-wrap { position: relative; }
.mi-textarea {
  width: 100%;
  resize: vertical;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.6rem 0.75rem;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.mi-textarea:focus {
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}

.mi-dropdown {
  position: absolute;
  z-index: 50;
  left: 0;
  bottom: calc(100% + 4px);
  width: min(280px, 100%);
  margin: 0;
  padding: 0.25rem;
  list-style: none;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.18);
  max-height: 240px;
  overflow-y: auto;
}
.mi-option {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0.4rem 0.5rem;
  border-radius: 8px;
  cursor: pointer;
}
.mi-option--active { background: color-mix(in srgb, var(--primary) 12%, transparent); }
.mi-avatar {
  flex-shrink: 0;
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
}
.mi-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mi-option-text { display: flex; flex-direction: column; min-width: 0; }
.mi-option-name { font-size: 0.82rem; font-weight: 600; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mi-option-handle { font-size: 0.7rem; color: var(--primary); font-weight: 600; }
</style>
