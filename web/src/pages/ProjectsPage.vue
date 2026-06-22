<template>
  <div>
    <PageHeader :title="$t('Projects')" subtitle="Website-building work assigned to your team.">
      <template #actions>
        <button class="btn-primary" type="button" @click="openCreate">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {{ $t('Create Project') }}
        </button>
      </template>
    </PageHeader>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" :placeholder="$t('Search projects...')" />
      <FormSelect
        v-model="statusFilter"
        :options="[
          { value: '', label: 'All statuses' },
          { value: 'not_started', label: 'Not Started' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'review', label: 'Review' },
          { value: 'approved', label: 'Approved' },
          { value: 'completed', label: 'Completed' }
        ]"
        class="max-w-[200px]"
      />
    </div>

    <LoadingBlock :loading="data.loading.projects" :error="data.errors.projects" :retry="data.fetchProjects">
      <DataTable :columns="columns" :rows="filtered">
        <template #cell-name="{ row }">
          <div class="ui-font font-medium text-text-main">{{ row.name }}</div>
          <div class="text-xs text-text-muted">{{ websiteName(row.websiteId) }}</div>
        </template>
        <template #cell-assignedMemberIds="{ row }">
          <div class="flex -space-x-2">
            <span
              v-for="(id, i) in row.assignedMemberIds.slice(0, 3)"
              :key="id"
              class="flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-soft text-primary ui-font text-xs font-semibold"
              :title="memberName(id)"
              :style="{ zIndex: 10 - i }"
            >
              {{ initials(memberName(id)) }}
            </span>
            <span
              v-if="row.assignedMemberIds.length > 3"
              class="ui-font flex h-7 w-7 items-center justify-center rounded-full border-2 border-card bg-soft text-primary text-xs font-semibold"
            >
              +{{ row.assignedMemberIds.length - 3 }}
            </span>
            <span v-if="row.assignedMemberIds.length === 0" class="text-xs text-text-muted">
              {{ $t('Not assigned') }}
            </span>
          </div>
        </template>
        <template #cell-status="{ row }">
          <StatusBadge :status="row.status" />
        </template>
        <template #cell-deadline="{ row }">
          <span class="text-text-muted">{{ row.deadline || '—' }}</span>
        </template>
        <template #actions="{ row }">
          <button class="btn-secondary h-8 px-3 text-xs" @click="openEdit(row)">{{ $t('Edit') }}</button>
          <button class="btn-danger h-8 px-3 text-xs" @click="confirmDelete(row)">{{ $t('Delete') }}</button>
        </template>
      </DataTable>
    </LoadingBlock>

    <Modal
      :open="modalOpen"
      :title="editing ? 'Edit project' : 'Create project'"
      size="lg"
      @close="closeModal"
    >
      <ProjectForm ref="formRef" :initial="formInitial" />
      <div v-if="data.errors.projects" class="mt-3 text-sm text-status-needs-fix-fg">
        {{ data.errors.projects }}
      </div>
      <template #footer>
        <button class="btn-ghost" type="button" @click="closeModal">{{ $t('Cancel') }}</button>
        <button class="btn-primary" type="button" :disabled="saving" @click="save(formRef?.model)">
          {{ saving ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import DataTable, { type Column } from '@/components/ui/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import Modal from '@/components/ui/Modal.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import ProjectForm from '@/components/forms/ProjectForm.vue';
import { useDataStore, type Project } from '@/stores/data';

const data = useDataStore();
const search = ref('');
const statusFilter = ref('');
const modalOpen = ref(false);
const editing = ref(false);
const saving = ref(false);
const formRef = ref<{ model: Project } | null>(null);

const blank = (): Project => ({
  id: '',
  name: '',
  websiteId: null,
  assignedMemberIds: [],
  status: 'not_started',
  deadline: '',
  notes: '',
  createdAt: ''
});

const formInitial = ref<Project>(blank());

const columns: Column[] = [
  { key: 'name', label: 'Project' },
  { key: 'assignedMemberIds', label: 'Members' },
  { key: 'status', label: 'Status' },
  { key: 'deadline', label: 'Deadline' }
];

const filtered = computed(() =>
  data.projects.filter((p) => {
    const q = search.value.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q);
    const matchesStatus = !statusFilter.value || p.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  })
);

const websiteName = (id: string | null) => data.websiteById(id)?.name ?? '—';
const memberName = (id: string) => data.memberById(id)?.fullName ?? '—';
const initials = (name: string) =>
  name.split(' ').map((s) => s[0] ?? '').join('').slice(0, 2).toUpperCase();

const openCreate = () => {
  formInitial.value = blank();
  editing.value = false;
  modalOpen.value = true;
};
const openEdit = (p: Project) => {
  formInitial.value = { ...p, assignedMemberIds: [...p.assignedMemberIds] };
  editing.value = true;
  modalOpen.value = true;
};
const closeModal = () => (modalOpen.value = false);

const save = async (p: Project | undefined) => {
  if (!p || !p.name) return;
  saving.value = true;
  const ok = await data.upsertProject(p);
  saving.value = false;
  if (ok) closeModal();
};

const confirmDelete = async (p: Project) => {
  if (!confirm(`Delete ${p.name}?`)) return;
  await data.removeProject(p.id);
};

onMounted(() => {
  data.fetchProjects();
  if (data.members.length === 0) data.fetchMembers();
  if (data.websites.length === 0) data.fetchWebsites();
});
</script>
