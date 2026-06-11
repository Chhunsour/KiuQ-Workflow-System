<template>
  <div class="np-page">
    <!-- Page header -->
    <div class="np-header">
      <div>
        <h1 class="np-title">Notifications Center</h1>
        <p class="np-sub">Manage alerts, acknowledgements, quality issues, and performance metrics.</p>
      </div>
      <button
        v-if="notifs.hasUnread && activeTab !== 'analytics'"
        class="btn-primary np-mark-all"
        type="button"
        @click="notifs.markAllRead()"
      >
        Mark all as read
      </button>
    </div>

    <!-- Push notification setup card -->
    <div class="mb-5">
      <PushNotificationCard :compact="true" />
    </div>

    <!-- Tab navigation -->
    <div class="np-tabs-container">
      <div class="np-tabs">
        <button
          v-for="t in tabs"
          :key="t.value"
          class="np-tab-btn"
          :class="{ 'np-tab-btn--active': activeTab === t.value }"
          type="button"
          @click="activeTab = t.value"
        >
          {{ t.label }}
          <span v-if="t.count !== undefined" class="np-tab-count">{{ t.count }}</span>
        </button>
      </div>
    </div>

    <!-- Filter & Options row -->
    <div class="np-filters-row" v-if="activeTab !== 'analytics'">
      <div class="np-filters">
        <button
          v-for="f in filterOptions"
          :key="f.value"
          class="np-filter-btn"
          :class="{ 'np-filter-btn--active': activeFilter === f.value }"
          type="button"
          @click="activeFilter = f.value"
        >
          {{ f.label }}
        </button>
      </div>

      <!-- Quick Sound Toggle Panel -->
      <div class="np-sound-panel">
        <button
          class="np-page-sound-toggle"
          type="button"
          :title="notifs.preferences?.soundEnabled ? 'Mute Notification Sounds' : 'Unmute Notification Sounds'"
          @click="toggleSound"
        >
          <svg v-if="notifs.preferences?.soundEnabled" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="np-sound-muted">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
          <span>Sound {{ notifs.preferences?.soundEnabled ? 'On' : 'Muted' }}</span>
        </button>
      </div>
    </div>

    <!-- Analytics Dashboard Tab -->
    <div v-if="activeTab === 'analytics'" class="np-analytics">
      <div v-if="loadingAnalytics" class="np-loading">Loading analytics data...</div>
      <div v-else-if="!analyticsData" class="np-empty">Failed to load analytics.</div>
      <div v-else class="space-y-6">
        <!-- Stats cards -->
        <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div class="np-stat-card border-l-4 border-primary">
            <span class="np-stat-label">Notifications Sent</span>
            <span class="np-stat-value text-primary">{{ analyticsData.total_sent }}</span>
          </div>
          <div class="np-stat-card border-l-4 border-status-approved-fg">
            <span class="np-stat-label">Notifications Read</span>
            <span class="np-stat-value text-status-approved-fg">{{ analyticsData.total_read }}</span>
          </div>
          <div class="np-stat-card border-l-4 border-status-needs-fix-fg">
            <span class="np-stat-label">Ignored / Pending</span>
            <span class="np-stat-value text-status-needs-fix-fg">{{ analyticsData.total_ignored }}</span>
          </div>
          <div class="np-stat-card border-l-4 border-status-pending-fg">
            <span class="np-stat-label">Avg Response Time</span>
            <span class="np-stat-value text-status-pending-fg">{{ formatSeconds(analyticsData.avg_response_seconds) }}</span>
          </div>
        </div>

        <!-- Delayed Users Table -->
        <div class="card card-pad">
          <h3 class="section-title mb-4">Delayed User Response Times</h3>
          <div class="overflow-x-auto">
            <table class="np-analytics-table">
              <thead>
                <tr>
                  <th>Teammate</th>
                  <th>Ignored / Pending Alert Count</th>
                  <th>Average Response Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="user in analyticsData.delayed_users" :key="user.id">
                  <td>
                    <div class="font-bold text-text-main">{{ user.name }}</div>
                    <div class="text-xs text-text-muted">{{ user.email }}</div>
                  </td>
                  <td class="text-status-needs-fix-fg font-black text-sm">{{ user.ignored_count }}</td>
                  <td class="font-semibold text-text-main">{{ formatSeconds(user.avg_response_time) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <!-- Notification list skeleton -->
    <div v-else-if="notifs.loading && !notifs.initialized" class="np-skeleton">
      <div v-for="i in 5" :key="i" class="np-skel-item">
        <div class="np-skel-icon" />
        <div class="np-skel-body">
          <div class="np-skel-line" />
          <div class="np-skel-line np-skel-line--short" />
        </div>
      </div>
    </div>

    <!-- Illustrated Empty state -->
    <div v-else-if="filtered.length === 0" class="np-empty-state">
      <div class="np-empty-icon-container">
        <div class="np-empty-glow" />
        <svg class="np-empty-bell-svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </div>
      <h3 class="np-empty-title">All caught up!</h3>
      <p class="np-empty-desc">You don't have any notifications matching this filter.</p>
    </div>

    <!-- Grouped/Single items list -->
    <div v-else class="np-groups">
      <section v-for="group in grouped" :key="group.key" class="np-group">
        <div class="np-group-head">
          <span class="np-group-label">{{ group.label }}</span>
          <span class="np-group-count">{{ group.items.length }}</span>
        </div>

        <div class="np-list">
          <template v-for="groupItem in group.items" :key="groupItem.id">
            <!-- Grouped notifications (Accordion) -->
            <div v-if="groupItem.isGroup" class="np-group-card" :class="{ 'np-group-card--expanded': expandedGroups[groupItem.id] }">
              <div
                class="np-item np-group-header-row"
                :class="{ 
                  'np-item--unread': !groupItem.isRead,
                  'np-item--critical': groupItem.priority === 'critical'
                }"
                @click="toggleGroup(groupItem.id)"
              >
                <div class="np-avatar-wrap" :title="actorName(groupItem)">
                  <img
                    v-if="groupItem.actorAvatarUrl"
                    class="np-avatar-img"
                    :src="groupItem.actorAvatarUrl"
                    :alt="actorName(groupItem)"
                    loading="lazy"
                  />
                  <span v-else class="np-avatar-fallback">{{ actorInitials(groupItem) }}</span>
                  <span class="np-source-icon" :class="`np-icon--${iconVariant(groupItem.type)}`" v-html="sourceIconSvg(groupItem.type)" />
                </div>

                <!-- Body -->
                <div class="np-item-body">
                  <div class="np-item-meta">
                    <span>{{ actorName(groupItem) }}</span>
                    <span aria-hidden="true">•</span>
                    <span>{{ sourceLabel(groupItem.type) }}</span>
                    <span v-if="groupItem.priority && groupItem.priority !== 'normal'" class="np-priority-badge" :class="`np-priority-badge--${groupItem.priority}`">
                      {{ groupItem.priority }}
                    </span>
                  </div>
                  <div class="np-item-row">
                    <span class="np-item-title">{{ groupItem.title }}</span>
                    <div class="np-item-right-actions">
                      <span class="np-item-time">{{ timeAgo(groupItem.createdAt) }}</span>
                      <span class="np-chevron-icon" :class="{ 'np-chevron-icon--rotated': expandedGroups[groupItem.id] }">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </span>
                    </div>
                  </div>
                  <p class="np-item-message">{{ groupItem.message }}</p>
                  
                  <div class="np-item-footer">
                    <span class="np-type-badge" :class="`np-type-badge--${iconVariant(groupItem.type)}`">
                      {{ sourceLabel(groupItem.type) }}
                    </span>
                  </div>
                </div>

                <!-- Unread indicator -->
                <span v-if="!groupItem.isRead" class="np-unread-dot" />
              </div>

              <!-- Children lists -->
              <Transition name="np-group-expand">
                <div v-if="expandedGroups[groupItem.id]" class="np-group-children">
                  <div
                    v-for="subNotif in groupItem.items"
                    :key="subNotif.id"
                    class="np-sub-item"
                    :class="{ 
                      'np-sub-item--unread': !subNotif.isRead,
                      'np-sub-item--critical': subNotif.priority === 'critical' && !subNotif.acknowledgedAt
                    }"
                    @click="open(subNotif)"
                  >
                    <div class="np-sub-item-indicator">
                      <span v-if="!subNotif.isRead" class="np-unread-dot-small" />
                    </div>
                    <div class="np-sub-item-body">
                      <div class="np-sub-item-meta">
                        <span class="np-sub-item-time">{{ timeAgo(subNotif.createdAt) }}</span>
                        <span v-if="subNotif.priority && subNotif.priority !== 'normal'" class="np-priority-badge" :class="`np-priority-badge--${subNotif.priority}`">
                          {{ subNotif.priority }}
                        </span>
                      </div>
                      <div class="np-sub-item-title">{{ subNotif.title }}</div>
                      <p class="np-sub-item-message">{{ subNotif.message }}</p>
                      <div class="np-sub-item-footer">
                        <div class="np-sub-item-actions">
                          <button
                            v-if="!subNotif.isRead"
                            class="btn-secondary np-action-btn-secondary"
                            type="button"
                            @click.stop="notifs.markRead(subNotif.id)"
                          >
                            Mark Read
                          </button>
                          <button
                            v-if="!subNotif.acknowledgedAt"
                            class="btn-primary np-ack-btn"
                            type="button"
                            @click.stop="notifs.acknowledgeNotification(subNotif.id)"
                          >
                            I Got It
                          </button>
                          <button
                            v-else
                            class="btn-primary np-action-btn-primary"
                            type="button"
                            @click.stop="open(subNotif)"
                          >
                            {{ actionLabel(subNotif) }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </div>

            <!-- Single notification card -->
            <div
              v-else
              class="np-item"
              :class="{ 
                'np-item--unread': !groupItem.isRead,
                'np-item--critical': groupItem.priority === 'critical' && !groupItem.acknowledgedAt
              }"
              @click="open(groupItem)"
            >
              <div class="np-avatar-wrap" :title="actorName(groupItem)">
                <img
                  v-if="groupItem.actorAvatarUrl"
                  class="np-avatar-img"
                  :src="groupItem.actorAvatarUrl"
                  :alt="actorName(groupItem)"
                  loading="lazy"
                />
                <span v-else class="np-avatar-fallback">{{ actorInitials(groupItem) }}</span>
                <span class="np-source-icon" :class="`np-icon--${iconVariant(groupItem.type)}`" v-html="sourceIconSvg(groupItem.type)" />
              </div>

              <!-- Body -->
              <div class="np-item-body">
                <div class="np-item-meta">
                  <span>{{ actorName(groupItem) }}</span>
                  <span aria-hidden="true">•</span>
                  <span>{{ sourceLabel(groupItem.type) }}</span>
                  <span v-if="groupItem.priority && groupItem.priority !== 'normal'" class="np-priority-badge" :class="`np-priority-badge--${groupItem.priority}`">
                    {{ groupItem.priority }}
                  </span>
                </div>
                <div class="np-item-row">
                  <span class="np-item-title">{{ groupItem.title }}</span>
                  <span class="np-item-time">{{ timeAgo(groupItem.createdAt) }}</span>
                </div>
                <p class="np-item-message">{{ groupItem.message }}</p>
                
                <div class="np-item-footer">
                  <span class="np-type-badge" :class="`np-type-badge--${iconVariant(groupItem.type)}`">
                    {{ sourceLabel(groupItem.type) }}
                  </span>
                  
                  <div class="np-item-hover-actions">
                    <button
                      v-if="!groupItem.isRead"
                      class="btn-secondary np-action-btn-secondary"
                      type="button"
                      @click.stop="notifs.markRead(groupItem.id)"
                    >
                      Mark Read
                    </button>
                    <button
                      v-if="!groupItem.acknowledgedAt"
                      class="btn-primary np-ack-btn"
                      type="button"
                      @click.stop="notifs.acknowledgeNotification(groupItem.id)"
                    >
                      I Got It
                    </button>
                    <button
                      v-else
                      class="btn-primary np-action-btn-primary"
                      type="button"
                      @click.stop="open(groupItem)"
                    >
                      {{ actionLabel(groupItem) }}
                    </button>
                  </div>
                </div>
              </div>

              <!-- Unread indicator -->
              <span v-if="!groupItem.isRead" class="np-unread-dot" />
            </div>
          </template>
        </div>
      </section>
    </div>

    <!-- Load more -->
    <div v-if="filtered.length > 0 && activeTab !== 'analytics' && notifs.notifications.length >= pageSize" class="np-load-more">
      <button class="btn-secondary" type="button" :disabled="notifs.loading" @click="loadMore">
        {{ notifs.loading ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore, type AppNotification, type NotificationType } from '@/stores/notifications';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import PushNotificationCard from '@/components/ui/PushNotificationCard.vue';
import {
  notificationCategoryLabel as sourceLabel,
  notificationIconSvg,
  notificationVariant as iconVariant,
  notificationTimeAgo as timeAgo,
  groupNotificationsByDay,
  groupNotificationsIntelligently,
} from '@/lib/notificationDisplay';

const notifs = useNotificationsStore();
const router = useRouter();
const auth = useAuthStore();

const activeFilter = ref<'all' | 'unread' | 'read' | 'high_priority'>('all');
const activeTab = ref<string>('all');
const pageSize = ref(50);

// Accordion groups expanded mapping
const expandedGroups = ref<Record<string, boolean>>({});

// Analytics state
const loadingAnalytics = ref(false);
const analyticsData = ref<any>(null);

const isAdmin = computed(() => {
  const role = auth.profile?.role;
  if (!role) return false;
  const normalized = String(role).toLowerCase().replace(/[\s-]+/g, '_');
  return ['admin', 'owner', 'head', 'supervisor'].includes(normalized);
});

const tabs = computed(() => {
  const list: { value: string; label: string; count?: number }[] = [
    { value: 'all', label: 'All', count: unreadCounts.value.all },
    { value: 'tasks', label: 'Tasks', count: unreadCounts.value.tasks },
    { value: 'follow_ups', label: 'Follow-Ups', count: unreadCounts.value.followUps },
    { value: 'quality', label: 'Quality Checks', count: unreadCounts.value.quality },
    { value: 'announcements', label: 'Announcements', count: unreadCounts.value.announcements },
    { value: 'mentions', label: 'Mentions', count: unreadCounts.value.mentions },
  ];
  if (isAdmin.value) {
    list.push({ value: 'analytics', label: 'Admin Analytics', count: undefined });
  }
  return list;
});

const filterOptions = [
  { value: 'all' as const, label: 'All' },
  { value: 'unread' as const, label: 'Unread' },
  { value: 'read' as const, label: 'Read' },
  { value: 'high_priority' as const, label: 'High Priority' }
];

onMounted(async () => {
  await notifs.fetchNotifications(pageSize.value);
  await notifs.fetchPreferences();
});

const loadMore = async () => {
  pageSize.value += 50;
  await notifs.fetchNotifications(pageSize.value);
};

const toggleGroup = (groupId: string) => {
  expandedGroups.value[groupId] = !expandedGroups.value[groupId];
};

const toggleSound = async () => {
  const currentVal = notifs.preferences?.soundEnabled !== false;
  await notifs.updatePreferences({ soundEnabled: !currentVal });
};

// ── Filters ────────────────────────────────────────────────────────────────

const unreadCounts = computed(() => {
  const items = notifs.notifications.filter(n => !n.isRead);
  return {
    all: items.length,
    tasks: items.filter(n => [
      'task_assigned', 'task_updated', 'task_comment', 'task_deadline_changed',
      'task_needs_fix', 'task_approved', 'task_completed'
    ].includes(n.type)).length,
    followUps: items.filter(n => [
      'blog_followup', 'plugin_update', 'ebay_click_followup', 'speed_optimization_followup'
    ].includes(n.type)).length,
    quality: items.filter(n => [
      'quality_issue_reported', 'quality_issue_fixed'
    ].includes(n.type)).length,
    announcements: items.filter(n => [
      'announcement', 'daily_summary'
    ].includes(n.type)).length,
    mentions: items.filter(n => n.type === 'mention').length,
  };
});

const filtered = computed(() => {
  let list = notifs.notifications;

  // 1. Filter by Tab
  if (activeTab.value === 'tasks') {
    list = list.filter(n => [
      'task_assigned', 'task_updated', 'task_comment', 'task_deadline_changed',
      'task_needs_fix', 'task_approved', 'task_completed'
    ].includes(n.type));
  } else if (activeTab.value === 'follow_ups') {
    list = list.filter(n => [
      'blog_followup', 'plugin_update', 'ebay_click_followup', 'speed_optimization_followup'
    ].includes(n.type));
  } else if (activeTab.value === 'quality') {
    list = list.filter(n => [
      'quality_issue_reported', 'quality_issue_fixed'
    ].includes(n.type));
  } else if (activeTab.value === 'announcements') {
    list = list.filter(n => [
      'announcement', 'daily_summary'
    ].includes(n.type));
  } else if (activeTab.value === 'mentions') {
    list = list.filter(n => n.type === 'mention');
  }

  // 2. Filter by Active Filter (All, Unread, Read, High Priority)
  if (activeFilter.value === 'unread') {
    list = list.filter(n => !n.isRead);
  } else if (activeFilter.value === 'read') {
    list = list.filter(n => n.isRead);
  } else if (activeFilter.value === 'high_priority') {
    list = list.filter(n => n.priority === 'high' || n.priority === 'critical');
  }

  // 3. Sort: priority = 'critical' && !acknowledged_at first, then by created_at desc
  return [...list].sort((a, b) => {
    const aCrit = a.priority === 'critical' && !a.acknowledgedAt;
    const bCrit = b.priority === 'critical' && !b.acknowledgedAt;
    if (aCrit && !bCrit) return -1;
    if (!aCrit && bCrit) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});

// Day-grouped sections of intelligently grouped items
const intelligentFiltered = computed(() => groupNotificationsIntelligently(filtered.value));
const grouped = computed(() => groupNotificationsByDay(intelligentFiltered.value));

// Mark visible as seen
const markVisibleAsSeen = async () => {
  const unseenIds = filtered.value
    .filter(n => !n.seenAt)
    .map(n => n.id);
  if (unseenIds.length > 0) {
    await notifs.markSeen(unseenIds);
  }
};

watch(filtered, () => {
  if (activeTab.value !== 'analytics') {
    void markVisibleAsSeen();
  }
}, { immediate: true });

// Fetch analytics data when active tab changes
const fetchAnalyticsData = async () => {
  loadingAnalytics.value = true;
  try {
    const data = await notifs.fetchAnalytics();
    analyticsData.value = data;
  } catch (err) {
    console.error('Error fetching analytics:', err);
  } finally {
    loadingAnalytics.value = false;
  }
};

watch(activeTab, (tab) => {
  if (tab === 'analytics') {
    void fetchAnalyticsData();
  }
});

const formatSeconds = (sec: number | null | undefined): string => {
  if (sec == null) return 'N/A';
  if (sec < 60) return `${Math.round(sec)}s`;
  const mins = sec / 60;
  if (mins < 60) return `${Math.round(mins)}m`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  const days = hrs / 24;
  return `${Math.round(days)}d`;
};

// ── Actions ────────────────────────────────────────────────────────────────

const open = async (n: AppNotification) => {
  await notifs.markRead(n.id);
  
  const isTask = n.taskId || n.type.startsWith('task_') || n.relatedType === 'task';
  const isAdminUser = isAdmin.value;
  const data = useDataStore();

  if (isTask && n.taskId) {
    let base = isAdminUser ? '/work-board/members' : '/work-board/my';
    if (isAdminUser) {
      const assignment = data.assignments.find((a) => a.id === n.taskId);
      if (assignment) {
        base = `/work-board/members/${assignment.assignedMemberId}`;
      }
    }
    router.push(`${base}?task=${n.taskId}`);
  } else if (n.type === 'submission_received' && n.submissionId) {
    router.push(`/reviews?submission=${n.submissionId}`);
  } else if (n.type === 'prompt_replaced' && n.relatedId) {
    router.push(`/my-assigned-prompts?prompt=${n.relatedId}`);
  } else if (n.submissionId) {
    router.push(`/my-submissions?submission=${n.submissionId}`);
  } else if (n.relatedType === 'submission') {
    router.push('/reviews');
  } else if (n.type === 'blog_followup') {
    router.push('/followup/blog');
  } else if (n.type === 'plugin_update') {
    router.push('/followup/plugins');
  } else if (n.type === 'ebay_click_followup') {
    router.push('/followup/ebay-click');
  } else if (n.type === 'speed_optimization_followup') {
    router.push('/followup/speed-optimization');
  } else if (n.type === 'quality_issue_reported' || n.type === 'quality_issue_fixed') {
    router.push(auth.isQualityChecker ? '/quality-check' : '/work-board/quality-check');
  } else {
    router.push('/notifications');
  }
};

// ── Icons / labels ─────────────────────────────────────────────────────────

const actorName = (n: any): string => n.actorName || (n.actorId ? 'Team member' : 'System');

const actorInitials = (n: any): string => {
  const name = actorName(n);
  if (!n.actorId) return 'SYS';
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'TM';
};

const sourceIconSvg = (type: NotificationType): string => notificationIconSvg(type, 11);

const actionLabel = (n: AppNotification): string => {
  const map: Partial<Record<NotificationType, string>> = {
    task_assigned: 'View Task',
    task_updated: 'View Task',
    task_comment: 'Open Task',
    task_deadline_changed: 'Open Task',
    task_needs_fix: 'View Feedback',
    task_approved: 'View Task',
    task_completed: 'View Task',
    prompt_replaced: 'Open Docs',
    submission_received: 'Review Submission',
    blog_followup: 'View Followup',
    plugin_update: 'View Followup',
    ebay_click_followup: 'View Followup',
    speed_optimization_followup: 'View Speed Check',
    quality_issue_reported: 'Open Issue',
    quality_issue_fixed: 'Review Fix',
    monthly_report: 'View Report',
    announcement: 'View Announcement',
    daily_summary: 'View Summary',
  };
  return map[n.type] ?? 'Open';
};
</script>

<style scoped>
.np-page { max-width: 740px; }

/* ── Header ──────────────────────────────────────────────────────────────── */
.np-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}
.np-title {
  font-family: 'Raleway', sans-serif;
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--text-main);
  margin: 0;
}
.np-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0.2rem 0 0;
}
.np-mark-all {
  flex-shrink: 0;
}

