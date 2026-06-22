<template>
  <div class="weekly-report-page flex flex-col gap-6">
    <div v-if="loading" class="flex flex-col gap-5">
      <!-- Skeleton Loading Stats -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="card card-pad skeleton h-20" />
      </div>
      <div class="card skeleton h-[350px]" />
    </div>

    <template v-else-if="stats">
      <!-- ── Weekly Accountability KPIs ── -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Total Completed Tasks') }}</div>
            <div class="kpi-value text-emerald-500">{{ totalCompleted }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Total Postponed Tasks') }}</div>
            <div class="kpi-value text-amber-500">{{ totalPostponed }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Workflow Violations') }}</div>
            <div class="kpi-value text-rose-500 font-bold">{{ totalViolations }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Follow-Up Rate') }}</div>
            <div class="kpi-value text-indigo-500 font-bold">{{ stats.avgFollowupCompletion }}%</div>
          </div>
        </div>
      </div>

      <!-- ── Weekly Accountability Insights ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4 flex items-center gap-2 text-primary font-bold">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          {{ $t('Weekly Insights & Performance Auditing') }}
        </h3>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div class="rounded-btn border border-border p-4 bg-soft/10">
            <div class="text-xs font-semibold uppercase tracking-wider text-emerald-500">{{ $t('Most Consistent Member') }}</div>
            <div v-if="mostConsistent" class="mt-2 flex items-center gap-3">
              <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                <img v-if="mostConsistent.avatarUrl" :src="mostConsistent.avatarUrl" class="w-full h-full object-cover" />
                <span v-else>{{ mostConsistent.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div>
                <div class="font-bold text-text-main text-sm">{{ mostConsistent.name }}</div>
                <div class="text-xs text-text-muted">Workflow compliance: {{ mostConsistent.workflowComplianceScore }}%</div>
              </div>
            </div>
            <div v-else class="mt-2 text-text-muted text-xs italic">{{ $t('No members available.') }}</div>
          </div>

          <div class="rounded-btn border border-border p-4 bg-soft/10">
            <div class="text-xs font-semibold uppercase tracking-wider text-blue-500">{{ $t('Most Productive Member') }}</div>
            <div v-if="mostProductive" class="mt-2 flex items-center gap-3">
              <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                <img v-if="mostProductive.avatarUrl" :src="mostProductive.avatarUrl" class="w-full h-full object-cover" />
                <span v-else>{{ mostProductive.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div>
                <div class="font-bold text-text-main text-sm">{{ mostProductive.name }}</div>
                <div class="text-xs text-text-muted">Completed {{ mostProductive.tasksCompleted }} tasks this week</div>
              </div>
            </div>
            <div v-else class="mt-2 text-text-muted text-xs italic">{{ $t('No members available.') }}</div>
          </div>

          <div class="rounded-btn border border-border p-4 bg-soft/10">
            <div class="text-xs font-semibold uppercase tracking-wider text-amber-500">{{ $t('Most Delayed / Postponed Tasks') }}</div>
            <div v-if="mostPostponed && mostPostponed.tasksPostponed > 0" class="mt-2 flex items-center gap-3">
              <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                <img v-if="mostPostponed.avatarUrl" :src="mostPostponed.avatarUrl" class="w-full h-full object-cover" />
                <span v-else>{{ mostPostponed.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div>
                <div class="font-bold text-text-main text-sm">{{ mostPostponed.name }}</div>
                <div class="text-xs text-text-muted">Postponed {{ mostPostponed.tasksPostponed }} tasks this week</div>
              </div>
            </div>
            <div v-else class="mt-2 flex items-center gap-3">
              <div class="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                ✓
              </div>
              <div>
                <div class="font-bold text-text-main text-sm">{{ $t('No Task Delays') }}</div>
                <div class="text-xs text-text-muted">{{ $t('No postponed cards recorded.') }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Neglected Projects Warning inside Weekly Insights -->
        <div v-if="neglectedProjects.length > 0" class="mt-4 p-3 rounded-btn border border-rose-500/20 bg-rose-500/[0.02] text-sm">
          <div class="font-bold text-rose-400 flex items-center gap-1.5 mb-1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {{ $t('Projects Neglected (No task updates in the last 7 days):') }}
          </div>
          <div class="flex flex-wrap gap-2 mt-2">
            <span v-for="p in neglectedProjects" :key="p.id" class="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 text-xs font-semibold">
              {{ p.projectName }}
            </span>
          </div>
        </div>
      </div>

      <!-- ── Weekly Performance Rankings ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4">{{ $t('Weekly Accountability Leaderboard') }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs font-semibold uppercase">
                <th class="py-3 px-4 w-12 text-center">{{ $t('Rank') }}</th>
                <th class="py-3 px-4">{{ $t('Team Member') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Completed Tasks') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Postponed Tasks') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Violations') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Compliance Score') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Follow-up Completion') }}</th>
                <th class="py-3 px-4 text-center pr-6">{{ $t('Weekly Score') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(member, idx) in summaries"
                :key="member.id"
                class="border-b border-border last:border-0 hover:bg-soft/40 transition-colors"
              >
                <td class="py-3.5 px-4 text-center font-bold">
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
                <td class="py-3.5 px-4">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                      <img v-if="member.avatarUrl" :src="member.avatarUrl" class="w-full h-full object-cover" />
                      <span v-else>{{ member.name.slice(0, 2).toUpperCase() }}</span>
                    </div>
                    <div>
                      <div class="font-bold text-text-main">{{ member.name }}</div>
                      <div class="text-xs text-text-muted">{{ member.email }}</div>
                    </div>
                  </div>
                </td>
                <td class="py-3.5 px-4 text-center font-semibold">{{ member.tasksCompleted }}</td>
                <td class="py-3.5 px-4 text-center font-medium text-amber-500">{{ member.tasksPostponed }}</td>
                <td class="py-3.5 px-4 text-center font-bold text-rose-500">{{ member.violationsCount }}</td>
                <td class="py-3.5 px-4 text-center font-semibold text-emerald-400">{{ member.workflowComplianceScore }}%</td>
                <td class="py-3.5 px-4 text-center font-semibold text-indigo-400">{{ member.followUpCompletionRate }}%</td>
                <td class="py-3.5 px-4 text-center pr-6">
                  <span
                    class="px-2.5 py-1 rounded font-black text-xs inline-block"
                    :class="member.teamAccountabilityScore >= 90
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : member.teamAccountabilityScore >= 75
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-rose-500/10 text-rose-400'"
                  >
                    {{ member.teamAccountabilityScore }}%
                  </span>
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
import { ref, computed, watch, onMounted } from 'vue';
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

const totalCompleted = computed(() => {
  return summaries.value.reduce((acc, m) => acc + m.tasksCompleted, 0);
});

const totalPostponed = computed(() => {
  return summaries.value.reduce((acc, m) => acc + m.tasksPostponed, 0);
});

const totalViolations = computed(() => {
  return summaries.value.reduce((acc, m) => acc + m.violationsCount, 0);
});

// Insights computations
const mostConsistent = computed(() => {
  if (summaries.value.length === 0) return null;
  return summaries.value.reduce((best, s) => s.workflowComplianceScore > best.workflowComplianceScore ? s : best, summaries.value[0]);
});

const mostProductive = computed(() => {
  if (summaries.value.length === 0) return null;
  return summaries.value.reduce((best, s) => s.tasksCompleted > best.tasksCompleted ? s : best, summaries.value[0]);
});

const mostPostponed = computed(() => {
  if (summaries.value.length === 0) return null;
  return summaries.value.reduce((best, s) => s.tasksPostponed > best.tasksPostponed ? s : best, summaries.value[0]);
});

const neglectedProjects = computed(() => {
  return alerts.value.filter(a => a.type === 'neglected_project');
});

const loadData = async () => {
  loading.value = true;
  try {
    const res = await reportsStore.getAggregatedMetrics(props.filters);
    stats.value = res.topStats;
    summaries.value = res.summaries;
    alerts.value = res.alerts;
  } catch (err) {
    console.error('[WeeklyReportsPage] load data failed', err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.filters, loadData, { deep: true });

onMounted(loadData);
</script>

<style scoped>
.weekly-report-page {
  width: 100%;
}
</style>
