<template>
  <!--
    Standalone landing for unapproved (status='pending' or 'deactivated')
    accounts. Rendered outside AdminLayout so it shows no sidebar/topbar
    chrome — these users must not see any team data, not even a hint.
  -->
  <div class="pa-screen">
    <div class="pa-card">
      <img src="/kiuq-logo.png" alt="KiuQ" class="pa-logo" />

      <span class="pa-badge">{{ statusLabel }}</span>

      <h1 class="pa-title">{{ $t('Your account is waiting for approval') }}</h1>
      <p class="pa-subtitle">
        {{ $t('Please contact') }} <strong>{{ $t('Sour') }}</strong> {{ $t('to activate your access. Once your role is assigned you can sign in again and start working.') }}
      </p>

      <div v-if="auth.profile" class="pa-info">
        <div class="pa-info-row">
          <span class="pa-info-label">{{ $t('Signed in as') }}</span>
          <span class="pa-info-value">{{ auth.profile.fullName || auth.profile.email }}</span>
        </div>
        <div class="pa-info-row">
          <span class="pa-info-label">{{ $t('Email') }}</span>
          <span class="pa-info-value">{{ auth.profile.email }}</span>
        </div>
      </div>

      <div class="pa-actions">
        <button class="btn-secondary" type="button" :disabled="checking" @click="recheck">
          {{ checking ? 'Checking…' : 'Check again' }}
        </button>
        <button class="btn-primary" type="button" :disabled="signingOut" @click="signOut">
          {{ signingOut ? 'Signing out…' : 'Sign out' }}
        </button>
      </div>

      <p v-if="err" class="pa-err">{{ err }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const auth     = useAuthStore();
const router   = useRouter();
const checking = ref(false);
const signingOut = ref(false);
const err      = ref('');

const statusLabel = computed(() => {
  const s = auth.accountStatus;
  if (s === 'deactivated') return 'Account deactivated';
  return 'Awaiting approval';
});

/**
 * Re-fetch the profile from Supabase. If an admin just approved them,
 * the new status will land here and the router guard will move them on.
 */
const recheck = async () => {
  checking.value = true;
  err.value = '';
  try {
    await auth.retryInit();
    if (auth.isApproved) {
      // Router beforeEach will redirect on next navigation; nudge it.
      await router.push('/');
    }
  } catch (e) {
    err.value = e instanceof Error ? e.message : 'Could not refresh status.';
  } finally {
    checking.value = false;
  }
};

const signOut = async () => {
  signingOut.value = true;
  try {
    await auth.signOut();
    await router.push('/login');
  } finally {
    signingOut.value = false;
  }
};
</script>

<style scoped>
.pa-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background: var(--bg, #f1f5f9);
}
.pa-card {
  width: 100%;
  max-width: 28rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
  padding: 2rem 1.6rem 1.6rem;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  text-align: center;
  box-shadow: 0 24px 60px rgba(8, 12, 20, 0.10);
}
.pa-logo {
  width: 92px;
  height: 92px;
  object-fit: contain;
  margin-bottom: 0.2rem;
}
.pa-badge {
  display: inline-flex;
  align-items: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--primary) 28%, transparent);
  border-radius: 999px;
  padding: 0.2rem 0.7rem;
}
.pa-title {
  margin: 0.1rem 0 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.25rem;
  font-weight: 850;
  color: var(--text-main);
  line-height: 1.3;
}
.pa-subtitle {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.55;
  color: var(--text-muted);
}
.pa-info {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.7rem 0.9rem;
  margin-top: 0.4rem;
}
.pa-info-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.82rem;
}
.pa-info-label { color: var(--text-muted); font-weight: 600; }
.pa-info-value {
  color: var(--text-main);
  font-weight: 700;
  text-align: right;
  word-break: break-word;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pa-actions {
  display: flex;
  gap: 0.55rem;
  margin-top: 0.4rem;
  width: 100%;
  justify-content: center;
  flex-wrap: wrap;
}
.pa-err {
  margin: 0;
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 600;
}
</style>
