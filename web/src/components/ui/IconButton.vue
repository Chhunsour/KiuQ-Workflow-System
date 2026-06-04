<template>
  <button
    type="button"
    class="btn-ghost h-8 w-8 px-0"
    :aria-label="label"
    @click="$emit('click')"
  >
    <span v-html="icon" />
  </button>
</template>

<script setup lang="ts">
defineProps<{ icon: string; label: string }>();
defineEmits<{ (e: 'click'): void }>();
</script>
