<template>
  <div class="min-h-screen bg-bg">
    <Sidebar :mobile-open="sidebarOpen" @close="sidebarOpen = false" />

    <!-- Mobile backdrop when drawer is open -->
    <div
      v-if="sidebarOpen"
      class="app-sidebar-backdrop"
      aria-hidden="true"
      @click="sidebarOpen = false"
    ></div>

    <div class="app-content-shell pl-[260px]" :class="{ 'app-content-shell--collapsed': collapsed }">
      <Topbar @open-sidebar="sidebarOpen = true" />
      <main
        class="app-main mx-auto"
        :class="{
          'max-w-7xl px-7 py-6': route.path !== '/cms',
          'cms-full-stage': route.path === '/cms'
        }"
      >
        <PushSetupBanner v-if="route.path !== '/cms'" />
        <RouterView />
      </main>
    </div>
    <RealtimeToasts />

    <!-- Global command palette (Cmd/Ctrl+K) -->
    <CommandPalette />

    <!-- Monthly personal recap (members) → hands off to the winners banner -->
    <MonthlyRecap v-if="auth.user?.id" />

    <!-- Monthly winners celebration (auto on the 1st; preview via event) -->
    <MonthlyWinnersBanner v-if="auth.user?.id" />

    <!-- One-time new-features popup. Self-manages its visibility based on
         the per-user "seen" row in Supabase. -->
    <FeatureAnnouncementModal v-if="auth.user?.id" />

    <!-- Reusable System Update Banner popup -->
    <SystemUpdateBanner v-if="auth.user?.id" />

    <!-- Floating Executive Action -->
    <template v-if="auth.isHeadOrSupervisor">
      <button
        class="executive-floating-quick-capture"
        type="button"
        @click="isQuickCaptureOpen = true"
        title="Quick Capture"
      >
        <span class="btn-icon text-primary">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
          </svg>
        </span>
        <span class="btn-text">Quick Capture</span>
      </button>

      <QuickCaptureModal
        :open="isQuickCaptureOpen"
        @close="isQuickCaptureOpen = false"
      />
    </template>

    <!-- Floating Admin Action -->
    <template v-if="auth.isAdmin">
      <button
        class="admin-floating-assign-task"
        type="button"
        @click="isQuickAddOpen = true"
        title="Assign a new task"
      >
        <span class="btn-icon">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
        </span>
        <span class="btn-text">Assign Task</span>
      </button>

      <QuickAddTaskModal
        :open="isQuickAddOpen"
        @close="isQuickAddOpen = false"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import Sidebar from '@/components/layout/Sidebar.vue';
import Topbar from '@/components/layout/Topbar.vue';
import { useSidebarCollapsed } from '@/composables/useSidebarCollapsed';
import RealtimeToasts from '@/components/ui/RealtimeToasts.vue';
import PushSetupBanner from '@/components/ui/PushSetupBanner.vue';
import QuickAddTaskModal from '@/components/board/QuickAddTaskModal.vue';
import FeatureAnnouncementModal from '@/components/ui/FeatureAnnouncementModal.vue';
import SystemUpdateBanner from '@/components/ui/SystemUpdateBanner.vue';
import CommandPalette from '@/components/ui/CommandPalette.vue';
import MonthlyWinnersBanner from '@/components/ui/MonthlyWinnersBanner.vue';
import MonthlyRecap from '@/components/ui/MonthlyRecap.vue';
import { useAuthStore } from '@/stores/auth';
import QuickCaptureModal from '@/components/ui/QuickCaptureModal.vue';

const auth = useAuthStore();
const { collapsed } = useSidebarCollapsed();
const isQuickAddOpen = ref(false);
const isQuickCaptureOpen = ref(false);
const sidebarOpen = ref(false);
const route = useRoute();

// Close the mobile drawer whenever navigation happens
watch(() => route.fullPath, () => {
  sidebarOpen.value = false;
});
</script>

<style scoped>
.admin-floating-assign-task {
  position: fixed;
  right: 0;
  bottom: 80px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: #3f8dfe;
  color: white;
  padding: 0.75rem 1.25rem 0.75rem 1.1rem;
  border-radius: 999px 0 0 999px;
  border: none;
  cursor: pointer;
  box-shadow: -2px 4px 12px rgba(63, 141, 254, 0.35);
  transform: translateX(calc(100% - 44px));
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, box-shadow 0.2s;
}

.admin-floating-assign-task:hover {
  transform: translateX(0);
  box-shadow: -4px 6px 16px rgba(63, 141, 254, 0.45);
  background: #367de6;
}

.admin-floating-assign-task:active {
  background: #2b6ecf;
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.btn-text {
  font-family: 'Google Sans', 'Product Sans', system-ui, sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: 0.01em;
}

.app-sidebar-backdrop {
  display: none;
}

/* ── Desktop: content shell follows the sidebar width smoothly ─────────── */
@media (min-width: 1025px) {
  .app-content-shell {
    transition: padding-left 320ms cubic-bezier(0.4, 0, 0.2, 1);
    will-change: padding-left;
  }
  .app-content-shell--collapsed {
    padding-left: 76px;
  }
}

/* ── Tablet / mobile: sidebar becomes an off-canvas drawer ─────────────── */
@media (max-width: 1024px) {
  .app-content-shell {
    padding-left: 0;
  }
  .app-sidebar-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 30;
    background: rgba(15, 23, 42, 0.45);
    -webkit-backdrop-filter: blur(1px);
    backdrop-filter: blur(1px);
  }
}

@media (max-width: 1024px) {
  .app-main {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    padding-top: 1.25rem;
    padding-bottom: 1.5rem;
  }
}

@media (max-width: 480px) {
  .app-main {
    padding-left: 0.875rem;
    padding-right: 0.875rem;
    padding-top: 1rem;
  }
}

@media (max-width: 640px) {
  .admin-floating-assign-task {
    padding: 0.85rem;
    right: 16px;
    bottom: 16px;
    border-radius: 999px;
    transform: none;
    box-shadow: 0 4px 12px rgba(63, 141, 254, 0.35);
  }
  .admin-floating-assign-task:hover {
    transform: translateY(-2px) scale(1.02);
  }

  .executive-floating-quick-capture {
    padding: 0.85rem;
    right: 16px;
    bottom: 80px;
    border-radius: 999px;
    border: 1px solid var(--border);
    transform: none;
    box-shadow: var(--shadow-md);
  }
  .executive-floating-quick-capture:hover {
    transform: translateY(-2px) scale(1.02);
  }

  .btn-text {
    display: none;
  }
}

.executive-floating-quick-capture {
  position: fixed;
  right: 0;
  bottom: 140px;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.75rem 1.25rem 0.75rem 1.1rem;
  border-radius: 999px 0 0 999px;
  border: 1px solid var(--border);
  border-right: none;
  cursor: pointer;
  box-shadow: -2px 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateX(calc(100% - 44px));
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s, border-color 0.2s, box-shadow 0.2s;
}

.executive-floating-quick-capture:hover {
  transform: translateX(0);
  box-shadow: -4px 6px 16px rgba(0, 0, 0, 0.15);
  border-color: var(--primary);
  background: var(--primary-soft);
}

.executive-floating-quick-capture:active {
  background: var(--primary-soft-strong);
}

.cms-full-stage {
  width: 100% !important;
  max-width: 100% !important;
  padding: 0 !important;
  margin: 0 !important;
  height: calc(100vh - 60px);
}
</style>
