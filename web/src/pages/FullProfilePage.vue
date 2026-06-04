<template>
  <div class="fp-page">
    <PageHeader title="Full Profile" subtitle="Team member profile, work status, and recent activity." />

    <div v-if="loadingPage" class="fp-skeleton">
      <section class="fp-hero fp-hero-loading">
        <div class="fp-avatar-skeleton"></div>
        <div class="fp-skeleton-main">
          <div class="fp-skeleton-line fp-skeleton-name"></div>
          <div class="fp-skeleton-line"></div>
          <div class="fp-skeleton-line fp-skeleton-short"></div>
        </div>
        <div class="fp-status-grid">
          <div v-for="item in 3" :key="item" class="fp-status-card fp-skeleton-card"></div>
        </div>
      </section>
      <section class="fp-stats-grid">
        <div v-for="item in 8" :key="item" class="fp-stat-card">
          <div class="fp-skeleton-line fp-skeleton-short"></div>
          <div class="fp-skeleton-line fp-skeleton-number"></div>
        </div>
      </section>
    </div>

    <div v-else-if="profileError" class="fp-error">
      <div class="fp-error-title">Could not load profile. Please try again.</div>
      <p>{{ profileError }}</p>
      <button class="btn-primary" type="button" @click="loadPageData">Retry</button>
    </div>

    <template v-else>
      <div v-if="!profile" class="fp-empty-card">
        <h3>Profile not found</h3>
        <p>This profile does not exist or you do not have permission to view it.</p>
      </div>

      <div v-else class="fp-stack">
        <section class="fp-hero">
          <div class="fp-hero-actions">
            <button class="btn-secondary" type="button" @click="router.back()">Back</button>
            <RouterLink
              v-if="canEditProfile"
              class="btn-primary"
              :to="`/members/${profile.id}/profile`"
            >
              Edit Profile
            </RouterLink>
          </div>

          <div class="fp-profile-block">
            <div class="fp-avatar">
              <img
                v-if="profile.avatarUrl"
                :src="profile.avatarUrl"
                :alt="`${displayName} avatar`"
              />
              <span v-else>{{ initials(displayName) }}</span>
            </div>

            <div class="fp-identity">
              <div class="fp-brand">KiuQ Website System</div>
              <h1>{{ displayName }}</h1>
              <div class="fp-meta-line">
                <span v-if="profile.username" class="fp-username">@{{ profile.username }}</span>
                <span>{{ emailText }}</span>
              </div>
              <div class="fp-meta-line">
                <span>{{ profile.position || 'No position set' }}</span>
                <span v-if="profile.phone">{{ profile.phone }}</span>
              </div>
              <div class="fp-badges">
                <span class="fp-role-badge" :class="roleBadgeClass(profile.role)">{{ roleLabel(profile.role) }}</span>
                <StatusBadge :status="profile.status" />

              </div>
            </div>
          </div>


        </section>

        <template v-if="publicOnly">
          <section class="fp-stats-grid">
            <ProfileStatCard label="Leaderboard Points" :value="publicRankRow?.totalPoints ?? 0" :icon="icons.rank" />
            <ProfileStatCard label="Team Rank" :value="publicRankLabel" :icon="icons.rank" />
            <ProfileStatCard label="Completed Tasks" :value="publicRankRow?.tasksCompleted ?? 0" :icon="icons.completed" />
            <ProfileStatCard label="Current Streak" :value="`${publicRankRow?.currentStreak ?? 0} days`" :icon="icons.activity" />
          </section>

          <section class="fp-panel">
            <div class="fp-panel-head">
              <h2>Public Activity Summary</h2>
              <p>Private submissions, notes, resources, and admin feedback are hidden.</p>
            </div>
            <div class="fp-mini-grid">
              <MiniInfo label="Prompts copied" :value="publicRankRow?.promptsCopied ?? 0" />
              <MiniInfo label="Approved work" :value="publicRankRow?.approvedSubmissions ?? 0" />
              <MiniInfo label="Resources created" :value="publicRankRow?.resourcesCreated ?? 0" />
            </div>
          </section>

          <section class="fp-panel">
            <div class="fp-panel-head">
              <h2>Badges</h2>
            </div>
            <BadgeGrid :badges="earnedBadges" empty-text="No public badges earned yet." />
          </section>
        </template>

        <template v-else>
          <section class="fp-stats-grid">
            <ProfileStatCard
              v-for="stat in summaryCards"
              :key="stat.label"
              :label="stat.label"
              :value="stat.value"
              :icon="stat.icon"
              :tone="stat.tone"
            />
          </section>

          <section class="fp-tabs-shell">
            <div class="fp-tabs" role="tablist" aria-label="Profile sections">
              <button
                v-for="tab in tabs"
                :key="tab.key"
                class="fp-tab"
                :class="{ 'fp-tab-active': activeTab === tab.key }"
                type="button"
                @click="activeTab = tab.key"
              >
                {{ tab.label }}
              </button>
            </div>

            <div class="fp-tab-body">
              <section v-if="activeTab === 'overview'" class="fp-overview-grid">
                <InfoPanel title="Basic Information">
                  <InfoRow label="Full name" :value="profile.fullName || '-'" />
                  <InfoRow label="Username" :value="profile.username ? `@${profile.username}` : '-'" />
                  <InfoRow label="Email" :value="emailText" />
                  <InfoRow label="Role" :value="roleLabel(profile.role)" />
                  <InfoRow label="Status" :value="profile.status" />

                  <InfoRow label="Position" :value="profile.position || '-'" />
                  <InfoRow label="Phone" :value="profile.phone || '-'" />
                  <InfoRow label="Bio" :value="profile.bio || '-'" />
                  <InfoRow v-if="auth.isAdmin" label="Notes" :value="profile.notes || '-'" />
                </InfoPanel>

                <InfoPanel title="Work Summary">
                  <InfoRow label="Total tasks" :value="workSummary.totalTasks" />
                  <InfoRow label="In progress" :value="workSummary.inProgressTasks" />
                  <InfoRow label="Waiting review" :value="workSummary.waitingReviewTasks" />
                  <InfoRow label="Needs fix" :value="workSummary.tasksNeedingFix" />
                  <InfoRow label="Completed" :value="workSummary.completedTasks" />
                  <InfoRow label="Websites" :value="memberWebsites.length" />
                  <InfoRow label="Monthly reports" :value="memberReports.length" />
                </InfoPanel>



                <InfoPanel title="Assigned Websites">
                  <CompactWebsiteList v-if="memberWebsites.length > 0" :websites="memberWebsites.slice(0, 4)" />
                  <EmptyLine v-else text="No websites assigned yet." />
                </InfoPanel>

                <InfoPanel title="Latest Tasks">
                  <div v-if="recentTasks.length > 0" class="fp-compact-list">
                    <div v-for="task in recentTasks.slice(0, 4)" :key="task.id" class="fp-compact-row">
                      <div>
                        <strong>{{ task.title }}</strong>
                        <span>{{ task.website }} · Due {{ task.dueDate || 'no date' }}</span>
                      </div>
                      <StatusBadge :status="task.status" />
                    </div>
                  </div>
                  <EmptyLine v-else text="No tasks assigned yet." />
                </InfoPanel>

                <InfoPanel title="Latest Feedback">
                  <div v-if="latestFeedback.length > 0" class="fp-compact-list">
                    <div v-for="item in latestFeedback" :key="item.submission.id" class="fp-feedback-row">
                      <strong>{{ item.title }}</strong>
                      <p>{{ item.feedback }}</p>
                    </div>
                  </div>
                  <EmptyLine v-else text="No recent feedback yet." />
                </InfoPanel>
              </section>

              <section v-else-if="activeTab === 'tasks'" class="fp-list-section">
                <EmptyLine v-if="recentTasks.length === 0" text="No tasks assigned yet." />
                <div v-for="task in recentTasks" v-else :key="task.id" class="fp-task-row">
                  <div class="fp-task-main">
                    <strong>{{ task.title }}</strong>
                    <span>{{ task.website }} · {{ task.page }}</span>
                  </div>
                  <div class="fp-task-meta">
                    <StatusBadge :status="task.status" />
                    <span>Due {{ task.dueDate || 'no date' }}</span>
                    <span>{{ task.boardMonth }}</span>
                    <RouterLink :to="task.link" class="btn-secondary h-8 px-3 text-xs">Open Task</RouterLink>
                  </div>
                </div>
              </section>

              <section v-else-if="activeTab === 'websites'" class="fp-website-grid">
                <EmptyLine v-if="memberWebsites.length === 0" text="No websites created or assigned yet." />
                <article v-for="website in memberWebsites" v-else :key="website.id" class="fp-website-card">
                  <div class="fp-website-icon">
                    <img v-if="website.faviconUrl" :src="website.faviconUrl" :alt="`${website.name} favicon`" />
                    <span v-else>{{ initials(website.name) }}</span>
                  </div>
                  <div class="fp-website-main">
                    <h3>{{ website.name }}</h3>
                    <p>{{ website.domain || 'No domain' }}</p>
                    <span>{{ website.websiteType || 'Website' }}</span>
                  </div>
                  <div class="fp-website-actions">
                    <a
                      v-if="website.domain"
                      class="btn-secondary h-8 px-3 text-xs"
                      :href="websiteUrl(website.domain)"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Website
                    </a>
                    <RouterLink class="btn-primary h-8 px-3 text-xs" :to="`/websites/${website.id}/edit`">
                      View Details
                    </RouterLink>
                  </div>
                </article>
              </section>

              <section v-else-if="activeTab === 'submissions'" class="fp-list-section">
                <EmptyLine v-if="recentSubmissions.length === 0" text="No submissions yet." />
                <div v-for="item in recentSubmissions" v-else :key="item.submission.id" class="fp-task-row">
                  <div class="fp-task-main">
                    <strong>{{ item.title }}</strong>
                    <span>Submitted {{ item.submission.submittedAt }}</span>
                    <p v-if="item.feedback">{{ item.feedback }}</p>
                  </div>
                  <div class="fp-task-meta">
                    <StatusBadge :status="item.submission.status" />
                    <RouterLink :to="submissionLink" class="btn-secondary h-8 px-3 text-xs">View Submission</RouterLink>
                  </div>
                </div>
              </section>



              <section v-else-if="activeTab === 'reports'" class="fp-report-grid">
                <EmptyLine v-if="memberReports.length === 0" text="No monthly reports submitted yet." />
                <article v-for="report in memberReports" v-else :key="report.id" class="fp-report-card">
                  <div class="fp-report-head">
                    <strong>{{ report.month }}</strong>
                    <StatusBadge :status="report.status" />
                  </div>
                  <InfoText label="Completed" :value="report.completedSummary" />
                  <InfoText label="Struggles" :value="report.struggles" />
                  <InfoText label="Help needed" :value="report.helpNeeded" />
                  <InfoText label="Next month plan" :value="report.nextMonthPlan" />
                </article>
              </section>

              <section v-else-if="activeTab === 'resources'" class="fp-list-section">
                <EmptyLine v-if="createdResourceItems.length === 0" text="No resources created yet." />
                <div v-for="resource in createdResourceItems" v-else :key="resource.id" class="fp-task-row">
                  <div class="fp-task-main">
                    <strong>{{ resource.title }}</strong>
                    <span>{{ resource.type }} · {{ resource.folder }} · Created {{ resource.createdAt || '-' }}</span>
                    <p v-if="resource.description">{{ resource.description }}</p>
                  </div>
                  <div class="fp-task-meta">
                    <span>{{ resource.visibility }}</span>
                    <StatusBadge :status="resource.status" />
                  </div>
                </div>
              </section>

              <section v-else-if="activeTab === 'blockers'" class="fp-list-section">
                <EmptyLine v-if="memberBlockers.length === 0" text="No blockers reported yet." />
                <div v-for="blocker in memberBlockers" v-else :key="blocker.id" class="fp-task-row">
                  <div class="fp-task-main">
                    <strong>{{ blocker.reason || 'Blocker' }}</strong>
                    <span>{{ blocker.helpNeeded || 'No help note.' }}</span>
                    <p v-if="blocker.adminResponse">Admin response: {{ blocker.adminResponse }}</p>
                  </div>
                  <div class="fp-task-meta">
                    <span>{{ blocker.urgency }}</span>
                    <StatusBadge :status="blocker.status" />
                  </div>
                </div>
              </section>
            </div>
          </section>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch, type PropType } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';

