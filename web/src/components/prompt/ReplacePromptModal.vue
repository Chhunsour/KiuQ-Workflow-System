<template>
  <Modal
    :open="open"
    title="Replace prompt"
    subtitle="Swap the prompt on this task without losing the submission history."
    size="lg"
    @close="$emit('close')"
  >
    <div v-if="assignment" class="space-y-5">
      <!-- Context strip -->
      <div class="rounded-card border border-border bg-soft/40 p-4 text-sm">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <div class="ui-font text-xs uppercase text-text-muted">Member</div>
            <div class="font-medium text-text-main">{{ memberName }}</div>
          </div>
          <div>
            <div class="ui-font text-xs uppercase text-text-muted">Project</div>
            <div class="font-medium text-text-main">{{ projectName }}</div>
          </div>
          <div class="sm:col-span-2">
            <div class="ui-font text-xs uppercase text-text-muted">Current prompt</div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-medium text-text-main">{{ currentPromptTitle }}</span>
              <span
                v-if="currentPrompt && currentPrompt.qualityStatus !== 'good'"
                class="ui-font rounded-full px-2 py-0.5 text-xs font-medium"
                :class="qualityClasses(currentPrompt.qualityStatus)"
              >{{ qualityLabel(currentPrompt.qualityStatus) }}</span>
            </div>
          </div>
        </div>
      </div>

      <FormSelect
        v-model="form.reason"
        label="Reason for replacement"
        :options="reasonOptions"
        helper="If you pick Weak Prompt or Needs Improvement, the old prompt's quality is updated automatically."
      />

      <div>
        <label class="label">New prompt</label>
        <p class="helper -mt-1 mb-2">
          Pick from approved, non-archived prompts. Search by title, page group, or category.
        </p>
        <input
          v-model="searchTerm"
          class="input mb-2"
          type="search"
          placeholder="Search prompts..."
        />
        <div class="max-h-[280px] overflow-y-auto rounded-card border border-border">
          <button
            v-for="candidate in filteredCandidates"
            :key="candidate.id"
            type="button"
            class="flex w-full cursor-pointer items-start justify-between gap-3 border-b border-border p-3 text-left transition last:border-b-0"
            :class="
              form.newPromptId === candidate.id
                ? 'bg-primary/5 ring-1 ring-primary'
                : 'hover:bg-soft'
            "
            @click="form.newPromptId = candidate.id"
          >
            <div class="min-w-0">
              <div class="ui-font text-sm font-medium text-text-main">{{ candidate.title }}</div>
              <div class="text-xs text-text-muted">
                {{ candidate.pageGroup || candidate.category || '—' }} ·
                v{{ candidate.version }} ·
                {{ candidate.promptMode === 'full_page' ? 'Full Page' : 'Section' }}
              </div>
            </div>
            <span
              class="ui-font rounded-full px-2 py-0.5 text-xs font-medium"
              :class="qualityClasses(candidate.qualityStatus)"
            >{{ qualityLabel(candidate.qualityStatus) }}</span>
          </button>
          <div v-if="filteredCandidates.length === 0" class="p-4 text-center text-sm text-text-muted">
            No matching prompts.
          </div>
        </div>
      </div>

      <FormTextarea
        v-model="form.adminNote"
        label="Admin note (optional)"
        helper="Tell the team why you're swapping the prompt — e.g. ‘Hero output kept missing the CTA. Try v2.’"
        :rows="3"
      />

      <div
        v-if="error"
        class="rounded-btn border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-3 py-2 text-sm text-status-needs-fix-fg"
      >
        {{ error }}
      </div>
    </div>
    <template #footer>
      <button class="btn-ghost" type="button" :disabled="submitting" @click="$emit('close')">
        Cancel
      </button>
      <button
        class="btn-primary"
        type="button"
        :disabled="submitting || !form.newPromptId || form.newPromptId === assignment?.promptId"
        @click="submit"
      >
        {{ submitting ? 'Replacing...' : 'Assign New Prompt' }}
      </button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import FormSelect from '@/components/ui/FormSelect.vue';
import FormTextarea from '@/components/ui/FormTextarea.vue';
import {
  useDataStore,
  type Prompt,
  type PromptAssignment,
  type PromptQualityStatus,
  type PromptReplacementReason
} from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { useNotificationsStore } from '@/stores/notifications';

