<template>
  <div class="pointer-events-none fixed right-5 top-20 z-50 flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="pointer-events-auto rounded-card border bg-card p-4 shadow-card"
      :class="toneClass(toast.tone)"
    >
      <div class="flex items-start justify-between gap-3">
        <div>
          <div class="ui-font text-sm font-semibold text-text-main">{{ toast.title }}</div>
          <div class="mt-1 text-sm text-text-muted">{{ toast.message }}</div>
        </div>
        <button
          class="rounded-btn px-2 py-1 text-xs text-text-muted hover:bg-soft"
          type="button"
          aria-label="Dismiss notification"
          @click="removeToast(toast.id)"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRealtimeService, type RealtimeToast } from '@/services/realtimeService';

const { toasts, removeToast } = useRealtimeService();

const toneClass = (tone: RealtimeToast['tone']) => {
  if (tone === 'success') return 'border-status-approved-bg';
  if (tone === 'warning') return 'border-status-needs-fix-bg';
  return 'border-border';
};
</script>
