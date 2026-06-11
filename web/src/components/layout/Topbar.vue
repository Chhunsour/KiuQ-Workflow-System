<template>
  <header
    ref="headerRef"
    class="topbar sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-topbar px-8"
  >
    <div class="flex min-w-0 items-center gap-2">
      <button
        type="button"
        class="topbar-hamburger btn-ghost h-9 w-9 px-0"
        aria-label="Open menu"
        @click="$emit('open-sidebar')"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <h1 class="topbar-title ui-font truncate text-lg font-semibold text-text-main">{{ pageTitle }}</h1>
    </div>
    <div class="topbar-actions flex items-center gap-3">
      <button
        type="button"
        class="topbar-search"
        aria-label="Search (Cmd/Ctrl + K)"
        title="Search — ⌘K"
        @click="openCommandPalette"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <span class="topbar-search-text">Search</span>
        <kbd class="topbar-search-kbd">{{ modKey }}K</kbd>
      </button>

      <NotificationBell />

      <button
        class="btn-secondary h-9 px-3"
        type="button"
        :aria-label="`Switch to ${theme.isDarkGray ? 'Light Mode' : 'Dark Gray Mode'}`"
        :title="theme.label"
        @click="theme.toggle"
      >
        <svg
          v-if="theme.isDarkGray"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        <svg
          v-else
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 7.5A9 9 0 1 1 12 3z" />
        </svg>
        <span class="hidden lg:inline">{{ theme.label }}</span>
      </button>

      <div class="relative">
        <button
          class="relative flex h-9 w-9 items-center justify-center rounded-full bg-soft text-primary ui-font text-sm font-semibold hover:bg-soft/70"
          type="button"
          @click="open = !open"
          aria-label="User menu"
        >
          <div class="h-full w-full rounded-full overflow-hidden flex items-center justify-center">
            <img
              v-if="auth.profile?.avatarUrl"
              :src="auth.profile.avatarUrl"
              :alt="`${auth.profile.fullName || 'User'} avatar`"
              class="h-full w-full object-cover"
            />
            <span v-else>{{ initials }}</span>
          </div>
          <span
            class="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-topbar"
            :class="statusDotClass"
            aria-hidden="true"
          />
        </button>
        <div
          v-if="open"
          class="absolute right-0 top-11 z-20 w-56 rounded-card border border-border bg-card shadow-card"
        >
          <div class="border-b border-border px-4 py-3">
            <div class="ui-font text-sm font-medium text-text-main truncate">
              {{ auth.profile?.fullName || 'You' }}
            </div>
            <div class="text-xs text-text-muted truncate">{{ auth.user?.email || '—' }}</div>
            <div class="mt-1.5">
              <span class="ui-font rounded-full bg-soft px-2 py-0.5 text-xs font-medium text-primary">
                {{ roleLabel(auth.profile?.role) }}
              </span>
            </div>
            <div v-if="auth.profile" class="mt-2">
              <PresenceBadge :member="auth.profile" :label="presenceText" />
            </div>
          </div>
          <div class="p-1">
            <RouterLink
              v-if="auth.user?.id && !auth.isQualityChecker"
              :to="`/profiles/${auth.user.id}`"
              class="nav-item w-full"
              @click="open = false"
            >
              <span class="flex h-5 w-5 items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M15 3h6v6"/>
                  <path d="M10 14 21 3"/>
                  <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/>
                </svg>
              </span>
              View Full
            </RouterLink>
            <RouterLink to="/profile" class="nav-item w-full" @click="open = false">
              <span class="flex h-5 w-5 items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21a8 8 0 0 0-16 0"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </span>
              Profile
            </RouterLink>
            <RouterLink v-if="auth.isAdmin || auth.isQualityChecker" to="/settings" class="nav-item w-full" @click="open = false">
              <span class="flex h-5 w-5 items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>
                </svg>
              </span>
              Settings
            </RouterLink>
            <button class="nav-item w-full" type="button" @click="onLogout">
              <span class="flex h-5 w-5 items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <path d="m16 17 5-5-5-5"/>
                  <path d="M21 12H9"/>
                </svg>
              </span>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { adminNavItems, memberNavItems, qualityCheckerNavItems } from './navItems';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useThemeStore } from '@/stores/theme';
import PresenceBadge from '@/components/ui/PresenceBadge.vue';
import NotificationBell from '@/components/ui/NotificationBell.vue';
import { presenceStatusFor, presenceSummaryFor } from '@/lib/presence';
import { roleLabel } from '@/lib/roles';
import { useNotificationsStore } from '@/stores/notifications';

defineEmits<{ (e: 'open-sidebar'): void }>();

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const data = useDataStore();
const theme = useThemeStore();
const notifs = useNotificationsStore();
const open = ref(false);
const headerRef = ref<HTMLElement | null>(null);

