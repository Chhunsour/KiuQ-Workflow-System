<template>
  <!-- FCM foreground push toast -->
  <Transition name="push-toast">
    <div v-if="notifs.foregroundToast" class="push-toast-wrap" role="alert" aria-live="polite">
      <div class="push-toast">
        <span class="push-toast-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        </span>
        <div class="push-toast-body">
          <strong>{{ notifs.foregroundToast.title }}</strong>
          <span>{{ notifs.foregroundToast.body }}</span>
        </div>
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
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppLoadingScreen from '@/components/ui/AppLoadingScreen.vue';
import { useAuthStore } from '@/stores/auth';
import { useRealtimeService, usePageRealtime } from '@/services/realtimeService';
import { useNotificationsStore } from '@/stores/notifications';
import { usePushNotifications } from '@/composables/usePushNotifications';
import { firebaseConfigured } from '@/lib/firebase';

const auth = useAuthStore();
const realtime = useRealtimeService();
const notifs = useNotificationsStore();
const router = useRouter();
const authTimedOut = ref(false);

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
</script>

<style scoped>
/* ── FCM foreground push toast ─────────────────────────────────────────── */
.push-toast-wrap {
  position: fixed;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 9999;
  pointer-events: none;
}

.push-toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 280px;
  max-width: 380px;
  padding: 0.9rem 1.1rem;
  border-radius: 16px;
  background: var(--card-bg, #fff);
  border: 1px solid var(--border, #e2e8f0);
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.14);
}

.push-toast-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: color-mix(in srgb, var(--primary, #3f8dfe) 12%, transparent);
  color: var(--primary, #3f8dfe);
}

.push-toast-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.push-toast-body strong {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main, #0f172a);
}

.push-toast-body span {
  font-size: 0.8rem;
  color: var(--text-muted, #64748b);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Slide-in from top-right */
.push-toast-enter-active,
.push-toast-leave-active {
  transition: opacity 260ms ease, transform 260ms cubic-bezier(0.16, 1, 0.3, 1);
}
.push-toast-enter-from,
.push-toast-leave-to {
  opacity: 0;
  transform: translateY(-0.75rem);
}
</style>