import StatusBadge, { type Status } from '@/components/ui/StatusBadge.vue';
import { relativeTime } from '@/lib/presence';
import { isLeaderboardParticipant, roleBadgeClass, roleLabel } from '@/lib/roles';
import {
  badgesForRow,
  buildLeaderboardRows,
  formatActiveTime,
  rerankLeaderboardRows,
  type BadgeProgress,
  type LeaderboardPeriod,
  type LeaderboardRow
} from '@/lib/leaderboard';
import { useAuthStore } from '@/stores/auth';
import {
  useDataStore,
  type ActivityAction,
  type ActivityLog,
  type Member,
  type ResourceStatus,
  type Website
} from '@/stores/data';

type TabKey = 'overview' | 'tasks' | 'websites' | 'submissions' | 'reports' | 'resources' | 'blockers';
type TaskView = {
  id: string;
  title: string;
  website: string;
  page: string;
  status: Status;
  priority: string;
  dueDate: string;
  updatedAt: string;
  boardMonth: string;
  link: string;
};
type ResourceView = {
  id: string;
  title: string;
  type: string;
  description: string;
  folder: string;
  visibility: string;
  status: ResourceStatus;
  createdAt: string;
};

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const data = useDataStore();
const activeTab = ref<TabKey>('overview');
const loadingPage = ref(false);
const profileError = ref<string | null>(null);
const profileLoadTimeoutMs = 12_000;