/* ── Filter bar ──────────────────────────────────────────────────────────── */
.np-filters-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.np-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0;
}

.np-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.75rem;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
}
.np-filter-btn:hover { background: var(--soft-bg); color: var(--text-main); }
.np-filter-btn--active {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-color: var(--primary);
  color: var(--primary);
}

.np-sound-panel {
  display: flex;
  align-items: center;
}

.np-page-sound-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  border: 1.5px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 120ms ease;
}

.np-page-sound-toggle:hover {
  background: var(--soft-bg);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
}

.np-sound-muted {
  opacity: 0.6;
}

/* ── Day groups ──────────────────────────────────────────────────────────── */
.np-groups {
  display: flex;
  flex-direction: column;
  gap: 1.4rem;
}
.np-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.np-group-head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0 0.15rem;
  position: sticky;
  top: 0;
  z-index: 1;
}
.np-group-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.np-group-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: var(--soft-bg);
  font-size: 0.62rem;
  font-weight: 800;
  color: var(--text-muted);
}

/* ── List & Glassmorphic cards ───────────────────────────────────────────── */
.np-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.np-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  width: 100%;
  padding: 1.1rem 1.25rem;
  background: color-mix(in srgb, var(--card-bg) 85%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid color-mix(in srgb, var(--border) 60%, rgba(226, 232, 240, 0.4));
  border-radius: 18px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
.np-item:hover {
  border-color: var(--primary);
  box-shadow: 0 8px 24px rgba(21, 214, 194, 0.08);
  transform: translateY(-1px);
}
.np-item--unread {
  background: color-mix(in srgb, var(--primary) 3.5%, var(--card-bg));
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  box-shadow: inset 3px 0 12px -3px color-mix(in srgb, var(--primary) 25%, transparent);
}
.np-item--unread:hover {
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
}

.np-item--critical {
  border-left: 4px solid #ef4444 !important;
  background: rgba(239, 68, 68, 0.02) !important;
}
.np-item--critical:hover {
  background: rgba(239, 68, 68, 0.05) !important;
}

/* Accordion Group Card */
.np-group-card {
  background: color-mix(in srgb, var(--card-bg) 60%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid color-mix(in srgb, var(--border) 60%, rgba(226, 232, 240, 0.4));
  border-radius: 20px;
  overflow: hidden;
  transition: all 0.2s ease;
}
.np-group-header-row {
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  transform: none !important;
}
.np-group-card--expanded {
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
}

.np-chevron-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  color: var(--text-muted);
  margin-left: 0.5rem;
}
.np-chevron-icon--rotated {
  transform: rotate(180deg);
}

/* Accordion children */
.np-group-children {
  background: color-mix(in srgb, var(--soft-bg) 35%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
}

.np-sub-item {
  display: flex;
  align-items: flex-start;
  padding: 1rem 1.25rem 1rem 2.8rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
  cursor: pointer;
  transition: background 0.15s ease;
}
.np-sub-item:last-child {
  border-bottom: none;
}
.np-sub-item:hover {
  background: var(--soft-bg);
}

.np-sub-item--unread {
  background: color-mix(in srgb, var(--primary) 2%, transparent);
}

.np-sub-item--critical {
  border-left: 4px solid #ef4444;
  padding-left: calc(1.25rem - 4px);
}

.np-sub-item-indicator {
  width: 0.75rem;
  display: flex;
  align-items: center;
  margin-top: 0.35rem;
}

.np-unread-dot-small {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 6px var(--primary);
}

.np-sub-item-body {
  flex: 1;
  min-width: 0;
}

.np-sub-item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.15rem;
}

.np-sub-item-time {
  font-size: 0.7rem;
  color: var(--text-muted);
  opacity: 0.75;
}

.np-sub-item-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 750;
  color: var(--text-main);
  margin-bottom: 0.2rem;
}