const modKey = computed(() => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘' : 'Ctrl+'));
const openCommandPalette = () => window.dispatchEvent(new Event('open-command-palette'));
const visibleNavItems = computed(() => {
  let items = auth.isAdmin
    ? adminNavItems
    : auth.isQualityChecker
      ? qualityCheckerNavItems
      : memberNavItems;

  if (!auth.isHeadOrSupervisor) {
    items = items.filter((item) => !item.isExecutiveOnly);
  }

  const userRole = auth.profile?.role ? auth.profile.role.trim().toLowerCase() : '';
  const isTaskAlertManager = userRole === 'admin' || userRole === 'owner' || userRole === 'head';
  if (!isTaskAlertManager) {
    items = items.filter((item) => !item.isTaskAlertManagerOnly);
  }

  return items;
});

const pageTitle = computed(() => {
  if (route.path === '/dashboard') return 'Quality Checker Dashboard';
  if (route.path === '/profile') return 'My Profile';
  if (route.path === '/profile/me') return 'My Profile';
  if (route.path === '/settings') return auth.isQualityChecker ? 'Account Settings' : 'Settings';
  if (route.path === '/notifications') return 'Notifications';
  if (route.path === '/quality-checker-dashboard') return 'Quality Checker Dashboard';
  if (route.path === '/quality-check') return 'Quality Check Board';
  if (route.path.startsWith('/quality-check/')) return 'Quality Check Board';
  if (route.path === '/work-board') return 'Work Board';
  if (route.path === '/work-board/my') return 'My Work Board';
  if (route.path === '/work-board/members') return 'Member Board';
  if (route.path.startsWith('/work-board/members/')) return 'Member Board';
  if (route.path === '/followup') return 'Followup';
  if (route.path === '/followup/blog') return 'Blog Followup';
  if (route.path === '/followup/plugins') return 'Plugin Update';
  if (route.path.startsWith('/followup/blog/')) return 'Blog Tracker';
  if (route.path.startsWith('/followup/plugins/')) return 'Plugin Tracker';
  if (route.path.startsWith('/members/') && route.path.endsWith('/profile')) return 'Member Profile';
  const match = visibleNavItems.value.find((item) => {
    if (item.to === '/') return route.path === '/';
    return route.path === item.to || route.path.startsWith(item.to + '/');
  });
  return match?.label ?? 'Dashboard';
});

const initials = computed(() => {
  const name = auth.profile?.fullName || auth.user?.email || '?';
  return name
    .split(/[\s@.]+/)
    .map((s) => s[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
});

const statusDotClass = computed(() => {
  if (!auth.profile) return 'bg-status-not-started-fg/70';
  const status = presenceStatusFor(auth.profile);
  if (status === 'online') return 'bg-status-approved-fg';
  if (status === 'away') return 'bg-status-submitted-fg';
  return 'bg-status-not-started-fg/70';
});
const presenceText = computed(() => (auth.profile ? presenceSummaryFor(auth.profile) : 'Offline'));

const onLogout = async () => {
  open.value = false;
  await auth.signOut();
  data.reset();
  notifs.reset();
  router.replace('/login');
};

const onDocClick = (e: MouseEvent) => {
  if (!open.value) return;
  const t = e.target as Node | null;
  if (headerRef.value && t && !headerRef.value.contains(t)) open.value = false;
};
let pollTimer: ReturnType<typeof setInterval> | null = null;

const stopNotificationPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const startNotificationPolling = () => {
  if (!auth.user?.id || pollTimer) return;
  console.log('[notification] current user id', auth.user.id);
  void notifs.fetchUnreadCount();
  void notifs.fetchNotifications(20);
  void notifs.fetchPreferences();
  pollTimer = setInterval(() => {
    if (auth.user?.id) void notifs.fetchUnreadCount();
  }, 30_000);
};

onMounted(() => {
  document.addEventListener('click', onDocClick);
  startNotificationPolling();
});

watch(
  () => auth.user?.id,
  (userId, oldUserId) => {
    if (userId === oldUserId) return;
    stopNotificationPolling();
    if (userId) startNotificationPolling();
  }
);

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick);
  stopNotificationPolling();
});
</script>

<style scoped>
/* Hamburger only appears once the sidebar collapses into a drawer */
.topbar-hamburger {
  display: none;
}

/* ── Search trigger ── */
.topbar-search {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--soft-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 140ms ease, color 140ms ease, background 140ms ease;
}
.topbar-search:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--text-main);
}
.topbar-search svg { flex-shrink: 0; }
.topbar-search-text { font-size: 0.82rem; font-weight: 600; }
.topbar-search-kbd {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 700;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.08rem 0.35rem;
  color: var(--text-muted);
}
@media (max-width: 768px) {
  .topbar-search-text, .topbar-search-kbd { display: none; }
  .topbar-search { padding: 0; width: 2.25rem; justify-content: center; }
}

@media (max-width: 1024px) {
  .topbar-hamburger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
}

@media (max-width: 768px) {
  .topbar {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    gap: 0.5rem;
  }
  .topbar-title {
    font-size: 1rem;
  }
  .topbar-actions {
    gap: 0.375rem;
  }
}

@media (max-width: 480px) {
  .topbar {
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    gap: 0.5rem;
  }
}
</style>
