<template>
  <!-- FCM foreground push toast -->
  <Transition name="push-toast">
    <div v-if="notifs.foregroundToast" class="push-toast-wrap" role="alert" aria-live="polite">
      <div class="push-toast-card">
        <!-- Accent indicator color stripe based on notification priority/type -->
        <div class="push-toast-accent" :class="'push-toast-accent--' + (notifs.foregroundToast.priority || 'normal')"></div>
        
        <div class="push-toast-content">
          <!-- Left: Actor Avatar / Initials Placeholder -->
          <div class="push-toast-avatar-container">
            <img 
              v-if="notifs.foregroundToast.actorAvatarUrl" 
              :src="notifs.foregroundToast.actorAvatarUrl" 
              class="push-toast-avatar-img" 
              alt="" 
            />
            <div v-else class="push-toast-avatar-placeholder">
              {{ toastActorInitials(notifs.foregroundToast) }}
            </div>
            
            <!-- Badge overlay: Action type icon -->
            <span class="push-toast-badge-icon" :class="'badge-' + toastCategoryClass(notifs.foregroundToast)">
              <component :is="toastCategoryIcon(notifs.foregroundToast)" />
            </span>
          </div>

          <!-- Right: Text Body & Details -->
          <div class="push-toast-body-details">
            <div class="push-toast-header">
              <span class="push-toast-actor-name">
                {{ notifs.foregroundToast.actorName || 'System Notification' }}
              </span>
              <span v-if="toastWebsiteName(notifs.foregroundToast)" class="push-toast-website-tag">
                {{ toastWebsiteName(notifs.foregroundToast) }}
              </span>
            </div>
            
            <h4 class="push-toast-title-text">{{ notifs.foregroundToast.title }}</h4>
            <p class="push-toast-msg-text">{{ notifs.foregroundToast.message || notifs.foregroundToast.body }}</p>
            
            <!-- Action Button -->
            <div v-if="notifs.foregroundToast.id" class="push-toast-action-row mt-2 flex items-center justify-start">
              <button 
                class="push-toast-action-btn text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
                type="button"
                @click="openToastAction(notifs.foregroundToast)"
              >
                {{ toastActionLabel(notifs.foregroundToast) }}
              </button>
            </div>
          </div>
        </div>

        <!-- Close Button -->
        <button class="push-toast-close" type="button" @click="notifs.foregroundToast = null" aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  </Transition>

  <AppLoadingScreen v-if="showAuthLoading" />
  <div
    v-else-if="showAuthError"
    class="flex min-h-screen items-center justify-center bg-bg px-6 text-center"
  >
    <div class="card card-pad max-w-md">
      <div class="ui-font text-base font-semibold text-status-needs-fix-fg">Could not load this page</div>
      <p class="mt-2 text-sm text-text-muted">
        {{ auth.error || 'Could not load this page. Please try again.' }}
      </p>
      <button class="btn-primary mt-4" type="button" @click="retryAuth">Retry</button>
    </div>
  </div>
  <RouterView v-else />

  <!-- Global Profile Picture Preview Modal -->
  <Modal
    :open="preview.isOpen"
    :title="preview.payload ? `${preview.payload.fullName} photo` : 'Profile photo'"
    subtitle="Profile photo preview."
    size="sm"
    @close="preview.closePreview"
  >
    <div v-if="preview.payload" class="space-y-4">
      <div class="rounded-card border border-border bg-soft/40 p-3">
        <img
          v-if="preview.payload.avatarUrl"
          :src="preview.payload.avatarUrl"
          :alt="`${preview.payload.fullName} profile photo`"
          class="mx-auto max-h-[55vh] w-full rounded-card object-contain"
        />
      </div>
      <div class="text-center">
        <div class="ui-font text-sm font-semibold text-text-main">{{ preview.payload.fullName }}</div>
        <div v-if="preview.payload.email" class="mt-1 text-xs text-text-muted">{{ preview.payload.email }}</div>
        <div v-if="preview.payload.role" class="mt-1 text-xs text-primary font-semibold">{{ preview.payload.role }}</div>
      </div>
    </div>
    <template #footer>
      <button class="btn-secondary" type="button" @click="preview.closePreview">Close</button>
    </template>
  </Modal>

  <!-- Surprise Task Popup Overlay -->
  <Transition name="surprise-modal">
    <div v-if="notifs.activeSurpriseTask" class="surprise-overlay fixed inset-0 z-50 flex items-center justify-center p-4" @click.self="notifs.activeSurpriseTask = null">
      <div class="surprise-card relative w-full max-w-md overflow-hidden rounded-card border border-border bg-card p-6 shadow-2xl">
        <!-- Decorative glowing pulse background -->
        <div class="absolute -right-12 -top-12 h-36 w-36 rounded-full bg-primary/15 blur-2xl" />
        
        <!-- Header / Badge -->
        <div class="flex items-center gap-3">
          <div class="surprise-icon-wrap flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div>
            <span class="text-xs font-bold uppercase tracking-wider text-primary">New Task Assigned!</span>
            <h3 class="ui-font text-base font-extrabold text-text-main">Surprise Alert</h3>
          </div>
        </div>

        <!-- Details -->
        <div class="mt-5 space-y-3">
          <div class="rounded-lg border border-border/60 bg-soft/30 p-4">
            <div class="text-xs text-text-muted">Task Title</div>
            <div class="ui-font text-sm font-semibold text-text-main mt-0.5">{{ notifs.activeSurpriseTask.title }}</div>
          </div>

          <div class="flex gap-4">
            <div class="flex-1 rounded-lg border border-border/60 bg-soft/30 p-3">
              <div class="text-xs text-text-muted">Assigned By</div>
              <div class="text-sm font-semibold text-text-main mt-0.5">{{ notifs.activeSurpriseTask.actorName || 'Team Leader' }}</div>
            </div>
            <div v-if="notifs.activeSurpriseTask.priority && notifs.activeSurpriseTask.priority !== 'normal'" class="flex-1 rounded-lg border border-border/60 bg-soft/30 p-3">
              <div class="text-xs text-text-muted">Priority</div>
              <div class="mt-0.5">
                <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold capitalize" :class="`surprise-priority--${notifs.activeSurpriseTask.priority}`">
                  {{ notifs.activeSurpriseTask.priority }}
                </span>
              </div>
            </div>
          </div>

          <p class="text-xs text-text-muted italic leading-relaxed pt-1">
            "{{ notifs.activeSurpriseTask.message }}"
          </p>
        </div>

        <!-- Action Buttons -->
        <div class="mt-6 flex items-center justify-end gap-3">
          <button
            class="btn-secondary px-4 py-2 text-xs"
            type="button"
            @click="dismissSurpriseTask"
          >
            I Got It
          </button>
          <button
            class="btn-primary px-5 py-2 text-xs"
            type="button"
            @click="viewSurpriseTask"
          >
            View Task
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch, h } from 'vue';
import { useRouter } from 'vue-router';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen.vue';
import Modal from '@/components/ui/Modal.vue';
import { useAuthStore } from '@/stores/auth';
import { useRealtimeService, usePageRealtime } from '@/services/realtimeService';
import { useNotificationsStore } from '@/stores/notifications';
import { useDataStore } from '@/stores/data';
import { usePushNotifications } from '@/composables/usePushNotifications';
import { firebaseConfigured } from '@/lib/firebase';
import { useImagePreviewStore } from '@/stores/imagePreview';
import { playNotificationSound } from '@/composables/useNotificationSound';

