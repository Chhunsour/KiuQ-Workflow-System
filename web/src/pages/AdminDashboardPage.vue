<template>
  <div>
    <PageHeader title="Dashboard" subtitle="Admin overview of the workspace and review queue.">
      <template #actions>
        <RouterLink to="/websites/new" class="btn-secondary">New Website</RouterLink>
        <RouterLink to="/library" class="btn-primary">New Prompt</RouterLink>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 gap-3 lg:grid-cols-6">
      <StatCard label="Total Members" :value="data.totalMembers" :icon="icons.members" />
      <StatCard label="Total Projects" :value="data.totalProjects" :icon="icons.projects" />
      <StatCard label="Total Websites" :value="data.totalWebsites" :icon="icons.websites" />
      <StatCard label="Total Prompts" :value="data.totalPrompts" :icon="icons.prompts" />
      <StatCard label="Pending Reviews" :value="data.pendingReviews" :icon="icons.reviews" />
      <StatCard label="Open Blockers" :value="openBlockers.length" :icon="icons.blockers" />
    </div>

    <!-- Today's Followups — team summary -->
    <div class="mt-5">
      <h3 class="section-title mb-2.5">Today's Followups</h3>
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          v-for="fu in followupSummary"
          :key="fu.key"
          class="card card-hover flex items-center gap-3 px-4 py-3"
        >
          <div
            class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-btn"
            :class="fu.pending > 0 ? 'bg-primary/10 text-primary' : 'bg-status-approved-bg text-status-approved-fg'"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" v-html="fu.icon" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="ui-font text-sm font-semibold text-text-main">{{ fu.label }}</div>
            <div class="mt-0.5 text-xs text-text-muted">
              <span :class="fu.pending > 0 ? 'font-bold text-status-needs-fix-fg' : 'font-bold text-status-approved-fg'">
                {{ fu.pending }}
              </span>
              pending
            </div>
          </div>
          <RouterLink :to="fu.to" class="btn-secondary h-8 flex-shrink-0 px-3 text-xs">Open</RouterLink>
        </div>
      </div>
    </div>

    <div class="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-3">
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
        <div class="flex items-center justify-between border-b border-border px-5 py-3.5">
          <h3 class="section-title">Team blockers</h3>
          <RouterLink to="/team-blockers" class="text-sm text-primary hover:underline">View all</RouterLink>
        </div>
        <div v-if="openBlockers.length > 0" class="divide-y divide-border">
          <div v-for="blocker in openBlockers.slice(0, 4)" :key="blocker.id" class="px-5 py-3.5">
            <div class="ui-font text-sm font-medium text-text-main">{{ blocker.reason || 'Blocker' }}</div>
            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-muted">
              <span>{{ memberName(blocker.memberId) }} · {{ blocker.createdAt }}</span>
              <RouterLink v-if="blocker.memberId" :to="`/profiles/${blocker.memberId}`" class="text-primary hover:underline">
                View Full
              </RouterLink>
            </div>
          </div>
        </div>
        <div v-else class="px-6 py-8 text-center text-sm text-text-muted">No open blockers.</div>
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
import { computed, onMounted } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import { RouterLink } from 'vue-router';
import { isToday, presenceStatusFor } from '@/lib/presence';
import { useDataStore, type ProjectStatus } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { isLeaderboardParticipant } from '@/lib/roles';

const data = useDataStore();
const followup = useFollowupStore();

const icons = {
  members: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  projects: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  websites: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>',
  prompts: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z"/></svg>',
  reviews: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/></svg>',
  blockers: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
};

const anyLoading = computed(() => Object.values(data.loading).some(Boolean));
const combinedError = computed(() => Object.values(data.errors).find(Boolean) ?? null);
const recentSubmissions = computed(() => data.submissions.slice(0, 6));
const openBlockers = computed(() => data.blockers.filter((b) => b.status === 'open'));
const onlineMembers = computed(() => data.members.filter((m) => presenceStatusFor(m) === 'online'));
const awayMembers = computed(() => data.members.filter((m) => presenceStatusFor(m) === 'away'));
const offlineMembers = computed(() => data.members.filter((m) => presenceStatusFor(m) === 'offline'));
const activeTodayMembers = computed(() =>
  data.members.filter((m) => isToday(m.lastActiveAt) || m.todayActivityCount > 0)
);
const teamActivityStats = computed(() => [
  { label: 'Online', value: onlineMembers.value.length },
  { label: 'Away', value: awayMembers.value.length },
  { label: 'Offline', value: offlineMembers.value.length },
  { label: 'Active Today', value: activeTodayMembers.value.length },
  { label: 'No Activity Today', value: Math.max(data.members.length - activeTodayMembers.value.length, 0) }
]);

const assignmentById = (id: string) => data.assignments.find((a) => a.id === id);
const promptTitle = (assignmentId: string) =>
  data.promptById(assignmentById(assignmentId)?.promptId)?.title ?? 'Assigned prompt';
const projectName = (assignmentId: string) =>
  data.projectById(assignmentById(assignmentId)?.projectId)?.name ?? 'No project';
const memberName = (id: string | null) => (id ? data.memberById(id)?.fullName ?? 'Team member' : 'Team member');

// ── Followup team summary ─────────────────────────────────────────────────────
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayStr = localIso(new Date());
const todayDow = new Date().getDay(); // 0=Sun

const blogPending = computed(() => followup.blogPendingCount());
const pluginPending = computed(() => followup.pluginPendingCount());
const speedPending = computed(() => followup.speedPendingCount());

// eBay pending = active members who haven't marked done today (Mon–Sat only)
const ebayPending = computed(() => {
  if (todayDow === 0) return 0; // Sunday = no work day
  const members = data.members.filter(
    (m) => m.status === 'active' && isLeaderboardParticipant(m)
  );
  const doneToday = new Set(
    followup.ebayEntries
      .filter((e) => e.date === todayStr && e.status === 'done')
      .map((e) => e.userId)
  );
  return members.filter((m) => !doneToday.has(m.id)).length;
});

const followupSummary = computed(() => [
  {
    key: 'blog',
    label: 'Blog Followup',
    pending: blogPending.value,
    to: '/followup/blog',
    icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/>'
  },
  {
    key: 'plugin',
    label: 'Plugin Update',
    pending: pluginPending.value,
    to: '/followup/plugins',
    icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'
  },
  {
    key: 'ebay',
    label: 'eBay Click Followup',
    pending: ebayPending.value,
    to: '/followup/ebay-click',
    icon: '<polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>'
  },
  {
    key: 'speed',
    label: 'Website Optimization',
    pending: speedPending.value,
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
};

onMounted(() => {
  void loadDashboardData();
});
</script>
