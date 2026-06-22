<template>
  <div class="pi-card card">
    <div class="pi-card-thumb">
      <img
        v-if="product.imageUrl"
        :src="product.imageUrl"
        :alt="product.name"
        class="pi-card-img"
        loading="lazy"
        @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
      />
      <div v-else class="pi-card-no-img">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </div>
    </div>

    <div class="pi-card-body">
      <h4 class="pi-card-name">{{ product.name }}</h4>
      <p v-if="product.category" class="pi-card-category">{{ product.category }}</p>
    </div>

    <button type="button" class="pi-copy-btn" @click="copyUrl" :disabled="!product.imageUrl">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
      {{ $t('Copy Image URL') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import type { Product } from '@/stores/data';

const props = defineProps<{ product: Product }>();
const emit = defineEmits<{ (e: 'copied', url: string): void }>();

const copyUrl = async () => {
  if (!props.product.imageUrl) return;
  try {
    await navigator.clipboard.writeText(props.product.imageUrl);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = props.product.imageUrl;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  emit('copied', props.product.imageUrl);
};
</script>

<style scoped>
.pi-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.pi-card-thumb {
  width: 100%;
  height: 140px;
  background: var(--soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.pi-card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pi-card-no-img {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  opacity: 0.4;
}

.pi-card-body {
  padding: 0.75rem 1rem;
  flex: 1;
}

.pi-card-name {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pi-card-category {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 0.15rem 0 0;
}

.pi-copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0.65rem 1rem;
  border: none;
  border-top: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
}
.pi-copy-btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.pi-copy-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.pi-copy-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