const icons = {
  tasks: '<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  progress: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 8-8v8l5.66 5.66A8 8 0 0 1 4 12Z"/><path d="M12 4a8 8 0 0 1 8 8"/></svg>',
  review: '<svg viewBox="0 0 24 24"><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/></svg>',
  fix: '<svg viewBox="0 0 24 24"><path d="m14.7 6.3 3 3M3 21l6.5-1.5L20 9a3.5 3.5 0 0 0-5-5L4.5 14.5 3 21Z"/></svg>',
  completed: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  websites: '<svg viewBox="0 0 24 24"><path d="M3 5h18v14H3z"/><path d="M3 9h18"/><path d="M8 15h3"/></svg>',
  reports: '<svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5"/><path d="M10 13h6M10 17h6"/></svg>',
  activity: '<svg viewBox="0 0 24 24"><path d="M3 12h4l3 8 4-16 3 8h4"/></svg>',
  rank: '<svg viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/></svg>'
};

const userId = computed(() => String(route.params.userId || ''));
const profile = computed<Member | undefined>(() => data.memberById(userId.value));
const isOwnProfile = computed(() => userId.value === auth.user?.id);
const canViewFull = computed(() => auth.isAdmin || isOwnProfile.value);
const publicOnly = computed(() => !!profile.value && !canViewFull.value);
const canEditProfile = computed(() => !!profile.value && (auth.isAdmin || isOwnProfile.value));
const displayName = computed(() => profile.value?.fullName || profile.value?.email || 'User');
const emailText = computed(() => (canViewFull.value ? profile.value?.email || '-' : 'Email hidden'));

const tabs: { key: TabKey; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'websites', label: 'Websites' },
  { key: 'submissions', label: 'Submissions' },

  { key: 'reports', label: 'Reports' },
  { key: 'resources', label: 'Resources' },
  { key: 'blockers', label: 'Blockers' }
];

