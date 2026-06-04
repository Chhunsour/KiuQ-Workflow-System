<template>
  <div class="card card-pad">
    <!-- Tauri desktop build: browser push isn't wired up yet. Show a single
         informational notice instead of the browser flow so the card never
         looks broken on macOS. -->
    <template v-if="inTauri">
      <div class="flex items-start gap-3">
        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </span>
        <div class="min-w-0">
          <div class="ui-font text-sm font-semibold text-text-main">Push Notifications</div>
          <p class="mt-0.5 text-xs text-text-muted leading-relaxed">
            Desktop notifications will be handled later.
          </p>
        </div>
      </div>
    </template>

    <!-- Browser/PWA flow (web build) -->
    <template v-else>
    <!-- ── Header ──────────────────────────────────────────────────────── -->
    <div class="flex items-start justify-between gap-4">
      <div class="flex items-start gap-3 min-w-0">
        <span class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
        </span>
        <div class="min-w-0">
          <div class="ui-font text-sm font-semibold text-text-main">Push Notifications</div>
          <p class="mt-0.5 text-xs text-text-muted leading-relaxed">
            {{ compact
              ? 'Get notified about tasks, feedback, and followups.'
              : 'Get notified when new tasks, feedback, or followups are assigned — even when the app is closed.' }}
          </p>
        </div>
      </div>

      <!-- Status pill -->
      <span
        class="ui-font shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
        :class="statusPillClass"
      >
        <span class="h-1.5 w-1.5 rounded-full" :class="statusDotClass" />
        {{ statusLabel }}
      </span>
    </div>

    <!-- ── Detail rows (full mode only) ──────────────────────────────── -->
    <div v-if="!compact" class="mt-4 grid grid-cols-2 gap-2 rounded-card border border-border bg-soft/40 px-4 py-3 text-xs">
      <div class="text-text-muted">Permission</div>
      <div class="ui-font font-semibold text-text-main text-right">{{ permissionLabel }}</div>
      <div class="text-text-muted">Device token</div>
      <div class="ui-font font-semibold text-right" :class="hasToken ? 'text-status-approved-fg' : 'text-text-muted'">
        {{ hasToken ? 'Saved' : 'Not saved' }}
      </div>
    </div>

    <!-- Denied helper -->
    <p v-if="permission === 'denied'" class="mt-3 text-xs text-status-needs-fix-fg">
      Open browser site settings and allow notifications for this website, then reload.
    </p>

    <!-- ── Member actions ─────────────────────────────────────────────── -->
    <div v-if="permission !== 'denied'" class="mt-4 flex flex-wrap gap-2">
      <button
        v-if="permission !== 'granted'"
        class="btn-primary text-sm"
        type="button"
        :disabled="working"
        @click="enable"
      >
        {{ working ? 'Enabling…' : 'Enable Push Notifications' }}
      </button>

      <template v-if="permission === 'granted'">
        <button
          v-if="!hasToken"
          class="btn-primary text-sm"
          type="button"
          :disabled="working"
          @click="resync"
        >
          {{ working ? 'Saving…' : 'Save Device Token' }}
        </button>
        <button
          v-else
          class="btn-secondary text-sm"
          type="button"
          :disabled="working"
          @click="resync"
        >
          {{ working ? 'Syncing…' : 'Re-sync Device' }}
        </button>

        <!-- Self test -->
        <button
          v-if="!compact"
          class="btn-secondary text-sm"
          type="button"
          :disabled="working"
          @click="testSelf"
        >
          {{ working ? 'Sending…' : 'Send Test to Myself' }}
        </button>
      </template>
    </div>

    <!-- ── Admin: send test to any member ─────────────────────────────── -->
    <template v-if="auth.isAdmin && !compact">
      <div class="mt-4 border-t border-border pt-4">
        <div class="ui-font mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Admin — Send Test Notification
        </div>
        <div class="flex flex-wrap gap-2">
          <select
            v-model="testTargetId"
            class="input-field text-sm flex-1 min-w-0"
            :disabled="adminWorking || eligibleMembers.length === 0"
          >
            <option value="">Select member…</option>
            <option
              v-for="m in eligibleMembers"
              :key="m.id"
              :value="m.id"
            >
              {{ m.fullName || m.email || m.id }}
            </option>
          </select>
          <button
            class="btn-primary text-sm"
            type="button"
            :disabled="adminWorking || !testTargetId"
            @click="testAdmin"
          >
            {{ adminWorking ? 'Sending…' : 'Send Test' }}
          </button>
        </div>
        <p v-if="adminMsg" class="mt-2 text-xs font-medium" :class="adminMsgError ? 'text-status-needs-fix-fg' : 'text-status-approved-fg'">
          {{ adminMsg }}
        </p>
      </div>
    </template>

    <!-- ── Feedback message ───────────────────────────────────────────── -->
    <p v-if="message" class="mt-2 text-xs font-medium" :class="messageError ? 'text-status-needs-fix-fg' : 'text-status-approved-fg'">
      {{ message }}
    </p>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { firebaseConfigured } from '@/lib/firebase';
import { isTauri } from '@/lib/runtime';

// Computed-friendly: isTauri() is a one-time check at startup; reading
// it once per component is fine since the runtime never switches.
const inTauri = isTauri();
import { requestNotificationPermission, syncToken, getPushSettings } from '@/services/pushNotifications';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useNotificationsStore } from '@/stores/notifications';
import { isLeaderboardParticipant } from '@/lib/roles';

