<template>
  <div class="nb-wrap" ref="wrapRef">
    <!-- Bell button -->
    <button
      class="nb-bell"
      type="button"
      aria-label="Notifications"
      :aria-expanded="open"
      @click="toggleOpen"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <Transition name="nb-badge-pop">
        <span v-if="notifs.hasUnread" class="nb-badge" :class="{ 'nb-badge--pulse': pulse }" aria-live="polite">
          {{ notifs.unreadCount > 99 ? '99+' : notifs.unreadCount }}
        </span>
      </Transition>
    </button>

    <!-- Dropdown panel -->
    <Transition name="nb-drop">
      <div v-if="open" class="nb-panel" role="dialog" aria-label="Notifications panel">
        <!-- Panel header -->
        <div class="nb-panel-header">
          <span class="nb-panel-title">Notifications</span>
          <div class="nb-panel-actions">
            <!-- Inline sound toggle -->
            <button
              class="nb-sound-toggle"
              type="button"
              :title="notifs.preferences?.soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'"
              @click="toggleSound"
            >
              <svg v-if="notifs.preferences?.soundEnabled" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="nb-sound-muted">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            </button>

            <button
              v-if="notifs.hasUnread"
              class="nb-action-btn"
              type="button"
              @click="markAllRead"
            >
              Mark all read
            </button>
            <button
              v-if="showAdminTestButton"
              class="nb-action-btn"
              type="button"
              @click="createTestNotification"
            >
              Test
            </button>
            <RouterLink to="/notifications" class="nb-action-btn nb-action-link" @click="open = false">
              View all
            </RouterLink>
          </div>
        </div>

        <!-- Filter tabs -->
        <div class="nb-filters" role="tablist">
          <button
            v-for="tab in filterTabs"
            :key="tab.key"
            type="button"
            role="tab"
            class="nb-filter-tab"
            :class="{ 'nb-filter-tab--active': filter === tab.key }"
            :aria-selected="filter === tab.key"
            @click="filter = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>

        <!-- List -->
        <div class="nb-list" role="list">
          <div v-if="notifs.loading" class="nb-empty">
            <div class="nb-loading-row" /><div class="nb-loading-row nb-loading-row--short" />
          </div>

          <div v-else-if="recent.length === 0" class="nb-empty-state">
            <div class="nb-empty-icon-container">
              <div class="nb-empty-glow" />
              <svg class="nb-empty-bell-svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
            </div>
            <p class="nb-empty-title">You're all caught up.</p>
            <p class="nb-empty-desc">No new notifications right now.</p>
          </div>

          <template v-else v-for="group in groupedRecent" :key="group.key">
            <div class="nb-group-head">{{ group.label }}</div>
            <div class="nb-group-items-wrap">
              <template v-for="groupItem in group.items" :key="groupItem.id">
                <!-- Grouped notifications (Accordion) -->
                <div v-if="groupItem.isGroup" class="nb-group-card" :class="{ 'nb-group-card--expanded': expandedGroups[groupItem.id] }">
                  <div
                    class="nb-item nb-group-header-row"
                    :class="{ 'nb-item--unread': !groupItem.isRead, 'nb-item--critical': groupItem.priority === 'critical' }"
                    @click="toggleGroup(groupItem.id)"
                  >
                    <div class="nb-item-content">
                      <div class="nb-avatar-wrap" :title="actorName(groupItem)">
                        <img
                          v-if="groupItem.actorAvatarUrl"
                          class="nb-avatar-img"
                          :src="groupItem.actorAvatarUrl"
                          :alt="actorName(groupItem)"
                          loading="lazy"
                        />
                        <span v-else class="nb-avatar-fallback">{{ actorInitials(groupItem) }}</span>
                        <span class="nb-source-icon" :class="`nb-icon--${iconVariant(groupItem.type)}`" v-html="sourceIconSvg(groupItem.type)" />
                      </div>
                      <div class="nb-item-body">
                        <div class="nb-item-meta">
                          <span>{{ actorName(groupItem) }}</span>
                          <span aria-hidden="true">•</span>
                          <span>{{ sourceLabel(groupItem.type) }}</span>
                        </div>
                        <div class="nb-item-top">
                          <div class="nb-item-title">{{ groupItem.title }}</div>
                          <div class="nb-item-right-actions">
                            <span v-if="!groupItem.isRead" class="nb-unread-dot" />
                            <span class="nb-chevron-icon" :class="{ 'nb-chevron-icon--rotated': expandedGroups[groupItem.id] }">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <polyline points="6 9 12 15 18 9"></polyline>
                              </svg>
                            </span>
                          </div>
                        </div>
                        <div class="nb-item-message">{{ groupItem.message }}</div>
                        <div class="nb-item-footer">
                          <span class="nb-item-time">{{ timeAgo(groupItem.createdAt) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Transition name="nb-group-expand">
                    <div v-if="expandedGroups[groupItem.id]" class="nb-group-children">
                      <div
                        v-for="subNotif in groupItem.items"
                        :key="subNotif.id"
                        class="nb-sub-item"
                        :class="{ 'nb-sub-item--unread': !subNotif.isRead, 'nb-sub-item--critical': subNotif.priority === 'critical' }"
                        @click="openNotification(subNotif)"
                      >
                        <div class="nb-sub-item-indicator">
                          <span v-if="!subNotif.isRead" class="nb-unread-dot-small" />
                        </div>
                        <div class="nb-sub-item-body">
                          <div class="nb-sub-item-title">{{ subNotif.title }}</div>
                          <div class="nb-sub-item-message">{{ subNotif.message }}</div>
                          <div class="nb-sub-item-footer">
                            <span class="nb-sub-item-time">{{ timeAgo(subNotif.createdAt) }}</span>
                            <div class="nb-sub-item-actions">
                              <button
                                v-if="!subNotif.isRead"
                                class="nb-sub-action-btn nb-sub-action-btn--secondary"
                                type="button"
                                @click.stop="notifs.markRead(subNotif.id)"
                              >
                                Mark Read
                              </button>
                              <button
                                v-if="hasAction(subNotif)"
                                class="nb-sub-action-btn"
                                type="button"
                                @click.stop="openNotification(subNotif)"
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
                  class="nb-item"
                  :class="{ 'nb-item--unread': !groupItem.isRead, 'nb-item--critical': groupItem.priority === 'critical' }"
                  @click="openNotification(groupItem)"
                >
                  <div class="nb-item-content">
                    <div class="nb-avatar-wrap" :title="actorName(groupItem)">
                      <img
                        v-if="groupItem.actorAvatarUrl"
                        class="nb-avatar-img"
                        :src="groupItem.actorAvatarUrl"
                        :alt="actorName(groupItem)"
                        loading="lazy"
                      />
                      <span v-else class="nb-avatar-fallback">{{ actorInitials(groupItem) }}</span>
                      <span class="nb-source-icon" :class="`nb-icon--${iconVariant(groupItem.type)}`" v-html="sourceIconSvg(groupItem.type)" />
                    </div>
                    <div class="nb-item-body">
                      <div class="nb-item-meta">
                        <span>{{ actorName(groupItem) }}</span>
                        <span aria-hidden="true">•</span>
                        <span>{{ sourceLabel(groupItem.type) }}</span>
                      </div>
                      <div class="nb-item-top">
                        <div class="nb-item-title">{{ groupItem.title }}</div>
                        <span v-if="!groupItem.isRead" class="nb-unread-dot" />
                      </div>
                      <div class="nb-item-message">{{ groupItem.message }}</div>
                      <div class="nb-item-footer">
                        <span class="nb-item-time">{{ timeAgo(groupItem.createdAt) }}</span>
                        <div class="nb-item-hover-actions">
                          <button
                            v-if="!groupItem.isRead"
                            class="nb-hover-btn nb-hover-btn--secondary"
                            type="button"
                            @click.stop="notifs.markRead(groupItem.id)"
                          >
                            Mark Read
                          </button>
                          <button
                            v-if="hasAction(groupItem)"
                            class="nb-hover-btn"
                            type="button"
                            @click.stop="openNotification(groupItem)"
                          >
                            {{ actionLabel(groupItem) }}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import { useNotificationsStore, type AppNotification, type NotificationType } from '@/stores/notifications';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import {
  notificationCategoryLabel as sourceLabel,
  notificationIconSvg,
  notificationVariant as iconVariant,
  notificationTimeAgo as timeAgo,
  groupNotificationsByDay,
  groupNotificationsIntelligently,
} from '@/lib/notificationDisplay';

const notifs = useNotificationsStore();
const auth   = useAuthStore();
const router = useRouter();
const open   = ref(false);
const wrapRef = ref<HTMLElement | null>(null);
const showAdminTestButton = computed(() => import.meta.env.DEV && auth.isAdmin);

const expandedGroups = ref<Record<string, boolean>>({});

// Subtle one-shot badge pulse whenever the unread count grows (new notification).
const pulse = ref(false);
let pulseTimer: ReturnType<typeof setTimeout> | null = null;
watch(() => notifs.unreadCount, (next, prev) => {
  if (next > (prev ?? 0)) {
    pulse.value = false;
    requestAnimationFrame(() => { pulse.value = true; });
    if (pulseTimer) clearTimeout(pulseTimer);
    pulseTimer = setTimeout(() => { pulse.value = false; }, 1000);
  }
});

// ── Filters ───────────────────────────────────────────────────────────────
type NotifFilter = 'all' | 'unread' | 'tasks' | 'quality' | 'followups' | 'system';
const filter = ref<NotifFilter>('all');
const filterTabs: { key: NotifFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'quality', label: 'Quality' },
  { key: 'followups', label: 'Followups' },
  { key: 'system', label: 'System' },
];
const FILTER_TYPES: Record<Exclude<NotifFilter, 'all' | 'unread'>, NotificationType[]> = {
  tasks:      ['task_assigned', 'task_updated', 'task_comment', 'task_deadline_changed', 'task_needs_fix', 'task_approved', 'task_completed', 'work_reviewed', 'submission_received', 'prompt_replaced', 'blocker_reported', 'blocker_resolved'],
  quality:    ['quality_issue_reported', 'quality_issue_fixed'],
  followups:  ['blog_followup', 'plugin_update', 'ebay_click_followup', 'speed_optimization_followup', 'monthly_report'],
  system:     ['announcement', 'daily_summary', 'mention'],
};
const matchesFilter = (n: AppNotification): boolean => {
  if (filter.value === 'all') return true;
  if (filter.value === 'unread') return !n.isRead;
  return FILTER_TYPES[filter.value].includes(n.type);
};

const recent = computed(() => notifs.notifications.filter(matchesFilter).slice(0, 12));
const intelligentRecent = computed(() => groupNotificationsIntelligently(recent.value));
const groupedRecent = computed(() => groupNotificationsByDay(intelligentRecent.value));

const sourceIconSvg = (type: NotificationType): string => notificationIconSvg(type, 11);

const toggleOpen = async () => {
  open.value = !open.value;
  if (open.value) {
    await notifs.fetchNotifications(20);
  }
};

const toggleGroup = (groupId: string) => {
  expandedGroups.value[groupId] = !expandedGroups.value[groupId];
};

const toggleSound = async () => {
  const currentVal = notifs.preferences?.soundEnabled !== false;
  await notifs.updatePreferences({ soundEnabled: !currentVal });
};

const markAllRead = async () => {
  await notifs.markAllRead();
};

const createTestNotification = async () => {
  await notifs.createTestAdminNotification();
};

const openNotification = async (n: AppNotification) => {
  open.value = false;
  await notifs.markRead(n.id);
  
  const isTask = n.taskId || n.type.startsWith('task_') || n.relatedType === 'task';
  const isAdmin = auth.isAdmin;
  const data = useDataStore();

  if (isTask && n.taskId) {
    let base = isAdmin ? '/work-board/members' : '/work-board/my';
    if (isAdmin) {
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

const hasAction = (n: AppNotification) => {
  return [
    'task_assigned', 'task_updated', 'task_comment', 'task_deadline_changed', 
    'task_needs_fix', 'task_approved', 'task_completed', 'prompt_replaced', 
    'submission_received',
    'blog_followup', 'plugin_update', 'ebay_click_followup',
    'speed_optimization_followup', 'quality_issue_reported', 'quality_issue_fixed'
  ].includes(n.type);
};

const actionLabel = (n: AppNotification) => {
  const map: Partial<Record<NotificationType, string>> = {
    task_assigned: 'View Task',
    task_updated: 'View Task',
    task_comment: 'Open Task',
    task_deadline_changed: 'Open Task',
    task_needs_fix: 'View Feedback',
    task_approved: 'View Task',
    task_completed: 'View Task',
    prompt_replaced: 'Open New Prompt',
    submission_received: 'Review Submission',
    blog_followup: 'View Followup',
    plugin_update: 'View Followup',
    ebay_click_followup: 'View Followup',
    speed_optimization_followup: 'View Speed Check',
    quality_issue_reported: 'Open Issue',
    quality_issue_fixed: 'Review Fix',
  };
  return map[n.type] ?? 'View';
};

// ── Actor identity ───────────────────────────────────────────────────────────

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

// ── Close on outside click ─────────────────────────────────────────────────

const onDocClick = (e: MouseEvent) => {
  if (!open.value) return;
  if (wrapRef.value && !wrapRef.value.contains(e.target as Node)) open.value = false;
};
onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>

<style scoped>
/* ── Wrapper ─────────────────────────────────────────────────────────────── */
.nb-wrap {
  position: relative;
  display: inline-flex;
}

/* ── Bell button ─────────────────────────────────────────────────────────── */
.nb-bell {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 140ms ease, border-color 140ms ease, color 140ms ease;
}

.nb-bell:hover {
  background: var(--soft-bg);
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--primary);
}

/* ── Unread badge ────────────────────────────────────────────────────────── */
.nb-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.28rem;
  border-radius: 999px;
  background: var(--primary);
  color: #0b2e2d;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.6rem;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--topbar-bg, var(--card-bg));
  pointer-events: none;
  transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

/* One-shot pulse only when a new notification arrives (not a looping animation). */
.nb-badge--pulse {
  animation: badgePulse 0.9s ease-out;
}

@keyframes badgePulse {
  0%   { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 60%, transparent); }
  70%  { box-shadow: 0 0 0 6px color-mix(in srgb, var(--primary) 0%, transparent); }
  100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--primary) 0%, transparent); }
}

