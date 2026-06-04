<template>
  <div>
    <PageHeader title="Reviews" subtitle="Review submitted work, approve it, reject it, or request fixes." />

    <div v-if="openBlockers.length > 0" class="mb-5 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/20 px-4 py-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="ui-font text-sm font-semibold text-status-needs-fix-fg">{{ openBlockers.length }} open blocker{{ openBlockers.length === 1 ? '' : 's' }}</div>
          <div class="text-xs text-text-muted">Resolve blockers before reviewing related work.</div>
        </div>
        <RouterLink to="/team-blockers" class="btn-secondary h-8 px-3 text-xs">Open Blockers</RouterLink>
      </div>
    </div>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" placeholder="Search submissions..." />
      <FormSelect
        v-model="statusFilter"
        class="max-w-[220px]"
        :options="[
          { value: '', label: 'All statuses' },
          { value: 'submitted', label: 'Pending Review' },
          { value: 'needs_fix', label: 'Needs Fix' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' }
        ]"
      />
    </div>

    <LoadingBlock :loading="data.loading.submissions" :error="data.errors.submissions" :retry="data.fetchSubmissions">
      <div v-if="filtered.length > 0" class="space-y-4">
        <div v-for="item in filtered" :key="item.submission.id" :id="`submission-${item.submission.id}`" class="card card-pad transition-all" :class="{ 'ring-4 ring-primary ring-offset-2 !border-primary shadow-2xl': highlightedSubmissionId === item.submission.id }">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="ui-font text-base font-semibold text-text-main">{{ item.promptTitle }}</h3>
              <p class="mt-1 text-sm text-text-muted">
                {{ item.memberName }} · {{ item.projectName }} · Submitted {{ item.submission.submittedAt }}
              </p>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <RouterLink class="btn-secondary h-8 px-3 text-xs" :to="`/profiles/${item.memberId}`">
                View Full
              </RouterLink>
              <StatusBadge :status="item.submission.status === 'submitted' ? 'pending_review' : item.submission.status" />
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <div class="ui-font mb-2 text-sm font-medium text-text-main">Submitted output</div>
              <pre class="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-card border border-border bg-soft p-4 text-sm text-text-main">{{ item.submission.content }}</pre>
              <a
                v-if="item.submission.screenshotUrl"
                :href="item.submission.screenshotUrl"
                target="_blank"
                rel="noopener"
                class="mt-2 inline-block text-sm text-primary hover:underline"
              >
                Open screenshot
              </a>
            </div>
            <div>
              <FormTextarea
                v-model="feedback[item.submission.id]"
                label="Feedback"
                placeholder="Write what needs fixing, or leave blank for a simple approval."
                :rows="8"
              />
              <div class="mt-3 flex flex-wrap justify-end gap-2">
                <button
                  v-if="assignmentById(item.submission.assignmentId)"
                  class="btn-secondary h-9 px-3 text-xs"
                  type="button"
                  @click="openReplace(assignmentById(item.submission.assignmentId)!)"
                >
                  Replace Prompt
                </button>
                <button class="btn-secondary h-9 px-3 text-xs" type="button" @click="review(item.submission, 'needs_fix')">
                  Needs Fix
                </button>
                <button class="btn-danger h-9 px-3 text-xs" type="button" @click="review(item.submission, 'rejected')">
                  Reject
                </button>
                <button class="btn-primary h-9 px-3 text-xs" type="button" @click="review(item.submission, 'approved')">
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        title="No submissions"
        description="Team submissions will appear here when they are ready for review."
      />
    </LoadingBlock>

    <ReplacePromptModal
      :open="replaceOpen"
      :assignment="replaceTarget"
      @close="replaceOpen = false"
      @replaced="onReplaced"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import ReplacePromptModal from '@/components/prompt/ReplacePromptModal.vue';
import { useDataStore, type PromptAssignment, type Submission, type SubmissionStatus } from '@/stores/data';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['submissions', 'review_comments', 'prompt_assignments']);

const route = useRoute();
const data = useDataStore();
const search = ref('');
const statusFilter = ref('');
const feedback = reactive<Record<string, string>>({});
const highlightedSubmissionId = ref('');
const openBlockers = computed(() => data.blockers.filter((b) => b.status === 'open'));

const assignmentById = (id: string) => data.assignments.find((a) => a.id === id);
const items = computed(() =>
  data.submissions.map((submission) => {
    const assignment = assignmentById(submission.assignmentId);
    return {
      submission,
      memberId: submission.submittedBy,
      promptTitle: data.promptById(assignment?.promptId)?.title ?? 'Assigned prompt',
      projectName: data.projectById(assignment?.projectId)?.name ?? 'No project',
      memberName: data.memberById(submission.submittedBy ?? '')?.fullName ?? 'Team member'
    };
  })
);

const filtered = computed(() =>
  items.value.filter((item) => {
    const q = search.value.toLowerCase();
    const matchesSearch =
      !q ||
      item.promptTitle.toLowerCase().includes(q) ||
      item.projectName.toLowerCase().includes(q) ||
      item.memberName.toLowerCase().includes(q);
    const matchesStatus = !statusFilter.value || item.submission.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  })
);

const review = async (submission: Submission, status: SubmissionStatus) => {
  await data.reviewSubmission(submission, status, feedback[submission.id] ?? '');
  feedback[submission.id] = '';
};

// Replace Prompt modal
const replaceOpen = ref(false);
const replaceTarget = ref<PromptAssignment | null>(null);

const openReplace = (assignment: PromptAssignment) => {
  replaceTarget.value = assignment;
  replaceOpen.value = true;
};

const onReplaced = async () => {
  // Refresh assignments + submissions so the next review pass shows the
  // new prompt + 'needs_resubmission' status straight away.
  await Promise.allSettled([data.fetchAssignments(), data.fetchSubmissions()]);
};

onMounted(async () => {
  await Promise.allSettled([
    data.fetchSubmissions(),
    data.fetchReviewComments(),
    data.fetchAssignments(),
    data.fetchPrompts(),
    data.fetchProjects(),
    data.fetchMembers(),
    data.fetchBlockers()
  ]);

  const subId = route.query.submission as string;
  if (subId) {
    highlightedSubmissionId.value = subId;
    window.setTimeout(() => {
      const el = document.getElementById(`submission-${subId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    window.setTimeout(() => {
      highlightedSubmissionId.value = '';
    }, 5000);
  }
});
</script>
