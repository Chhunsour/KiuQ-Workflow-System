<template>
  <div>
    <PageHeader title="My Tasks" subtitle="All assigned work with clear next actions." />

    <div class="mb-5 flex flex-wrap gap-2">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="btn h-9 px-3 text-xs"
        :class="activeTab === tab.key ? 'bg-primary text-white shadow-soft' : 'bg-card text-text-main border border-border hover:bg-soft'"
        type="button"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
        <span class="ui-font rounded-full bg-white/20 px-1.5">{{ tab.count }}</span>
      </button>
    </div>

    <LoadingBlock :loading="data.loading.assignments" :error="data.errors.assignments" :retry="data.fetchAssignments">
      <div v-if="filteredTasks.length > 0" class="space-y-3">
        <article v-for="task in filteredTasks" :key="task.id" class="card card-pad">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <h3 class="ui-font text-base font-semibold text-text-main">{{ task.name }}</h3>
              <p class="mt-1 text-sm text-text-muted">
                {{ task.website }} · {{ task.page }} · {{ task.section }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <span class="ui-font rounded-full px-2.5 py-1 text-xs font-medium" :class="priorityClass(task.priority)">
                {{ task.priorityLabel }}
              </span>
              <StatusBadge :status="task.status === 'pending' ? 'assigned' : task.status" />
            </div>
          </div>

          <dl class="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
            <div>
              <dt class="text-text-muted">Prompt</dt>
              <dd class="ui-font text-text-main">{{ task.prompt }}</dd>
            </div>
            <div>
              <dt class="text-text-muted">Due date</dt>
              <dd class="ui-font text-text-main">{{ task.dueDate || 'No date' }}</dd>
            </div>
            <div>
              <dt class="text-text-muted">Last update</dt>
              <dd class="ui-font text-text-main">{{ task.updatedAt || '—' }}</dd>
            </div>
            <div>
              <dt class="text-text-muted">Project</dt>
              <dd class="ui-font text-text-main">{{ task.project }}</dd>
            </div>
            <div class="flex items-end justify-end">
              <RouterLink :to="task.actionTo" class="btn-primary h-9 px-3 text-xs">
                {{ task.actionLabel }}
              </RouterLink>
            </div>
          </dl>
        </article>
      </div>

      <EmptyState
        v-else
        title="Your admin has not assigned work yet."
        description="Open Docs to review team rules while you wait for your first task."
      >
        <template #action>
          <RouterLink to="/docs" class="btn-primary">Open Docs</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { useDataStore, type AssignmentStatus, type Priority } from '@/stores/data';

type TabKey = 'all' | 'today' | 'in_progress' | 'needs_fix' | 'waiting_review' | 'approved' | 'overdue';

interface TaskRow {
  id: string;
  name: string;
  website: string;
  page: string;
  section: string;
  prompt: string;
  status: AssignmentStatus;
  dueDate: string;
  priority: Priority;
  priorityLabel: string;
  updatedAt: string;
  project: string;
  actionLabel: string;
  actionTo: string;
}

const data = useDataStore();
const activeTab = ref<TabKey>('all');
const today = computed(() => new Date().toISOString().slice(0, 10));

const priorityClass = (priority: Priority) => {
  if (priority === 'urgent') return 'bg-status-needs-fix-bg text-status-needs-fix-fg';
  if (priority === 'high') return 'bg-status-submitted-bg text-status-submitted-fg';
  if (priority === 'low') return 'bg-status-not-started-bg text-status-not-started-fg';
  return 'bg-soft text-primary';
};
const priorityLabel = (priority: Priority) =>
  priority === 'normal' ? 'Normal' : priority[0].toUpperCase() + priority.slice(1);

const taskRows = computed<TaskRow[]>(() =>
  data.myAssignments.map((assignment) => {
    const prompt = data.promptById(assignment.promptId);
    const dueDate = assignment.dueDate || data.projectById(assignment.projectId)?.deadline || '';
    const actionLabel =
      assignment.status === 'pending'
        ? 'Start'
        : assignment.status === 'in_progress'
          ? 'Continue'
          : assignment.status === 'submitted'
            ? 'View'
            : assignment.status === 'needs_fix'
              ? 'View Feedback'
              : 'Open';
    const actionTo =
      assignment.status === 'needs_fix' ? '/review-feedback' : `/prompt-builder/${assignment.id}`;
    return {
      id: assignment.id,
      name: prompt?.title ?? 'Assigned prompt',
      website: data.websiteById(assignment.websiteId)?.name ?? 'No website',
      page: data.projectById(assignment.projectId)?.name ?? 'No project',
      section: prompt?.category || 'Prompt task',
      prompt: prompt?.title ?? 'Assigned prompt',
      status: assignment.status,
      dueDate,
      priority: assignment.priority,
      priorityLabel: priorityLabel(assignment.priority),
      updatedAt: assignment.updatedAt,
      project: data.projectById(assignment.projectId)?.name ?? 'No project',
      actionLabel,
      actionTo
    };
  })
);

const isOverdue = (task: TaskRow) => !!task.dueDate && task.dueDate < today.value && task.status !== 'approved';
const tabFilter = (task: TaskRow, key: TabKey) => {
  if (key === 'all') return true;
  if (key === 'today') return task.dueDate === today.value || task.priority === 'urgent';
  if (key === 'waiting_review') return task.status === 'submitted';
  if (key === 'overdue') return isOverdue(task);
  return task.status === key;
};

const tabs = computed(() => [
  { key: 'all' as TabKey, label: 'All', count: taskRows.value.length },
  { key: 'today' as TabKey, label: 'Today', count: taskRows.value.filter((t) => tabFilter(t, 'today')).length },
  { key: 'in_progress' as TabKey, label: 'In Progress', count: taskRows.value.filter((t) => t.status === 'in_progress').length },
  { key: 'needs_fix' as TabKey, label: 'Needs Fix', count: taskRows.value.filter((t) => t.status === 'needs_fix').length },
  { key: 'waiting_review' as TabKey, label: 'Waiting Review', count: taskRows.value.filter((t) => t.status === 'submitted').length },
  { key: 'approved' as TabKey, label: 'Approved', count: taskRows.value.filter((t) => t.status === 'approved').length },
  { key: 'overdue' as TabKey, label: 'Overdue', count: taskRows.value.filter(isOverdue).length }
]);

const filteredTasks = computed(() => taskRows.value.filter((task) => tabFilter(task, activeTab.value)));

onMounted(() => {
  data.fetchAssignments();
  data.fetchPrompts();
  data.fetchProjects();
  data.fetchWebsites();
});
</script>
