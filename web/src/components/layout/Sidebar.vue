<template>
  <aside
    class="app-sidebar fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-border bg-sidebar"
    :class="{ 'app-sidebar--open': mobileOpen, 'app-sidebar--collapsed': collapsed }"
  >
    <div class="app-sidebar-logo-wrap flex items-center justify-between px-5 pb-4 pt-5">
      <button
        type="button"
        class="app-sidebar-brand flex flex-col items-center gap-1.5"
        :title="$t('Refresh page')"
        :aria-label="$t('Refresh page')"
        @click="refreshPage"
      >
        <img
          src="/kiuq-logo.png"
          alt="KiuQ Website System"
          class="app-sidebar-logo h-auto w-full max-w-[183px] object-contain"
        />
        <div class="app-sidebar-logo-sub text-[10px] uppercase tracking-wider text-text-muted opacity-80">{{ $t('KiuQ Website System') }}</div>
      </button>
      <button
        type="button"
        class="app-sidebar-close btn-ghost h-8 w-8 px-0"
        :aria-label="$t('Close menu')"
        @click="$emit('close')"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>

    <nav class="app-sidebar-nav flex-1 space-y-1 overflow-y-auto px-3 pb-6">
      <template v-for="item in visibleNavItems" :key="item.to">
        <!-- Section label (expanded) / hairline divider (collapsed) -->
        <div v-if="item.section && !collapsed" class="nav-section-label">
          {{ getNavTranslationKey(item.section) ? $t(getNavTranslationKey(item.section)) : item.section }}
        </div>
        <div v-else-if="item.section && collapsed" class="nav-collapsed-divider" aria-hidden="true" />
        <!-- Group item (has children) -->
        <div v-if="item.children?.length">
          <div
            class="nav-item w-full"
            :class="{
              'nav-item-active': isGroupActive(item) && !isParentActiveOnly(item),
              'nav-group-active-parent': isParentActiveOnly(item),
              'nav-group-open': openGroup === item.to
            }"
          >
            <RouterLink
              :to="item.to"
              class="flex min-w-0 flex-1 items-center gap-3 truncate"
              style="text-decoration:none;color:inherit;"
              @click="toggleGroup(item.to)"
            >
              <span class="flex h-5 w-5 items-center justify-center" v-html="item.icon"></span>
              <span class="min-w-0 flex-1 truncate text-left">
                {{ getNavTranslationKey(item.label) ? $t(getNavTranslationKey(item.label)) : item.label }}
              </span>
            </RouterLink>
            <button
              type="button"
              class="ml-auto flex-shrink-0 rounded p-1 transition-colors text-text-muted hover:text-text-main"
              :aria-label="$t('Toggle section')"
              @click.stop="toggleGroup(item.to)"
            >
              <svg
                class="nav-chevron h-3.5 w-3.5 text-text-muted"
                :class="{ 'rotate-180': openGroup === item.to }"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
          <!-- Children (hidden entirely in collapsed mode) — smooth drop-down -->
          <Transition name="nav-dropdown">
            <div v-if="openGroup === item.to && !collapsed" class="nav-dropdown">
              <div class="space-y-0.5">
                <template v-for="child in item.children" :key="child.label">
                  <div
                    v-if="child.isComingSoon"
                    class="nav-item text-sm opacity-50 cursor-not-allowed select-none"
                    :title="$t('Coming Soon')"
                  >
                    <span class="flex h-4 w-4 items-center justify-center" v-html="child.icon"></span>
                    <span class="min-w-0 flex-1 truncate">
                      {{ getNavTranslationKey(child.label) ? $t(getNavTranslationKey(child.label)) : child.label }}
                    </span>
                    <span class="ml-auto text-[10px] uppercase font-bold tracking-wider text-text-muted">Soon</span>
                  </div>
                  <RouterLink
                    v-else
                    :to="child.to"
                    class="nav-item text-sm"
                    :class="{ 'nav-item-active': isActive(child) }"
                  >
                    <span class="flex h-4 w-4 items-center justify-center" v-html="child.icon"></span>
                    <span class="min-w-0 flex-1 truncate">
                      {{ getNavTranslationKey(child.label) ? $t(getNavTranslationKey(child.label)) : child.label }}
                    </span>
                    <span v-if="child.isLocked" class="ml-auto flex items-center justify-center text-text-muted opacity-70" :title="$t('Locked')">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    </span>
                  </RouterLink>
                </template>
              </div>
            </div>
          </Transition>
        </div>

        <!-- Coming soon regular item -->
        <div
          v-else-if="item.isComingSoon"
          class="nav-item opacity-50 cursor-not-allowed select-none"
          :title="$t('Coming Soon')"
        >
          <span class="flex h-5 w-5 items-center justify-center" v-html="item.icon"></span>
          <span class="min-w-0 flex-1 truncate">
            {{ getNavTranslationKey(item.label) ? $t(getNavTranslationKey(item.label)) : item.label }}
          </span>
          <span class="ml-auto text-[10px] uppercase font-bold tracking-wider text-text-muted">Soon</span>
        </div>

        <!-- Regular item -->
        <RouterLink
          v-else
          :to="item.to"
          class="nav-item"
          :class="{ 'nav-item-active': isActive(item) }"
        >
          <span class="flex h-5 w-5 items-center justify-center" v-html="item.icon"></span>
          <span class="min-w-0 flex-1 truncate">
            {{ getNavTranslationKey(item.label) ? $t(getNavTranslationKey(item.label)) : item.label }}
          </span>
          <span v-if="item.isLocked" class="ml-auto flex items-center justify-center text-text-muted opacity-70" :title="$t('Locked')">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </span>
          <span
            v-else-if="badgeValue(item)"
            class="ui-font ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold leading-4 text-white"
          >
            {{ badgeValue(item) }}
          </span>
        </RouterLink>
      </template>
    </nav>

    <!-- Collapse / expand toggle (desktop only) -->
    <div class="app-sidebar-collapse-row border-t border-border px-3 py-2">
      <button
        type="button"
        class="app-sidebar-collapse-btn"
        :aria-label="collapsed ? $t('Expand sidebar') : $t('Collapse sidebar')"
        :title="collapsed ? $t('Expand sidebar') : $t('Collapse sidebar')"
        @click="toggleCollapsed"
      >
        <svg
          class="app-sidebar-collapse-icon"
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span class="app-sidebar-collapse-label">{{ $t('nav.collapse') }}</span>
      </button>
    </div>

    <div class="border-t border-border px-4 py-4">
      <RouterLink class="app-sidebar-profile flex items-center gap-3 rounded-btn p-2 hover:bg-soft" to="/profile">
        <div
          class="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-soft text-primary ui-font text-sm font-semibold flex-shrink-0"
        >
          <img
            v-if="auth.profile?.avatarUrl"
            :src="auth.profile.avatarUrl"
            :alt="`${auth.profile.fullName || 'User'} avatar`"
            class="h-full w-full object-cover cursor-pointer transition hover:scale-110"
            @click.prevent.stop="openPhotoPreview(auth.profile)"
          />
          <span v-else>{{ initials }}</span>
        </div>
        <div class="app-sidebar-profile-meta min-w-0 flex-1">
          <div class="ui-font truncate text-sm font-medium">{{ auth.profile?.fullName || 'You' }}</div>
          <div class="truncate text-xs text-text-muted">{{ roleLabel(auth.profile?.role) }}</div>
        </div>
      </RouterLink>
      <RouterLink
        v-if="auth.user?.id && !auth.isQualityChecker"
        class="app-sidebar-viewfull mt-2 block rounded-btn px-3 py-2 text-center ui-font text-xs font-medium text-primary hover:bg-soft"
        :to="`/profiles/${auth.user.id}`"
      >
        {{ $t('nav.viewFull') }}
      </RouterLink>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { adminNavItems, memberNavItems, qualityCheckerNavItems, type NavItem } from './navItems';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';

