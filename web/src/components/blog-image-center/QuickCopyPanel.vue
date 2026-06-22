<template>
  <div class="qcp card card-pad">
    <h3 class="qcp-title">
      <span class="qcp-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
          <polyline points="13 2 13 9 20 9" />
        </svg>
      </span>
      {{ $t('Quick Copy') }}
    </h3>
    <p class="qcp-subtitle">{{ $t('One-click access to everything you need.') }}</p>

    <div class="qcp-grid">
      <!-- Primary Color -->
      <button type="button" class="qcp-btn qcp-btn--color" @click="copyColor(website.primaryColor, 'Primary')">
        <span class="qcp-btn-swatch" :style="{ background: website.primaryColor }" />
        <span class="qcp-btn-label">
          <span class="qcp-btn-tag">{{ $t('Primary Color') }}</span>
          <span class="qcp-btn-value">{{ website.primaryColor }}</span>
        </span>
        <span class="qcp-btn-action">{{ $t('Copy') }}</span>
      </button>

      <!-- Secondary Color -->
      <button v-if="website.secondaryColor" type="button" class="qcp-btn qcp-btn--color" @click="copyColor(website.secondaryColor, 'Secondary')">
        <span class="qcp-btn-swatch" :style="{ background: website.secondaryColor }" />
        <span class="qcp-btn-label">
          <span class="qcp-btn-tag">{{ $t('Secondary Color') }}</span>
          <span class="qcp-btn-value">{{ website.secondaryColor }}</span>
        </span>
        <span class="qcp-btn-action">{{ $t('Copy') }}</span>
      </button>

      <!-- Prompt selector -->
      <div v-if="prompts.length" class="qcp-select-group">
        <label class="qcp-select-label">{{ $t('Prompt Template') }}</label>
        <div class="qcp-select-row">
          <select v-model="selectedPromptIdx" class="input qcp-select">
            <option v-for="(p, i) in prompts" :key="p.id" :value="i">{{ p.templateName }}</option>
          </select>
          <button type="button" class="qcp-btn qcp-btn--action" @click="copyPrompt">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {{ $t('Copy') }}
          </button>
        </div>
      </div>

      <!-- Product image selector -->
      <div v-if="products.length" class="qcp-select-group">
        <label class="qcp-select-label">{{ $t('Product Image URL') }}</label>
        <div class="qcp-select-row">
          <select v-model="selectedProductIdx" class="input qcp-select">
            <option v-for="(p, i) in products" :key="p.id" :value="i">{{ p.name }}</option>
          </select>
          <button type="button" class="qcp-btn qcp-btn--action" :disabled="!products[selectedProductIdx]?.imageUrl" @click="copyProduct">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {{ $t('Copy') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { Website, Product } from '@/stores/data';
import type { BlogImagePrompt } from '@/stores/blogImageCenter';

const props = defineProps<{
  website: Website;
  prompts: BlogImagePrompt[];
  products: Product[];
}>();

const emit = defineEmits<{
  (e: 'copied', msg: string): void;
}>();

const selectedPromptIdx = ref(0);
const selectedProductIdx = ref(0);

const clipCopy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
};

const copyColor = async (color: string, label: string) => {
  await clipCopy(color);
  emit('copied', `${label} color copied ✓`);
};

const copyPrompt = async () => {
  const p = props.prompts[selectedPromptIdx.value];
  if (!p) return;
  await clipCopy(p.promptContent);
  emit('copied', 'Prompt copied ✓');
};

const copyProduct = async () => {
  const p = props.products[selectedProductIdx.value];
  if (!p?.imageUrl) return;
  await clipCopy(p.imageUrl);
  emit('copied', 'Image URL copied ✓');
};
</script>

<style scoped>
.qcp {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.qcp-title {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.qcp-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), color-mix(in srgb, var(--primary) 6%, transparent));
  color: var(--primary);
}

.qcp-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: -0.25rem 0 0.5rem;
}

.qcp-grid {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.qcp-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}
.qcp-btn:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 8%, transparent);
}
.qcp-btn:active {
  transform: scale(0.98);
}

.qcp-btn-swatch {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  flex-shrink: 0;
  border: 2px solid rgba(0, 0, 0, 0.06);
}
:root[data-theme='dark-gray'] .qcp-btn-swatch {
  border-color: rgba(248, 251, 255, 0.1);
}

.qcp-btn-label {
  display: flex;
  flex-direction: column;
  gap: 0.05rem;
  flex: 1;
  min-width: 0;
}

.qcp-btn-tag {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.qcp-btn-value {
  font-family: 'Jost Numbers', 'Raleway', monospace;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
}

.qcp-btn-action {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--primary);
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  flex-shrink: 0;
}

.qcp-select-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.qcp-select-label {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.qcp-select-row {
  display: flex;
  gap: 0.5rem;
}

.qcp-select {
  flex: 1;
  min-width: 0;
}

.qcp-btn--action {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}
.qcp-btn--action:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 16%, transparent);
}
.qcp-btn--action:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
