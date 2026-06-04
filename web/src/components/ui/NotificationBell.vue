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
      <span v-if="notifs.hasUnread" class="nb-badge" aria-live="polite">
        {{ notifs.unreadCount > 99 ? '99+' : notifs.unreadCount }}
      </span>
    </button>

    <!-- Dropdown panel -->
    <Transition name="nb-drop">
      <div v-if="open" class="nb-panel" role="dialog" aria-label="Notifications panel">
        <!-- Panel header -->
        <div class="nb-panel-header">
          <span class="nb-panel-title">Notifications</span>
          <div class="nb-panel-actions">
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

        <!-- List -->
        <div class="nb-list" role="list">
          <div v-if="notifs.loading" class="nb-empty">
            <div class="nb-loading-row" /><div class="nb-loading-row nb-loading-row--short" />
          </div>

          <div v-else-if="recent.length === 0" class="nb-empty">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <p class="nb-empty-text">You're all caught up!</p>
          </div>

          <template v-for="group in groupedRecent" :key="group.key">
            <div class="nb-group-head">{{ group.label }}</div>
            <div
              v-for="n in group.items"
              :key="n.id"
              class="nb-item"
              :class="{ 'nb-item--unread': !n.isRead }"
              @click="openNotification(n)"
            >
              <div class="nb-item-content">
                <div class="nb-avatar-wrap" :title="actorName(n)">
                  <img
                    v-if="n.actorAvatarUrl"
                    class="nb-avatar-img"
                    :src="n.actorAvatarUrl"
                    :alt="actorName(n)"
                    loading="lazy"
                  />
                  <span v-else class="nb-avatar-fallback">{{ actorInitials(n) }}</span>
                  <span class="nb-source-icon" :class="`nb-icon--${iconVariant(n.type)}`" v-html="sourceIconSvg(n.type)" />
                </div>
                <div class="nb-item-body">
                  <div class="nb-item-meta">
                    <span>{{ actorName(n) }}</span>
                    <span aria-hidden="true">•</span>
                    <span>{{ sourceLabel(n.type) }}</span>
                  </div>
                  <div class="nb-item-top">
                    <div class="nb-item-title">{{ n.title }}</div>
                    <span v-if="!n.isRead" class="nb-unread-dot" />
                  </div>
                  <div class="nb-item-message">{{ n.message }}</div>
                  <div class="nb-item-footer">
                    <span class="nb-item-time">{{ timeAgo(n.createdAt) }}</span>
                    <button v-if="hasAction(n)" class="nb-item-action" type="button" @click.stop="openNotification(n)">
                      {{ actionLabel(n) }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
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
} from '@/lib/notificationDisplay';

const notifs = useNotificationsStore();
const auth   = useAuthStore();
const router = useRouter();
const open   = ref(false);
const wrapRef = ref<HTMLElement | null>(null);
const showAdminTestButton = computed(() => import.meta.env.DEV && auth.isAdmin);

const recent = computed(() => notifs.notifications.slice(0, 8));
const groupedRecent = computed(() => groupNotificationsByDay(recent.value));

const sourceIconSvg = (type: NotificationType): string => notificationIconSvg(type, 11);

const toggleOpen = async () => {
  open.value = !open.value;
  if (open.value) {
    await notifs.fetchNotifications(20);
  }
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
  } else if (n.type === 'blocker_reported' && n.relatedId) {
    router.push(isAdmin ? `/team-blockers?blocker=${n.relatedId}` : '/team-blockers');
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
    'submission_received', 'blocker_reported', 'blocker_resolved',
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
    blocker_reported: 'View Blocker',
    blocker_resolved: 'View Blocker',
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

const actorName = (n: AppNotification): string => n.actorName || (n.actorId ? 'Team member' : 'System');

const actorInitials = (n: AppNotification): string => {
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
  color: #fff;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.6rem;
  font-weight: 900;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--topbar-bg, var(--card-bg));
  pointer-events: none;
}

/* ── Dropdown panel ──────────────────────────────────────────────────────── */
.nb-panel {
  position: absolute;
  top: calc(100% + 0.6rem);
  right: 0;
  width: min(440px, calc(100vw - 2rem));
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.14);
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
  gap: 0.5rem;
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

.nb-empty-text {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0;
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
  background: color-mix(in srgb, var(--primary) 3%, transparent);
  border-left: 3px solid var(--primary);
  padding-left: calc(1.15rem - 3px);
}
.nb-item--unread:hover {
  background: color-mix(in srgb, var(--primary) 6%, var(--soft-bg));
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
.nb-icon--neutral { background: var(--soft-bg); color: var(--text-muted); }

:root[data-theme='dark-gray'] .nb-icon--success { background: rgba(34, 197, 94, 0.14); color: #4ade80; }
:root[data-theme='dark-gray'] .nb-icon--warning { background: rgba(239, 68, 68, 0.14); color: #f87171; }
:root[data-theme='dark-gray'] .nb-icon--purple  { background: rgba(124, 58, 237, 0.14); color: #a78bfa; }

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

.nb-unread-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--primary);
  box-shadow: 0 0 0 2.5px var(--card-bg);
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

.nb-item-action {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  color: #fff;
  background: var(--primary);
  border: none;
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 25%, transparent);
}

.nb-item-action:hover {
  transform: translateY(-1px);
  filter: brightness(1.1);
  box-shadow: 0 6px 15px color-mix(in srgb, var(--primary) 35%, transparent);
}

.nb-item-action:active {
  transform: translateY(0);
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