const getNavTranslationKey = (label: string) => {
  const mapping: Record<string, string> = {
    'Dashboard': 'nav.dashboard',
    'My Dashboard': 'nav.dashboard',
    'Command Center': 'nav.commandCenter',
    'Winner Center': 'nav.winnerCenter',
    'Work Board': 'nav.workBoard',
    'My Work Board': 'nav.myWorkBoard',
    'Member Board': 'nav.memberBoard',
    'Quality Check': 'nav.qualityCheck',
    'Quality Check Board': 'nav.qualityCheck',
    'Followup': 'nav.followup',
    'Followup Center': 'nav.followup',
    'Blog Followup': 'nav.blogFollowup',
    'Plugin Update': 'nav.pluginUpdate',
    'eBay Click Followup': 'nav.ebayClickFollowup',
    'Website Optimization': 'nav.websiteOptimization',
    'Calendar': 'nav.calendar',
    'Reports': 'nav.reports',
    'Projects': 'nav.projects',
    'Folders': 'nav.folders',
    'Websites': 'nav.websites',
    'My Websites': 'nav.myWebsites',
    'Team Websites': 'nav.teamWebsites',
    'New Website': 'nav.newWebsite',
    'Performance': 'nav.performance',
    'Overview': 'nav.overview',
    'Page Indexing': 'nav.pageIndexing',
    'CMS': 'nav.cms',
    'Products': 'nav.products',
    'Blog Posts': 'nav.blogPosts',
    'Blog Center': 'nav.blogCenter',
    'Images': 'nav.images',
    'Prompt': 'nav.prompt',
    'Prompt Dashboard': 'nav.promptDashboard',
    'Prompt Library': 'nav.promptLibrary',
    'Prompt Builder': 'nav.promptBuilder',
    'Old Prompt Library': 'nav.oldPromptLibrary',
    'Members': 'nav.members',
    'Team Members': 'nav.members',
    'Reviews': 'nav.reviews',
    'Leaderboard': 'nav.leaderboard',
    'Activity': 'nav.activity',
    'Notes': 'nav.notes',
    'Docs': 'nav.docs',
    'Resources': 'nav.resources',
    'Settings': 'nav.settings',
    'Account Settings': 'nav.settings',
    'Task Alerts': 'nav.taskAlerts',
    'Profile': 'nav.profile',
    'My Profile': 'nav.myProfile',
    'Member Profile': 'nav.memberProfile',
    'Executive': 'nav.executiveSection',
    'Operations': 'nav.operationsSection',
    'Content': 'nav.contentSection',
    'Team': 'nav.teamSection',
    'Library': 'nav.librarySection',
    'System': 'nav.systemSection'
  };
  return mapping[label] || '';
};
import { roleLabel } from '@/lib/roles';
import { useSidebarCollapsed } from '@/composables/useSidebarCollapsed';

