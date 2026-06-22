<template>
  <div class="member-work-board">
    <template v-if="selectedMember">
      <section class="member-board-header card">
        <div class="member-heading">
          <span class="member-avatar large">
            <img v-if="selectedMember.avatarUrl" :src="selectedMember.avatarUrl" :alt="selectedMember.fullName || selectedMember.email" loading="lazy" class="cursor-pointer transition hover:scale-110" @click.prevent.stop="openPhotoPreview(selectedMember)" />
            <span v-else>{{ initials(selectedMember.fullName, selectedMember.email) }}</span>
          </span>
          <div>
            <div class="header-kicker">{{ $t('memberBoard.kicker') }}</div>
            <h1 class="page-title">{{ selectedMember.fullName || selectedMember.email }}</h1>
            <p class="page-subtitle">{{ $t('memberBoard.desc') }}</p>
            <div class="member-chip-row">
              <span class="role-chip">{{ roleLabel(selectedMember.role) }}</span>
              <span class="presence-chip" :class="selectedMember.currentStatus">{{ presenceLabel(selectedMember) }}</span>
              <span class="last-chip">{{ $t('memberBoard.lastActive', { time: relativeTime(selectedMember.lastActiveAt) }) }}</span>
            </div>
          </div>
        </div>
        <div class="header-right">
          <MonthSelector v-model="boardMonth" />
          <div class="header-actions">
            <RouterLink to="/work-board/members" class="btn-secondary">{{ $t('memberBoard.backToMembers') }}</RouterLink>
            <RouterLink :to="`/profiles/${selectedMember.id}`" class="btn-secondary">{{ $t('memberBoard.viewFullProfile') }}</RouterLink>
            <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="openAssignForSelected">{{ $t('memberBoard.assignNewTask') }}</button>
          </div>
        </div>
      </section>

      <section class="summary-strip card">
        <div v-for="item in selectedMemberSummary" :key="item.label">
          <span>{{ item.label }}</span>
          <strong>{{ item.value }}</strong>
        </div>
      </section>

      <TodaysWorkPage
        ref="workBoardRef"
        :key="`${route.fullPath}-${boardMonth}`"
        :admin-member-id="selectedMember.id"
        :read-only="!auth.isAdmin && selectedMember.id !== auth.user?.id"
        :override-assignments="allAssignmentsSource"
        :board-month="boardMonth"
        embedded
      />
    </template>

    <template v-else>
      <section class="admin-board-hero card">
        <div>
          <div class="header-kicker">{{ auth.isAdmin ? $t('memberBoard.adminControlCenter') : $t('memberBoard.teamTransparency') }}</div>
          <h1 class="page-title">{{ $t('memberBoard.title') }}</h1>
          <p class="page-subtitle">{{ $t('memberBoard.subtitle') }}</p>
        </div>
        <div class="header-right">
          <MonthSelector v-model="boardMonth" />
          <div class="header-actions">
            <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="workBoardRef?.openAddTask('to_do')">{{ $t('memberBoard.assign') }}</button>
          </div>
        </div>
      </section>

      <div class="mb-board-section-label">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h3M8 12h5M16 8h1M16 12h1M8 16h2"/></svg>
        {{ $t('memberBoard.taskBoard') }}
      </div>
      <TodaysWorkPage
        ref="workBoardRef"
        :key="`all-${route.fullPath}-${boardMonth}`"
        :read-only="!auth.isAdmin"
        :override-assignments="allAssignmentsSource"
        :board-month="boardMonth"
        embedded
      />

      <section class="member-toolbar card">
        <label class="member-search">
          <span class="sr-only">{{ $t('Search members') }}</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          </svg>
          <input v-model="searchQuery" type="search" :placeholder="$t('memberBoard.searchTeamMembers')" />
        </label>
        <select v-model="statusFilter" class="filter-select" aria-:label="$t('Filter by online status')">
          <option value="">{{ $t('memberBoard.allStatus') }}</option>
          <option value="online">{{ $t('memberBoard.online') }}</option>
          <option value="away">{{ $t('memberBoard.away') }}</option>
          <option value="offline">{{ $t('memberBoard.offline') }}</option>
        </select>
        <select v-model="workloadFilter" class="filter-select" aria-:label="$t('Filter by workload')">
          <option value="">{{ $t('memberBoard.allWorkload') }}</option>
          <option value="active">{{ $t('memberBoard.hasActiveTasks') }}</option>
          <option value="needs_fix">{{ $t('memberBoard.needsFix') }}</option>
          <option value="blocked">{{ $t('memberBoard.blocked') }}</option>
          <option value="none">{{ $t('memberBoard.noTasks') }}</option>
        </select>
        <select v-model="roleFilter" class="filter-select" aria-:label="$t('Filter by role')">
          <option value="">{{ $t('memberBoard.allRoles') }}</option>
          <option value="member">{{ $t('memberBoard.teamMember') }}</option>
          <option value="reviewer">{{ $t('memberBoard.reviewer') }}</option>
          <option value="admin">{{ $t('memberBoard.admin') }}</option>
        </select>
      </section>

      <div
        v-if="pageError"
        class="card card-pad flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between"
      >
        <div>
          <div class="ui-font font-semibold text-status-needs-fix-fg">{{ $t('memberBoard.couldNotLoad') }}</div>
          <p class="mt-1 text-text-muted">{{ pageError }}</p>
        </div>
        <button class="btn-primary w-fit" type="button" @click="loadPageData">{{ $t('Retry') }}</button>
      </div>

      <section v-else-if="loading" class="member-grid">
        <div v-for="item in 6" :key="item" class="member-card skeleton-member-card">
          <div class="skeleton-line avatar" />
          <div class="skeleton-line title" />
          <div class="skeleton-line text" />
        </div>
      </section>

      <EmptyState
        v-else-if="filteredMembers.length === 0"
        :title="$t('memberBoard.noMatchingMembers')"
        :description="$t('memberBoard.noMatchingMembersSub')"
      />

      <template v-else>
        <div class="mb-board-section-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          {{ $t('memberBoard.teamMembersSection') }}
        </div>
        <section class="member-grid">
        <article v-for="member in filteredMembers" :key="member.id" class="member-card">
          <div class="member-card-profile">
            <span class="member-avatar member-avatar-lg">
              <img v-if="member.avatarUrl" :src="member.avatarUrl" :alt="member.fullName || member.email" loading="lazy" class="cursor-pointer transition hover:scale-110" @click.prevent.stop="openPhotoPreview(member)" />
              <span v-else>{{ initials(member.fullName, member.email) }}</span>
            </span>
            <span class="presence-dot" :class="member.currentStatus" :title="presenceLabel(member)" />
          </div>
          <div class="member-card-identity">
            <h2>{{ member.fullName || member.email }}</h2>
            <p v-if="member.username" class="member-username">@{{ member.username }}</p>
            <p v-if="member.position" class="member-position">{{ member.position }}</p>
            <p class="member-email">{{ member.email }}</p>
            <div class="member-chip-row">
              <span class="role-chip">{{ roleLabel(member.role) }}</span>
              <span class="presence-chip" :class="member.currentStatus">{{ presenceLabel(member) }}</span>
            </div>
          </div>

          <div class="member-stats-grid">
            <div class="stats-total">
              <span>{{ $t('memberBoard.totalTasks') }}</span>
              <strong>{{ memberStats(member).total }}</strong>
            </div>
            <div>
              <span>{{ $t('memberBoard.toDo') }}</span>
              <strong>{{ memberStats(member).todo }}</strong>
            </div>
            <div>
              <span>{{ $t('memberBoard.inProgress') }}</span>
              <strong>{{ memberStats(member).inProgress }}</strong>
            </div>
            <div>
              <span>{{ $t('memberBoard.postpone') }}</span>
              <strong>{{ memberStats(member).postpone }}</strong>
            </div>
            <div>
              <span>{{ $t('memberBoard.review') }}</span>
              <strong>{{ memberStats(member).waitingReview }}</strong>
            </div>
            <div>
              <span>{{ $t('memberBoard.needsFix') }}</span>
              <strong>{{ memberStats(member).needsFix }}</strong>
            </div>
            <div>
              <span>{{ $t('memberBoard.completed') }}</span>
              <strong>{{ memberStats(member).completed }}</strong>
            </div>
          </div>

          <div class="member-card-actions">
            <RouterLink class="btn-primary h-9 px-3 text-xs" :to="`/work-board/members/${member.id}`">
              {{ $t('memberBoard.viewBoard') }}
            </RouterLink>
            <RouterLink class="btn-secondary h-9 px-3 text-xs" :to="`/profiles/${member.id}`">
              {{ $t('memberBoard.profile') }}
            </RouterLink>
            <RouterLink v-if="auth.isAdmin" class="btn-secondary h-9 px-3 text-xs" :to="`/work-board/members/${member.id}?assign=1`">
              {{ $t('memberBoard.assign') }}
            </RouterLink>
          </div>
        </article>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import EmptyState from '@/components/ui/EmptyState.vue';