const buildRowsFor = (period: LeaderboardPeriod) =>
  buildLeaderboardRows({
    members: data.members,
    activityLogs: data.activityLogs,
    assignments: data.assignments,
    submissions: data.submissions,
    resources: data.resources,
    docsFiles: data.docsFiles,
    monthlyReports: data.monthlyReports,
    blockers: data.blockers,
    period
  });
const rowFor = (period: LeaderboardPeriod) => buildRowsFor(period).find((row) => row.userId === userId.value);
const todayRow = computed(() => rowFor('today'));
const weekRow = computed(() => rowFor('week'));
const monthRow = computed(() => rowFor('month'));
const allTimeRows = computed(() =>
  rerankLeaderboardRows(buildRowsFor('all').filter((row) => row.member && isLeaderboardParticipant(row.member)))
);
const leaderboardRow = computed(() => allTimeRows.value.find((row) => row.userId === userId.value));
const publicRankRow = computed(() => leaderboardRow.value);
const publicRankLabel = computed(() => (publicRankRow.value ? `#${publicRankRow.value.rank}` : 'Unranked'));
const earnedBadges = computed(() => badgesForRow(leaderboardRow.value).filter((badge) => badge.earned));

const memberAssignments = computed(() => data.assignments.filter((a) => a.assignedMemberId === userId.value));
const memberSectionTasks = computed(() => data.sectionTasks.filter((t) => t.assignedMemberId === userId.value));
const memberSubmissions = computed(() => data.submissions.filter((s) => s.submittedBy === userId.value));
const memberReports = computed(() =>
  data.monthlyReports.filter((report) => report.memberId === userId.value).slice(0, 8)
);
const memberBlockers = computed(() =>
  data.blockers.filter((blocker) => blocker.memberId === userId.value).slice(0, 10)
);
const recentActivity = computed(() =>
  data.activityLogs.filter((log) => log.userId === userId.value).slice(0, 12)
);

const isTaskOpen = (status: string) => !['approved', 'completed', 'rejected'].includes(status);
const isOverdueDate = (date: string) => !!date && new Date(date).getTime() < new Date().setHours(0, 0, 0, 0);
const assignmentDueDate = (projectId: string | null, dueDate: string) =>
  dueDate || data.projectById(projectId)?.deadline || '';

const workSummary = computed(() => {
  const assignedTasks = memberAssignments.value.length + memberSectionTasks.value.length;
  const inProgressTasks =
    memberAssignments.value.filter((a) => a.status === 'in_progress').length +
    memberSectionTasks.value.filter((t) => t.status === 'in_progress').length;
  const waitingReviewTasks =
    memberAssignments.value.filter((a) => a.status === 'submitted').length +
    memberSubmissions.value.filter((s) => s.status === 'submitted').length;
  const completedTasks =
    memberAssignments.value.filter((a) => a.status === 'approved').length +
    memberSectionTasks.value.filter((t) => ['approved', 'completed'].includes(t.status)).length;
  const pendingTasks =
    memberAssignments.value.filter((a) => ['pending', 'in_progress', 'submitted'].includes(a.status)).length +
    memberSectionTasks.value.filter((t) => isTaskOpen(t.status)).length;
  const tasksNeedingFix =
    memberAssignments.value.filter((a) => ['needs_fix', 'needs_resubmission'].includes(a.status)).length +
    memberSubmissions.value.filter((s) => s.status === 'needs_fix').length;
  const overdueTasks =
    memberAssignments.value.filter((a) => isTaskOpen(a.status) && isOverdueDate(assignmentDueDate(a.projectId, a.dueDate))).length +
    memberSectionTasks.value.filter((t) => isTaskOpen(t.status) && isOverdueDate(t.dueDate || t.deadline)).length;

  return {
    totalTasks: assignedTasks,
    inProgressTasks,
    waitingReviewTasks,
    completedTasks,
    pendingTasks,
    tasksNeedingFix,
    overdueTasks,
    approvedSubmissions: memberSubmissions.value.filter((s) => s.status === 'approved').length,
    rejectedSubmissions: memberSubmissions.value.filter((s) => s.status === 'rejected').length,
    pendingReviewSubmissions: memberSubmissions.value.filter((s) => s.status === 'submitted').length
  };
});

const assignedProjectIds = computed(() => {
  const ids = new Set<string>();
  data.projects.forEach((project) => {
    if (project.assignedMemberIds.includes(userId.value)) ids.add(project.id);
  });
  memberAssignments.value.forEach((assignment) => {
    if (assignment.projectId) ids.add(assignment.projectId);
  });
  memberSectionTasks.value.forEach((task) => {
    if (task.projectId) ids.add(task.projectId);
  });
  return ids;
});
const assignedProjects = computed(() =>
  data.projects.filter((project) => assignedProjectIds.value.has(project.id)).slice(0, 8)
);
const memberWebsites = computed(() => {
  const ids = new Set<string>();
  data.websites.forEach((website) => {
    if (website.createdBy === userId.value) ids.add(website.id);
  });
  assignedProjects.value.forEach((project) => {
    if (project.websiteId) ids.add(project.websiteId);
  });
  memberAssignments.value.forEach((assignment) => {
    if (assignment.websiteId) ids.add(assignment.websiteId);
  });
  return data.websites.filter((website) => ids.has(website.id));
});



