<template>
  <div class="card card-pad flex flex-col items-center justify-center py-12 text-center">
    <div
      class="empty-tile mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl text-primary"
    >
      <svg
        v-if="!$slots.icon"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M12 18v-6M9 15h6" />
      </svg>
      <slot v-else name="icon" />
    </div>
    <h3 class="ui-font text-[0.95rem] font-bold text-text-main">{{ title }}</h3>
    <p v-if="description" class="mt-1 max-w-sm text-sm text-text-muted">{{ description }}</p>
    <div v-if="$slots.action" class="mt-5">
      <slot name="action" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; description?: string }>();
</script>

<style scoped>
/* Soft blue gradient tile — a quiet premium touch vs the old flat circle. */
.empty-tile {
  background: linear-gradient(135deg, var(--primary-soft-strong), var(--primary-soft));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary) 14%, transparent);
}
</style>
