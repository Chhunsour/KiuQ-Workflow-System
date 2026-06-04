<template>
  <div>
    <PageHeader :title="welcomeTitle" subtitle="Quick overview of your prompt-management workspace.">
      <template #actions>
        <RouterLink to="/websites/new" class="btn-secondary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Website
        </RouterLink>
        <RouterLink to="/library" class="btn-primary">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Prompt
        </RouterLink>
      </template>
    </PageHeader>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-5">
      <StatCard
        label="Total Members"
        :value="data.totalMembers"
        icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>'
        icon-bg="bg-soft"
        icon-color="text-primary"
      />
      <StatCard
        label="Total Projects"
        :value="data.totalProjects"
        icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
        icon-bg="bg-soft"
        icon-color="text-primary"
      />
      <StatCard
        label="Total Websites"
        :value="data.totalWebsites"
        icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>'
        icon-bg="bg-soft"
        icon-color="text-primary"
      />
      <StatCard
        label="Total Prompts"
        :value="data.totalPrompts"
        icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
        icon-bg="bg-soft"
        icon-color="text-primary"
      />
      <StatCard
        label="Pending Tasks"
        :value="data.pendingTasks"
        icon='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>'
        icon-bg="bg-status-submitted-bg"
        icon-color="text-status-submitted-fg"
      />
    </div>

    <div v-if="combinedError" class="mt-4 rounded-card border border-status-needs-fix-bg bg-status-needs-fix-bg/30 px-4 py-3 text-sm text-status-needs-fix-fg">
      {{ combinedError }}
    </div>

    <div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="card lg:col-span-2">
        <div class="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 class="section-title">Recent activity</h3>
          <span v-if="anyLoading" class="text-xs text-text-muted">Loading...</span>
        </div>
        <ul v-if="data.activity.length > 0" class="divide-y divide-border">
          <li v-for="item in data.activity" :key="item.id" class="px-6 py-4 text-sm">
            <div class="flex items-start justify-between gap-3">
              <span class="text-text-main">{{ item.text }}</span>
              <span class="text-xs text-text-muted whitespace-nowrap">{{ item.timestamp }}</span>
            </div>
          </li>
        </ul>
        <div v-else class="px-6 py-10 text-center text-sm text-text-muted">
          {{ anyLoading ? 'Loading...' : 'No recent activity yet.' }}
        </div>
      </div>

      <div class="card">
        <div class="border-b border-border px-6 py-4">
          <h3 class="section-title">Quick actions</h3>
        </div>
        <div class="space-y-2 p-4">
          <RouterLink to="/members" class="nav-item">
            <span class="flex h-8 w-8 items-center justify-center rounded-btn bg-soft text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </span>
            Manage members
          </RouterLink>
          <RouterLink to="/projects" class="nav-item">
            <span class="flex h-8 w-8 items-center justify-center rounded-btn bg-soft text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </span>
            Create a project
          </RouterLink>
          <RouterLink to="/library" class="nav-item">
            <span class="flex h-8 w-8 items-center justify-center rounded-btn bg-soft text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </span>
            Open Prompt Library
          </RouterLink>
          <RouterLink to="/websites/new" class="nav-item">
            <span class="flex h-8 w-8 items-center justify-center rounded-btn bg-soft text-primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>
            </span>
            Create a new website
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import { useDataStore } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';

const data = useDataStore();
const auth = useAuthStore();

const welcomeTitle = computed(() => {
  const name = auth.profile?.fullName?.split(' ')[0];
  return name ? `Welcome back, ${name}` : 'Welcome back';
});

const anyLoading = computed(() =>
  Object.values(data.loading).some(Boolean)
);

const combinedError = computed(() => {
  const first = Object.values(data.errors).find((e) => !!e);
  return first ?? null;
});

onMounted(() => data.fetchAll());
</script>