const summaryCards = computed(() => [
  { label: 'Total Tasks', value: workSummary.value.totalTasks, icon: icons.tasks },
  { label: 'In Progress', value: workSummary.value.inProgressTasks, icon: icons.progress, tone: 'blue' },
  { label: 'Waiting Review', value: workSummary.value.waitingReviewTasks, icon: icons.review, tone: 'amber' },
  { label: 'Needs Fix', value: workSummary.value.tasksNeedingFix, icon: icons.fix, tone: 'red' },
  { label: 'Completed Tasks', value: workSummary.value.completedTasks, icon: icons.completed, tone: 'green' },
  { label: 'Websites', value: memberWebsites.value.length, icon: icons.websites },
  { label: 'Monthly Reports', value: memberReports.value.length, icon: icons.reports }
]);

const promptTitle = (id: string | null | undefined) => (id ? data.promptById(id)?.title ?? 'Assigned prompt' : 'Assigned task');
const websiteName = (id: string | null | undefined) => (id ? data.websiteById(id)?.name ?? 'No website' : 'No website');
const projectName = (id: string | null | undefined) => (id ? data.projectById(id)?.name ?? 'No project' : 'No project');
const assignmentWebsiteName = (assignment: { websiteId?: string | null; projectId?: string | null }) =>
  websiteName(assignment.websiteId || data.projectById(assignment.projectId || null)?.websiteId);
const assignmentLink = (id: string) => (isOwnProfile.value ? `/prompt-builder/${id}` : '/projects');
const boardMonth = (date: string) => (date ? new Date(date).toLocaleString(undefined, { month: 'short', year: 'numeric' }) : 'No board month');

const recentTasks = computed<TaskView[]>(() => {
  const assignmentTasks: TaskView[] = memberAssignments.value.map((assignment) => ({
    id: `assignment-${assignment.id}`,
    title: promptTitle(assignment.promptId),
    website: assignmentWebsiteName(assignment),
    page: projectName(assignment.projectId),
    status: assignment.status === 'pending' ? 'assigned' : assignment.status,
    priority: assignment.priority,
    dueDate: assignmentDueDate(assignment.projectId, assignment.dueDate),
    updatedAt: assignment.updatedAt || assignment.assignedAt,
    boardMonth: boardMonth(assignment.dueDate || assignment.assignedAt),
    link: assignmentLink(assignment.id)
  }));
  const sectionTasks: TaskView[] = memberSectionTasks.value.map((task) => ({
    id: `section-${task.id}`,
    title: task.name,
    website: projectName(task.projectId),
    page: task.pageTitle || 'Section task',
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate || task.deadline,
    updatedAt: task.updatedAt,
    boardMonth: boardMonth(task.dueDate || task.updatedAt),
    link: isOwnProfile.value ? '/my-tasks' : '/projects'
  }));
  return [...assignmentTasks, ...sectionTasks]
    .sort((a, b) => (b.updatedAt > a.updatedAt ? 1 : -1))
    .slice(0, 12);
});

const recentSubmissions = computed(() =>
  memberSubmissions.value.slice(0, 10).map((submission) => {
    const assignment = data.assignments.find((a) => a.id === submission.assignmentId);
    const feedback = data.reviewComments.find((comment) => comment.submissionId === submission.id)?.body ?? '';
    return {
      submission,
      title: promptTitle(assignment?.promptId),
      feedback: canViewFull.value ? feedback : ''
    };
  })
);
const latestFeedback = computed(() => recentSubmissions.value.filter((item) => item.feedback).slice(0, 3));
const submissionLink = computed(() => (auth.isAdmin ? '/reviews' : '/my-submissions'));

const createdResourceItems = computed<ResourceView[]>(() => {
  const resources = data.resources
    .filter((resource) => resource.createdBy === userId.value)
    .map((resource) => ({
      id: `resource-${resource.id}`,
      title: resource.title || resource.fileName || 'Resource',
      type: resource.type.replace('_', ' '),
      description: resource.description,
      folder: data.folderById(resource.folderId)?.name ?? 'No folder',
      visibility: resource.visibility.replace('_', ' '),
      status: resource.status,
      createdAt: resource.createdAt
    }));
  const docsFiles = data.docsFiles
    .filter((file) => file.createdBy === userId.value)
    .map((file) => ({
      id: `docs-file-${file.id}`,
      title: file.title,
      type: file.type.replace('_', ' '),
      description: file.description,
      folder: data.docsFolders.find((folder) => folder.id === file.folderId)?.name ?? 'No docs folder',
      visibility: 'docs',
      status: 'published' as ResourceStatus,
      createdAt: file.createdAt
    }));
  return [...resources, ...docsFiles].slice(0, 12);
});

