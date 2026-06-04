<template>
  <div>
    <label v-if="label" class="label" :for="id">{{ label }}</label>
    <textarea
      :id="id"
      :value="modelValue"
      :placeholder="placeholder"
      :rows="rows"
      class="input"
      :class="{ 'min-h-[120px]': !rows }"
      @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
    />
    <p v-if="helper" class="helper">{{ helper }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string;
  label?: string;
  helper?: string;
  placeholder?: string;
  rows?: number;
  id?: string;
}>();
defineEmits<{ (e: 'update:modelValue', v: string): void }>();
</script>