import TodaysWorkPage from '@/pages/TodaysWorkPage.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member, type PromptAssignment, type Role } from '@/stores/data';
import { usePageRealtime } from '@/services/realtimeService';
import { useImagePreviewStore } from '@/stores/imagePreview';
const previewStore = useImagePreviewStore();

const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      email: member.email,
      role: member.role
    });
  }
};

usePageRealtime(['prompt_assignments', 'section_tasks', 'submissions', 'profiles', 'websites']);

const auth = useAuthStore();

const route = useRoute();
const data = useDataStore();
const workBoardRef = ref<InstanceType<typeof TodaysWorkPage> | null>(null);
const loading = ref(false);
const localError = ref<string | null>(null);

// Month selector — default to current month
const currentMonthStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const boardMonth = ref(currentMonthStr());
const searchQuery = ref('');
const statusFilter = ref('');
const workloadFilter = ref('');
const roleFilter = ref('');

// All assignments fetched via security-definer RPC (bypasses RLS for transparency)
const allAssignments = ref<PromptAssignment[]>([]);

const memberId = computed(() => (typeof route.params.memberId === 'string' ? route.params.memberId : ''));
const selectedMember = computed(() => (memberId.value ? data.memberById(memberId.value) : null));
const pageError = computed(() => localError.value || data.errors.members || data.errors.assignments || null);