const { collapsed, toggleCollapsed } = useSidebarCollapsed();

withDefaults(defineProps<{ mobileOpen?: boolean }>(), { mobileOpen: false });
defineEmits<{ (e: 'close'): void }>();

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();
import { useImagePreviewStore } from '@/stores/imagePreview';
const previewStore = useImagePreviewStore();

const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName || 'You',
      email: member.email,
      role: member.role
    });
  }
};

const refreshPage = () => {
  window.location.reload();
};

const visibleNavItems = computed(() => {
  let items = auth.isAdmin
    ? adminNavItems
    : auth.isQualityChecker
      ? qualityCheckerNavItems
      : memberNavItems;

  if (!auth.isHeadOrSupervisor) {
    items = items.filter((item) => !item.isExecutiveOnly);
  }

  // Winner Center — Owner/Admin/Head only (Supervisor & below excluded).
  if (!auth.canAccessWinnerCenter) {
    items = items.filter((item) => !item.isWinnerCenterOnly);
  }

  const userRole = auth.profile?.role ? auth.profile.role.trim().toLowerCase() : '';
  const isTaskAlertManager = userRole === 'admin' || userRole === 'owner' || userRole === 'head';
  if (!isTaskAlertManager) {
    items = items.filter((item) => !item.isTaskAlertManagerOnly);
  }

  const isHead = auth.normalizedRole === 'head';
  items = items.filter((item) => !item.isHeadOnly || isHead);

  const isAdminRole = auth.normalizedRole === 'admin';
  items = items.filter((item) => !item.hideFromAdmin || !isAdminRole);

  if (auth.isViewer) {
    items = items.map((item) => {
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child) => child.to !== '/websites/new')
        };
      }
      return item;
    });
  }

  // Drop a section label when the previous visible item already opened the
  // same section — so filtered-out items (e.g. Command Center hidden from
  // owner/admin) never leave a duplicate or orphaned "Executive" header.
  let lastSection = '';
  items = items.map((item) => {
    if (item.section && item.section === lastSection) {
      const { section: _drop, ...rest } = item;
      return rest;
    }
    if (item.section) lastSection = item.section;
    return item;
  });

  return items;
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

