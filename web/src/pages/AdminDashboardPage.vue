<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Admin overview of the workspace and review queue.">
      <template #actions>
        <RouterLink to="/websites/new" class="btn-secondary">New Website</RouterLink>
        <RouterLink to="/library" class="btn-primary">New Prompt</RouterLink>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <StatCard label="Total Members" :value="data.totalMembers" :icon="icons.members" />
      <StatCard label="Total Projects" :value="data.totalProjects" :icon="icons.projects" />
      <StatCard label="Total Websites" :value="data.totalWebsites" :icon="icons.websites" />
      <StatCard label="Total Prompts" :value="data.totalPrompts" :icon="icons.prompts" />
      <StatCard label="Pending Reviews" :value="data.pendingReviews" :icon="icons.reviews" />
    </div>

    <!-- Followups — schedule-aware, range-filtered -->
    <div class="mt-5">
      <div class="mb-2.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="section-title">Followups</h3>
          <p class="mt-0.5 text-xs text-text-muted">
            Showing <strong class="text-text-main">{{ currentRange.label }}</strong>
            · {{ currentRange.start === currentRange.end ? currentRange.start : `${currentRange.start} → ${currentRange.end}` }}
          </p>
        </div>
        <div class="flex items-center gap-1.5">
          <label class="text-xs font-semibold text-text-muted" for="dash-range">Range:</label>
          <select
            id="dash-range"
            v-model="timeRange"
            class="rounded-btn border border-border bg-card px-2.5 py-1.5 text-xs font-semibold text-text-main focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option v-for="opt in rangeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="fu in followupSummary"
          :key="fu.key"
          class="card card-hover flex items-center gap-3 px-4 py-3"
        >
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
            :class="fu.summary.pending > 0 ? 'bg-primary/10 text-primary' : 'bg-status-approved-bg text-status-approved-fg'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="fu.icon" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="ui-font text-sm font-semibold text-text-main">{{ fu.label }}</div>
            <div class="mt-0.5 text-xs text-text-muted">
              <span v-if="fu.summary.total === 0" class="font-bold text-text-muted">
                None due
              </span>
              <template v-else>
                <strong class="ui-font text-text-main">{{ fu.summary.done }}/{{ fu.summary.total }}</strong>
                completed
                <span v-if="fu.summary.pending > 0" class="ml-1 font-semibold text-status-needs-fix-fg">
                  · {{ fu.summary.pending }} pending
                </span>
              </template>
            </div>
          </div>
          <RouterLink :to="fu.to" class="btn-secondary h-8 flex-shrink-0 px-3 text-xs">Open</RouterLink>
        </div>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div class="card">
        <div class="border-b border-border px-5 py-3.5">
          <h3 class="section-title">Team Activity</h3>
          <p class="mt-1 text-xs text-text-muted">Simple presence for workflow visibility.</p>
        </div>
        <div class="grid grid-cols-2 gap-3 p-4">
          <div v-for="item in teamActivityStats" :key="item.label" class="rounded-btn bg-soft/50 px-3 py-2">
            <div class="text-xs text-text-muted">{{ item.label }}</div>
            <div class="mt-1 ui-font text-lg font-semibold text-text-main">{{ item.value }}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="border-b border-border px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 class="section-title">Task Alerts Summary</h3>
            <p class="mt-1 text-xs text-text-muted">Targeted notification delivery status.</p>
          </div>
          <RouterLink to="/admin/notifications/task-alerts" class="text-xs text-primary hover:underline">
            Manage
          </RouterLink>
        </div>
        <div class="p-4 flex flex-col gap-2">
          <RouterLink
            v-for="item in taskAlertMetricsList"
            :key="item.label"
            to="/admin/notifications/task-alerts"
            class="flex items-center justify-between rounded-btn bg-soft/40 hover:bg-primary/5 border border-border/40 hover:border-primary/20 px-3 py-1.5 transition-all group"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="w-2 h-2 rounded-full shrink-0" :class="item.dotClass" />
              <span class="text-xs font-semibold text-text-muted group-hover:text-text-main transition-colors truncate">{{ item.label }}</span>
            </div>
            <strong class="ui-font text-xs font-bold text-text-main group-hover:text-primary transition-colors shrink-0">{{ item.value }}</strong>
          </RouterLink>
        </div>
      </div>

      <div class="card">
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 class="section-title">Member activity</h3>
          <RouterLink to="/activity" class="text-sm text-primary hover:underline">Open Activity</RouterLink>
        </div>
        <div v-if="data.activityLogs.length > 0" class="divide-y divide-border">
          <div v-for="log in data.activityLogs.slice(0, 4)" :key="log.id" class="px-5 py-3.5">
            <div class="ui-font text-sm font-medium text-text-main">{{ log.message }}</div>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>{{ memberName(log.userId) }} · {{ new Date(log.createdAt).toLocaleString() }}</span>
              <RouterLink :to="`/profiles/${log.userId}`" class="text-primary hover:underline">
                View Full
              </RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="px-6 py-8 text-center text-sm text-text-muted">No member activity yet.</div>
      </div>
    </div>

    <div
      v-if="combinedError"
      class="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-4 py-3 text-sm text-status-needs-fix-fg"
    >
      <span>{{ combinedError }}</span>
      <button type="button" class="btn-secondary h-8 px-3 text-xs" @click="loadDashboardData">
        Retry
      </button>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 class="section-title">Recently submitted work</h3>
          <RouterLink to="/reviews" class="text-sm text-primary hover:underline">Open Reviews</RouterLink>
        </div>
        <ul v-if="recentSubmissions.length > 0" class="divide-y divide-border">
          <li v-for="submission in recentSubmissions" :key="submission.id" class="px-5 py-3.5">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="ui-font text-sm font-medium text-text-main">{{ promptTitle(submission.assignmentId) }}</div>
                <div class="mt-1 text-xs text-text-muted">
                  {{ memberName(submission.submittedBy) }} · {{ projectName(submission.assignmentId) }} · {{ submission.submittedAt }}
                </div>
              </div>
              <StatusBadge :status="submission.status === 'submitted' ? 'pending_review' : submission.status" />
            </div>
          </li>
        </ul>
        <div v-else class="px-6 py-10 text-center text-sm text-text-muted">
          {{ anyLoading ? 'Loading...' : 'No submissions yet.' }}
        </div>
      </div>

      <div class="card">
        <div class="border-b border-border px-5 py-3.5">
          <h3 class="section-title">Project progress overview</h3>
        </div>
        <div class="space-y-3 p-4">
          <div v-for="item in projectProgress" :key="item.status" class="flex items-center justify-between rounded-btn bg-soft/50 px-3 py-2">
            <StatusBadge :status="item.status" />
            <span class="ui-font text-sm font-semibold text-text-main">{{ item.count }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { RouterLink } from 'vue-router';
import { isToday, presenceStatusFor } from '@/lib/presence';
import { useDataStore, type ProjectStatus } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { useTaskAlertsStore, type TaskAlertMetrics } from '@/stores/taskAlerts';
import { isLeaderboardParticipant, normalizeRole } from '@/lib/roles';

const data = useDataStore();
const followup = useFollowupStore();
const taskAlertStore = useTaskAlertsStore();

const taskAlertMetrics = ref<TaskAlertMetrics>({
  activeAlerts: 0,
  pendingAcknowledgements: 0,
  overdueAcknowledgements: 0,
  qualityCheckAlerts: 0,
  followUpAlerts: 0,
});

const taskAlertMetricsList = computed(() => [
  { label: 'Active Alerts', value: taskAlertMetrics.value.activeAlerts, dotClass: 'bg-primary' },
  { label: 'Pending Acknowledge', value: taskAlertMetrics.value.pendingAcknowledgements, dotClass: 'bg-status-submitted-fg' },
  { label: 'Overdue (24h+)', value: taskAlertMetrics.value.overdueAcknowledgements, dotClass: 'bg-status-needs-fix-fg' },
  { label: 'Quality Check Alerts', value: taskAlertMetrics.value.qualityCheckAlerts, dotClass: 'bg-status-rejected-fg' },
  { label: 'Follow-Up Alerts', value: taskAlertMetrics.value.followUpAlerts, dotClass: 'bg-status-approved-fg' },
]);

const icons = {
  members: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  projects: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  websites: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>',
  prompts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
  reviews: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/></svg>'
};

const anyLoading = computed(() => Object.values(data.loading).some(Boolean));
const combinedError = computed(() => Object.values(data.errors).find(Boolean) ?? null);
const recentSubmissions = computed(() => data.submissions.slice(0, 6));
const isWorker = (m: any) => {
  const r = normalizeRole(m.role);
  return r !== 'viewer' && r !== 'tester' && r !== 'employee';
};
const onlineMembers = computed(() => data.members.filter((m) => isWorker(m) && presenceStatusFor(m) === 'online'));
const awayMembers = computed(() => data.members.filter((m) => isWorker(m) && presenceStatusFor(m) === 'away'));
const offlineMembers = computed(() => data.members.filter((m) => isWorker(m) && presenceStatusFor(m) === 'offline'));
const activeTodayMembers = computed(() =>
  data.members.filter((m) => isWorker(m) && (isToday(m.lastActiveAt) || m.todayActivityCount > 0))
);
const teamActivityStats = computed(() => [
  { label: 'Online', value: onlineMembers.value.length },
  { label: 'Away', value: awayMembers.value.length },
  { label: 'Offline', value: offlineMembers.value.length },
  { label: 'Active Today', value: activeTodayMembers.value.length },
  { label: 'No Activity Today', value: Math.max(data.members.filter(isWorker).length - activeTodayMembers.value.length, 0) }
]);

const assignmentById = (id: string) => data.assignments.find((a) => a.id === id);
const promptTitle = (assignmentId: string) =>
  data.promptById(assignmentById(assignmentId)?.promptId)?.title ?? 'Assigned prompt';
const projectName = (assignmentId: string) =>
  data.projectById(assignmentById(assignmentId)?.projectId)?.name ?? 'No project';
const memberName = (id: string | null) => (id ? data.memberById(id)?.fullName ?? 'Team member' : 'Team member');

// ── Time Range filter ─────────────────────────────────────────────────────────
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Range = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month';
const timeRange = ref<Range>('today');
const rangeOptions: { value: Range; label: string }[] = [
  { value: 'today',      label: 'Today' },
  { value: 'yesterday',  label: 'Yesterday' },
  { value: 'this_week',  label: 'This Week' },
  { value: 'last_week',  label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

const mondayOf = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
};

/** Returns the inclusive [startIso, endIso] for the selected range. */
const dateRangeFor = (range: Range): { start: string; end: string; label: string; mondays: string[] } => {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (range === 'today') {
    const iso = localIso(today);
    return { start: iso, end: iso, label: 'today', mondays: [localIso(mondayOf(today))] };
  }
  if (range === 'yesterday') {
    const y = new Date(today); y.setDate(today.getDate() - 1);
    const iso = localIso(y);
    return { start: iso, end: iso, label: 'yesterday', mondays: [localIso(mondayOf(y))] };
  }
  if (range === 'this_week') {
    const m = mondayOf(today); const s = new Date(m); const e = new Date(m); e.setDate(m.getDate() + 6);
    return { start: localIso(s), end: localIso(e), label: 'this week', mondays: [localIso(m)] };
  }
  if (range === 'last_week') {
    const m = mondayOf(today); m.setDate(m.getDate() - 7);
    const e = new Date(m); e.setDate(m.getDate() + 6);
    return { start: localIso(m), end: localIso(e), label: 'last week', mondays: [localIso(m)] };
  }
  if (range === 'this_month') {
    const s = new Date(today.getFullYear(), today.getMonth(), 1);
    const e = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: localIso(s), end: localIso(e), label: 'this month', mondays: mondaysBetween(s, e) };
  }
  // last_month
  const s = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const e = new Date(today.getFullYear(), today.getMonth(), 0);
  return { start: localIso(s), end: localIso(e), label: 'last month', mondays: mondaysBetween(s, e) };
};

const mondaysBetween = (start: Date, end: Date): string[] => {
  const out: string[] = [];
  const cur = mondayOf(start);
  while (cur <= end) { out.push(localIso(cur)); cur.setDate(cur.getDate() + 7); }
  return out;
};

const currentRange = computed(() => dateRangeFor(timeRange.value));

// ── Followup team summary — schedule-aware, range-filtered ────────────────────
const blogSummary   = computed(() => followup.blogRangeSummary(currentRange.value.start, currentRange.value.end));
const pluginSummary = computed(() => {
  // Plugin/Speed are weekly — sum each Monday in the range so a multi-month
  // range counts each due week once. Single-day ranges resolve to that week.
  const ms = currentRange.value.mondays;
  if (ms.length === 0) return { done: 0, total: 0, pending: 0 };
  if (ms.length === 1) return followup.pluginRangeSummary(ms[0], ms[0]);
  return followup.pluginRangeSummary(ms[0], ms[ms.length - 1]);
});
const speedSummary = computed(() => {
  const ms = currentRange.value.mondays;
  if (ms.length === 0) return { done: 0, total: 0, pending: 0 };
  if (ms.length === 1) return followup.speedRangeSummary(ms[0], ms[0]);
  return followup.speedRangeSummary(ms[0], ms[ms.length - 1]);
});

// eBay: Mon–Sat required days × active leaderboard members, completed = done entries in range.
const ebaySummary = computed(() => {
  const { start, end } = currentRange.value;
  const startD = new Date(start); const endD = new Date(end);
  let workDays = 0;
  for (const cur = new Date(startD); cur <= endD; cur.setDate(cur.getDate() + 1)) {
    if (cur.getDay() !== 0) workDays++; // exclude Sunday
  }
  const memberCount = data.members.filter(
    (m) => m.status === 'active' && isLeaderboardParticipant(m)
  ).length;
  const total = workDays * memberCount;
  const done = followup.ebayEntries
    .filter((e) => e.status === 'done' && e.date >= start && e.date <= end)
    .length;
  return { done, total, pending: Math.max(0, total - done) };
});

const followupSummary = computed(() => [
  {
    key: 'blog',
    label: 'Blog Followup',
    summary: blogSummary.value,
    to: '/followup/blog',
    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  },
  {
    key: 'plugin',
    label: 'Plugin Update',
    summary: pluginSummary.value,
    to: '/followup/plugins',
    icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
  },
  {
    key: 'ebay',
    label: 'eBay Click Followup',
    summary: ebaySummary.value,
    to: '/followup/ebay-click',
    icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
  },
  {
    key: 'speed',
    label: 'Website Optimization',
    summary: speedSummary.value,
    to: '/followup/speed-optimization',
    icon: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
  }
]);

const statusOrder: ProjectStatus[] = ['not_started', 'in_progress', 'review', 'approved', 'completed'];
const projectProgress = computed(() =>
  statusOrder.map((status) => ({
    status,
    count: data.projects.filter((p) => p.status === status).length
  }))
);

const loadDashboardData = async () => {
  await data.fetchDashboardSummary();
  // Also fetch activity logs for the sidebar
  await data.fetchActivityLogs();
  // Followup team summary — non-blocking, silent on error
  try {
    await Promise.all([
      followup.fetchBlogSlots(),
      followup.fetchPluginSlots(),
      followup.fetchEbayEntries(),
      followup.fetchSpeedSlots()
    ]);
  } catch {
    // dashboard should not block on followup errors
  }
  
  // Task Alerts metrics load
  try {
    taskAlertMetrics.value = await taskAlertStore.fetchDashboardMetrics();
  } catch (err) {
    console.error('[dashboard] taskAlerts metrics failed', err);
  }
};

onMounted(() => {
  void loadDashboardData();
});
</script>
