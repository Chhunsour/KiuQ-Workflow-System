<template>
  <div>
    <label v-if="label" class="label" :for="id">{{ label }}</label>
    <select
      :id="id"
      :value="modelValue"
      class="input"
      @change="$emit('update:modelValue', ($event.target as HTMLSelectElement).value)"
    >
      <option v-if="placeholder" value="">{{ placeholder }}</option>
      <option v-for="opt in normalizedOptions" :key="String(opt.value)" :value="opt.value">
        {{ opt.label }}
      </option>
    </select>
    <p v-if="helper" class="helper">{{ helper }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type Option = { value: string; label: string };

const props = defineProps<{
  modelValue: string;
  options: (string | Option)[];
  label?: string;
  helper?: string;
  placeholder?: string;
  id?: string;
}>();
defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const normalizedOptions = computed<Option[]>(() =>
  props.options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o))
);
</script>