// ── Group open/close state (accordion: only one open at a time) ───────────────
const openGroup = ref<string | null>(null);

const toggleGroup = (to: string) => {
  openGroup.value = openGroup.value === to ? null : to;
};

const isActive = (item: NavItem) => {
  const [path, queryStr] = item.to.split('?');
  const pathMatches = route.path === path || (path !== '/' && route.path.startsWith(path + '/'));
  if (!pathMatches) return false;

  if (queryStr) {
    const params = new URLSearchParams(queryStr);
    for (const [key, val] of params.entries()) {
      const qVal = route.query[key];
      // Special case: if query expects view=overview and route has no view query parameter, treat as active
      if (key === 'view' && val === 'overview' && !qVal) {
        continue;
      }
      if (qVal !== val) return false;
    }
  }
  return true;
};

const isGroupActive = (item: NavItem) => {
  if (isActive(item)) return true;
  return item.children?.some((c) => isActive(c)) ?? false;
};

const isParentActiveOnly = (item: NavItem) => {
  if (!item.children?.length) return false;
  return item.children.some((c) => isActive(c));
};

// Auto-open the group whose child matches the current route
const syncOpenGroup = () => {
  for (const item of visibleNavItems.value) {
    if (item.children?.some((c) => isActive(c))) {
      openGroup.value = item.to;
      return;
    }
  }
};

watch(() => route.path, syncOpenGroup, { immediate: true });

// ── Badge values ──────────────────────────────────────────────────────────────
const badgeValue = (item: NavItem) => {
  if (!item.badgeKey || auth.isAdmin) return 0;
  if (item.badgeKey === 'today') return data.mySidebarTodayCount;
  if (item.badgeKey === 'tasks') return data.myActiveTaskCount;
  if (item.badgeKey === 'feedback') return data.mySidebarFeedbackCount;
  if (item.badgeKey === 'submissions') return data.myPendingSubmissions;
  return 0;
};

onMounted(() => {
  if (auth.isMember) {
    data.fetchAssignments();
    data.fetchSectionTasks();
    data.fetchSubmissions();
  }
});
</script>

<style scoped>
/* Hide the nav scrollbar (still scrollable) — no browser scroll slider */
.app-sidebar-nav {
  scrollbar-width: none;            /* Firefox */
  -ms-overflow-style: none;         /* old Edge / IE */
}

/* First section label shouldn't push a big gap at the very top. */
.app-sidebar-nav > .nav-section-label:first-child {
  padding-top: 0.25rem;
}

/* Collapsed mode: section labels collapse into a centered hairline so the
   grouping rhythm survives without text. */
.nav-collapsed-divider {
  height: 1px;
  margin: 0.5rem auto;
  width: 28px;
  background: var(--border);
}
/* ── Chevron rotation in sync with the drop-down ───────────────────────── */
.nav-chevron {
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1);
}
.nav-chevron.rotate-180 {
  transform: rotate(180deg);
}