const auth = useAuthStore();
const realtime = useRealtimeService();
const notifs = useNotificationsStore();
const dataStore = useDataStore();
const preview = useImagePreviewStore();
const router = useRouter();
const authTimedOut = ref(false);

const toastActorInitials = (toast: any) => {
  const name = toast.actorName || toast.title || 'System';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const toastWebsiteName = (toast: any) => {
  if (!toast.relatedWebsiteId) return '';
  const ws = dataStore.websites.find(w => w.id === toast.relatedWebsiteId);
  return ws ? ws.name || ws.domain : '';
};

const toastActionLabel = (n: any) => {
  if (!n.type) return 'View';
  const map: Record<string, string> = {
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

const openToastAction = async (n: any) => {
  notifs.foregroundToast = null;
  await notifs.markRead(n.id);
  
  const isTask = n.taskId || n.type?.startsWith('task_') || n.relatedType === 'task';
  const isAdmin = auth.isAdmin;

  if (isTask && n.taskId) {
    let base = isAdmin ? '/work-board/members' : '/work-board/my';
    if (isAdmin) {
      const assignment = dataStore.assignments.find((a) => a.id === n.taskId);
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
  } else if (n.type?.startsWith('quality_')) {
    router.push(auth.isQualityChecker ? '/quality-check' : '/work-board/quality-check');
  } else {
    router.push('/notifications');
  }
};

const toastCategoryClass = (toast: any) => {
  const t = toast.type;
  if (!t) return 'info';
  if (['task_assigned', 'task_updated', 'task_deadline_changed', 'task_needs_fix', 'task_approved', 'task_completed'].includes(t)) {
    return 'task';
  }
  if (['task_comment', 'mention'].includes(t)) {
    return 'comment';
  }
  if (['blog_followup', 'plugin_update', 'ebay_click_followup', 'speed_optimization_followup'].includes(t)) {
    return 'followup';
  }
  if (['quality_issue_reported', 'quality_issue_fixed'].includes(t)) {
    return 'quality';
  }
  if (['submission_received', 'work_reviewed'].includes(t)) {
    return 'submission';
  }
  return 'info';
};

const toastCategoryIcon = (toast: any) => {
  const cat = toastCategoryClass(toast);
  return {
    render() {
      if (cat === 'task') {
        return h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2' }),
          h('rect', { x: '8', y: '2', width: '8', height: '4', rx: '1', ry: '1' }),
          h('path', { d: 'm9 14 2 2 4-4' })
        ]);
      }
      if (cat === 'comment') {
        return h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' })
        ]);
      }
      if (cat === 'followup') {
        return h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67' })
        ]);
      }
      if (cat === 'quality') {
        return h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' })
        ]);
      }
      if (cat === 'submission') {
        return h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
          h('path', { d: 'M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z' }),
          h('polyline', { points: '14 2 14 8 20 8' })
        ]);
      }
      // default: info
      return h('svg', { width: '10', height: '10', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '3', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, [
        h('path', { d: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' }),
        h('path', { d: 'M13.73 21a2 2 0 0 1-3.46 0' })
      ]);
    }
  };
};

