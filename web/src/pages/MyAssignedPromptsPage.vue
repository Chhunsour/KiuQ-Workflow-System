<template>
  <div>
    <PageHeader :title="$t('My Assigned Prompts')" subtitle="Only prompt templates assigned to you are shown here." />

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" :placeholder="$t('Search assigned prompts...')" />
      <FormSelect
        v-model="statusFilter"
        class="max-w-[200px]"
        :options="[
          { value: '', label: 'All statuses' },
          { value: 'pending', label: 'Assigned' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'submitted', label: 'Pending Review' },
          { value: 'needs_fix', label: 'Needs Fix' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }
        ]"
      />
    </div>

    <LoadingBlock :loading="data.loading.assignments" :error="data.errors.assignments" :retry="data.fetchAssignments">
      <div v-if="filtered.length > 0" class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div v-for="assignment in filtered" :key="assignment.id" :id="`assignment-${assignment.id}`" class="card card-pad transition-all" :class="{ 'ring-4 ring-primary ring-offset-2 !border-primary shadow-2xl': highlightedAssignmentId === assignment.id }">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="ui-font text-base font-semibold text-text-main">{{ promptTitle(assignment.promptId) }}</h3>
              <p class="mt-1 text-sm text-text-muted">{{ projectName(assignment.projectId) }}</p>
            </div>
            <StatusBadge :status="assignment.status === 'pending' ? 'assigned' : assignment.status" />
          </div>

          <!-- Prompt-replaced notice (admin swapped the prompt; member must resubmit) -->
          <div
            v-if="assignment.status === 'needs_resubmission'"
            class="mt-3 rounded-btn border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-3 py-2 text-xs text-status-needs-fix-fg"
          >
            <div class="ui-font font-semibold">{{ $t('Admin replaced the prompt.') }}</div>
            <div class="mt-0.5">
              {{ $t('Please use the new prompt and resubmit.') }}
              <span v-if="latestReplacementFor(assignment.id)?.adminNote">
                — “{{ latestReplacementFor(assignment.id)?.adminNote }}”
              </span>
            </div>
          </div>

          <dl class="mt-4 space-y-1.5 text-sm">
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">{{ $t('Website') }}</dt>
              <dd class="ui-font text-text-main">{{ websiteName(assignment.websiteId) }}</dd>
            </div>
            <div class="flex justify-between gap-2">
              <dt class="text-text-muted">{{ $t('Assigned') }}</dt>
              <dd class="ui-font text-text-main">{{ assignment.assignedAt || '—' }}</dd>
            </div>
          </dl>

          <div class="mt-4 flex justify-end">
            <RouterLink :to="`/prompt-builder/${assignment.id}`" class="btn-primary h-9 px-3 text-xs">
              {{ $t('Open Prompt') }}
            </RouterLink>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        :title="$t('No assigned prompts')"
        description="Your admin has not assigned work yet."
      >
        <template #action>
          <RouterLink to="/docs" class="btn-primary">{{ $t('Open Docs') }}</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useDataStore } from '@/stores/data';

const route = useRoute();
const data = useDataStore();
const search = ref('');
const statusFilter = ref('');
const highlightedAssignmentId = ref('');

const promptTitle = (id: string) => data.promptById(id)?.title ?? 'Assigned prompt';
const projectName = (id: string | null) => data.projectById(id)?.name ?? 'No project';
const websiteName = (id: string | null) => data.websiteById(id)?.name ?? 'No website';

// Pull the most recent prompt-replacement audit row for a given assignment, so
// the notice can show the admin's "why" message.
const latestReplacementFor = (assignmentId: string) =>
  data.promptReplacements.find((r) => r.assignmentId === assignmentId) ?? null;

const filtered = computed(() =>
  data.myAssignments.filter((assignment) => {
    const prompt = data.promptById(assignment.promptId);
    const q = search.value.toLowerCase();
    const matchesSearch =
      !q ||
      prompt?.title.toLowerCase().includes(q) ||
      prompt?.category.toLowerCase().includes(q) ||
      projectName(assignment.projectId).toLowerCase().includes(q);
    const matchesStatus = !statusFilter.value || assignment.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  })
);

onMounted(async () => {
  await Promise.allSettled([
    data.fetchAssignments(),
    data.fetchPrompts(),
    data.fetchProjects(),
    data.fetchWebsites(),
    data.fetchPromptReplacements()
  ]);

  const assignmentId = route.query.prompt as string;
  if (assignmentId) {
    highlightedAssignmentId.value = assignmentId;
    window.setTimeout(() => {
      const el = document.getElementById(`assignment-${assignmentId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    window.setTimeout(() => {
      highlightedAssignmentId.value = '';
    }, 5000);
  }
});
</script>