/* ── Smooth drop-down for sidebar group children ───────────────────────── */
/* The grid-rows trick lets us animate from height 0 → auto, which CSS
   can't otherwise transition. The inner div is the visible content. */
.nav-dropdown {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
}
.nav-dropdown > div {
  overflow: hidden;
  min-height: 0;
  margin-left: 21px;
  border-left: 1px solid var(--border);
  padding-left: 0.5rem; /* compact spacing */
  margin-top: 0.15rem;
  margin-bottom: 0.15rem;
}

.nav-dropdown .nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.4rem; /* compact gap */
  padding: 0.3rem 0.5rem; /* compact vertical & horizontal padding */
  font-size: 0.78rem; /* premium compact text */
  font-weight: 500;
  color: var(--text-muted);
  border-radius: 6px;
  background: transparent;
  transition: all 130ms ease;
  margin-top: 0.05rem;
  margin-bottom: 0.05rem;
}

.nav-dropdown .nav-item:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}

.nav-dropdown .nav-item-active,
.nav-dropdown .nav-item-active:hover {
  background: rgba(21, 214, 194, 0.06) !important; /* soft dark/cyan tinted background */
  color: var(--primary) !important;
  font-weight: 600; /* clean weight, no layout shift */
}

/* Remove default active indicator bar on submenu items */
.nav-dropdown :deep(.nav-item-active::before) {
  display: none !important;
}

/* Premium active dot indicator centered on the vertical border-l line */
.nav-dropdown .nav-item::after {
  content: '';
  position: absolute;
  left: -0.5rem; /* aligned with padding-left 0.5rem */
  top: 50%;
  transform: translate(-50%, -50%) scale(0);
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--primary);
  transition: transform 180ms cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 10;
}

.nav-dropdown .nav-item-active::after {
  transform: translate(-50%, -50%) scale(1);
}

/* Small, elegant submenu icons */
.nav-dropdown .nav-item :deep(span.flex) {
  width: 14px;
  height: 14px;
  color: var(--text-soft);
  transition: color 150ms ease;
}

.nav-dropdown .nav-item :deep(span.flex svg) {
  width: 14px;
  height: 14px;
}

.nav-dropdown .nav-item:hover :deep(span.flex) {
  color: var(--text-main);
}

.nav-dropdown .nav-item-active :deep(span.flex) {
  color: var(--primary) !important;
}

/* Parent active/open states scoped overrides */
.nav-group-open {
  background: var(--soft-bg) !important;
}

:deep(.nav-group-active-parent) {
  background: var(--soft-bg) !important;
  color: var(--primary) !important; /* cyan text only if active */
}

:deep(.nav-group-active-parent svg) {
  color: var(--primary) !important; /* cyan icon */
}

.nav-dropdown-enter-from,
.nav-dropdown-leave-to {
  grid-template-rows: 0fr;
  opacity: 0;
}
.nav-dropdown-enter-to,
.nav-dropdown-leave-from {
  grid-template-rows: 1fr;
  opacity: 1;
}
@media (prefers-reduced-motion: reduce) {
  .nav-dropdown { transition: none; }
}

.app-sidebar-nav::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;                    /* Chrome / Safari / new Edge */
}

/* The close button only shows inside the mobile drawer */
.app-sidebar-close {
  display: none;
}

.app-sidebar-logo-wrap {
  position: relative;
  justify-content: center !important;
}
.app-sidebar-brand {
  appearance: none;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
  text-align: center;
  cursor: pointer;
  border-radius: 10px;
  outline: none;
  max-width: 220px;
}
.app-sidebar-logo {
  display: block;
  margin-inline: auto;
}
.app-sidebar-logo-sub {
  text-align: center;
  line-height: 1.2;
}
.app-sidebar-brand:focus-visible {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 22%, transparent);
}