// FCM push — must be called here in setup(), not inside a watch/callback,
// so that any Vue lifecycle hooks inside the composable have an active instance.
// userId is '' on first call; init() is called later once auth is ready.
const push = usePushNotifications({
  userId: auth.user?.id ?? '',
  onForeground: (payload) => notifs.showForegroundToast(payload.title, payload.body),
});
let pushInitialized = false;

// Global tables: presence, activity, and notifications (for real-time bell updates)
usePageRealtime(['profiles', 'activity_logs', 'notifications']);

const authBusy = computed(() => auth.initializing || (!auth.initialized && auth.profileLoading));
const showAuthLoading = computed(() => authBusy.value && !authTimedOut.value);
const showAuthError = computed(
  () =>
    (authTimedOut.value && !auth.profile) ||
    (!!auth.error && auth.isAuthenticated && !auth.profile)
);

let authTimer: ReturnType<typeof setTimeout> | null = null;

watch(
  authBusy,
  (busy) => {
    if (authTimer) {
      clearTimeout(authTimer);
      authTimer = null;
    }
    if (!busy) {
      authTimedOut.value = false;
      return;
    }
    authTimer = setTimeout(() => {
      auth.finishTimedOutInit();
      authTimedOut.value = !auth.profile;
    }, 10_000);
  },
  { immediate: true }
);

const retryAuth = async () => {
  authTimedOut.value = false;
  await auth.retryInit();
};

watch(
  () => auth.initialized && auth.isAuthenticated && !!auth.profile,
  (isReady) => {
    if (!isReady) {
      void realtime.stop();
      if (!auth.isAuthenticated && pushInitialized) {
        void push.revoke();
        pushInitialized = false;
      }
    } else {
      void realtime.rebuildNotifChannel();

      if (firebaseConfigured && auth.user?.id && !pushInitialized) {
        pushInitialized = true;
        void push.init();
      }
    }
  },
  { immediate: true }
);

// Handle SW notification click → navigate to correct route inside the SPA
const handleSwMessage = (event: MessageEvent) => {
  if (event.data?.type === 'NAVIGATE' && event.data?.url) {
    void router.push(event.data.url);
  }
};

onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
  }
});

onBeforeUnmount(() => {
  if (authTimer) clearTimeout(authTimer);
  void realtime.stop();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.removeEventListener('message', handleSwMessage);
  }
});

// Surprise Task popup handlers
const viewSurpriseTask = async () => {
  const t = notifs.activeSurpriseTask;
  if (!t) return;
  await notifs.acknowledgeNotification(t.id);
  notifs.activeSurpriseTask = null;
  void router.push('/work-board/my');
};

const dismissSurpriseTask = async () => {
  const t = notifs.activeSurpriseTask;
  if (!t) return;
  await notifs.acknowledgeNotification(t.id);
  notifs.activeSurpriseTask = null;
};

