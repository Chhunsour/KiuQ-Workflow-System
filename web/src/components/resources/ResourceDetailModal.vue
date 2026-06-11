<template>
  <Modal
    :open="open"
    :title="resource?.title || resource?.fileName || 'Resource'"
    :subtitle="resource ? typeMeta?.label : undefined"
    size="lg"
    @close="$emit('close')"
  >
    <div v-if="resource" class="space-y-5">
      <!-- Type chip + visibility / status -->
      <div class="flex flex-wrap items-center gap-2">
        <span class="ui-font inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium" :class="typeMeta?.swatch">
          <span class="flex h-3.5 w-3.5 items-center" v-html="typeMeta?.icon" />
          {{ typeMeta?.label }}
        </span>
        <span class="ui-font rounded-full px-2.5 py-1 text-xs font-medium" :class="visMeta.classes">
          {{ visMeta.label }}
        </span>
        <span class="ui-font rounded-full px-2.5 py-1 text-xs font-medium" :class="statMeta.classes">
          {{ statMeta.label }}
        </span>
      </div>

      <p v-if="resource.description" class="whitespace-pre-line text-sm text-text-main">
        {{ resource.description }}
      </p>

      <!-- File body -->
      <div
        v-if="resource.type === 'file' || resource.type === 'screenshot'"
        class="rounded-card border border-border p-4"
      >
        <div class="flex items-start gap-3">
          <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn bg-soft text-primary">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
            </svg>
          </span>
          <div class="min-w-0 flex-1">
            <div class="ui-font truncate text-sm font-medium text-text-main">
              {{ resource.fileName || '—' }}
            </div>
            <div class="text-xs text-text-muted">
              <template v-if="resource.optimizedSize">
                <span class="line-through opacity-60">{{ formatFileSize(resource.originalSize || 0) }}</span>
                <span class="mx-1">→</span>
                <span class="text-primary font-bold">{{ formatFileSize(resource.optimizedSize) }}</span>
                <span class="ml-1.5 bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black">Saved {{ resource.compressionRatio }}%</span>
              </template>
              <template v-else>
                {{ formatFileSize(resource.fileSize) }}
              </template>
              · {{ resource.fileType || 'file' }}
            </div>
          </div>
          <button class="btn-secondary" type="button" :disabled="urlLoading" @click="openInTab">
            {{ urlLoading ? 'Loading...' : 'Open File' }}
          </button>
          <button class="btn-primary" type="button" :disabled="urlLoading" @click="downloadFile">
            {{ urlLoading ? 'Loading...' : 'Download' }}
          </button>
        </div>
        <p v-if="urlError" class="mt-3 text-sm text-status-needs-fix-fg">{{ urlError }}</p>

        <!-- Inline image preview when applicable -->
        <div v-if="canPreviewImage" class="mt-4">
          <img
            v-if="signedPreviewUrl"
            :src="signedPreviewUrl"
            :alt="resource.fileName || 'Image preview'"
            class="max-h-[420px] w-full rounded-btn border border-border object-contain"
          />
          <button
            v-else
            class="btn-ghost text-sm"
            type="button"
            :disabled="urlLoading"
            @click="loadPreview"
          >
            {{ urlLoading ? 'Loading preview...' : 'Show preview' }}
          </button>
        </div>
      </div>

      <!-- Link body -->
      <div
        v-else-if="resource.type === 'link' || resource.type === 'website_ref'"
        class="rounded-card border border-border p-4"
      >
        <div class="ui-font text-xs font-medium uppercase text-text-muted">URL</div>
        <div class="mt-1 break-all text-sm text-primary">{{ resource.externalUrl || '—' }}</div>
        <div class="mt-3">
          <a
            v-if="normalizedLinkHref"
            :href="normalizedLinkHref"
            target="_blank"
            rel="noopener"
            class="btn-primary"
          >
            Open Link
          </a>
        </div>
      </div>

      <!-- Note / document body -->
      <div
        v-else-if="resource.type === 'note' || resource.type === 'document'"
        class="rounded-card border border-border p-4"
      >
        <div class="ui-font mb-2 text-xs font-medium uppercase text-text-muted">
          {{ resource.type === 'document' ? 'Document' : 'Note' }}
        </div>
        <pre class="max-h-[420px] overflow-auto whitespace-pre-wrap break-words text-sm text-text-main">{{ resource.textContent || '(empty)' }}</pre>
      </div>

      <!-- Organization tags -->
      <dl class="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div v-if="folderName" class="flex justify-between gap-2">
          <dt class="text-text-muted">Folder</dt>
          <dd class="ui-font text-text-main">{{ folderName }}</dd>
        </div>
        <div v-if="projectName" class="flex justify-between gap-2">
          <dt class="text-text-muted">Project</dt>
          <dd class="ui-font text-text-main">{{ projectName }}</dd>
        </div>
        <div v-if="websiteName" class="flex justify-between gap-2">
          <dt class="text-text-muted">Website</dt>
          <dd class="ui-font text-text-main">{{ websiteName }}</dd>
        </div>
        <div class="flex justify-between gap-2">
          <dt class="text-text-muted">Created by</dt>
          <dd class="ui-font text-text-main">{{ creatorName }}</dd>
        </div>
        <div class="flex justify-between gap-2">
          <dt class="text-text-muted">Updated</dt>
          <dd class="ui-font text-text-main">{{ resource.updatedAt || resource.createdAt || '—' }}</dd>
        </div>
      </dl>
    </div>

    <template #footer>
      <button class="btn-ghost" type="button" @click="$emit('close')">Close</button>
      <button v-if="canEdit && resource" class="btn-secondary" type="button" @click="$emit('edit', resource)">
        Edit
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import {
  formatFileSize,
  normalizeExternalUrl,
  resourceTypeMeta,
  statusMeta,
  visibilityMeta
} from './resourceMeta';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Resource } from '@/stores/data';

