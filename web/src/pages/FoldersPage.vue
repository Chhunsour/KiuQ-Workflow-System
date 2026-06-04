<template>
  <div>
    <PageHeader title="Folders" subtitle="Group prompts by topic so the team can find them quickly.">
      <template v-if="auth.isAdmin" #actions>
        <button class="btn-primary" type="button" @click="openCreate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Folder
        </button>
      </template>
    </PageHeader>

    <LoadingBlock :loading="data.loading.folders" :error="data.errors.folders" :retry="data.fetchFolders">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="folder in data.folders"
          :key="folder.id"
          role="link"
          tabindex="0"
          class="card card-pad cursor-pointer transition hover:border-primary/40 hover:shadow-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          @click="openFolder(folder.id)"
          @keydown.enter.prevent="openFolder(folder.id)"
          @keydown.space.prevent="openFolder(folder.id)"
        >
          <div class="flex items-start justify-between">
            <div class="flex h-10 w-10 items-center justify-center rounded-btn bg-soft text-primary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">
              {{ folderItemCount(folder.id) }} items
            </span>
          </div>
          <h3 class="mt-3 ui-font text-base font-semibold text-text-main">{{ folder.name }}</h3>
          <p class="mt-1 line-clamp-2 text-sm text-text-muted">{{ folder.description || '—' }}</p>
          <div class="mt-4 flex items-center justify-between text-xs text-text-muted">
            <span>Created {{ folder.createdAt }}</span>
            <div v-if="auth.isAdmin" class="flex gap-1">
              <button class="btn-ghost h-8 px-3 text-xs" @click.stop="openEdit(folder)">Edit</button>
              <button class="btn-danger h-8 px-3 text-xs" @click.stop="confirmDelete(folder)">Delete</button>
            </div>
          </div>
        </div>
      </div>

      <EmptyState
        v-if="data.folders.length === 0"
        title="No folders yet"
        description="Create folders like Homepage Sections, SEO Prompts, or Blog Prompts."
      >
        <template #action>
          <button v-if="auth.isAdmin" class="btn-primary" @click="openCreate">New Folder</button>
        </template>
      </EmptyState>
    </LoadingBlock>

    <Modal
      :open="modalOpen"
      :title="editing ? 'Edit folder' : 'New folder'"
      size="md"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="save(form)">
        <FormInput v-model="form.name" label="Folder name" placeholder="Homepage Sections" />
        <FormTextarea v-model="form.description" label="Description" />
      </form>
      <div v-if="data.errors.folders" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.folders }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeModal">Cancel</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="save(form)">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Folder } from '@/stores/data';

const data = useDataStore();
const auth = useAuthStore();
const router = useRouter();
const modalOpen = ref(false);
const editing = ref(false);
const saving = ref(false);

const openFolder = (id: string) => router.push(`/folders/${id}`);

const folderItemCount = (folderId: string) =>
  data.promptCountByFolder(folderId) +
  data.resources.filter((resource) => resource.folderId === folderId).length +
  data.notes.filter((note) => note.folderId === folderId).length +
  data.docs.filter((doc) => doc.folderId === folderId).length +
  data.docsFiles.filter((file) => file.folderId === folderId).length;

const blank = (): Folder => ({ id: '', name: '', description: '', createdAt: '' });
const form = reactive<Folder>(blank());

const openCreate = () => {
  Object.assign(form, blank());
  editing.value = false;
  modalOpen.value = true;
};
const openEdit = (f: Folder) => {
  Object.assign(form, f);
  editing.value = true;
  modalOpen.value = true;
};
const closeModal = () => (modalOpen.value = false);

const save = async (f: Folder) => {
  if (!f.name) return;
  saving.value = true;
  const ok = await data.upsertFolder(f);
  saving.value = false;
  if (ok) closeModal();
};

const confirmDelete = async (f: Folder) => {
  if (!confirm(`Delete "${f.name}"?`)) return;
  await data.removeFolder(f.id);
};

onMounted(() => {
  data.fetchFolders();
  if (data.prompts.length === 0) data.fetchPrompts();
  if (data.resources.length === 0) data.fetchResources();
  if (data.notes.length === 0) data.fetchNotes();
  if (data.docs.length === 0) data.fetchDocs();
  if (data.docsFiles.length === 0) data.fetchDocsFiles();
});
</script>
