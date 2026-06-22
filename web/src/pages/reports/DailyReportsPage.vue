<template>
  <div class="daily-report-page flex flex-col gap-6">
    <div v-if="loading" class="flex flex-col gap-5">
      <!-- Skeleton Loading Stats -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-6">
        <div v-for="i in 6" :key="i" class="card card-pad skeleton h-20" />
      </div>
      <div class="card skeleton h-[300px]" />
    </div>

    <template v-else-if="stats">
      <!-- ── Daily Accountability KPIs ── -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Completed Today') }}</div>
            <div class="kpi-value text-emerald-500">{{ stats.completedToday }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Added Today') }}</div>
            <div class="kpi-value text-primary">{{ stats.newCreated || stats.completedToday + stats.inProgress }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Postponed Today') }}</div>
            <div class="kpi-value text-amber-500">{{ dailyPostponedCount }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Reopened Today') }}</div>
            <div class="kpi-value text-rose-500">{{ dailyReopenedCount }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Workflow Violations') }}</div>
            <div class="kpi-value text-rose-600 font-black">{{ stats.overdue + dailyViolationsCount }}</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">{{ $t('Follow-Ups Completed') }}</div>
            <div class="kpi-value text-indigo-500">{{ stats.avgFollowupCompletion }}%</div>
          </div>
        </div>
      </div>

      <!-- ── Manager Action Summary Panel ── -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div class="card p-5 border border-primary/20 bg-primary/[0.01]">
          <h3 class="section-title mb-4 flex items-center gap-2 text-primary font-bold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
            </svg>
            {{ $t('Manager View: Accomplishments Summary') }}
          </h3>
          
          <div class="flex flex-col gap-4 text-sm">
            <div>
              <span class="font-bold text-text-main block">{{ $t('Who completed work today:') }}</span>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="m in completedTodayMembers"
                  :key="m.id"
                  class="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold text-xs flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {{ m.name }}
                </span>
                <span v-if="completedTodayMembers.length === 0" class="text-text-muted italic text-xs">{{ $t('No member completed tasks today yet.') }}</span>
              </div>
            </div>

            <div>
              <span class="font-bold text-text-main block">{{ $t('Who made active progress today:') }}</span>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="m in activeTodayMembers"
                  :key="m.id"
                  class="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 font-semibold text-xs flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  {{ m.name }}
                </span>
                <span v-if="activeTodayMembers.length === 0" class="text-text-muted italic text-xs">{{ $t('No active progress recorded.') }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="card p-5 border border-rose-500/20 bg-rose-500/[0.01]">
          <h3 class="section-title mb-4 flex items-center gap-2 text-rose-500 font-bold">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            {{ $t('Manager View: Action & Coaching Needed') }}
          </h3>

          <div class="flex flex-col gap-4 text-sm">
            <div>
              <span class="font-bold text-text-main block">{{ $t('Who has unfinished / active work:') }}</span>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="m in unfinishedMembers"
                  :key="m.id"
                  class="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold text-xs flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {{ m.name }} ({{ m.tasksInProgress }} in prog)
                </span>
                <span v-if="unfinishedMembers.length === 0" class="text-text-muted italic text-xs">{{ $t('No active/unfinished tasks left.') }}</span>
              </div>
            </div>

            <div>
              <span class="font-bold text-text-main block text-rose-400">{{ $t('Who requires coaching or rule follow-up:') }}</span>
              <div class="mt-1 flex flex-wrap gap-2">
                <span
                  v-for="m in coachingRequiredMembers"
                  :key="m.id"
                  class="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 font-black text-xs flex items-center gap-1.5"
                >
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {{ m.name }}
                </span>
                <span v-if="coachingRequiredMembers.length === 0" class="text-text-muted italic text-xs">{{ $t('All members in full compliance.') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Daily Team Summary Table ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4">{{ $t('Daily Team Accountability Summary') }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs font-semibold uppercase">
                <th class="py-3 px-4">{{ $t('Team Member') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Completed') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Postponed') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Workflow Violations') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Compliance') }}</th>
                <th class="py-3 px-4">{{ $t('Active Task Card') }}</th>
                <th class="py-3 px-4 pr-6">{{ $t('Follow-up Checklists') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in summaries" :key="m.id" class="border-b border-border last:border-0 hover:bg-soft/40 transition-colors">
                <td class="py-3.5 px-4 font-semibold text-text-main flex items-center gap-2.5">
                  <div class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                    <img v-if="m.avatarUrl" :src="m.avatarUrl" class="w-full h-full object-cover" />
                    <span v-else>{{ m.name.slice(0, 2).toUpperCase() }}</span>
                  </div>
                  {{ m.name }}
                </td>
                <td class="py-3.5 px-4 text-center font-medium text-emerald-400">+{{ m.tasksCompleted }}</td>
                <td class="py-3.5 px-4 text-center font-medium text-amber-400">{{ m.tasksPostponed }}</td>
                <td class="py-3.5 px-4 text-center font-bold" :class="m.violationsCount > 0 ? 'text-rose-500' : 'text-text-muted'">
                  {{ m.violationsCount }}
                </td>
                <td class="py-3.5 px-4 text-center font-bold" :class="m.workflowComplianceScore >= 90 ? 'text-emerald-400' : 'text-rose-400'">
                  {{ m.workflowComplianceScore }}%
                </td>
                <td class="py-3.5 px-4 max-w-xs truncate text-xs text-text-main font-medium">{{ m.activeTaskName }}</td>
                <td class="py-3.5 px-4 pr-6">
                  <div class="flex items-center gap-2 text-xs font-semibold">
                    <span class="px-2 py-0.5 rounded" :class="m.blogRate === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">
                      Blog: {{ m.blogRate === 100 ? '✓' : m.blogRate + '%' }}
                    </span>
                    <span class="px-2 py-0.5 rounded" :class="m.ebayRate === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">
                      eBay: {{ m.ebayRate === 100 ? '✓' : m.ebayRate + '%' }}
                    </span>
                    <span class="px-2 py-0.5 rounded" :class="m.speedRate === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">
                      Speed: {{ m.speedRate === 100 ? '✓' : m.speedRate + '%' }}
                    </span>
                    <span class="px-2 py-0.5 rounded" :class="m.pluginRate === 100 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'">
                      Plugin: {{ m.pluginRate === 100 ? '✓' : m.pluginRate + '%' }}
                    </span>
                  </div>
                </td>
              </tr>
              <tr v-if="summaries.length === 0">
                <td colspan="7" class="py-8 text-center text-text-muted text-sm">{{ $t('No member summaries available.') }}</td>
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
import { useReportsStore, type MemberAccountabilitySummary } from '@/stores/reports';

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

const dailyPostponedCount = computed(() => {
  return summaries.value.reduce((acc, m) => acc + m.tasksPostponed, 0);
});

const dailyReopenedCount = computed(() => {
  return summaries.value.reduce((acc, m) => acc + m.tasksReopened, 0);
});

const dailyViolationsCount = computed(() => {
  return summaries.value.reduce((acc, m) => acc + m.violationsCount, 0);
});

// Manager View Computations
const completedTodayMembers = computed(() => {
  return summaries.value.filter(s => s.tasksCompleted > 0);
});

const activeTodayMembers = computed(() => {
  return summaries.value.filter(s => s.tasksInProgress > 0 || s.tasksCompleted > 0);
});

const unfinishedMembers = computed(() => {
  return summaries.value.filter(s => s.tasksInProgress > 0 || s.tasksOverdue > 0);
});

const coachingRequiredMembers = computed(() => {
  return summaries.value.filter(s => s.violationsCount > 0 || s.tasksOverdue > 0 || s.teamAccountabilityScore < 75);
});

const loadData = async () => {
  loading.value = true;
  try {
    const res = await reportsStore.getAggregatedMetrics(props.filters);
    stats.value = res.topStats;
    summaries.value = res.summaries;
  } catch (err) {
    console.error('[DailyReportsPage] load failed', err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.filters, loadData, { deep: true });

onMounted(loadData);
</script>

<style scoped>
.daily-report-page {
  width: 100%;
}
</style>
