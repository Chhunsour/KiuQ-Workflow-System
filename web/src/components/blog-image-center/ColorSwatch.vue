<template>
  <button
    type="button"
    class="color-swatch-btn"
    :title="`Copy ${label}: ${color}`"
    @click="copy"
  >
    <span class="swatch-circle" :style="{ background: color }" />
    <span class="swatch-info">
      <span class="swatch-label">{{ label }}</span>
      <span class="swatch-hex">{{ color }}</span>
    </span>
    <span class="swatch-copy-icon" aria-hidden="true">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </span>
  </button>
</template>

<script setup lang="ts">
const props = defineProps<{ color: string; label: string }>();
const emit = defineEmits<{ (e: 'copied', color: string): void }>();

const copy = async () => {
  try {
    await navigator.clipboard.writeText(props.color);
    emit('copied', props.color);
  } catch {
    // fallback
    const ta = document.createElement('textarea');
    ta.value = props.color;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    emit('copied', props.color);
  }
};
</script>

<style scoped>
.color-swatch-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
}
.color-swatch-btn:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 10%, transparent);
}
.color-swatch-btn:active {
  transform: scale(0.98);
}

.swatch-circle {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  flex-shrink: 0;
  border: 2px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
:root[data-theme='dark-gray'] .swatch-circle {
  border-color: rgba(248, 251, 255, 0.12);
}

.swatch-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.swatch-label {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.swatch-hex {
  font-family: 'Jost Numbers', 'Raleway', monospace;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
}

.swatch-copy-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: var(--soft-bg);
  color: var(--text-muted);
  flex-shrink: 0;
  transition: all 0.15s ease;
}
.color-swatch-btn:hover .swatch-copy-icon {
  background: color-mix(in srgb, var(--primary) 14%, transparent);
  color: var(--primary);
}
</style>