const props = defineProps<{ open: boolean; resource: Resource | null }>();
defineEmits<{
  (e: 'close'): void;
  (e: 'edit', r: Resource): void;
}>();

const auth = useAuthStore();
const data = useDataStore();

const typeMeta = computed(() => (props.resource ? resourceTypeMeta(props.resource.type) : null));
const visMeta = computed(() =>
  props.resource ? visibilityMeta(props.resource.visibility) : { label: '', classes: '' }
);
const statMeta = computed(() =>
  props.resource ? statusMeta(props.resource.status) : { label: '', classes: '' }
);

const folderName = computed(() =>
  props.resource?.folderId ? data.folderById(props.resource.folderId)?.name ?? '' : ''
);
const projectName = computed(() =>
  props.resource?.projectId ? data.projectById(props.resource.projectId)?.name ?? '' : ''
);
const websiteName = computed(() =>
  props.resource?.websiteId ? data.websiteById(props.resource.websiteId)?.name ?? '' : ''
);
const creatorName = computed(() => {
  if (!props.resource?.createdBy) return 'Unknown';
  if (props.resource.createdBy === auth.user?.id) return 'You';
  return data.memberById(props.resource.createdBy)?.fullName || 'Team member';
});

const isOwner = computed(
  () => !!props.resource?.createdBy && props.resource.createdBy === auth.user?.id
);
const canEdit = computed(() => !auth.isViewer && !!props.resource && (auth.isAdmin || isOwner.value));

const normalizedLinkHref = computed(() =>
  props.resource ? normalizeExternalUrl(props.resource.externalUrl) : null
);

// Signed-URL fetching for the file body
const urlLoading = ref(false);
const urlError = ref<string | null>(null);
const signedPreviewUrl = ref<string | null>(null);

const canPreviewImage = computed(
  () => props.resource?.type === 'screenshot' || (props.resource?.fileType ?? '').startsWith('image/')
);

const fetchSignedUrl = async () => {
  if (!props.resource?.filePath) return null;
  urlLoading.value = true;
  urlError.value = null;
  const url = await data.getResourceDownloadUrl(props.resource);
  urlLoading.value = false;
  if (!url) {
    urlError.value = data.errors.resources ?? "Couldn't generate a download link.";
    return null;
  }
  return url;
};

const openInTab = async () => {
  const url = await fetchSignedUrl();
  if (url) window.open(url, '_blank', 'noopener');
};

const downloadFile = async () => {
  const url = await fetchSignedUrl();
  if (!url) return;
  const a = document.createElement('a');
  a.href = url;
  a.download = props.resource?.fileName || '';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

const loadPreview = async () => {
  const url = await fetchSignedUrl();
  if (url) signedPreviewUrl.value = url;
};

// Reset preview state when the modal opens for a different resource.
watch(
  () => [props.open, props.resource?.id],
  () => {
    signedPreviewUrl.value = null;
    urlError.value = null;
  }
);
</script>