.nb-badge-pop-enter-active {
  animation: badgePop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.nb-badge-pop-leave-active {
  transition: transform 0.15s ease, opacity 0.15s ease;
}
.nb-badge-pop-leave-to {
  transform: scale(0);
  opacity: 0;
}

@keyframes badgePop {
  0% { transform: scale(0); }
  70% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* ── Dropdown panel ──────────────────────────────────────────────────────── */
.nb-panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  width: min(420px, calc(100vw - 1.5rem));
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  z-index: 100;
  overflow: hidden;
}

/* ── Panel header ────────────────────────────────────────────────────────── */
.nb-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem 0.65rem;
  border-bottom: 1px solid var(--border);
}

.nb-panel-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
}

.nb-panel-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.nb-sound-toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 6px;
  transition: all 120ms ease;
}

.nb-sound-toggle:hover {
  background: var(--soft-bg);
  color: var(--primary);
}

.nb-sound-muted {
  color: var(--text-muted);
  opacity: 0.6;
}

.nb-action-btn {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  transition: background 120ms ease;
  text-decoration: none;
}
.nb-action-btn:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); }

/* ── Filter tabs ─────────────────────────────────────────────────────────── */
.nb-filters {
  display: flex;
  gap: 0.3rem;
  padding: 0.55rem 0.85rem;
  border-bottom: 1px solid var(--border);
  overflow-x: auto;
  scrollbar-width: none;
}
.nb-filters::-webkit-scrollbar { display: none; }
.nb-filter-tab {
  flex-shrink: 0;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  background: var(--soft-bg);
  border: 1px solid transparent;
  border-radius: 999px;
  padding: 0.28rem 0.7rem;
  cursor: pointer;
  white-space: nowrap;
  transition: background 130ms ease, color 130ms ease, border-color 130ms ease;
}
.nb-filter-tab:hover { color: var(--text-main); }
.nb-filter-tab--active {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: color-mix(in srgb, var(--primary) 28%, transparent);
}

