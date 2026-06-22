<template>
  <div>
    <PageHeader :title="$t('Notes')" subtitle="Quick notes about websites, projects, prompts, or the team.">
      <template #actions>
        <button class="btn-primary" type="button" @click="openCreate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {{ $t('New Note') }}
        </button>
      </template>
    </PageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" :placeholder="$t('Search notes...')" />
    </div>

    <LoadingBlock :loading="data.loading.notes" :error="data.errors.notes" :retry="data.fetchNotes">
      <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <div v-for="note in filtered" :key="note.id" class="card card-pad flex flex-col">
          <div class="flex items-center justify-between">
            <span class="ui-font rounded-full bg-soft px-2.5 py-1 text-xs font-medium text-primary">
              {{ relatedLabel(note) }}
            </span>
            <span class="text-xs text-text-muted">Updated {{ note.updatedAt }}</span>
          </div>
          <h3 class="mt-3 ui-font text-base font-semibold text-text-main">{{ note.title }}</h3>
          <p class="mt-2 flex-1 whitespace-pre-line text-sm text-text-main">{{ note.content }}</p>
          <div class="mt-4 flex justify-end gap-2">
            <button class="btn-secondary h-8 px-3 text-xs" @click="openEdit(note)">{{ $t('Edit') }}</button>
            <button class="btn-danger h-8 px-3 text-xs" @click="confirmDelete(note)">{{ $t('Delete') }}</button>
          </div>
        </div>
      </div>

      <EmptyState
        v-if="filtered.length === 0"
        :title="$t('No notes yet')"
        description="Use notes for brand voice reminders, sprint priorities, or reviewer checklists."
      >
        <template #action>
          <button class="btn-primary" @click="openCreate">{{ $t('New Note') }}</button>
        </template>
      </EmptyState>
    </LoadingBlock>

    <Modal
      :open="modalOpen"
      :title="editing ? 'Edit note' : 'New note'"
      size="md"
      @close="closeModal"
    >
      <form class="space-y-4" @submit.prevent="save(form)">
        <FormInput v-model="form.title" :label="$t('Title')" />
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormSelect
            v-model="folderIdValue"
            :label="$t('Folder')"
            :placeholder="$t('No folder')"
            :options="folderOptions"
          />
          <FormSelect
            v-model="form.relatedType"
            :label="$t('Related to')"
            :options="[
              { value: 'none', label: 'None' },
              { value: 'project', label: 'Project' },
              { value: 'website', label: 'Website' },
              { value: 'prompt', label: 'Prompt' },
              { value: 'team', label: 'Team' }
            ]"
          />
          <FormSelect
            v-if="form.relatedType !== 'none' && form.relatedType !== 'team'"
            v-model="relatedIdValue"
            :label="$t('Pick item')"
            :placeholder="$t('Choose...')"
            :options="relatedOptions"
          />
        </div>
        <FormTextarea v-model="form.content" :label="$t('Note content')" :rows="6" />
      </form>
      <div v-if="data.errors.notes" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.notes }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeModal">{{ $t('Cancel') }}</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="save(form)">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import FormInput from '@/components/ui/FormInput.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import { useDataStore, type Note } from '@/stores/data';

const data = useDataStore();
const search = ref('');
const modalOpen = ref(false);
const editing = ref(false);
const saving = ref(false);

const blank = (): Note => ({
  id: '',
  title: '',
  relatedType: 'none',
  relatedId: null,
  folderId: null,
  content: '',
  createdAt: '',
  updatedAt: ''
});
const form = reactive<Note>(blank());

const relatedIdValue = computed({
  get: () => form.relatedId ?? '',
  set: (v) => (form.relatedId = v || null)
});

const folderIdValue = computed({
  get: () => form.folderId ?? '',
  set: (v) => (form.folderId = v || null)
});

const folderOptions = computed(() =>
  data.folders.map((folder) => ({ value: folder.id, label: folder.name }))
);

const relatedOptions = computed(() => {
  if (form.relatedType === 'project') {
    return data.projects.map((p) => ({ value: p.id, label: p.name }));
  }
  if (form.relatedType === 'website') {
    return data.websites.map((w) => ({ value: w.id, label: w.name }));
  }
  if (form.relatedType === 'prompt') {
    return data.prompts.map((p) => ({ value: p.id, label: p.title }));
  }
  return [];
});

const filtered = computed(() =>
  data.notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.value.toLowerCase()) ||
      n.content.toLowerCase().includes(search.value.toLowerCase())
  )
);

const relatedLabel = (n: Note) => {
  if (n.relatedType === 'team') return 'Team';
  if (n.relatedType === 'none') return 'General';
  if (n.relatedType === 'project') return data.projectById(n.relatedId)?.name ?? 'Project';
  if (n.relatedType === 'website') return data.websiteById(n.relatedId)?.name ?? 'Website';
  if (n.relatedType === 'prompt') return data.promptById(n.relatedId)?.title ?? 'Prompt';
  return 'General';
};

const openCreate = () => {
  Object.assign(form, blank());
  editing.value = false;
  modalOpen.value = true;
};
const openEdit = (n: Note) => {
  Object.assign(form, n);
  editing.value = true;
  modalOpen.value = true;
};
const closeModal = () => (modalOpen.value = false);

const save = async (n: Note) => {
  if (!n.title) return;
  saving.value = true;
  const ok = await data.upsertNote(n);
  saving.value = false;
  if (ok) closeModal();
};

const confirmDelete = async (n: Note) => {
  if (!confirm(`Delete "${n.title}"?`)) return;
  await data.removeNote(n.id);
};

onMounted(() => {
  data.fetchNotes();
  if (data.projects.length === 0) data.fetchProjects();
  if (data.websites.length === 0) data.fetchWebsites();
  if (data.prompts.length === 0) data.fetchPrompts();
  if (data.folders.length === 0) data.fetchFolders();
});
</script>
