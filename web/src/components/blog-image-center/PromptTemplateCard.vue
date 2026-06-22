<template>
  <div class="prompt-card card">
    <div class="prompt-card-header">
      <div class="prompt-card-title-row">
        <span class="prompt-card-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </span>
        <h4 class="prompt-card-name">{{ prompt.templateName }}</h4>
      </div>
      <div v-if="canEdit" class="prompt-card-actions">
        <button type="button" class="prompt-action-btn" :title="$t('Edit')" @click="$emit('edit', prompt)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z" />
          </svg>
        </button>
        <button type="button" class="prompt-action-btn prompt-action-btn--danger" :title="$t('Delete')" @click="$emit('delete', prompt)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </button>
      </div>
    </div>

    <p class="prompt-card-content">{{ prompt.promptContent }}</p>

    <button type="button" class="prompt-copy-btn" @click="copyPrompt">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {{ $t('Copy Prompt') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { BlogImagePrompt } from '@/stores/blogImageCenter';

const props = defineProps<{
  prompt: BlogImagePrompt;
  canEdit: boolean;
}>();

const emit = defineEmits<{
  (e: 'edit', prompt: BlogImagePrompt): void;
  (e: 'delete', prompt: BlogImagePrompt): void;
  (e: 'copied', text: string): void;
}>();

const copyPrompt = async () => {
  try {
    await navigator.clipboard.writeText(props.prompt.promptContent);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = props.prompt.promptContent;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  emit('copied', props.prompt.promptContent);
};
</script>

<style scoped>
.prompt-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.prompt-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.9rem 1.1rem 0.6rem;
}

.prompt-card-title-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}

.prompt-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  flex-shrink: 0;
}

.prompt-card-name {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prompt-card-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.prompt-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}
.prompt-action-btn:hover {
  background: var(--soft-bg);
  color: var(--primary);
}
.prompt-action-btn--danger:hover {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
}

.prompt-card-content {
  padding: 0 1.1rem 0.8rem;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--text-muted);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.prompt-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.7rem 1.1rem;
  border: none;
  border-top: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}
.prompt-copy-btn:hover {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.prompt-copy-btn:active {
  transform: scale(0.98);
}
</style>