const initials = (name: string) =>
  (name || '?')
    .split(/[\s@.]+/)
    .map((part) => part[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
const actionLabel = (action: ActivityAction) =>
  action
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
const websiteUrl = (domain: string) => (/^https?:\/\//i.test(domain) ? domain : `https://${domain}`);
const relatedLabel = (log: ActivityLog) => {
  if (!log.relatedId) return 'Profile activity';
  if (log.relatedType === 'assignment') return promptTitle(data.assignments.find((item) => item.id === log.relatedId)?.promptId);
  if (log.relatedType === 'resource') return data.resources.find((item) => item.id === log.relatedId)?.title ?? 'Resource';
  if (log.relatedType === 'prompt') return promptTitle(log.relatedId);
  return log.relatedType.replace('_', ' ');
};

const withProfileTimeout = async <T,>(promise: Promise<T>): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Profile request timed out.')), profileLoadTimeoutMs);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
};

const loadPageData = async () => {
  if (!userId.value) {
    profileError.value = 'Missing profile id.';
    return;
  }

  loadingPage.value = true;
  profileError.value = null;
  try {
    const member = await withProfileTimeout(data.fetchMemberProfile(userId.value));
    if (!member) {
      profileError.value = 'This profile does not exist or you do not have permission to view it.';
      return;
    }

    const loaders = canViewFull.value
      ? [
          data.fetchActivityLogs(true),
          data.fetchProjects(true),
          data.fetchWebsites(true),
          data.fetchPrompts(true),
          data.fetchPromptReplacements(),
          data.fetchAssignments(true),
          data.fetchSectionTasks(true),
          data.fetchSubmissions(true),
          data.fetchReviewComments(),
          data.fetchMonthlyReports(),
          data.fetchBlockers(true),
          data.fetchResources(true),
          data.fetchFolders(true),
          data.fetchDocs(true),
          data.fetchDocsFolders(),
          data.fetchDocsFiles()
        ]
      : [data.fetchActivityLogs(true)];

    await withProfileTimeout(Promise.allSettled(loaders));
  } catch (error) {
    console.error('[FullProfilePage] load failed', error);
    profileError.value = 'Could not load profile. Please try again.';
  } finally {
    loadingPage.value = false;
  }
};

watch(userId, () => {
  activeTab.value = 'overview';
  void loadPageData();
});

onMounted(() => {
  void loadPageData();
});

const MiniInfo = defineComponent({
  name: 'MiniInfo',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number] as PropType<string | number>, required: true }
  },
  setup(props) {
    return () =>
      h('div', { class: 'fp-mini-info' }, [
        h('span', props.label),
        h('strong', String(props.value))
      ]);
  }
});

const ProfileStatCard = defineComponent({
  name: 'ProfileStatCard',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number] as PropType<string | number>, required: true },
    icon: { type: String, required: true },
    tone: { type: String, default: 'neutral' }
  },
  setup(props) {
    return () =>
      h('article', { class: ['fp-stat-card', `fp-stat-${props.tone}`] }, [
        h('div', { class: 'fp-stat-icon', innerHTML: props.icon }),
        h('div', { class: 'fp-stat-body' }, [
          h('strong', String(props.value)),
          h('span', props.label)
        ])
      ]);
  }
});

const InfoPanel = defineComponent({
  name: 'InfoPanel',
  props: { title: { type: String, required: true } },
  setup(props, { slots }) {
    return () =>
      h('section', { class: 'fp-panel' }, [
        h('div', { class: 'fp-panel-head' }, [h('h2', props.title)]),
        h('div', { class: 'fp-panel-body' }, slots.default?.())
      ]);
  }
});

const InfoRow = defineComponent({
  name: 'InfoRow',
  props: {
    label: { type: String, required: true },
    value: { type: [String, Number] as PropType<string | number>, required: true }
  },
  setup(props) {
    return () =>
      h('div', { class: 'fp-info-row' }, [
        h('span', props.label),
        h('strong', String(props.value || '-'))
      ]);
  }
});

const InfoText = defineComponent({
  name: 'InfoText',
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true }
  },
  setup(props) {
    return () =>
      h('div', { class: 'fp-info-text' }, [
        h('span', props.label),
        h('p', props.value || '-')
      ]);
  }
});

const EmptyLine = defineComponent({
  name: 'EmptyLine',
  props: { text: { type: String, required: true } },
  setup(props) {
    return () => h('div', { class: 'fp-empty-line' }, props.text);
  }
});

const CompactTimeline = defineComponent({
  name: 'CompactTimeline',
  props: { items: { type: Array as PropType<ActivityLog[]>, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'fp-timeline fp-timeline-compact' }, props.items.map((item) =>
        h('div', { class: 'fp-timeline-item', key: item.id }, [
          h('div', { class: 'fp-timeline-dot' }),
          h('div', [
            h('strong', item.message || actionLabel(item.action)),
            h('span', `${actionLabel(item.action)} · ${new Date(item.createdAt).toLocaleString()}`)
          ])
        ])
      ));
  }
});

const ActivityTimeline = defineComponent({
  name: 'ActivityTimeline',
  props: { items: { type: Array as PropType<ActivityLog[]>, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'fp-timeline' }, props.items.map((item) =>
        h('div', { class: 'fp-timeline-item', key: item.id }, [
          h('div', { class: 'fp-timeline-dot' }),
          h('div', [
            h('strong', item.message || actionLabel(item.action)),
            h('span', `${new Date(item.createdAt).toLocaleString()} · ${relatedLabel(item)}`)
          ])
        ])
      ));
  }
});

