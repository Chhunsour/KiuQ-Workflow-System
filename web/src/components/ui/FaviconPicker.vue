<template>
  <div class="fp-root">
    <!-- Current favicon preview + status -->
    <div class="fp-preview-row">
      <div class="fp-avatar" :class="{ 'fp-avatar--empty': !modelValue }">
        <img
          v-if="previewSrc"
          :src="previewSrc"
          alt="favicon"
          class="fp-img"
          @error="onImgError"
        />
        <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="fp-default-icon">
          <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>
        </svg>
      </div>

      <div class="fp-status-col">
        <span v-if="detecting" class="fp-status fp-status--loading">
          <span class="fp-spinner" />
          {{ $t('Detecting favicon…') }}
        </span>
        <span v-else-if="modelValue" class="fp-status fp-status--found">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ $t('Favicon set.') }}
        </span>
        <span v-else-if="triedAuto && !modelValue" class="fp-status fp-status--notfound">
          {{ $t('No favicon found. Choose an option below.') }}
        </span>
        <span v-else class="fp-status fp-status--idle">{{ $t('Optional — auto-detect when you enter the domain.') }}</span>
      </div>

      <!-- Quick actions row -->
      <div class="fp-quick-btns">
        <button
          v-if="domain"
          type="button"
          class="fp-qbtn"
          :disabled="detecting"
          @click="autoDetect"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
          {{ detecting ? 'Detecting…' : 'Refresh' }}
        </button>
        <button
          v-if="modelValue"
          type="button"
          class="fp-qbtn fp-qbtn--danger"
          @click="clear"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          {{ $t('Remove') }}
        </button>
      </div>
    </div>

    <!-- Expand/collapse options -->
    <div v-if="!modelValue || showOptions" class="fp-options">
      <!-- Tab bar -->
      <div class="fp-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          type="button"
          class="fp-tab"
          :class="{ 'fp-tab--active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- Tab: URL paste -->
      <div v-if="activeTab === 'url'" class="fp-tab-body">
        <input
          v-model="urlInput"
          class="input"
          type="url"
          placeholder="https://example.com/favicon.png"
          @keydown.enter.prevent="applyUrl"
        />
        <button type="button" class="btn-secondary fp-apply-btn" :disabled="!urlInput.trim()" @click="applyUrl">
          {{ $t('Apply URL') }}
        </button>
        <span v-if="urlError" class="fp-url-error">{{ urlError }}</span>
      </div>

      <!-- Tab: Upload -->
      <div v-if="activeTab === 'upload'" class="fp-tab-body">
        <label class="fp-upload-area" :class="{ 'fp-upload-area--dragging': dragging }"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
            class="fp-file-input"
            @change="onFileChange"
          />
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <span>{{ uploading ? 'Uploading…' : 'Click or drag PNG, JPG, WebP, ICO' }}</span>
        </label>
        <span v-if="uploadError" class="fp-url-error">{{ uploadError }}</span>
      </div>

      <!-- Tab: Default icon -->
      <div v-if="activeTab === 'default'" class="fp-tab-body fp-tab-body--default">
        <div class="fp-default-preview">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
          {{ $t('Default website icon') }}
        </div>
        <button type="button" class="btn-secondary fp-apply-btn" @click="useDefault">
          {{ $t('Use Default Icon') }}
        </button>
      </div>
    </div>

    <!-- "Change favicon" toggle when already set -->
    <button
      v-if="modelValue && !showOptions"
      type="button"
      class="fp-change-link"
      @click="showOptions = true"
    >
      {{ $t('Change favicon') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { getFaviconUrl } from '@/lib/getFavicon';
import { useDataStore } from '@/stores/data';

const props = defineProps<{
  modelValue: string;   // the favicon URL (empty string = none)
  domain?: string;      // used for auto-detect trigger
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void;
}>();

const data = useDataStore();

type Tab = 'url' | 'upload' | 'default';
const tabs: { key: Tab; label: string }[] = [
  { key: 'url',     label: 'Paste URL' },
  { key: 'upload',  label: 'Upload File' },
  { key: 'default', label: 'Default Icon' },
];

const activeTab  = ref<Tab>('url');
const showOptions = ref(false);
const detecting  = ref(false);
const triedAuto  = ref(false);
const urlInput   = ref('');
const urlError   = ref('');
const uploading  = ref(false);
const uploadError = ref('');
const dragging   = ref(false);
const imgFailed  = ref(false);

const fileInput = ref<HTMLInputElement | null>(null);

// Preview: use modelValue unless img failed to load
const previewSrc = computed(() => {
  if (!props.modelValue || imgFailed.value) return '';
  return props.modelValue;
});

const onImgError = () => { imgFailed.value = true; };

// Reset imgFailed when modelValue changes
watch(() => props.modelValue, () => { imgFailed.value = false; });

// Auto-detect when domain prop changes (debounced by parent, so we fire immediately)
watch(() => props.domain, async (newDomain) => {
  if (!newDomain || props.modelValue) return;
  await autoDetect();
}, { immediate: false });

const autoDetect = async () => {
  if (!props.domain || detecting.value) return;
  detecting.value = true;
  triedAuto.value = false;
  const url = await getFaviconUrl(props.domain);
  detecting.value = false;
  triedAuto.value = true;
  if (url) {
    emit('update:modelValue', url);
    showOptions.value = false;
  }
};

const clear = () => {
  emit('update:modelValue', '');
  triedAuto.value = false;
  showOptions.value = true;
};

const applyUrl = async () => {
  urlError.value = '';
  const val = urlInput.value.trim();
  if (!val) return;
  if (!val.startsWith('http')) {
    urlError.value = 'Please enter a full URL starting with http.';
    return;
  }
  emit('update:modelValue', val);
  showOptions.value = false;
  urlInput.value = '';
};

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await uploadFile(file);
};

const onDrop = async (e: DragEvent) => {
  dragging.value = false;
  const file = e.dataTransfer?.files[0];
  if (!file) return;
  await uploadFile(file);
};

const uploadFile = async (file: File) => {
  uploadError.value = '';
  if (file.size > 2 * 1024 * 1024) {
    uploadError.value = 'File must be under 2 MB.';
    return;
  }
  uploading.value = true;
  const url = await data.uploadFavicon(file);
  uploading.value = false;
  if (!url) {
    uploadError.value = 'Upload failed. Please try again or paste a URL instead.';
    return;
  }
  emit('update:modelValue', url);
  showOptions.value = false;
  if (fileInput.value) fileInput.value.value = '';
};

const useDefault = () => {
  emit('update:modelValue', '');
  showOptions.value = false;
  triedAuto.value = false;
};
</script>

<style scoped>
.fp-root { display: flex; flex-direction: column; gap: 0.6rem; }

/* Preview row */
.fp-preview-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.fp-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.fp-avatar--empty { opacity: 0.6; }
.fp-img { width: 100%; height: 100%; object-fit: contain; }
.fp-default-icon { color: var(--text-muted); }

.fp-status-col { flex: 1; min-width: 0; }
.fp-status {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
}
.fp-status--loading  { color: var(--text-muted); }
.fp-status--found    { color: #16a34a; }
.fp-status--notfound { color: var(--text-muted); }
.fp-status--idle     { color: var(--text-muted); }

.fp-spinner {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--border);
  border-top-color: var(--primary);
  animation: fp-spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes fp-spin { to { transform: rotate(360deg); } }

.fp-quick-btns { display: flex; gap: 0.4rem; align-items: center; }
.fp-qbtn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.25rem 0.6rem;
  border-radius: 7px;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: background 120ms;
  white-space: nowrap;
}
.fp-qbtn:hover:not(:disabled) { background: var(--card-bg); }
.fp-qbtn:disabled { opacity: 0.5; cursor: not-allowed; }
.fp-qbtn--danger { color: #dc2626; }

/* Options panel */
.fp-options {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: var(--card-bg);
}

.fp-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}
.fp-tab {
  flex: 1;
  padding: 0.5rem 0.4rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color 120ms, background 120ms;
}
.fp-tab:hover { color: var(--text-main); background: var(--soft-bg); }
.fp-tab--active {
  color: var(--primary);
  border-bottom: 2px solid var(--primary);
  margin-bottom: -1px;
}

.fp-tab-body {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.fp-apply-btn {
  align-self: flex-start;
  font-size: 0.8rem;
  padding: 0.3rem 0.75rem;
  height: auto;
}

.fp-url-error {
  font-size: 0.73rem;
  color: #dc2626;
}

/* Upload area */
.fp-upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  border: 1.5px dashed var(--border);
  border-radius: 10px;
  padding: 1rem;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--text-muted);
  transition: border-color 150ms, background 150ms;
  position: relative;
}
.fp-upload-area:hover,
.fp-upload-area--dragging {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 4%, transparent);
  color: var(--primary);
}
.fp-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}

/* Default icon tab */
.fp-tab-body--default { align-items: flex-start; }
.fp-default-preview {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  padding: 0.25rem 0;
}

/* Change link */
.fp-change-link {
  font-size: 0.73rem;
  color: var(--primary);
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  align-self: flex-start;
}
.fp-change-link:hover { opacity: 0.75; }
</style>