/* ── Notification list ───────────────────────────────────────────────────── */
.nb-list {
  max-height: 420px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.35rem 0;
}

.nb-list::-webkit-scrollbar { width: 4px; }
.nb-list::-webkit-scrollbar-track { background: transparent; }
.nb-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 999px; }

/* ── Empty / loading ─────────────────────────────────────────────────────── */
.nb-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2.2rem 1rem;
  color: var(--text-muted);
}

.nb-loading-row {
  height: 0.75rem;
  border-radius: 6px;
  width: 80%;
  background: color-mix(in srgb, var(--text-muted) 18%, transparent);
  animation: nb-shimmer 1.2s ease infinite;
}
.nb-loading-row--short { width: 50%; }

@keyframes nb-shimmer {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.9; }
}

.nb-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1.5rem;
  text-align: center;
  color: var(--text-muted);
}

.nb-empty-icon-container {
  position: relative;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.75rem;
}

.nb-empty-glow {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 58px;
  height: 58px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}

.nb-empty-bell-svg {
  position: relative;
  color: var(--primary);
  opacity: 0.85;
}

.nb-empty-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0 0 0.2rem 0;
}

.nb-empty-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin: 0;
  max-width: 200px;
  line-height: 1.4;
}

/* ── Day group header ────────────────────────────────────────────────────── */
.nb-group-head {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 0.5rem 1.15rem 0.3rem;
  background: var(--card-bg);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
}

