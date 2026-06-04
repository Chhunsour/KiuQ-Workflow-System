<template>
  <article class="card card-pad flex flex-col">
    <div class="flex items-start gap-3">
      <span
        class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
        :class="meta.swatch"
      >
        <span v-html="meta.icon" />
      </span>
      <div class="min-w-0 flex-1">
        <div class="ui-font text-xs font-medium uppercase tracking-wide text-text-muted">
          {{ meta.label }}
        </div>
        <h3 class="ui-font text-base font-semibold text-text-main truncate">
          {{ resource.title || resource.fileName || 'Untitled' }}
        </h3>
      </div>
      <div class="flex flex-col items-end gap-1">
        <span class="ui-font rounded-full px-2 py-0.5 text-xs font-medium" :class="visMeta.classes">
          {{ visMeta.label }}
        </span>
        <span class="ui-font rounded-full px-2 py-0.5 text-xs font-medium" :class="statMeta.classes">
          {{ statMeta.label }}
        </span>
      </div>
    </div>

    <p v-if="resource.description" class="mt-3 line-clamp-3 text-sm text-text-muted">
      {{ resource.description }}
    </p>

    <!-- Type-specific summary line -->
    <div v-if="resource.type === 'file' || resource.type === 'screenshot'" class="mt-3 text-xs text-text-muted">
      <span class="ui-font font-medium text-text-main">{{ resource.fileName || '—' }}</span>
      <span v-if="resource.fileSize"> · {{ formatFileSize(resource.fileSize) }}</span>
    </div>
    <div
      v-else-if="resource.type === 'link' || resource.type === 'website_ref'"
      class="mt-3 truncate text-xs text-primary"
    >
      {{ resource.externalUrl || '—' }}
    </div>
    <div
      v-else-if="resource.type === 'note' || resource.type === 'document'"
      class="mt-3 line-clamp-2 whitespace-pre-line text-xs text-text-muted"
    >
      {{ resource.textContent || '—' }}
    </div>

    <!-- Folder / project / website tags -->
    <div class="mt-3 flex flex-wrap gap-1.5 text-xs text-text-muted">
      <span v-if="folderLabel" class="ui-font rounded-full bg-soft px-2 py-0.5">
        📁 {{ folderLabel }}
      </span>
      <span v-if="projectLabel" class="ui-font rounded-full bg-soft px-2 py-0.5">
        {{ projectLabel }}
      </span>
      <span v-if="websiteLabel" class="ui-font rounded-full bg-soft px-2 py-0.5">
        {{ websiteLabel }}
      </span>
    </div>

    <div class="mt-3 flex items-center gap-2 text-xs text-text-muted">
      <span>By {{ creatorName }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ resource.updatedAt || resource.createdAt || '—' }}</span>
    </div>

    <div class="mt-auto flex flex-wrap items-center gap-2 pt-4">
      <button class="btn-secondary" type="button" @click="$emit('view', resource)">View</button>
      <a
        v-if="normalizedLinkHref"
        :href="normalizedLinkHref"
        target="_blank"
        rel="noopener"
        class="btn-primary"
      >
        Open Link
      </a>
      <button
        v-if="canOpenFile"
        class="btn-primary"
        type="button"
        :disabled="openingFile"
        @click="openFile"
      >
        {{ openingFile ? 'Opening...' : 'Open File' }}
      </button>
      <button v-if="canEdit" class="btn-secondary" type="button" @click="$emit('edit', resource)">
        Edit
      </button>
      <button v-if="canDelete" class="btn-danger" type="button" @click="$emit('delete', resource)">
        Delete
      </button>
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  formatFileSize,
  isFileType,
  isLinkType,
  normalizeExternalUrl,
  resourceTypeMeta,
  statusMeta,
  visibilityMeta
} from './resourceMeta';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Resource } from '@/stores/data';

const props = defineProps<{ resource: Resource }>();
defineEmits<{
  (e: 'view', r: Resource): void;
  (e: 'edit', r: Resource): void;
  (e: 'delete', r: Resource): void;
}>();

const auth = useAuthStore();
const data = useDataStore();

const meta = computed(() => resourceTypeMeta(props.resource.type));
const visMeta = computed(() => visibilityMeta(props.resource.visibility));
const statMeta = computed(() => statusMeta(props.resource.status));

const folderLabel = computed(() =>
  props.resource.folderId ? data.folderById(props.resource.folderId)?.name ?? '' : ''
);
const projectLabel = computed(() =>
  props.resource.projectId ? data.projectById(props.resource.projectId)?.name ?? '' : ''
);
const websiteLabel = computed(() =>
  props.resource.websiteId ? data.websiteById(props.resource.websiteId)?.name ?? '' : ''
);

const creatorName = computed(() => {
  if (!props.resource.createdBy) return 'Unknown';
  if (props.resource.createdBy === auth.user?.id) return 'You';
  const member = data.memberById(props.resource.createdBy);
  return member?.fullName || member?.email || 'Team';
});

const isOwner = computed(
  () => !!props.resource.createdBy && props.resource.createdBy === auth.user?.id
);
const canEdit = computed(() => auth.isAdmin || isOwner.value);
const canDelete = computed(() => auth.isAdmin || isOwner.value);
const normalizedLinkHref = computed(() =>
  isLinkType(props.resource.type) ? normalizeExternalUrl(props.resource.externalUrl) : null
);
const canOpenFile = computed(() => isFileType(props.resource.type) && !!props.resource.filePath);
const openingFile = ref(false);

const openFile = async () => {
  openingFile.value = true;
  const url = await data.getResourceDownloadUrl(props.resource);
  openingFile.value = false;
  if (url) window.open(url, '_blank', 'noopener');
};
</script>
