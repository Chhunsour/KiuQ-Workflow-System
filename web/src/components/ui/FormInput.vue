<template>
  <div>
    <label v-if="label" class="label" :for="id">
      {{ label }}
      <span v-if="required" class="text-primary">*</span>
    </label>
    <input
      :id="id"
      :type="type"
      :value="modelValue"
      :placeholder="placeholder"
      :disabled="disabled"
      :required="required"
      class="input"
      :class="{ 'input-error': !!error, 'input-success': success && !error }"
      :aria-invalid="!!error"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @blur="$emit('blur')"
    />
    <p v-if="error" class="field-error">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
      {{ error }}
    </p>
    <p v-else-if="helper" class="helper">{{ helper }}</p>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    modelValue: string | number;
    label?: string;
    helper?: string;
    placeholder?: string;
    type?: string;
    disabled?: boolean;
    id?: string;
    /** Validation message — shows a red border + inline error. */
    error?: string;
    /** Mark the field valid — shows a subtle green border. */
    success?: boolean;
    required?: boolean;
  }>(),
  { type: 'text' }
);
defineEmits<{ (e: 'update:modelValue', v: string): void; (e: 'blur'): void }>();
</script>
