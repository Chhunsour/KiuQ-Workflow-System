<template>
  <div class="kpi card-hover">
    <div class="kpi-ico icon-tile" :class="[iconBg, iconColor]">
      <span v-html="icon" />
    </div>
    <div class="min-w-0 flex-1">
      <p class="kpi-label truncate">{{ label }}</p>
      <p class="kpi-value">{{ value }}</p>
      <p v-if="hint" class="mt-0.5 truncate text-xs text-text-muted">{{ hint }}</p>
    </div>
    <span v-if="trend" class="kpi-trend" :class="trendClass">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <polyline v-if="trend === 'up'" points="6 15 12 9 18 15" />
        <polyline v-else points="6 9 12 15 18 9" />
      </svg>
      {{ trendValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    hint?: string;
    icon: string;
    /** Tailwind bg class for the icon tile. Defaults to brand blue-soft. */
    iconBg?: string;
    /** Tailwind text-color class for the icon. Defaults to brand blue. */
    iconColor?: string;
    /** Optional trend indicator. */
    trend?: 'up' | 'down';
    trendValue?: string;
  }>(),
  {
    iconBg: '',
    iconColor: ''
  }
);

const trendClass = computed(() => (props.trend === 'up' ? 'kpi-trend--up' : 'kpi-trend--down'));
</script>

<style scoped>
.kpi-ico :deep(svg) {
  width: 18px;
  height: 18px;
}

.kpi-trend {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  flex-shrink: 0;
  align-self: flex-start;
}
.kpi-trend--up {
  color: #16a34a;
  background: color-mix(in srgb, #16a34a 12%, transparent);
}
.kpi-trend--down {
  color: #dc2626;
  background: color-mix(in srgb, #dc2626 12%, transparent);
}
:root[data-theme='dark-gray'] .kpi-trend--up { color: #4ade80; }
:root[data-theme='dark-gray'] .kpi-trend--down { color: #f87171; }
</style>
