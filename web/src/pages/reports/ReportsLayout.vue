<template>
  <div class="reports-layout-page flex flex-col gap-5">
    <!-- Header -->
    <PageHeader :title="$t('Reports & Accountability')" subtitle="Monitor task completion, workflow compliance, alerts, and team discipline.">
      <template #actions>
        <button type="button" class="btn-primary" @click="saveSnap">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          {{ $t('Save Snapshot') }}
        </button>
      </template>
    </PageHeader>

    <!-- Global Filters Bar -->
    <div class="card card-pad flex flex-wrap items-center gap-4 bg-card shadow-sm border border-border">
      <!-- Date Range -->
      <div class="filter-group flex flex-col gap-1">
        <label class="eyebrow text-text-muted">{{ $t('Start Date') }}</label>
        <input type="date" v-model="filters.startDate" class="input py-1.5 px-3 max-w-[150px]" />
      </div>
      <div class="filter-group flex flex-col gap-1">
        <label class="eyebrow text-text-muted">{{ $t('End Date') }}</label>
        <input type="date" v-model="filters.endDate" class="input py-1.5 px-3 max-w-[150px]" />
      </div>

      <!-- Member Filter (Locked for standard member) -->
      <div class="filter-group flex flex-col gap-1">
        <label class="eyebrow text-text-muted">{{ $t('Member') }}</label>
        <select
          v-model="filters.memberId"
          :disabled="isMemberLocked"
          class="input py-1.5 px-3 min-w-[150px]"
        >
          <option value="">{{ $t('All Members') }}</option>
          <option v-for="m in filteredMembers" :key="m.id" :value="m.id">
            {{ m.fullName || m.email }}
          </option>
        </select>
      </div>

      <!-- Project Filter -->
      <div class="filter-group flex flex-col gap-1">
        <label class="eyebrow text-text-muted">{{ $t('Project') }}</label>
        <select v-model="filters.projectId" class="input py-1.5 px-3 min-w-[150px]">
          <option value="">{{ $t('All Projects') }}</option>
          <option v-for="p in data.projects" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>

      <!-- Department (derived from positions) -->
      <div class="filter-group flex flex-col gap-1">
        <label class="eyebrow text-text-muted">{{ $t('Department') }}</label>
        <select v-model="filters.department" class="input py-1.5 px-3 min-w-[150px]">
          <option value="">{{ $t('All Departments') }}</option>
          <option v-for="dept in departments" :key="dept" :value="dept">{{ dept }}</option>
        </select>
      </div>


    </div>

    <!-- Sub-tab Navigation (Desktop top nav for quick switching) -->
    <div class="reports-tabs flex border-b border-border overflow-x-auto gap-2">
      <RouterLink
        v-for="tab in visibleTabs"
        :key="tab.to"
        :to="tab.to"
        class="reports-tab py-2.5 px-4 text-sm font-semibold text-text-muted hover:text-text-main border-b-2 border-transparent transition"
        active-class="reports-tab--active text-primary border-primary"
      >
        {{ tab.label }}
      </RouterLink>
    </div>

    <!-- Main View Section -->
    <div class="reports-content mt-2">
      <RouterView :filters="filters" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide, onMounted, reactive } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useReportsStore } from '@/stores/reports';

const auth = useAuthStore();
const data = useDataStore();
const reportsStore = useReportsStore();
const route = useRoute();

// Time helper: defaults to start of current month to today
const getMonthStart = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const getTodayDate = () => new Date().toISOString().split('T')[0];

// Shared Filters state
const filters = reactive({
  startDate: getMonthStart(),
  endDate: getTodayDate(),
  memberId: '',
  projectId: '',
  department: ''
});

// Provide filters so any nested route page can inject it dynamically
provide('reports-filters', filters);

// Lock filters based on roles
const isMemberLocked = computed(() => {
  // regular team members can only view their own reports
  return auth.isMember && !auth.isAssistantHead;
});