const CompactWebsiteList = defineComponent({
  name: 'CompactWebsiteList',
  props: { websites: { type: Array as PropType<Website[]>, required: true } },
  setup(props) {
    return () =>
      h('div', { class: 'fp-compact-list' }, props.websites.map((website) =>
        h('div', { class: 'fp-compact-row', key: website.id }, [
          h('div', [
            h('strong', website.name),
            h('span', `${website.domain || 'No domain'} · ${website.websiteType || 'Website'}`)
          ]),
          h('span', { class: 'fp-small-pill' }, website.status)
        ])
      ));
  }
});

const BadgeGrid = defineComponent({
  name: 'BadgeGrid',
  props: {
    badges: { type: Array as PropType<BadgeProgress[]>, required: true },
    emptyText: { type: String, required: true }
  },
  setup(props) {
    return () =>
      props.badges.length
        ? h('div', { class: 'fp-badge-grid' }, props.badges.map((badge) =>
            h('div', { class: 'fp-badge-card', key: badge.key }, [
              h('strong', badge.name),
              h('span', badge.description)
            ])
          ))
        : h('div', { class: 'fp-empty-line' }, props.emptyText);
  }
});
</script>

<style scoped>
.fp-page {
  --fp-primary: #3f8dfe;
  --fp-primary-soft: color-mix(in srgb, var(--primary) 12%, transparent);
  --fp-card: var(--card-bg);
  --fp-soft: var(--soft-bg);
  --fp-border: var(--border);
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding-bottom: 3rem;
}

.fp-stack {
  display: grid;
  gap: 1.1rem;
}

.fp-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(16rem, 24rem);
  gap: 1rem;
  align-items: center;
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  padding: 1.1rem;
  background: var(--fp-card);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}

.fp-hero-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  grid-column: 1 / -1;
  order: -1;
}

.fp-profile-block {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
}

.fp-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4.4rem;
  height: 4.4rem;
  flex: 0 0 auto;
  overflow: hidden;
  border: 2px solid color-mix(in srgb, var(--primary) 20%, transparent);
  border-radius: 999px;
  background: var(--fp-primary-soft);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.35rem;
  font-weight: 900;
}

.fp-avatar img,
.fp-website-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fp-identity {
  min-width: 0;
}

.fp-brand {
  margin-bottom: 0.35rem;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0;
  text-transform: uppercase;
}

.fp-identity h1 {
  margin: 0;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: 0;
}

.fp-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem 0.75rem;
  margin-top: 0.35rem;
  color: var(--text-muted);
  font-size: 0.8rem;
}

.fp-username {
  color: var(--primary);
  font-weight: 700;
}

.fp-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.fp-role-badge,
.fp-small-pill {
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1;
}

.fp-status-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.fp-status-card,
.fp-mini-info {
  min-width: 0;
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  padding: 0.75rem 0.85rem;
  background: color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg));
}

.fp-status-card span,
.fp-mini-info span,
.fp-stat-card span,
.fp-info-row span,
.fp-info-text span,
.fp-compact-row span,
.fp-task-main span,
.fp-task-meta,
.fp-timeline-item span,
.fp-panel-head p {
  color: var(--text-muted);
  font-size: 0.75rem;
}

.fp-status-card strong,
.fp-mini-info strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  line-height: 1.2;
}

.fp-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
  gap: 0.65rem;
}

.fp-stat-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 0;
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  padding: 0.8rem 1rem;
  background: var(--fp-card);
  transition: border-color 140ms, background 140ms;
}

.fp-stat-card:hover {
  border-color: color-mix(in srgb, var(--primary) 28%, var(--border));
  background: var(--fp-soft);
}

.fp-stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.2rem;
  height: 2.2rem;
  flex: 0 0 auto;
  border-radius: 9px;
  background: var(--fp-primary-soft);
  color: var(--primary);
}

.fp-stat-icon :deep(svg) {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.fp-stat-body {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.05rem;
}

.fp-stat-card strong {
  display: block;
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.25rem;
  font-weight: 900;
  line-height: 1.1;
}

.fp-stat-card span {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
}

.fp-stat-green .fp-stat-icon { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
.fp-stat-amber .fp-stat-icon { background: rgba(217, 119, 6, 0.12); color: #d97706; }
.fp-stat-red .fp-stat-icon { background: rgba(220, 38, 38, 0.12); color: #dc2626; }
.fp-stat-blue .fp-stat-icon { background: var(--fp-primary-soft); color: var(--fp-primary); }

.fp-tabs-shell,
.fp-panel,
.fp-error,
.fp-empty-card {
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  background: var(--fp-card);
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.04), 0 1px 3px rgba(16, 24, 40, 0.06);
}

.fp-tabs-shell {
  overflow: hidden;
}

.fp-tabs {
  display: flex;
  gap: 0.4rem;
  overflow-x: auto;
  border-bottom: 1px solid var(--fp-border);
  padding: 0.65rem;
}

.fp-tab {
  flex: 0 0 auto;
  border: 0;
  border-radius: 10px;
  padding: 0.55rem 0.85rem;
  background: transparent;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
}

.fp-tab:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}

.fp-tab-active {
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 16px rgba(63, 141, 254, 0.08);
}

.fp-tab-body {
  padding: 1rem;
}

.fp-overview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.fp-panel {
  padding: 1rem;
}

.fp-panel-head {
  margin-bottom: 0.75rem;
}

.fp-panel-head h2 {
  margin: 0;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.25;
}

.fp-panel-head p {
  margin-top: 5px;
}

.fp-panel-body,
.fp-compact-list,
.fp-list-section,
.fp-report-grid {
  display: grid;
  gap: 0.65rem;
}

.fp-info-row,
.fp-compact-row,
.fp-task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-top: 1px solid var(--fp-border);
  padding-top: 0.65rem;
}

.fp-info-row:first-child,
.fp-compact-row:first-child {
  border-top: 0;
  padding-top: 0;
}

.fp-info-row strong {
  max-width: 62%;
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: right;
}

.fp-compact-row strong,
.fp-task-main strong,
.fp-feedback-row strong,
.fp-timeline-item strong,
.fp-website-main h3,
.fp-report-head strong {
  display: block;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.25;
}

.fp-feedback-row {
  border-radius: 10px;
  background: var(--fp-soft);
  padding: 0.75rem;
}

.fp-feedback-row p,
.fp-task-main p,
.fp-info-text p {
  margin: 5px 0 0;
  color: var(--text-muted);
  font-size: 0.82rem;
  line-height: 1.45;
}

.fp-task-row {
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  padding: 0.9rem 1rem;
  background: var(--fp-card);
}

.fp-task-main {
  min-width: 0;
}

.fp-task-meta,
.fp-website-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
}

