<template>
  <div class="overview-report-page flex flex-col gap-6">
    <div v-if="loading" class="flex flex-col gap-5">
      <!-- Skeleton Loading Stats -->
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="card card-pad skeleton h-20" />
      </div>
      <!-- Skeleton Loading Sections -->
      <div class="card skeleton h-[350px] w-full" />
    </div>

    <template v-else-if="stats">
      <!-- ── Top Statistics Cards (No Hours or Attendance) ── -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div class="kpi card card-pad">
          <div class="icon-tile text-blue-500 bg-blue-500/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Completed Today</div>
            <div class="kpi-value text-blue-500">{{ stats.completedToday }}</div>
          </div>
        </div>

        <div class="kpi card card-pad">
          <div class="icon-tile text-amber-500 bg-amber-500/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 8h3M8 12h5"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Tasks In Progress</div>
            <div class="kpi-value text-amber-500">{{ stats.inProgress }}</div>
          </div>
        </div>

        <div class="kpi card card-pad">
          <div class="icon-tile text-rose-500 bg-rose-500/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Overdue Tasks</div>
            <div class="kpi-value text-rose-500">{{ stats.overdue }}</div>
          </div>
        </div>

        <div class="kpi card card-pad">
          <div class="icon-tile text-emerald-500 bg-emerald-500/10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div class="kpi-label">Avg Compliance</div>
            <div class="kpi-value text-emerald-500">{{ stats.avgWorkflowCompliance }}%</div>
          </div>
        </div>
      </div>

      <!-- ── Management Attention / Alerts Section ── -->
      <div class="card p-5 border border-rose-500/20 bg-rose-500/[0.02]">
        <h3 class="section-title mb-4 flex items-center gap-2 text-rose-500 font-bold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Management Attention Alerts
        </h3>
        
        <div v-if="alerts.length === 0" class="text-sm text-text-muted py-4 flex flex-col items-center gap-2">
          <svg class="text-emerald-500" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span class="font-medium">All clear. No workflow violations or overdue tasks active.</span>
        </div>

        <div v-else class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div
            v-for="alert in alerts"
            :key="alert.id"
            class="flex gap-3 rounded-btn border p-3.5 text-sm transition"
            :class="alert.severity === 'danger'
              ? 'border-rose-500/30 bg-rose-500/5 text-rose-200'
              : 'border-amber-500/30 bg-amber-500/5 text-amber-200'"
          >
            <span class="flex-shrink-0 mt-0.5">
              <svg v-if="alert.severity === 'danger'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </span>
            <div class="flex-1">
              <div class="font-bold text-xs uppercase tracking-wide opacity-90">{{ alert.title }}</div>
              <div class="mt-1 text-text-main font-medium leading-relaxed">{{ alert.message }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Team Accountability Rankings ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4 flex items-center justify-between">
          <span>Team Accountability Rankings</span>
          <span class="text-xs text-text-muted font-normal">Ranked by Accountability Score</span>
        </h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs font-semibold uppercase">
                <th class="py-3 px-4 w-12 text-center">Rank</th>
                <th class="py-3 px-4">Team Member</th>
                <th class="py-3 px-4 text-center">Accountability Score</th>
                <th class="py-3 px-4 text-center">Tasks Completed</th>
                <th class="py-3 px-4 text-center">In Progress</th>
                <th class="py-3 px-4 text-center">Overdue</th>
                <th class="py-3 px-4 text-center">Compliance Score</th>
                <th class="py-3 px-4 pr-6">Current Task Card</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(member, idx) in summaries"
                :key="member.id"
                class="border-b border-border last:border-0 hover:bg-soft/40 transition-colors"
              >
                <td class="py-4 px-4 text-center font-bold">
                  <span
                    class="flex items-center justify-center w-6 h-6 rounded-full mx-auto"
                    :class="idx === 0
                      ? 'bg-amber-500/20 text-amber-500 text-xs'
                      : idx === 1
                        ? 'bg-slate-400/20 text-slate-400 text-xs'
                        : idx === 2
                          ? 'bg-amber-700/20 text-amber-700 text-xs'
                          : 'text-text-muted'"
                  >
                    {{ idx + 1 }}
                  </span>
                </td>
                <td class="py-4 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                      <img v-if="member.avatarUrl" :src="member.avatarUrl" class="w-full h-full object-cover" />
                      <span v-else>{{ member.name.slice(0, 2).toUpperCase() }}</span>
                    </div>
                    <div>
                      <div class="font-bold text-text-main">{{ member.name }}</div>
                      <div class="text-xs text-text-muted">{{ member.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-4 text-center">
                  <span
                    class="px-3 py-1.5 rounded-full font-black text-xs inline-block min-w-[55px]"
                    :class="member.teamAccountabilityScore >= 90
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : member.teamAccountabilityScore >= 75
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'"
                  >
                    {{ member.teamAccountabilityScore }}%
                  </span>
                </td>
                <td class="py-4 px-4 text-center font-medium">{{ member.tasksCompleted }}</td>
                <td class="py-4 px-4 text-center font-medium">
                  <span
                    class="px-2 py-0.5 rounded text-xs font-semibold"
                    :class="member.tasksInProgress > 1 ? 'bg-rose-500/20 text-rose-400 font-bold' : 'text-text-main'"
                  >
                    {{ member.tasksInProgress }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center font-semibold" :class="member.tasksOverdue > 0 ? 'text-rose-400 font-bold' : 'text-text-muted'">
                  {{ member.tasksOverdue }}
                </td>
                <td class="py-4 px-4 text-center font-semibold" :class="member.workflowComplianceScore >= 90 ? 'text-emerald-400' : 'text-amber-400'">
                  {{ member.workflowComplianceScore }}%
                </td>
                <td class="py-4 px-4 pr-6 text-xs text-text-main max-w-xs truncate font-medium">
                  {{ member.activeTaskName }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useReportsStore, type MemberAccountabilitySummary, type ManagementAlert } from '@/stores/reports';

const props = defineProps<{
  filters: {
    startDate: string;
    endDate: string;
    memberId: string;
    projectId: string;
    department: string;
  };
}>();

const reportsStore = useReportsStore();
const loading = ref(true);
const stats = ref<any>(null);
const summaries = ref<MemberAccountabilitySummary[]>([]);
const alerts = ref<ManagementAlert[]>([]);

const loadData = async () => {
  loading.value = true;
  try {
    const res = await reportsStore.getAggregatedMetrics(props.filters);
    stats.value = res.topStats;
    summaries.value = res.summaries;
    alerts.value = res.alerts;
  } catch (err) {
    console.error('[OverviewPage] Load accountability metrics failed', err);
  } finally {
    loading.value = false;
  }
};

// Re-fetch data on deep filters changes
watch(() => props.filters, loadData, { deep: true });

onMounted(loadData);
</script>

<style scoped>
.overview-report-page {
  width: 100%;
}
</style>
