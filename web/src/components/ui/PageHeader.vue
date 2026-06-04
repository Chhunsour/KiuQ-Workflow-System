<template>
  <div class="page-header mb-6 flex flex-wrap items-end justify-between gap-4">
    <div class="flex min-w-0 items-center gap-3">
      <div v-if="icon" class="page-header-icon icon-tile" aria-hidden="true" v-html="icon" />
      <div class="min-w-0">
        <p v-if="eyebrow" class="eyebrow mb-0.5">{{ eyebrow }}</p>
        <h2 class="page-title">{{ title }}</h2>
        <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
      </div>
    </div>
    <div v-if="$slots.actions" class="flex flex-shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; eyebrow?: string; icon?: string }>();
</script>

<style scoped>
.page-header-icon {
  width: 2.5rem;
  height: 2.5rem;
}
.page-header-icon :deep(svg) {
  width: 20px;
  height: 20px;
}
</style>