.nb-group-items-wrap {
  display: flex;
  flex-direction: column;
}

/* ── Notification item ───────────────────────────────────────────────────── */
.nb-item {
  display: flex;
  flex-direction: column;
  width: 100%;
  padding: 0.9rem 1.15rem;
  background: transparent;
  border-bottom: 1px solid var(--border);
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.nb-item:last-child { border-bottom: none; }

.nb-item:hover { background: var(--soft-bg); }

.nb-item:not(.nb-item--unread) {
  opacity: 0.88;
}

.nb-item--unread {
  background: color-mix(in srgb, var(--primary) 5%, transparent);
  border-left: 3px solid var(--primary);
  padding-left: calc(1.15rem - 3px);
}
.nb-item--unread:hover {
  background: color-mix(in srgb, var(--primary) 9%, var(--soft-bg));
}

.nb-item--critical {
  border-left: 3px solid #ef4444 !important;
  background: rgba(239, 68, 68, 0.02);
}
.nb-item--critical:hover {
  background: rgba(239, 68, 68, 0.05);
}

/* ── Actor avatar + source icon ──────────────────────────────────────────── */
.nb-avatar-wrap {
  position: relative;
  flex-shrink: 0;
  width: 2.45rem;
  height: 2.45rem;
}

.nb-avatar-img,
.nb-avatar-fallback {
  width: 2.45rem;
  height: 2.45rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  background: color-mix(in srgb, var(--primary) 12%, var(--soft-bg));
  color: var(--primary);
  object-fit: cover;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
}

.nb-source-icon {
  position: absolute;
  right: -0.18rem;
  bottom: -0.18rem;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--card-bg);
  background: var(--soft-bg);
  color: var(--text-muted);
}

