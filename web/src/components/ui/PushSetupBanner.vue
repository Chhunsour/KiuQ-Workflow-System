<template>
  <section v-if="shouldShow" class="push-setup-banner" aria-label="Push notification setup">
    <div class="push-setup-icon" aria-hidden="true">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    </div>

    <div class="push-setup-copy">
      <div class="ui-font push-setup-title">{{ title }}</div>
      <p>{{ description }}</p>
      <p v-if="message" class="push-setup-message" :class="{ 'push-setup-message--error': messageError }">
        {{ message }}
      </p>
    </div>

    <div class="push-setup-actions">
      <button
        v-if="permission !== 'denied'"
        class="btn-primary push-setup-button"
        type="button"
        :disabled="working"
        @click="enablePush"
      >
        {{ buttonText }}
      </button>
      <RouterLink class="btn-secondary push-setup-button" to="/notifications">
        Details
      </RouterLink>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { firebaseConfigured } from '@/lib/firebase';
import { getPushSettings, requestNotificationPermission, syncToken } from '@/services/pushNotifications';
import { useAuthStore } from '@/stores/auth';

type PermissionState = NotificationPermission | 'unsupported';

const auth = useAuthStore();
const working = ref(false);
const message = ref('');
const messageError = ref(false);
const permissionState = ref<PermissionState>('default');
const hasToken = ref(false);
let refreshTimer: ReturnType<typeof setInterval> | null = null;

const refreshState = () => {
  permissionState.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  hasToken.value = getPushSettings().hasToken;
};

const permission = computed(() => {
  if (!firebaseConfigured || permissionState.value === 'unsupported') return 'unsupported' as const;
  return permissionState.value;
});

const shouldShow = computed(() =>
  auth.isAuthenticated &&
  !!auth.user?.id &&
  firebaseConfigured &&
  !(permission.value === 'granted' && hasToken.value)
);

const title = computed(() => {
  if (permission.value === 'denied') return 'Notifications are blocked on this Mac';
  if (permission.value === 'granted') return 'Finish notification setup on this Mac';
  return 'Turn on Mac notifications';
});

const description = computed(() => {
  if (permission.value === 'denied') {
    return 'Allow notifications in your browser and macOS settings, then reload this page.';
  }
  if (permission.value === 'granted') {
    return 'Permission is allowed. Save this device so task updates can reach this Mac.';
  }
  return 'Enable notifications once so task assignments, feedback, and review updates can show on this Mac.';
});

const buttonText = computed(() => {
  if (working.value) return permission.value === 'granted' ? 'Saving...' : 'Enabling...';
  if (permission.value === 'granted') return 'Save This Mac';
  return 'Enable Notifications';
});

const setMessage = (text: string, isError = false) => {
  message.value = text;
  messageError.value = isError;
};

const enablePush = async () => {
  if (!auth.user?.id) return;
  working.value = true;
  setMessage('');

  try {
    const ok = permission.value === 'granted'
      ? await syncToken()
      : await requestNotificationPermission();

    refreshState();
    if (ok) {
      setMessage('This Mac is ready for task notifications.');
    } else if (permission.value === 'denied') {
      setMessage('Notifications are blocked. Allow them in browser and macOS settings.', true);
    } else {
      setMessage('Could not enable notifications. Try again.', true);
    }
  } catch {
    setMessage('Could not enable notifications. Try again.', true);
  } finally {
    working.value = false;
  }
};

const onFocus = () => refreshState();

onMounted(() => {
  refreshState();
  window.addEventListener('focus', onFocus);
  refreshTimer = setInterval(refreshState, 5_000);
});

onBeforeUnmount(() => {
  window.removeEventListener('focus', onFocus);
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.push-setup-banner {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  margin-bottom: 1.25rem;
  padding: 0.9rem 1rem;
  border: 1px solid var(--border);
  border-radius: 16px;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 10%, transparent), transparent 42%),
    var(--card-bg);
  box-shadow: var(--shadow-card);
}

.push-setup-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}

.push-setup-copy {
  min-width: 0;
  flex: 1 1 auto;
}

.push-setup-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
}

.push-setup-copy p {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: var(--text-muted);
}

.push-setup-message {
  font-weight: 600;
  color: var(--status-approved-fg);
}

.push-setup-message--error {
  color: var(--status-needs-fix-fg);
}

.push-setup-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 0 0 auto;
}

.push-setup-button {
  min-height: 2.25rem;
  white-space: nowrap;
}

@media (max-width: 760px) {
  .push-setup-banner {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .push-setup-actions {
    width: 100%;
  }

  .push-setup-button {
    flex: 1 1 0;
    justify-content: center;
  }
}
</style>
