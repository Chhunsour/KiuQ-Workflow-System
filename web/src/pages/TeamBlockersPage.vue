<template>
  <div>
    <PageHeader title="Team Blockers" subtitle="Open blockers from team members and admin responses." />

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <input v-model="search" class="input max-w-sm" type="search" placeholder="Search blockers..." />
      <FormSelect
        v-model="statusFilter"
        class="max-w-[200px]"
        :options="[
          { value: '', label: 'All statuses' },
          { value: 'open', label: 'Open' },
          { value: 'resolved', label: 'Resolved' }
        ]"
      />
    </div>

    <LoadingBlock :loading="data.loading.blockers" :error="data.errors.blockers" :retry="data.fetchBlockers">
      <div v-if="filtered.length > 0" class="space-y-4">
        <article v-for="blocker in filtered" :key="blocker.id" :id="`blocker-${blocker.id}`" class="card card-pad transition-all" :class="{ 'ring-4 ring-primary ring-offset-2 !border-primary shadow-2xl': highlightedBlockerId === blocker.id }">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 class="ui-font text-base font-semibold text-text-main">{{ blocker.reason || 'Blocker' }}</h3>
              <p class="mt-1 text-sm text-text-muted">
                {{ memberName(blocker.memberId) }} · {{ taskTitle(blocker.taskId) }} · {{ blocker.createdAt }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <RouterLink class="btn-secondary h-8 px-3 text-xs" :to="`/profiles/${blocker.memberId}`">
                View Full
              </RouterLink>
              <span class="ui-font rounded-full px-2.5 py-1 text-xs font-medium" :class="priorityClass(blocker.urgency)">
                {{ blocker.urgency }}
              </span>
              <StatusBadge :status="blocker.status" />
            </div>
          </div>

          <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <h4 class="ui-font text-sm font-medium text-text-main">What they tried</h4>
              <p class="mt-1 whitespace-pre-line text-sm text-text-muted">{{ blocker.whatTried || '—' }}</p>
            </div>
            <div>
              <h4 class="ui-font text-sm font-medium text-text-main">Help needed</h4>
              <p class="mt-1 whitespace-pre-line text-sm text-text-muted">{{ blocker.helpNeeded || '—' }}</p>
            </div>
          </div>

          <div v-if="blocker.status === 'open'" class="mt-4">
            <FormTextarea v-model="responses[blocker.id]" label="Admin response" :rows="3" />
            <div class="mt-3 flex justify-end">
              <button class="btn-primary h-9 px-3 text-xs" type="button" @click="resolve(blocker)">
                Resolve Blocker
              </button>
            </div>
          </div>
          <p v-else class="mt-4 rounded-btn bg-status-approved-bg/40 px-3 py-2 text-sm text-status-approved-fg">
            {{ blocker.adminResponse || 'Resolved.' }}
          </p>
        </article>
      </div>
      <EmptyState v-else title="No blockers" description="Open team blockers will appear here." />
    </LoadingBlock>
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
import { useDataStore, type Blocker, type Priority } from '@/stores/data';

const route = useRoute();
const data = useDataStore();
const search = ref('');
const statusFilter = ref('');
const responses = reactive<Record<string, string>>({});
const highlightedBlockerId = ref('');

const memberName = (id: string) => data.memberById(id)?.fullName ?? data.memberById(id)?.email ?? 'Team member';
const assignment = (id: string | null) => data.assignments.find((a) => a.id === id);
const taskTitle = (id: string | null) => {
  const found = assignment(id);
  return found ? data.promptById(found.promptId)?.title ?? 'Assigned prompt' : 'Task';
};

const filtered = computed(() =>
  data.blockers.filter((blocker) => {
    const q = search.value.toLowerCase();
    const matchesSearch =
      !q ||
      blocker.reason.toLowerCase().includes(q) ||
      blocker.helpNeeded.toLowerCase().includes(q) ||
      memberName(blocker.memberId).toLowerCase().includes(q) ||
      taskTitle(blocker.taskId).toLowerCase().includes(q);
    const matchesStatus = !statusFilter.value || blocker.status === statusFilter.value;
    return matchesSearch && matchesStatus;
  })
);

const priorityClass = (priority: Priority) => {
  if (priority === 'urgent') return 'bg-status-needs-fix-bg text-status-needs-fix-fg';
  if (priority === 'high') return 'bg-status-submitted-bg text-status-submitted-fg';
  if (priority === 'low') return 'bg-status-not-started-bg text-status-not-started-fg';
  return 'bg-soft text-primary';
};

const resolve = async (blocker: Blocker) => {
  await data.resolveBlocker(blocker, responses[blocker.id] ?? '');
  responses[blocker.id] = '';
};

onMounted(async () => {
  await Promise.allSettled([
    data.fetchBlockers(),
    data.fetchAssignments(),
    data.fetchPrompts(),
    data.fetchMembers()
  ]);

  const blockerId = route.query.blocker as string;
  if (blockerId) {
    highlightedBlockerId.value = blockerId;
    window.setTimeout(() => {
      const el = document.getElementById(`blocker-${blockerId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
    window.setTimeout(() => {
      highlightedBlockerId.value = '';
    }, 5000);
  }
});
</script>