.nb-icon--primary { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
.nb-icon--success { background: rgba(34, 197, 94, 0.12); color: #16a34a; }
.nb-icon--warning { background: rgba(239, 68, 68, 0.12); color: #dc2626; }
.nb-icon--purple  { background: rgba(124, 58, 237, 0.12); color: #7c3aed; }
.nb-icon--cyan    { background: rgba(6, 182, 212, 0.12); color: #0891b2; }
.nb-icon--red     { background: rgba(239, 68, 68, 0.12); color: #ef4444; }
.nb-icon--neutral { background: var(--soft-bg); color: var(--text-muted); }

:root[data-theme='dark-gray'] .nb-icon--success { background: rgba(34, 197, 94, 0.14); color: #4ade80; }
:root[data-theme='dark-gray'] .nb-icon--warning { background: rgba(239, 68, 68, 0.14); color: #f87171; }
:root[data-theme='dark-gray'] .nb-icon--purple  { background: rgba(124, 58, 237, 0.14); color: #a78bfa; }
:root[data-theme='dark-gray'] .nb-icon--cyan    { background: rgba(6, 182, 212, 0.14); color: #22d3ee; }

/* ── Item text ───────────────────────────────────────────────────────────── */
.nb-item-content {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  width: 100%;
}

.nb-item-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.nb-item-right-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.nb-unread-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 6px var(--primary);
}

.nb-item-body {
  flex: 1;
  min-width: 0;
}

.nb-item-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.12rem;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 750;
  line-height: 1.2;
}

.nb-item-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 750;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nb-item-message {
  font-size: 0.75rem;
  line-height: 1.4;
  color: var(--text-muted);
  margin-top: 0.18rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.nb-item-time {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 0.25rem;
  opacity: 0.7;
}

.nb-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.65rem;
}

/* Accordion Group Card */
.nb-group-card {
  border-bottom: 1px solid var(--border);
}
.nb-group-card:last-child {
  border-bottom: none;
}
.nb-group-header-row {
  border-bottom: none !important;
}

.nb-chevron-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  color: var(--text-muted);
}
.nb-chevron-icon--rotated {
  transform: rotate(180deg);
}

/* Accordion transitions */
.nb-group-expand-enter-active,
.nb-group-expand-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 500px;
  overflow: hidden;
}
.nb-group-expand-enter-from,
.nb-group-expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.nb-group-children {
  background: color-mix(in srgb, var(--soft-bg) 35%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--border) 40%, transparent);
}

.nb-sub-item {
  display: flex;
  align-items: flex-start;
  padding: 0.65rem 1.15rem 0.65rem 2.2rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 30%, transparent);
  cursor: pointer;
  transition: background 0.15s ease;
}
.nb-sub-item:last-child {
  border-bottom: none;
}
.nb-sub-item:hover {
  background: var(--soft-bg);
}

.nb-sub-item--unread {
  background: color-mix(in srgb, var(--primary) 2%, transparent);
}

.nb-sub-item--critical {
  border-left: 3px solid #ef4444;
  padding-left: calc(1.15rem - 3px);
}

.nb-sub-item-indicator {
  width: 0.75rem;
  display: flex;
  align-items: center;
  margin-top: 0.3rem;
}

.nb-unread-dot-small {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 5px var(--primary);
}

.nb-sub-item-body {
  flex: 1;
  min-width: 0;
}

.nb-sub-item-title {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 750;
  color: var(--text-main);
  margin-bottom: 0.1rem;
}

.nb-sub-item-message {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.35;
  margin-bottom: 0.35rem;
}

.nb-sub-item-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nb-sub-item-time {
  font-size: 0.65rem;
  color: var(--text-muted);
  opacity: 0.7;
}

.nb-sub-item-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* ── Action Buttons (Hover states on desktop, always visible on mobile) ──── */
.nb-hover-btn,
.nb-sub-action-btn {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  color: #0b2e2d;
  background: var(--primary);
  border: none;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.nb-hover-btn--secondary,
.nb-sub-action-btn--secondary {
  color: var(--text-main);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  padding: 0.2rem 0.55rem;
}

.nb-hover-btn:hover,
.nb-sub-action-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 4px 10px color-mix(in srgb, var(--primary) 30%, transparent);
}

.nb-hover-btn--secondary:hover,
.nb-sub-action-btn--secondary:hover {
  background: var(--border);
}

.nb-hover-btn:active,
.nb-sub-action-btn:active {
  transform: translateY(0);
}

.nb-item-hover-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

@media (min-width: 769px) {
  .nb-item-hover-actions,
  .nb-sub-item-actions {
    opacity: 0;
    pointer-events: none;
    transform: translateY(2px);
    transition: opacity 0.15s ease, transform 0.15s ease;
  }

  .nb-item:hover .nb-item-hover-actions,
  .nb-sub-item:hover .nb-sub-item-actions {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .nb-item-hover-actions,
  .nb-sub-item-actions {
    opacity: 1;
    pointer-events: auto;
  }
}

/* ── Drop animation ──────────────────────────────────────────────────────── */
.nb-drop-enter-active { transition: opacity 160ms ease, transform 200ms cubic-bezier(0.16, 1, 0.3, 1); }
.nb-drop-leave-active { transition: opacity 120ms ease, transform 140ms ease; }
.nb-drop-enter-from  { opacity: 0; transform: translateY(-6px) scale(0.97); }
.nb-drop-leave-to    { opacity: 0; transform: translateY(-4px) scale(0.98); }

@media (prefers-reduced-motion: reduce) {
  .nb-drop-enter-active,
  .nb-drop-leave-active { transition: none; }
}
</style>