// Play sound on surprise modal display
watch(
  () => notifs.activeSurpriseTask,
  (newVal) => {
    if (newVal) {
      void playNotificationSound();
    }
  }
);
</script>

<style scoped>
/* ── FCM foreground push toast ─────────────────────────────────────────── */
.push-toast-wrap {
  position: fixed;
  top: 1.5rem;
  right: 1.5rem;
  z-index: 9999;
  pointer-events: auto;
}

.push-toast-card {
  position: relative;
  display: flex;
  align-items: stretch;
  min-width: 300px;
  max-width: 400px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  transition: box-shadow 0.3s ease;
  animation: toast-slide-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Accent stripe based on priority */
.push-toast-accent {
  width: 5px;
  flex-shrink: 0;
}
.push-toast-accent--critical {
  background: #ef4444;
}
.push-toast-accent--high {
  background: #f97316;
}
.push-toast-accent--normal {
  background: #15D6C2;
}
.push-toast-accent--low {
  background: #64748b;
}

.push-toast-content {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1rem 1.25rem;
  flex: 1;
}

/* Avatar styling */
.push-toast-avatar-container {
  position: relative;
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
}

.push-toast-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(21, 214, 194, 0.2);
}

.push-toast-avatar-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary);
  color: #04201d;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.5px;
}

/* Category Badge overlay on avatar */
.push-toast-badge-icon {
  position: absolute;
  bottom: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
  box-shadow: 0 2px 4px rgba(15, 23, 42, 0.18);
  color: #fff;
}

.badge-task {
  background: #15D6C2;
}
.badge-comment {
  background: #8b5cf6;
}
.badge-followup {
  background: #f59e0b;
}
.badge-quality {
  background: #ef4444;
}
.badge-submission {
  background: #0ea5e9;
}
.badge-info {
  background: #64748b;
}

/* Text Body Details */
.push-toast-body-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.push-toast-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.push-toast-actor-name {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: var(--text-muted, #64748b);
}

.push-toast-website-tag {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.45rem;
  border-radius: 9999px;
  font-size: 0.68rem;
  font-weight: 600;
  background: var(--primary-soft);
  color: var(--primary);
  border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}

.push-toast-title-text {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main, #0f172a);
  margin: 0;
  line-height: 1.25;
}

.push-toast-msg-text {
  font-size: 0.8rem;
  color: var(--text-muted, #475569);
  margin: 0;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Close Button */
.push-toast-close {
  align-self: flex-start;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 0.6rem;
  margin-top: 0.4rem;
  margin-right: 0.4rem;
  border-radius: 8px;
  color: var(--text-soft);
  transition: background 0.2s ease, color 0.2s ease;
}
.push-toast-close:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}

.push-toast-action-btn {
  background: var(--primary, #15D6C2);
  color: #fff;
  border: none;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 10px rgba(21, 214, 194, 0.25);
}
.push-toast-action-btn:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 6px 14px rgba(21, 214, 194, 0.35);
}
.push-toast-action-btn:active {
  transform: translateY(0);
}

@keyframes toast-slide-in {
  from {
    opacity: 0;
    transform: translateX(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

/* Vue Transition slide-out */
.push-toast-leave-active {
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.push-toast-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
}

/* ── Surprise Task Alert Modal ─────────────────────────────────────────── */
.surprise-overlay {
  background: color-mix(in srgb, var(--text-main) 35%, transparent);
  -webkit-backdrop-filter: blur(8px) saturate(140%);
  backdrop-filter: blur(8px) saturate(140%);
}

.surprise-card {
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.3);
  animation: surprise-pop 280ms cubic-bezier(0.34, 1.56, 0.64, 1);
  background: var(--card-bg);
}

.surprise-icon-wrap {
  animation: pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.surprise-priority--critical {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}
.surprise-priority--high {
  background: rgba(249, 115, 22, 0.15);
  color: #f97316;
}
.surprise-priority--low {
  background: rgba(100, 116, 139, 0.15);
  color: #64748b;
}

@keyframes surprise-pop {
  from { opacity: 0; transform: scale(0.9) translateY(20px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes pulse-ring {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(21, 214, 194, 0.4); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(21, 214, 194, 0); }
}

.surprise-modal-enter-active,
.surprise-modal-leave-active {
  transition: opacity 200ms ease;
}
.surprise-modal-enter-from,
.surprise-modal-leave-to {
  opacity: 0;
}
</style>