// Set default logged-in member filter on mount
onMounted(async () => {
  await Promise.allSettled([
    data.fetchMembers(),
    data.fetchProjects()
  ]);
  if (isMemberLocked.value && auth.user?.id) {
    filters.memberId = auth.user.id;
  }
});

// Limit member filter options for Team Leader (Assistant Head)
const filteredMembers = computed(() => {
  const isWorker = (m: any) => {
    const role = (m.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return role !== 'viewer' && role !== 'tester' && role !== 'employee';
  };

  if (auth.isAdmin || auth.profile?.role === 'reviewer' || auth.profile?.role === 'manager') {
    return data.members.filter(isWorker);
  }
  
  if (auth.isAssistantHead && auth.user?.id) {
    // Only show members belonging to same projects as the Assistant Head
    const myProjectIds = data.projects
      .filter(p => data.assignments.some(a => a.projectId === p.id && a.assignedMemberId === auth.user?.id))
      .map(p => p.id);
      
    const allowedMemberIds = new Set<string>();
    data.assignments.forEach(a => {
      if (a.projectId && myProjectIds.includes(a.projectId)) {
        allowedMemberIds.add(a.assignedMemberId);
      }
    });

    return data.members.filter(m => isWorker(m) && (allowedMemberIds.has(m.id) || m.id === auth.user?.id));
  }

  // Regular members only see themselves in dropdown
  if (auth.user?.id) {
    return data.members.filter(m => isWorker(m) && m.id === auth.user?.id);
  }

  return [];
});

// Unique Departments from profiles positions
const departments = computed(() => {
  const depts = new Set<string>();
  const isWorker = (m: any) => {
    const role = (m.role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    return role !== 'viewer' && role !== 'tester' && role !== 'employee';
  };
  data.members.filter(isWorker).forEach(m => {
    if (m.position) depts.add(m.position);
  });
  return Array.from(depts).sort();
});

// Define subpages tabs
const allTabs = [
  { label: 'Overview', to: '/reports/overview', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head', 'member', 'team_member'] },
  { label: 'Daily Reports', to: '/reports/daily', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head', 'member', 'team_member'] },
  { label: 'Weekly Reports', to: '/reports/weekly', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head', 'member', 'team_member'] },
  { label: 'Monthly Reports', to: '/reports/monthly', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head', 'member', 'team_member'] },
  { label: 'Member Performance', to: '/reports/member', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head'] },
  { label: 'Team Analytics', to: '/reports/team', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head'] },
  { label: 'Activity Logs', to: '/reports/activity', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager'] },
  { label: 'Productivity Insights', to: '/reports/insights', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head'] },
  { label: 'Exports', to: '/reports/exports', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head', 'member', 'team_member'] },
  { label: 'Performance Doc', to: '/reports/documentation', roles: ['admin', 'owner', 'head', 'supervisor', 'reviewer', 'manager', 'assistant_head'] },
  { label: 'Settings', to: '/reports/settings', roles: ['admin', 'owner', 'head', 'supervisor'] }
];

const visibleTabs = computed(() => {
  const userRole = auth.profile?.role || 'member';
  return allTabs.filter(tab => tab.roles.includes(userRole));
});

// Snapshot action
const saveSnap = async () => {
  const activeTab = route.path.split('/').pop() || 'overview';
  const success = await reportsStore.saveSnapshot(
    activeTab,
    filters,
    { timestamp: new Date().toISOString(), savedBy: auth.profile?.fullName || 'Admin' }
  );

  if (success) {
    alert('Report snapshot saved successfully!');
  } else {
    alert('Failed to save snapshot: ' + reportsStore.error);
  }
};
</script>

<style scoped>
.reports-layout-page {
  width: 100%;
}
.reports-tabs {
  scrollbar-width: none;
}
.reports-tabs::-webkit-scrollbar {
  display: none;
}
.reports-tab {
  white-space: nowrap;
}
.reports-tab--active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
</style>