const boardExtras = (assignment: { filledValues: Record<string, string> }) => {
  const parse = <T,>(value: string | undefined, fallback: T): T => {
    if (!value) return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };
  return {
    column: assignment.filledValues?.__board_column || '',
    collaborators: parse<string[]>(assignment.filledValues?.__board_collaborators, [])
  };
};

const allAssignmentsSource = computed(() =>
  allAssignments.value.length ? allAssignments.value : data.assignments
);

const cardsForMember = (id: string) =>
  allAssignmentsSource.value.filter((assignment) => {
    if (assignment.isArchived === true) return false;
    const extra = boardExtras(assignment);
    return assignment.assignedMemberId === id || extra.collaborators.includes(id);
  });

const memberStats = (member: Member) => {
  const cards = cardsForMember(member.id);
  const blockedTaskIds = new Set<string>();
  return {
    total: cards.length,
    todo: cards.filter((card) => card.status === 'pending').length,
    inProgress: cards.filter((card) => card.status === 'in_progress').length,
    postpone: cards.filter((card) => card.status === 'postponed').length,
    waitingReview: cards.filter((card) => card.status === 'submitted').length,
    needsFix: cards.filter((card) => ['needs_fix', 'needs_resubmission', 'rejected'].includes(card.status)).length,
    completed: cards.filter((card) => card.status === 'approved').length,
    blocked: cards.filter((card) => blockedTaskIds.has(card.id) || boardExtras(card).column === 'blocked').length
  };
};

const selectedMemberSummary = computed(() => {
  if (!selectedMember.value) return [];
  const stats = memberStats(selectedMember.value);
  return [
    { label: 'Total tasks', value: stats.total },
    { label: 'To Do', value: stats.todo },
    { label: 'In Progress', value: stats.inProgress },
    { label: 'Postpone', value: stats.postpone },
    { label: 'Waiting Review', value: stats.waitingReview },
    { label: 'Needs Fix', value: stats.needsFix },
    { label: 'Completed', value: stats.completed }
  ];
});

const filteredMembers = computed(() => {
  const term = searchQuery.value.trim().toLowerCase();
  return data.members.filter((member) => {
    const searchable = `${member.fullName} ${member.email} ${member.role}`.toLowerCase();
    const stats = memberStats(member);
    if (term && !searchable.includes(term)) return false;
    if (statusFilter.value && member.currentStatus !== statusFilter.value) return false;
    if (roleFilter.value && roleFilter.value !== normalizedRole(member.role)) return false;
    if (workloadFilter.value === 'active' && stats.inProgress === 0 && stats.todo === 0) return false;
    if (workloadFilter.value === 'needs_fix' && stats.needsFix === 0) return false;
    if (workloadFilter.value === 'blocked' && stats.blocked === 0) return false;
    if (workloadFilter.value === 'none' && cardsForMember(member.id).length > 0) return false;
    return true;
  });
});

const normalizedRole = (role: Role) => {
  if (role === 'team_member') return 'member';
  return String(role);
};

const roleLabel = (role: Role) => {
  if (role === 'admin') return 'Admin';
  if (role === 'reviewer') return 'Reviewer';
  return 'Team Member';
};

const initials = (name: string, email: string) => {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const presenceLabel = (member: Member) => {
  if (member.currentStatus === 'online') return 'Online';
  if (member.currentStatus === 'away') return `Away · ${relativeTime(member.lastActiveAt)}`;
  return `Offline · ${relativeTime(member.lastActiveAt)}`;
};

const relativeTime = (date: string) => {
  if (!date) return 'never';
  const ms = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return `${days} days ago`;
};

const withTimeout = <T,>(promise: Promise<T>, message: string, ms = 10000) =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    })
  ]);

