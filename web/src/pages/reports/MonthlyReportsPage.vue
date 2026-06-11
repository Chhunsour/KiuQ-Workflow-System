<template>
  <div class="monthly-report-page flex flex-col gap-6">
    <div v-if="loading" class="flex flex-col gap-5">
      <!-- Skeleton Loading Stats -->
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div v-for="i in 4" :key="i" class="card card-pad skeleton h-20" />
      </div>
      <div class="card skeleton h-[350px]" />
    </div>

    <template v-else-if="stats">
      <!-- ── Monthly Accountability KPIs ── -->
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">Task Completion Rate</div>
            <div class="kpi-value text-emerald-500">{{ stats.weeklyCompletionRate }}%</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">Workflow Compliance</div>
            <div class="kpi-value text-emerald-400 font-bold">{{ stats.avgWorkflowCompliance }}%</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">Follow-Up Rate</div>
            <div class="kpi-value text-indigo-500 font-bold">{{ stats.avgFollowupCompletion }}%</div>
          </div>
        </div>
        <div class="kpi card card-pad">
          <div>
            <div class="kpi-label text-text-muted">Overall Team Score</div>
            <div class="kpi-value text-primary font-bold">{{ overallTeamScore }}%</div>
          </div>
        </div>
      </div>

      <!-- ── Monthly Management Summary ── -->
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <!-- Contributors Section -->
        <div class="card p-5">
          <h3 class="section-title mb-4 text-emerald-400 font-bold flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            Top Contributors
          </h3>
          <div class="flex flex-col gap-3">
            <div
              v-for="(member, idx) in topContributors"
              :key="member.id"
              class="flex items-center justify-between border-b border-border last:border-0 pb-2.5 last:pb-0"
            >
              <div class="flex items-center gap-3">
                <span class="text-xs font-bold text-emerald-400">#{{ idx + 1 }}</span>
                <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                  <img v-if="member.avatarUrl" :src="member.avatarUrl" class="w-full h-full object-cover" />
                  <span v-else>{{ member.name.slice(0, 2).toUpperCase() }}</span>
                </div>
                <div>
                  <div class="text-sm font-semibold text-text-main">{{ member.name }}</div>
                  <div class="text-xs text-text-muted">{{ member.tasksCompleted }} completed / {{ member.violationsCount }} violations</div>
                </div>
              </div>
              <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 py-1 px-2.5 rounded-full">
                Score: {{ member.teamAccountabilityScore }}%
              </span>
            </div>
            <div v-if="topContributors.length === 0" class="text-xs text-text-muted italic py-4">No data.</div>
          </div>
        </div>

        <!-- Coaching Section -->
        <div class="card p-5">
          <h3 class="section-title mb-4 text-rose-500 font-bold flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="19" y1="18" x2="19.01" y2="18"/>
            </svg>
            Members Needing Improvement
          </h3>
          <div class="flex flex-col gap-3">
            <div
              v-for="member in lowPerformers"
              :key="member.id"
              class="flex items-center justify-between border-b border-border last:border-0 pb-2.5 last:pb-0"
            >
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-rose-500/10 text-rose-400 font-bold text-xs flex-shrink-0">
                  <img v-if="member.avatarUrl" :src="member.avatarUrl" class="w-full h-full object-cover" />
                  <span v-else>{{ member.name.slice(0, 2).toUpperCase() }}</span>
                </div>
                <div>
                  <div class="text-sm font-semibold text-text-main">{{ member.name }}</div>
                  <div class="text-xs text-text-muted">{{ member.tasksOverdue }} overdue / {{ member.violationsCount }} violations</div>
                </div>
              </div>
              <span class="text-xs font-bold text-rose-400 bg-rose-500/10 py-1 px-2.5 rounded-full">
                Score: {{ member.teamAccountabilityScore }}%
              </span>
            </div>
            <div v-if="lowPerformers.length === 0" class="text-xs text-text-muted italic py-4">No coaching required. All members are performing above standards.</div>
          </div>
        </div>
      </div>

      <!-- ── Project Status Overview ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4">Project Accountability & Neglect Tracker</h3>
        
        <div v-if="neglectedProjects.length === 0" class="text-sm text-text-muted py-4 flex flex-col items-center gap-1">
          <svg class="text-emerald-500" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
          <span class="font-medium mt-1">All projects are moving forward. No neglect detected.</span>
        </div>

        <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div
            v-for="proj in neglectedProjects"
            :key="proj.id"
            class="flex items-start gap-3 rounded-btn border border-rose-500/20 bg-rose-500/[0.02] p-4"
          >
            <div class="mt-0.5 text-rose-400">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div>
              <div class="font-bold text-text-main text-sm">Project: {{ proj.projectName }}</div>
              <div class="text-xs text-text-muted mt-1 leading-relaxed">{{ proj.message }}</div>
              <div class="mt-2 text-xs text-rose-400 font-bold uppercase tracking-wider">Action Required: Shift resources or reassign tasks</div>
            </div>
          </div>
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

const overallTeamScore = computed(() => {
  if (summaries.value.length === 0) return 100;
  const sum = summaries.value.reduce((acc, s) => acc + s.teamAccountabilityScore, 0);
  return Math.round(sum / summaries.value.length);
});

// Contributors list
const topContributors = computed(() => {
  return summaries.value.filter(s => s.teamAccountabilityScore >= 85);
});

// Coaching list
const lowPerformers = computed(() => {
  return summaries.value.filter(s => s.teamAccountabilityScore < 85);
});

// Neglected projects list
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
    console.error('[MonthlyReportsPage] load monthly data failed', err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.filters, loadData, { deep: true });

onMounted(loadData);
</script>

<style scoped>
.monthly-report-page {
  width: 100%;
}
</style>
