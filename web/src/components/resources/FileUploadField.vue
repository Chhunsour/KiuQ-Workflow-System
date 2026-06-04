<template>
  <div>
    <label v-if="label" class="label">{{ label }}</label>

    <!-- Empty state: drop zone -->
    <div
      v-if="!modelValue.path"
      class="rounded-card border border-dashed border-border bg-soft/40 px-4 py-6 text-center transition"
      :class="dragActive ? 'border-primary bg-soft' : 'hover:border-primary/40'"
      @dragenter.prevent="dragActive = true"
      @dragover.prevent="dragActive = true"
      @dragleave.prevent="dragActive = false"
      @drop.prevent="onDrop"
    >
      <div class="flex flex-col items-center gap-2 text-text-muted">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m17 8-5-5-5 5" />
          <path d="M12 3v12" />
        </svg>
        <p class="text-sm">Drag &amp; drop a file here, or</p>
        <button
          class="btn-secondary"
          type="button"
          :disabled="uploading || optimizing"
          @click="triggerPicker"
        >
          {{ optimizing ? 'Optimizing...' : uploading ? 'Uploading...' : 'Choose file' }}
        </button>
        <p v-if="accept" class="text-xs text-text-muted">{{ acceptHelper }}</p>
      </div>
    </div>

    <!-- Filled state: show what was uploaded -->
    <div v-else class="card card-pad flex items-center gap-3">
      <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn bg-soft text-primary">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      </span>
      <div class="min-w-0 flex-1">
        <div class="ui-font truncate text-sm font-medium text-text-main">{{ modelValue.name }}</div>
        <div class="text-xs text-text-muted">
          {{ formatFileSize(modelValue.size) }} · {{ modelValue.type || 'file' }}
        </div>
      </div>
      <button
        class="btn-ghost h-8 px-3 text-xs"
        type="button"
        :disabled="uploading"
        @click="triggerPicker"
      >
        Replace
      </button>
      <button
        class="btn-danger h-8 px-3 text-xs"
        type="button"
        :disabled="uploading"
        @click="clear"
      >
        Remove
      </button>
    </div>

    <input
      ref="pickerRef"
      type="file"
      class="hidden"
      :accept="accept"
      @change="onPicked"
    />

    <p v-if="helper" class="helper">{{ helper }}</p>
    <p v-if="error" class="mt-2 text-sm text-status-needs-fix-fg">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { formatFileSize } from './resourceMeta';
import { useDataStore } from '@/stores/data';
import { optimizeImage } from '@/utils/imageOptimizer';

export interface FileUploadValue {
  path: string;
  name: string;
  type: string;
  size: number;
}

const props = withDefaults(
  defineProps<{
    modelValue: FileUploadValue;
    label?: string;
    helper?: string;
    accept?: string;
    maxSizeMb?: number;
  }>(),
  { maxSizeMb: 25 }
);

const emit = defineEmits<{
  (e: 'update:modelValue', v: FileUploadValue): void;
  (e: 'uploading', uploading: boolean): void;
}>();

const data = useDataStore();
const pickerRef = ref<HTMLInputElement | null>(null);
const uploading = ref(false);
const optimizing = ref(false);
const dragActive = ref(false);
const error = ref<string | null>(null);

const acceptHelper = computed(() => {
  if (!props.accept) return '';
  return `Allowed: ${props.accept.replace(/,/g, ', ')}`;
});

const triggerPicker = () => pickerRef.value?.click();

const setUploading = (v: boolean) => {
  uploading.value = v;
  emit('uploading', v);
};

const handleFile = async (file: File) => {
  error.value = null;
  if (props.maxSizeMb && file.size > props.maxSizeMb * 1024 * 1024) {
    error.value = `File is too large. Max ${props.maxSizeMb} MB.`;
    return;
  }
  let fileToUpload = file;
  if (file.type.startsWith('image/')) {
    try {
      optimizing.value = true;
      const optimized = await optimizeImage(file);
      fileToUpload = optimized.file;
    } catch (err) {
      console.error('[image-optimization] failed', err);
      // Fallback to original if optimization fails, or error? 
      // User said: "If image cannot be converted to WebP, show error and do not upload original unless admin confirms."
      // Since this is a general file field, I'll show error.
      error.value = 'Could not optimize image. Please try another file.';
      optimizing.value = false;
      return;
    } finally {
      optimizing.value = false;
    }
  }

  setUploading(true);
  const result = await data.uploadResourceFile(fileToUpload);
  setUploading(false);
  if (!result) {
    error.value = data.errors.resources ?? 'Upload failed.';
    return;
  }
  emit('update:modelValue', {
    path: result.path,
    name: result.name,
    type: result.type,
    size: result.size
  });
};

const onPicked = (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) void handleFile(file);
  if (input) input.value = '';
};

const onDrop = (event: DragEvent) => {
  dragActive.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file) void handleFile(file);
};

const clear = () => {
  emit('update:modelValue', { path: '', name: '', type: '', size: 0 });
};
</script>
