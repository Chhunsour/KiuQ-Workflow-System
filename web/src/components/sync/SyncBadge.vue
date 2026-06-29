<template>
  <span class="sync-badge" :class="`sync-badge--${variant}`">
    <span class="sync-badge-dot" />
    {{ label ?? text }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string; label?: string }>();

const variant = computed(() => {
  switch (props.status) {
    case 'success':
    case 'active': return 'green';
    case 'partial': return 'amber';
    case 'failed': return 'red';
    case 'waiting':
    case 'pending': return 'blue';
    default: return 'neutral';
  }
});
const text = computed(() => props.status.charAt(0).toUpperCase() + props.status.slice(1));
</script>

<style scoped>
.sync-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--border);
  white-space: nowrap;
}
.sync-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.sync-badge--neutral { color: var(--text-muted); }
.sync-badge--green  { color: #16a34a; background: rgba(22,163,74,0.10); border-color: rgba(22,163,74,0.28); }
.sync-badge--amber  { color: #d97706; background: rgba(217,119,6,0.10);  border-color: rgba(217,119,6,0.28); }
.sync-badge--red    { color: #dc2626; background: rgba(220,38,38,0.10);  border-color: rgba(220,38,38,0.28); }
.sync-badge--blue   { color: #2563eb; background: rgba(37,99,235,0.10);  border-color: rgba(37,99,235,0.28); }
</style>
