<template>
  <span class="wf" :style="{ width: size + 'px', height: size + 'px' }">
    <img v-if="src && !failed" :src="src" :alt="name || domain || 'site'" loading="lazy" @error="failed = true" />
    <span v-else class="wf-fallback">{{ letter }}</span>
  </span>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(
  defineProps<{ faviconUrl?: string | null; domain?: string | null; name?: string | null; size?: number }>(),
  { faviconUrl: null, domain: null, name: null, size: 24 }
);

const failed = ref(false);
// Reset the error flag if the website changes (e.g. reused row in a v-for).
watch(() => [props.faviconUrl, props.domain], () => { failed.value = false; });

const cleanDomain = computed(() =>
  (props.domain || '').trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '')
);
const src = computed(() => {
  if (props.faviconUrl) return props.faviconUrl;
  return cleanDomain.value ? `https://www.google.com/s2/favicons?domain=${cleanDomain.value}&sz=64` : '';
});
const letter = computed(() => (props.name || cleanDomain.value || '?').charAt(0).toUpperCase());
</script>

<style scoped>
.wf {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 0.4rem;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
  overflow: hidden;
}
:root[data-theme='dark-gray'] .wf { background: #f1f5f9; }
.wf img { width: 78%; height: 78%; object-fit: contain; }
.wf-fallback { font-size: 0.72rem; font-weight: 800; color: #475569; }
</style>