.fp-website-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.fp-website-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  padding: 1rem;
  background: var(--fp-card);
}

.fp-website-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  overflow: hidden;
  border-radius: 14px;
  background: var(--fp-primary-soft);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-weight: 900;
}

.fp-website-main p,
.fp-website-main span {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.fp-website-actions {
  grid-column: 1 / -1;
}

.fp-activity-layout {
  display: grid;
  gap: 1rem;
}

.fp-activity-stats,
.fp-mini-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.fp-timeline {
  display: grid;
  gap: 0;
}

.fp-timeline-item {
  position: relative;
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 10px;
  padding: 0 0 16px;
}

.fp-timeline-item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 5px;
  top: 14px;
  bottom: 0;
  width: 1px;
  background: var(--fp-border);
}

.fp-timeline-dot {
  position: relative;
  z-index: 1;
  width: 11px;
  height: 11px;
  margin-top: 3px;
  border: 2px solid var(--primary);
  border-radius: 999px;
  background: var(--fp-card);
}

.fp-report-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.fp-report-card {
  display: grid;
  gap: 0.65rem;
  border: 1px solid var(--fp-border);
  border-radius: 14px;
  padding: 1rem;
  background: var(--fp-card);
}

.fp-report-head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.fp-info-text {
  border-radius: 10px;
  background: var(--fp-soft);
  padding: 0.75rem;
}

.fp-empty-line {
  border: 1px dashed var(--fp-border);
  border-radius: 10px;
  padding: 0.85rem;
  color: var(--text-muted);
  font-size: 0.82rem;
  text-align: center;
}

.fp-error,
.fp-empty-card {
  padding: 2rem;
  text-align: center;
}

.fp-error-title,
.fp-empty-card h3 {
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  line-height: 1.2;
}

.fp-error p,
.fp-empty-card p {
  margin: 8px auto 18px;
  max-width: 420px;
  color: var(--text-muted);
  font-size: 0.86rem;
}

.fp-skeleton {
  display: grid;
  gap: 1.1rem;
}

.fp-hero-loading {
  align-items: center;
}

.fp-avatar-skeleton,
.fp-skeleton-line,
.fp-skeleton-card {
  background: linear-gradient(90deg, var(--soft-bg), color-mix(in srgb, var(--soft-bg) 70%, white 30%), var(--soft-bg));
  background-size: 220% 100%;
  animation: fp-shimmer 1.5s infinite;
}

.fp-avatar-skeleton {
  width: 116px;
  height: 116px;
  border-radius: 999px;
}

.fp-skeleton-main {
  display: grid;
  gap: 12px;
}

.fp-skeleton-line {
  height: 14px;
  width: 220px;
  border-radius: 999px;
}

.fp-skeleton-name {
  height: 32px;
  width: 320px;
}

.fp-skeleton-short {
  width: 150px;
}

.fp-skeleton-number {
  height: 28px;
  width: 58px;
}

.fp-skeleton-card {
  min-height: 68px;
}

@keyframes fp-shimmer {
  to {
    background-position: -220% 0;
  }
}

@media (max-width: 1100px) {
  .fp-hero,
  .fp-overview-grid,
  .fp-website-grid,
  .fp-report-grid {
    grid-template-columns: 1fr;
  }

  .fp-status-grid,
  .fp-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 700px) {
  .fp-hero {
    padding: 20px;
  }

  .fp-hero-actions {
    position: static;
    order: -1;
    margin-bottom: 8px;
  }

  .fp-profile-block,
  .fp-task-row,
  .fp-info-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .fp-avatar {
    width: 94px;
    height: 94px;
  }

  .fp-status-grid,
  .fp-stats-grid,
  .fp-activity-stats,
  .fp-mini-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .fp-info-row strong {
    max-width: none;
    text-align: left;
  }

  .fp-task-meta,
  .fp-website-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 430px) {
  .fp-status-grid,
  .fp-stats-grid,
  .fp-activity-stats,
  .fp-mini-grid {
    grid-template-columns: 1fr;
  }
}
</style>
