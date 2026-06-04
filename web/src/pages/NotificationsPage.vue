<template>
  <div class="np-page">
    <!-- Page header -->
    <div class="np-header">
      <div>
        <h1 class="np-title">Notifications</h1>
        <p class="np-sub">Stay on top of tasks, comments, and reviews.</p>
      </div>
      <button
        v-if="notifs.hasUnread"
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

    <!-- Filter bar -->
    <div class="np-filters">
      <button
        v-for="f in filters"
        :key="f.value"
        class="np-filter-btn"
        :class="{ 'np-filter-btn--active': activeFilter === f.value }"
        type="button"
        @click="activeFilter = f.value"
      >
        {{ f.label }}
        <span v-if="f.count !== undefined" class="np-filter-count">{{ f.count }}</span>
      </button>

      <div class="np-filter-sep" />

      <select v-model="typeFilter" class="np-type-select">
        <option value="">All types</option>
        <option v-for="t in typeOptions" :key="t.value" :value="t.value">{{ t.label }}</option>
      </select>
    </div>

    <!-- Notification list -->
    <div v-if="notifs.loading && !notifs.initialized" class="np-skeleton">
      <div v-for="i in 5" :key="i" class="np-skel-item">
        <div class="np-skel-icon" />
        <div class="np-skel-body">
          <div class="np-skel-line" />
          <div class="np-skel-line np-skel-line--short" />
        </div>
      </div>
    </div>

    <div v-else-if="filtered.length === 0" class="np-empty">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.2;">
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </svg>
      <h3 class="np-empty-title">No notifications yet</h3>
      <p class="np-empty-sub">You're all caught up.</p>
    </div>

    <div v-else class="np-groups">
      <section v-for="group in grouped" :key="group.key" class="np-group">
        <div class="np-group-head">
          <span class="np-group-label">{{ group.label }}</span>
          <span class="np-group-count">{{ group.items.length }}</span>
        </div>

        <div class="np-list">
          <button
            v-for="n in group.items"
            :key="n.id"
            class="np-item"
            :class="{ 'np-item--unread': !n.isRead }"
            type="button"
            @click="open(n)"
          >
            <div class="np-avatar-wrap" :title="actorName(n)">
              <img
                v-if="n.actorAvatarUrl"
                class="np-avatar-img"
                :src="n.actorAvatarUrl"
                :alt="actorName(n)"
                loading="lazy"
              />
              <span v-else class="np-avatar-fallback">{{ actorInitials(n) }}</span>
              <span class="np-source-icon" :class="`np-icon--${iconVariant(n.type)}`" v-html="sourceIconSvg(n.type)" />
            </div>

            <!-- Body -->
            <div class="np-item-body">
              <div class="np-item-meta">
                <span>{{ actorName(n) }}</span>
                <span aria-hidden="true">•</span>
                <span>{{ sourceLabel(n.type) }}</span>
              </div>
              <div class="np-item-row">
                <span class="np-item-title">{{ n.title }}</span>
                <span class="np-item-time">{{ timeAgo(n.createdAt) }}</span>
              </div>
              <p class="np-item-message">{{ n.message }}</p>
              <div class="np-item-footer">
                <span class="np-type-badge" :class="`np-type-badge--${iconVariant(n.type)}`">
                  {{ sourceLabel(n.type) }}
                </span>
                <span class="np-action-label">{{ actionLabel(n) }}</span>
              </div>
            </div>

            <!-- Unread indicator -->
            <span v-if="!n.isRead" class="np-unread-dot" />
          </button>
        </div>
      </section>
    </div>

    <!-- Load more -->
    <div v-if="filtered.length > 0 && notifs.notifications.length >= pageSize" class="np-load-more">
      <button class="btn-secondary" type="button" :disabled="notifs.loading" @click="loadMore">
        {{ notifs.loading ? 'Loading…' : 'Load more' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationsStore, type AppNotification, type NotificationType } from '@/stores/notifications';
import PushNotificationCard from '@/components/ui/PushNotificationCard.vue';
import {
  notificationCategoryLabel as sourceLabel,
  notificationIconSvg,
  notificationVariant as iconVariant,
  notificationTimeAgo as timeAgo,
  groupNotificationsByDay,
} from '@/lib/notificationDisplay';

const notifs = useNotificationsStore();
const router = useRouter();

const activeFilter = ref<'all' | 'unread' | 'read'>('all');
const typeFilter   = ref<string>('');
const pageSize     = ref(50);

onMounted(async () => {
  await notifs.fetchNotifications(pageSize.value);
});

const loadMore = async () => {
  pageSize.value += 50;
  await notifs.fetchNotifications(pageSize.value);
};

// ── Filters ────────────────────────────────────────────────────────────────

const unreadCount = computed(() => notifs.notifications.filter((n) => !n.isRead).length);

const filters = computed(() => [
  { value: 'all'    as const, label: 'All',    count: notifs.notifications.length },
  { value: 'unread' as const, label: 'Unread', count: unreadCount.value },
  { value: 'read'   as const, label: 'Read',   count: notifs.notifications.length - unreadCount.value },
]);

const typeOptions: { value: NotificationType; label: string }[] = [
  { value: 'task_assigned',         label: 'Task assigned'         },
  { value: 'task_updated',          label: 'Task updated'          },
  { value: 'task_comment',          label: 'Comment'               },
  { value: 'task_deadline_changed', label: 'Deadline changed'      },
  { value: 'task_needs_fix',        label: 'Needs fix'             },
  { value: 'task_approved',         label: 'Task approved'         },
  { value: 'task_completed',        label: 'Task completed'        },
  { value: 'work_reviewed',         label: 'Work reviewed'         },
  { value: 'prompt_replaced',       label: 'Prompt replaced'       },
  { value: 'submission_received',   label: 'Submission received'   },
  { value: 'blocker_reported',      label: 'Blocker reported'      },
  { value: 'blocker_resolved',      label: 'Blocker resolved'      },
  { value: 'mention',               label: 'Mention'               },
  { value: 'blog_followup',         label: 'Blog followup'         },
  { value: 'plugin_update',         label: 'Plugin update'         },
  { value: 'ebay_click_followup',   label: 'eBay click followup'   },
  { value: 'speed_optimization_followup', label: 'Website optimization' },
  { value: 'quality_issue_reported', label: 'Quality issue reported' },
  { value: 'quality_issue_fixed',    label: 'Quality issue fixed'   },
  { value: 'monthly_report',        label: 'Monthly report'        },
];

const filtered = computed(() => {
  let list = notifs.notifications;
  if (activeFilter.value === 'unread') list = list.filter((n) => !n.isRead);
  if (activeFilter.value === 'read')   list = list.filter((n) =>  n.isRead);
  if (typeFilter.value) list = list.filter((n) => n.type === typeFilter.value);
  return list;
});

// Day-grouped sections: Today · 1 day ago · 2 days ago · 1 week ago · …
const grouped = computed(() => groupNotificationsByDay(filtered.value));

// ── Actions ────────────────────────────────────────────────────────────────

const open = async (n: AppNotification) => {
  await notifs.markRead(n.id);
  if (n.taskId) router.push('/work-board/members');
  else if (n.submissionId) router.push('/my-submissions');
  else if (n.relatedType === 'submission') router.push('/reviews');
  else if (n.type === 'blog_followup') router.push('/followup/blog');
  else if (n.type === 'plugin_update') router.push('/followup/plugins');
  else if (n.type === 'ebay_click_followup') router.push('/followup/ebay-click');
  else if (n.type === 'speed_optimization_followup') router.push('/followup/speed-optimization');
  else if (n.type === 'quality_issue_reported' || n.type === 'quality_issue_fixed') router.push('/work-board/quality-check');
};

// ── Icons / labels ─────────────────────────────────────────────────────────

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
.np-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 1.2rem;
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

.np-filter-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.1rem;
  height: 1.1rem;
  padding: 0 0.25rem;
  border-radius: 999px;
  background: var(--soft-bg);
  font-size: 0.65rem;
  font-weight: 800;
}