.np-sub-item-message {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
  margin-bottom: 0.6rem;
}

.np-sub-item-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.np-sub-item-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Accordion expand transitions */
.np-group-expand-enter-active,
.np-group-expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 1000px;
  overflow: hidden;
}
.np-group-expand-enter-from,
.np-group-expand-leave-to {
  max-height: 0;
  opacity: 0;
}

/* ── Actor avatar + source icon ──────────────────────────────────────────── */
.np-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 2.55rem;
  height: 2.55rem;
}

.np-avatar-img,
.np-avatar-fallback {
  width: 2.55rem;
  height: 2.55rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  background: color-mix(in srgb, var(--primary) 12%, var(--soft-bg));
  color: var(--primary);
  object-fit: cover;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 900;
}

.np-source-icon {
  position: absolute;
  right: -0.18rem;
  bottom: -0.18rem;
  width: 1.08rem;
  height: 1.08rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--card-bg);
}

.np-icon--primary { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.np-icon--success { background: rgba(34, 197, 94, 0.12);  color: #15803d; }
.np-icon--warning { background: rgba(239, 68, 68, 0.12);  color: #b91c1c; }
.np-icon--purple  { background: rgba(124, 58, 237, 0.12); color: #6d28d9; }
.np-icon--cyan    { background: rgba(6, 182, 212, 0.12);  color: #0891b2; }
.np-icon--red     { background: rgba(239, 68, 68, 0.12);  color: #ef4444; }
.np-icon--neutral { background: var(--soft-bg); color: var(--text-muted); }

:root[data-theme='dark-gray'] .np-icon--success { background: rgba(34, 197, 94, 0.14);  color: #4ade80; }
:root[data-theme='dark-gray'] .np-icon--warning { background: rgba(239, 68, 68, 0.14);  color: #f87171; }
:root[data-theme='dark-gray'] .np-icon--purple  { background: rgba(124, 58, 237, 0.14); color: #a78bfa; }
:root[data-theme='dark-gray'] .np-icon--cyan    { background: rgba(6, 182, 212, 0.14); color: #22d3ee; }

/* ── Body ────────────────────────────────────────────────────────────────── */
.np-item-body { flex: 1; min-width: 0; }

.np-item-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 750;
  margin-bottom: 0.1rem;
}

.np-item-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.np-item-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--text-main);
}
.np-item-right-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.np-item-time {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  opacity: 0.75;
}
.np-item-message {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0.22rem 0 0.5rem;
  line-height: 1.5;
}

.np-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.np-action-label {
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 850;
  white-space: nowrap;
}

/* ── Type badge ──────────────────────────────────────────────────────────── */
.np-type-badge {
  display: inline-flex;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.67rem;
  font-weight: 800;
  border: 1px solid transparent;
}
.np-type-badge--primary { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 25%, transparent); }
.np-type-badge--success { background: rgba(34, 197, 94, 0.10); color: #15803d; border-color: rgba(34, 197, 94, 0.25); }
.np-type-badge--warning { background: rgba(239, 68, 68, 0.10); color: #b91c1c; border-color: rgba(239, 68, 68, 0.25); }
.np-type-badge--purple  { background: rgba(124, 58, 237, 0.10); color: #6d28d9; border-color: rgba(124, 58, 237, 0.25); }
.np-type-badge--cyan    { background: rgba(6, 182, 212, 0.10);  color: #0891b2; border-color: rgba(6, 182, 212, 0.25); }
.np-type-badge--red     { background: rgba(239, 68, 68, 0.10);  color: #ef4444; border-color: rgba(239, 68, 68, 0.25); }
.np-type-badge--neutral { background: var(--soft-bg); color: var(--text-muted); border-color: var(--border); }

:root[data-theme='dark-gray'] .np-type-badge--success { color: #4ade80; }
:root[data-theme='dark-gray'] .np-type-badge--warning { color: #f87171; }
:root[data-theme='dark-gray'] .np-type-badge--purple  { color: #a78bfa; }
:root[data-theme='dark-gray'] .np-type-badge--cyan    { color: #22d3ee; }

/* ── Unread dot ──────────────────────────────────────────────────────────── */
.np-unread-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--primary);
  margin-top: 0.5rem;
  box-shadow: 0 0 6px var(--primary);
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
.np-skeleton {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.np-skel-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 16px;
}
.np-skel-icon {
  flex-shrink: 0;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--text-muted) 14%, transparent);
  animation: np-shimmer 1.2s ease infinite;
}
.np-skel-body { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }
.np-skel-line {
  height: 0.75rem;
  border-radius: 6px;
  background: color-mix(in srgb, var(--text-muted) 14%, transparent);
  animation: np-shimmer 1.2s ease infinite;
}
.np-skel-line--short { width: 55%; }

@keyframes np-shimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.8; }
}

/* ── Empty state ─────────────────────────────────────────────────────────── */
.np-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4.5rem 2rem;
  text-align: center;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--card-bg) 60%, transparent);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid color-mix(in srgb, var(--border) 60%, rgba(226, 232, 240, 0.4));
  border-radius: 20px;
}

.np-empty-icon-container {
  position: relative;
  width: 90px;
  height: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.np-empty-glow {
  position: absolute;
  width: 70px;
  height: 70px;
  border-radius: 999px;
  background: radial-gradient(circle, color-mix(in srgb, var(--primary) 22%, transparent) 0%, transparent 70%);
  filter: blur(8px);
  animation: glowPulsePage 3s ease-in-out infinite alternate;
}

@keyframes glowPulsePage {
  0% { transform: scale(0.9); opacity: 0.5; }
  100% { transform: scale(1.1); opacity: 0.9; }
}

.np-empty-bell-svg {
  color: var(--primary);
  opacity: 0.7;
  filter: drop-shadow(0 0 10px color-mix(in srgb, var(--primary) 30%, transparent));
}

.np-empty-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 0.35rem 0;
}

.np-empty-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
  max-width: 240px;
  line-height: 1.45;
}

/* ── Load more ───────────────────────────────────────────────────────────── */
.np-load-more {
  display: flex;
  justify-content: center;
  margin-top: 1.2rem;
}

/* ── Tab navigation ──────────────────────────────────────────────────────── */
.np-tabs-container {
  border-bottom: 1.5px solid var(--border);
  margin-bottom: 1.5rem;
}
.np-tabs {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  scrollbar-width: none;
}
.np-tabs::-webkit-scrollbar {
  display: none;
}
.np-tab-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 0.25rem;
  border-bottom: 2.5px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-family: 'Raleway', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: border-color 150ms ease, color 150ms ease;
}
.np-tab-btn:hover {
  color: var(--text-main);
}
.np-tab-btn--active {
  border-color: var(--primary);
  color: var(--primary);
}
.np-tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: var(--soft-bg);
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
}
.np-tab-btn--active .np-tab-count {
  background: color-mix(in srgb, var(--primary) 15%, transparent);
  color: var(--primary);
}

/* ── Priority Badges ─────────────────────────────────────────────────────── */
.np-priority-badge {
  display: inline-flex;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
}
.np-priority-badge--critical {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.np-priority-badge--high {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}
.np-priority-badge--low {
  background: rgba(100, 116, 139, 0.15);
  color: #64748b;
}

/* ── Acknowledge Button & Actions ────────────────────────────────────────── */
.np-ack-btn {
  padding: 0.35rem 0.85rem;
  border-radius: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  background: var(--primary);
  color: #0b2e2d;
  border: none;
  cursor: pointer;
  transition: opacity 120ms ease;
}
.np-ack-btn:hover {
  opacity: 0.9;
}

.np-action-btn-primary,
.np-action-btn-secondary {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.np-action-btn-primary {
  background: var(--primary);
  color: #0b2e2d;
  border: none;
}

.np-action-btn-primary:hover {
  filter: brightness(1.05);
}

.np-action-btn-secondary {
  background: var(--soft-bg);
  color: var(--text-main);
  border: 1px solid var(--border);
}

.np-action-btn-secondary:hover {
  background: var(--border);
}

.np-item-hover-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

@media (min-width: 769px) {
  .np-item-hover-actions,
  .np-sub-item-actions {
    opacity: 0;
    pointer-events: none;
    transform: translateY(2px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .np-item:hover .np-item-hover-actions,
  .np-sub-item:hover .np-sub-item-actions {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .np-item-hover-actions,
  .np-sub-item-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

/* ── Analytics ───────────────────────────────────────────────────────────── */
.np-analytics {
  animation: modal-fade 200ms ease;
}
.np-stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  box-shadow: var(--shadow-sm);
}
.np-stat-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 600;
}
.np-stat-value {
  font-family: 'Raleway', sans-serif;
  font-size: 1.75rem;
  font-weight: 800;
}
.np-analytics-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}
.np-analytics-table th {
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 750;
  color: var(--text-muted);
  border-bottom: 1.5px solid var(--border);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.np-analytics-table td {
  padding: 1rem;
  font-size: 0.82rem;
  border-bottom: 1px solid var(--border);
  vertical-align: middle;
}
.np-analytics-table tr:last-child td {
  border-bottom: none;
}
.np-loading {
  text-align: center;
  padding: 3rem;
  color: var(--text-muted);
  font-size: 0.9rem;
}
</style>
