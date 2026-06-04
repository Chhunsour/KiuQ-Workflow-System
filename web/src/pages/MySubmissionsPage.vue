<template>
  <div>
    <PageHeader title="My Submissions" subtitle="Work you submitted for admin review." />

    <LoadingBlock :loading="data.loading.submissions" :error="data.errors.submissions" :retry="data.fetchSubmissions">
      <DataTable :columns="columns" :rows="rows">
        <template #cell-prompt="{ row }">
          <div class="ui-font font-medium text-text-main">{{ row.prompt }}</div>
          <div class="text-xs text-text-muted">{{ row.project }}</div>
        </template>
        <template #cell-status="{ row }">
          <StatusBadge :status="row.status === 'submitted' ? 'pending_review' : row.status" />
        </template>
        <template #cell-feedback="{ row }">
          <span class="text-text-muted">{{ row.feedbackCount }} comments</span>
        </template>
        <template #actions="{ row }">
          <RouterLink
            v-if="row.status === 'needs_fix'"
            :to="`/prompt-builder/${row.assignmentId}`"
            class="btn-secondary h-8 px-3 text-xs"
          >
            Resubmit
          </RouterLink>
        </template>
      </DataTable>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import DataTable, { type Column } from '@/components/ui/DataTable.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useDataStore } from '@/stores/data';

const data = useDataStore();

const columns: Column[] = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'submittedAt', label: 'Submitted' },
  { key: 'status', label: 'Status' },
  { key: 'feedback', label: 'Feedback' }
];

const assignmentById = (id: string) => data.assignments.find((a) => a.id === id);
const rows = computed(() =>
  data.mySubmissions.map((submission) => {
    const assignment = assignmentById(submission.assignmentId);
    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      prompt: data.promptById(assignment?.promptId)?.title ?? 'Assigned prompt',
      project: data.projectById(assignment?.projectId)?.name ?? 'No project',
      submittedAt: submission.submittedAt,
      status: submission.status,
      feedbackCount: data.reviewComments.filter((c) => c.submissionId === submission.id).length
    };
  })
);

onMounted(() => {
  data.fetchSubmissions();
  data.fetchReviewComments();
  data.fetchAssignments();
  data.fetchPrompts();
  data.fetchProjects();
});
</script>