.np-filter-btn--active .np-filter-count {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
}

.np-filter-sep {
  flex: 1;
  min-width: 8px;
}

.np-type-select {
  padding: 0.3rem 0.6rem;
  border: 1.5px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.78rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-weight: 600;
  cursor: pointer;
  outline: none;
}
.np-type-select:focus { border-color: var(--primary); }

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

/* ── List ────────────────────────────────────────────────────────────────── */
.np-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.np-item {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  width: 100%;
  padding: 1rem 1.1rem;
  background: var(--card-bg);
  border: 1.5px solid var(--border);
  border-radius: 16px;
  text-align: left;
  cursor: pointer;
  transition: border-color 130ms ease, box-shadow 130ms ease, background 130ms ease;
  position: relative;
}
.np-item:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
}
.np-item--unread {
  background: color-mix(in srgb, var(--primary) 3.5%, var(--card-bg));
  border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
}
.np-item--unread:hover {
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
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
.np-icon--neutral { background: var(--soft-bg); color: var(--text-muted); }

:root[data-theme='dark-gray'] .np-icon--success { background: rgba(34, 197, 94, 0.14);  color: #4ade80; }
:root[data-theme='dark-gray'] .np-icon--warning { background: rgba(239, 68, 68, 0.14);  color: #f87171; }
:root[data-theme='dark-gray'] .np-icon--purple  { background: rgba(124, 58, 237, 0.14); color: #a78bfa; }

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
.np-type-badge--neutral { background: var(--soft-bg); color: var(--text-muted); border-color: var(--border); }

:root[data-theme='dark-gray'] .np-type-badge--success { color: #4ade80; }
:root[data-theme='dark-gray'] .np-type-badge--warning { color: #f87171; }
:root[data-theme='dark-gray'] .np-type-badge--purple  { color: #a78bfa; }

/* ── Unread dot ──────────────────────────────────────────────────────────── */
.np-unread-dot {
  flex-shrink: 0;
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: var(--primary);
  margin-top: 0.5rem;
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
.np-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 4rem 2rem;
  color: var(--text-muted);
  text-align: center;
}
.np-empty-title {
  font-family: 'Raleway', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}
.np-empty-sub {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Load more ───────────────────────────────────────────────────────────── */
.np-load-more {
  display: flex;
  justify-content: center;
  margin-top: 1.2rem;
}
</style>
