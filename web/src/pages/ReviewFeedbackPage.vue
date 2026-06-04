<template>
  <div>
    <PageHeader title="Review Feedback" subtitle="Admin feedback for work that needs fixes or was rejected." />

    <LoadingBlock :loading="data.loading.reviewComments" :error="data.errors.reviewComments" :retry="data.fetchReviewComments">
      <div v-if="feedbackItems.length > 0" class="space-y-4">
        <div v-for="item in feedbackItems" :key="item.submission.id" class="card card-pad">
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="ui-font text-base font-semibold text-text-main">{{ item.promptTitle }}</h3>
              <p class="mt-1 text-sm text-text-muted">{{ item.projectName }} · Submitted {{ item.submission.submittedAt }}</p>
            </div>
            <StatusBadge :status="item.submission.status" />
          </div>

          <div class="mt-4 space-y-3">
            <div v-for="comment in item.comments" :key="comment.id" class="rounded-card border border-border bg-soft/40 p-4">
              <div class="text-sm text-text-main whitespace-pre-line">{{ comment.body }}</div>
              <div class="mt-2 text-xs text-text-muted">{{ comment.createdAt }}</div>
            </div>
            <div v-if="item.comments.length === 0" class="text-sm text-text-muted">
              No written feedback was attached.
            </div>
          </div>

          <div class="mt-4 flex justify-end">
            <RouterLink :to="`/prompt-builder/${item.submission.assignmentId}`" class="btn-primary h-9 px-3 text-xs">
              Fix and Resubmit
            </RouterLink>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        title="No fix feedback"
        description="No fix feedback right now. Keep working on your assigned tasks."
      >
        <template #action>
          <RouterLink to="/work-board/my" class="btn-primary">Open My Work Board</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useDataStore } from '@/stores/data';

const data = useDataStore();

const assignmentById = (id: string) => data.assignments.find((a) => a.id === id);
const feedbackItems = computed(() =>
  data.mySubmissions
    .filter((submission) => submission.status === 'needs_fix' || submission.status === 'rejected')
    .map((submission) => {
      const assignment = assignmentById(submission.assignmentId);
      return {
        submission,
        promptTitle: data.promptById(assignment?.promptId)?.title ?? 'Assigned prompt',
        projectName: data.projectById(assignment?.projectId)?.name ?? 'No project',
        comments: data.reviewComments.filter((comment) => comment.submissionId === submission.id)
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