const loadPageData = async () => {
  loading.value = true;
  localError.value = null;
  try {
    await Promise.allSettled([
      data.fetchMembers(),
      data.fetchAssignments(),
      data.fetchPrompts(),
      data.fetchProjects(),
      data.fetchWebsites(),
      data.fetchSubmissions(),
      data.fetchActivityLogs()
    ]);
    // Fetch all assignments via security-definer RPC for member stats transparency
    if (!auth.isAdmin) {
      const all = await data.fetchAllAssignmentsForBoard();
      if (all.length) allAssignments.value = all;
    }
  } catch (err) {
    console.error('[admin-work-board] load failed', err);
    localError.value = 'Could not load Work Board. Please try again.';
  } finally {
    loading.value = false;
  }
};

const openAssignForSelected = () => {
  if (!selectedMember.value) return;
  workBoardRef.value?.openAddTask('to_do', selectedMember.value.id);
};

onMounted(() => {
  void loadPageData();
});
</script>

<style scoped>
.member-work-board {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.6rem;
  flex-shrink: 0;
}

.mb-board-section-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 850;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0 0.25rem;
}

.admin-board-hero,
.member-board-header,
.member-toolbar,
.summary-strip {
  padding: 1rem;
}

.admin-board-hero,
.member-board-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.header-kicker {
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 850;
  text-transform: uppercase;
}

.member-heading,
.header-actions,
.member-toolbar,
.member-card-head,
.member-chip-row,
.member-card-actions {
  display: flex;
  align-items: center;
}

.member-card-profile {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.member-avatar-lg {
  width: 4.5rem;
  height: 4.5rem;
  font-size: 1.2rem;
}

.presence-dot {
  position: absolute;
  bottom: 2px;
  right: calc(50% - 2.25rem + 2px);
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 999px;
  border: 2px solid var(--card-bg);
}

.presence-dot.online { background: #16a34a; }
.presence-dot.away   { background: #f97316; }
.presence-dot.offline { background: var(--text-muted); }

.member-card-identity {
  text-align: center;
  margin-bottom: 0.75rem;
}

.member-card-identity h2 {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1rem;
  font-weight: 850;
}

.member-username {
  margin-top: 0.15rem;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.member-position {
  margin-top: 0.1rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  font-weight: 500;
}

.member-email {
  margin-top: 0.1rem;
  color: var(--text-muted);
  font-size: 0.78rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-card-identity .member-chip-row {
  justify-content: center;
}

.member-heading {
  gap: 0.9rem;
}

.header-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.6rem;
}

.member-toolbar {
  flex-wrap: wrap;
  gap: 0.7rem;
}

.member-search {
  position: relative;
  min-width: min(100%, 22rem);
  flex: 1;
}

.member-search svg {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  transform: translateY(-50%);
}

.member-search input,
.filter-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--input-bg);
  color: var(--text-main);
  font-size: 0.86rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}

.member-search input {
  padding: 0.72rem 0.9rem 0.72rem 2.4rem;
}

.filter-select {
  width: auto;
  min-width: 10rem;
  padding: 0.72rem 0.8rem;
}

.member-search input:focus,
.filter-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr));
  gap: 1rem;
}

.member-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1rem;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.05);
}


.member-avatar {
  display: inline-flex;
  width: 3rem;
  height: 3rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-weight: 900;
}

.member-avatar.large {
  width: 4rem;
  height: 4rem;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-chip-row {
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.role-chip,
.presence-chip,
.last-chip {
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
}

.role-chip {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.presence-chip.online {
  background: rgba(22, 163, 74, 0.13);
  color: #16a34a;
}

.presence-chip.away {
  background: rgba(249, 115, 22, 0.13);
  color: #f97316;
}

.presence-chip.offline,
.last-chip {
  background: var(--soft-bg);
  color: var(--text-muted);
}

.member-stats-grid,
.summary-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.member-stats-grid {
  margin-top: 1rem;
}

.member-stats-grid div,
.summary-strip div {
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--soft-bg);
  padding: 0.65rem;
}

.member-stats-grid span,
.summary-strip span {
  display: block;
  color: var(--text-muted);
  font-size: 0.72rem;
}

.member-stats-grid strong,
.summary-strip strong {
  display: block;
  margin-top: 0.2rem;
  color: var(--text-main);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 1.05rem;
  font-weight: 900;
}

.member-card-actions {
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}

.skeleton-line {
  border-radius: 999px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: pulse 1.4s ease-in-out infinite;
}

.skeleton-line.avatar {
  height: 3rem;
  width: 3rem;
}

.skeleton-line.title {
  height: 1rem;
  width: 9rem;
  margin-top: 0.8rem;
}

.skeleton-line.text {
  height: 0.85rem;
  width: 13rem;
  margin-top: 0.5rem;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

@media (max-width: 760px) {
  .admin-board-hero,
  .member-board-header {
    align-items: stretch;
    flex-direction: column;
  }

  .header-right {
    align-items: stretch;
  }

  .member-heading {
    align-items: flex-start;
  }

  .filter-select {
    width: 100%;
  }

  .member-stats-grid,
  .summary-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