/* ── Collapse / expand toggle button ─────────────────────────────────────── */
.app-sidebar-collapse-row {
  display: flex;
  justify-content: flex-end;
}
.app-sidebar-collapse-btn {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 8px;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  transition: background 150ms ease;
}
.app-sidebar-collapse-btn:hover { background: var(--soft-bg); }
.app-sidebar-collapse-icon {
  flex-shrink: 0;
  transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* ── Desktop collapsed mode (compact ~50% width) ─────────────────────────── */
@media (min-width: 1025px) {
  /* Smooth, premium easing shared by every collapse transition. */
  .app-sidebar {
    transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: width;
    overflow-x: hidden;
  }
  .app-sidebar--collapsed {
    width: 76px;
  }

  /* Labels fade quickly while the sidebar is shrinking, then are removed
     from layout entirely so every icon centers perfectly (no residual
     zero-width boxes throwing the column off). */
  .app-sidebar :deep(.nav-item span.truncate),
  .app-sidebar :deep(.nav-item > span.ml-auto),
  .app-sidebar .app-sidebar-collapse-label,
  .app-sidebar .app-sidebar-logo-sub,
  .app-sidebar .app-sidebar-profile-meta {
    transition: opacity 160ms cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 1;
  }
  .app-sidebar--collapsed :deep(.nav-item span.truncate),
  .app-sidebar--collapsed :deep(.nav-item > span.ml-auto),
  .app-sidebar--collapsed :deep(.nav-item > button),
  .app-sidebar--collapsed .app-sidebar-collapse-label,
  .app-sidebar--collapsed .app-sidebar-logo-sub,
  .app-sidebar--collapsed .app-sidebar-profile-meta {
    display: none !important;
  }

  /* Both row structures must center identically:
     - regular item: .nav-item > [icon][label]
     - group item:   .nav-item > a(icon+label) + button(chevron)
     Flatten the group's RouterLink so its icon becomes a direct flex
     participant of the centered .nav-item. */
  .app-sidebar--collapsed :deep(.nav-item) {
    justify-content: center !important;
    gap: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
  .app-sidebar--collapsed :deep(.nav-item > a) {
    display: contents;
  }
  /* The icon span — fixed box, perfectly centered for every item */
  .app-sidebar--collapsed :deep(.nav-item > span),
  .app-sidebar--collapsed :deep(.nav-item > a > span) {
    flex: 0 0 auto !important;
    margin: 0 !important;
  }

  /* Collapse button: icon only, centered, arrow flips to point right */
  .app-sidebar--collapsed .app-sidebar-collapse-row {
    justify-content: center;
  }
  .app-sidebar--collapsed .app-sidebar-collapse-btn {
    justify-content: center;
  }
  .app-sidebar--collapsed .app-sidebar-collapse-icon {
    transform: rotate(180deg);
  }

  /* Logo: keep the image, hide only the sub-text label */
  .app-sidebar--collapsed .app-sidebar-logo {
    max-width: 44px;
  }
  .app-sidebar--collapsed .app-sidebar-logo-wrap {
    align-items: center;
    justify-content: center !important;
    padding-left: 0;
    padding-right: 0;
  }
  .app-sidebar--collapsed .app-sidebar-brand {
    max-width: 44px;
  }

  /* Profile footer: keep avatar, hide name/role + "View Full" */
  .app-sidebar--collapsed .app-sidebar-profile {
    justify-content: center;
  }
  .app-sidebar--collapsed .app-sidebar-viewfull {
    display: none;
  }
}

@media (max-width: 1024px) {
  .app-sidebar {
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.04);
    will-change: transform;
  }
  .app-sidebar--open {
    transform: translateX(0);
    box-shadow: 0 10px 40px rgba(15, 23, 42, 0.25);
  }
  .app-sidebar-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
  }
}

/* Slightly narrower drawer on very small phones */
@media (max-width: 380px) {
  .app-sidebar {
    width: 84vw;
    max-width: 300px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .app-sidebar,
  .app-sidebar *,
  .app-sidebar-collapse-icon {
    transition: none !important;
  }
}
</style>