const props = defineProps<{ open: boolean; assignment: PromptAssignment | null }>();
const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'replaced'): void;
}>();

const data = useDataStore();
const auth = useAuthStore();
const notifs = useNotificationsStore();
const submitting = ref(false);
const error = ref<string | null>(null);
const searchTerm = ref('');

const reasonOptions: { value: PromptReplacementReason; label: string }[] = [
  { value: 'weak_prompt', label: 'Weak Prompt — output was bad' },
  { value: 'needs_improvement', label: 'Needs Improvement — partially OK' },
  { value: 'better_prompt_available', label: 'Better prompt available' },
  { value: 'other', label: 'Other reason' }
];

const form = reactive<{
  reason: PromptReplacementReason;
  newPromptId: string;
  adminNote: string;
}>({
  reason: 'weak_prompt',
  newPromptId: '',
  adminNote: ''
});

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      form.reason = 'weak_prompt';
      form.newPromptId = '';
      form.adminNote = '';
      searchTerm.value = '';
      error.value = null;
    }
  }
);

const currentPrompt = computed(() =>
  props.assignment ? data.promptById(props.assignment.promptId) : null
);
const currentPromptTitle = computed(
  () => currentPrompt.value?.title ?? '(prompt removed)'
);
const memberName = computed(
  () => data.memberById(props.assignment?.assignedMemberId ?? '')?.fullName ?? 'Team member'
);
const projectName = computed(
  () => data.projectById(props.assignment?.projectId ?? null)?.name ?? 'No project'
);

// Candidate prompts: anything but the current one, not archived, and (preferably) approved.
const candidatePrompts = computed<Prompt[]>(() =>
  data.prompts
    .filter((p) => p.id !== props.assignment?.promptId)
    .filter((p) => p.qualityStatus !== 'archived')
    .filter((p) => p.status === 'approved')
    .sort((a, b) => (a.title > b.title ? 1 : -1))
);

const filteredCandidates = computed(() => {
  const q = searchTerm.value.trim().toLowerCase();
  if (!q) return candidatePrompts.value;
  return candidatePrompts.value.filter((p) =>
    `${p.title} ${p.pageGroup} ${p.category} ${p.shortDescription}`.toLowerCase().includes(q)
  );
});

// Map reason → quality flag we should set on the OLD prompt.
const qualityFromReason = (reason: PromptReplacementReason): PromptQualityStatus | null => {
  if (reason === 'weak_prompt') return 'weak';
  if (reason === 'needs_improvement') return 'needs_improvement';
  return null;
};

const submit = async () => {
  if (!props.assignment || !form.newPromptId) return;
  submitting.value = true;
  error.value = null;
  const ok = await data.replacePromptForAssignment({
    assignmentId: props.assignment.id,
    newPromptId: form.newPromptId,
    reason: form.reason,
    adminNote: form.adminNote,
    markOldQuality: qualityFromReason(form.reason)
  });
  submitting.value = false;
  if (ok) {
    // Notify the assigned member that their prompt was replaced
    const memberId = props.assignment?.assignedMemberId;
    if (memberId && memberId !== auth.user?.id) {
      void notifs.createNotification({
        recipientId: memberId,
        actorId:     auth.user?.id,
        type:        'prompt_replaced',
        title:       'Prompt replaced for your task',
        message:     `${auth.profile?.fullName || 'Admin'} replaced the prompt on one of your assigned tasks.`,
        relatedType: 'assignment',
        relatedId:   props.assignment?.id,
      });
    }
    emit('replaced');
    emit('close');
  } else {
    error.value = data.errors.promptReplacements ?? 'Could not replace the prompt.';
  }
};

// Tiny duplicates of the helpers in PromptLibraryPage so the modal is self-contained.
const qualityLabel = (q: PromptQualityStatus): string => {
  switch (q) {
    case 'weak': return 'Weak';
    case 'needs_improvement': return 'Needs Improvement';
    case 'archived': return 'Archived';
    default: return 'Good';
  }
};
const qualityClasses = (q: PromptQualityStatus): string => {
  switch (q) {
    case 'weak': return 'bg-status-needs-fix-bg text-status-needs-fix-fg';
    case 'needs_improvement': return 'bg-status-submitted-bg text-status-submitted-fg';
    case 'archived': return 'bg-status-not-started-bg text-status-not-started-fg';
    default: return 'bg-status-approved-bg text-status-approved-fg';
  }
};
</script>
