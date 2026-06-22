<template>
  <div>
    <nav class="mb-3 flex items-center gap-2 text-sm text-text-muted" aria-:label="$t('Breadcrumb')">
      <RouterLink to="/resources" class="hover:text-text-main">{{ $t('Resources') }}</RouterLink>
      <span aria-hidden="true">›</span>
      <span class="ui-font font-medium text-text-main truncate">
        {{ resource?.title || resource?.fileName || '...' }}
      </span>
    </nav>

    <PageHeader
      :title="resource?.title || resource?.fileName || 'Resource'"
      :subtitle="typeMeta?.label"
    >
      <template #actions>
        <RouterLink to="/resources" class="btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          {{ $t('Back to Resources') }}
        </RouterLink>
        <button
          v-if="resource && canEdit"
          class="btn-primary"
          type="button"
          @click="editOpen = true"
        >
          {{ $t('Edit') }}
        </button>
      </template>
    </PageHeader>

    <LoadingBlock
      :loading="data.loading.resources"
      :error="data.errors.resources"
      :retry="data.fetchResources"
    >
      <div v-if="!resource && resourcesLoaded" class="card card-pad text-center">
        <h3 class="ui-font text-base font-semibold text-text-main">{{ $t('Resource not found') }}</h3>
        <p class="mt-1 text-sm text-text-muted">{{ $t('It may have been deleted, or you don\'t have access.') }}</p>
        <div class="mt-4">
          <RouterLink to="/resources" class="btn-primary">{{ $t('Back to Resources') }}</RouterLink>
        </div>
      </div>
    </LoadingBlock>

    <ResourceDetailModal
      :open="!!resource"
      :resource="resource ?? null"
      @close="$router.push('/resources')"
      @edit="(r) => (editOpen = true)"
    />

    <Modal
      :open="editOpen"
      :title="$t('Edit resource')"
      size="lg"
      @close="editOpen = false"
    >
      <ResourceForm v-if="resource" ref="formRef" :initial="resource" @uploading="(v) => (uploading = v)" />
      <div v-if="data.errors.resources" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.resources }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" :disabled="saving || uploading" @click="editOpen = false">
          {{ $t('Cancel') }}
        </button>
        <button
          class="btn-primary"
          type="button"
          :disabled="saving || uploading"
          @click="save"
        >
          {{ saving ? 'Saving...' : uploading ? 'Uploading...' : 'Save' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import ResourceForm from '@/components/resources/ResourceForm.vue';
import ResourceDetailModal from '@/components/resources/ResourceDetailModal.vue';
import { resourceTypeMeta } from '@/components/resources/resourceMeta';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Resource } from '@/stores/data';

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();

const resourceId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const resource = computed(() => data.resources.find((r) => r.id === resourceId.value));
const resourcesLoaded = ref(false);

const typeMeta = computed(() => (resource.value ? resourceTypeMeta(resource.value.type) : null));

const isOwner = computed(
  () => !!resource.value?.createdBy && resource.value.createdBy === auth.user?.id
);
const canEdit = computed(() => !!resource.value && (auth.isAdmin || isOwner.value));

const editOpen = ref(false);
const saving = ref(false);
const uploading = ref(false);
const formRef = ref<{ model: Resource } | null>(null);

const save = async () => {
  const m = formRef.value?.model;
  if (!m) return;
  saving.value = true;
  const ok = await data.upsertResource(m);
  saving.value = false;
  if (ok) editOpen.value = false;
};

onMounted(async () => {
  if (!data.resources.length) await data.fetchResources();
  resourcesLoaded.value = true;
  if (!data.folders.length) data.fetchFolders();
  if (!data.projects.length) data.fetchProjects();
  if (!data.websites.length) data.fetchWebsites();
  if (!data.members.length) data.fetchMembers();
});
</script>