const props = withDefaults(defineProps<{ compact?: boolean }>(), { compact: false });

const auth  = useAuthStore();
const data  = useDataStore();
const notifs = useNotificationsStore();

// ── Member push state ─────────────────────────────────────────────────────────

const working      = ref(false);
const message      = ref('');
const messageError = ref(false);

const permissionState = ref<NotificationPermission | 'unsupported'>(
  typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
);
const hasToken = ref(getPushSettings().hasToken);

const permission = computed(() => {
  if (!firebaseConfigured || permissionState.value === 'unsupported') return 'unsupported' as const;
  return permissionState.value;
});

const refreshState = () => {
  permissionState.value = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';
  hasToken.value = getPushSettings().hasToken;
};

onMounted(refreshState);

const permissionLabel = computed(() => {
  const p = permission.value;
  if (p === 'granted')     return 'Granted';
  if (p === 'denied')      return 'Denied';
  if (p === 'unsupported') return 'Not supported';
  return 'Default';
});

const statusLabel = computed(() => {
  if (permission.value === 'granted' && hasToken.value) return 'Enabled';
  if (permission.value === 'granted')                   return 'Permission granted';
  if (permission.value === 'denied')                    return 'Blocked';
  if (permission.value === 'unsupported')               return 'Not supported';
  return 'Not enabled';
});

const statusPillClass = computed(() => {
  if (permission.value === 'granted' && hasToken.value) return 'bg-status-approved-bg text-status-approved-fg';
  if (permission.value === 'granted')                   return 'bg-amber-500/10 text-amber-600';
  if (permission.value === 'denied')                    return 'bg-status-needs-fix-bg text-status-needs-fix-fg';
  return 'bg-soft text-text-muted';
});

const statusDotClass = computed(() => {
  if (permission.value === 'granted' && hasToken.value) return 'bg-status-approved-fg';
  if (permission.value === 'granted')                   return 'bg-amber-500';
  if (permission.value === 'denied')                    return 'bg-status-needs-fix-fg';
  return 'bg-text-muted';
});

const setMsg = (text: string, isError = false) => {
  message.value = text;
  messageError.value = isError;
};

const enable = async () => {
  if (!auth.user?.id) return;
  working.value = true;
  setMsg('');
  const granted = await requestNotificationPermission();
  refreshState();
  working.value = false;
  if (granted) {
    setMsg('Push notifications enabled on this device.');
  } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
    setMsg('Notifications are blocked. Enable them in browser settings.', true);
  } else {
    setMsg('Could not enable push notifications. Try again.', true);
  }
};

const resync = async () => {
  if (!auth.user?.id) return;
  working.value = true;
  setMsg('');
  try {
    localStorage.removeItem('kiuq-fcm-token');
    const ok = await syncToken();
    refreshState();
    setMsg(ok ? 'Device synced successfully.' : 'Could not save token. Check browser console for details.', !ok);
  } catch {
    setMsg('Could not sync device. Try again.', true);
  } finally {
    working.value = false;
  }
};

const testSelf = async () => {
  if (!auth.user?.id) return;
  working.value = true;
  setMsg('');
  try {
    const { data: res, error } = await import('@/lib/supabase').then(({ supabase }) =>
      supabase.functions.invoke('send-push-notification', {
        body: {
          user_id:   auth.user!.id,
          title:     'KiuQ Test Notification',
          body_text: 'Push notifications are working on this device.',
          type:      'task_assigned',
          link:      '/work-board/my',
        },
      })
    );
    if (error) {
      setMsg(`Test failed: ${error.message}`, true);
    } else if ((res as { sent?: number })?.sent === 0) {
      setMsg('No active device tokens found. Re-sync first.', true);
    } else {
      setMsg('Test notification sent — check your device.');
    }
  } catch (e) {
    setMsg('Test failed. Check browser console.', true);
    console.error('[push-card] testSelf error:', e);
  } finally {
    working.value = false;
  }
};

// ── Admin test ────────────────────────────────────────────────────────────────

const testTargetId  = ref('');
const adminWorking  = ref(false);
const adminMsg      = ref('');
const adminMsgError = ref(false);

const eligibleMembers = computed(() =>
  data.members.filter((m) => m.id !== auth.user?.id)
);

const setAdminMsg = (text: string, isError = false) => {
  adminMsg.value = text;
  adminMsgError.value = isError;
};

const testAdmin = async () => {
  if (!testTargetId.value || !auth.user?.id) return;
  adminWorking.value = true;
  setAdminMsg('');

  const target = eligibleMembers.value.find((m) => m.id === testTargetId.value);
  const name   = target?.fullName || 'team member';

  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: res, error } = await supabase.functions.invoke('send-push-notification', {
      body: {
        user_id:   testTargetId.value,
        title:     'KiuQ Admin Test',
        body_text: `This is a test notification sent to ${name} by admin.`,
        type:      'task_assigned',
        link:      '/work-board/my',
      },
    });

    if (error) {
      setAdminMsg(`Failed: ${error.message}`, true);
    } else if ((res as { sent?: number })?.sent === 0) {
      setAdminMsg(`${name} has no active device tokens.`, true);
    } else {
      setAdminMsg(`Test sent to ${name} — ${(res as { sent?: number }).sent} device(s).`);
    }
  } catch (e) {
    setAdminMsg('Test failed. Check browser console.', true);
    console.error('[push-card] testAdmin error:', e);
  } finally {
    adminWorking.value = false;
  }
};
</script>
