<template>
  <div>
    <label v-if="label" class="label" :for="id">{{ label }}</label>
    <div class="flex gap-2">
      <input
        :id="id"
        type="url"
        :value="modelValue"
        :placeholder="placeholder ?? 'https://...'"
        class="input flex-1"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <a
        v-if="normalizedHref"
        :href="normalizedHref"
        target="_blank"
        rel="noopener"
        class="btn-secondary"
      >
        {{ $t('Open') }}
      </a>
    </div>
    <p v-if="helper" class="helper">{{ helper }}</p>
    <p v-if="modelValue && !normalizedHref" class="mt-1 text-xs text-status-needs-fix-fg">
      That URL doesn't look right. Use http(s):// or a plain domain.
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { normalizeExternalUrl } from './resourceMeta';

const props = defineProps<{
  modelValue: string;
  label?: string;
  helper?: string;
  placeholder?: string;
  id?: string;
}>();
defineEmits<{ (e: 'update:modelValue', v: string): void }>();

const normalizedHref = computed(() => normalizeExternalUrl(props.modelValue));
</script>
