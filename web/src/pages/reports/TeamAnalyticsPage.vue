<template>
  <div class="team-analytics-page flex flex-col gap-6">
    <div v-if="loading" class="card skeleton h-[350px] w-full" />

    <template v-else>
      <!-- ── Department Accountability Rankings ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4 flex items-center justify-between">
          <span>{{ $t('Department Accountability Rankings') }}</span>
          <span class="text-xs text-text-muted font-normal">{{ $t('Ranked by overall average score') }}</span>
        </h3>
        
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs font-semibold uppercase">
                <th class="py-3 px-4 w-12 text-center">{{ $t('Rank') }}</th>
                <th class="py-3 px-4">{{ $t('Department / Team') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Active Members') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Avg Compliance Score') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Avg Follow-up Rate') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Tasks Completed') }}</th>
                <th class="py-3 px-4 text-center pr-6">{{ $t('Avg Accountability Score') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(dept, idx) in departmentStats"
                :key="dept.name"
                class="border-b border-border last:border-0 hover:bg-soft/40 transition-colors"
              >
                <td class="py-4 px-4 text-center font-bold">
                  <span
                    class="flex items-center justify-center w-6 h-6 rounded-full mx-auto"
                    :class="idx === 0
                      ? 'bg-amber-500/20 text-amber-500 text-xs'
                      : idx === 1
                        ? 'bg-slate-400/20 text-slate-400 text-xs'
                        : 'text-text-muted'"
                  >
                    {{ idx + 1 }}
                  </span>
                </td>
                <td class="py-4 px-4 font-bold text-text-main">{{ dept.name }}</td>
                <td class="py-4 px-4 text-center font-medium">{{ dept.memberCount }}</td>
                <td class="py-4 px-4 text-center font-semibold text-emerald-400">{{ dept.avgCompliance }}%</td>
                <td class="py-4 px-4 text-center font-semibold text-indigo-400">{{ dept.avgFollowup }}%</td>
                <td class="py-4 px-4 text-center font-medium">{{ dept.totalCompleted }}</td>
                <td class="py-4 px-4 text-center pr-6">
                  <span
                    class="px-2.5 py-1 rounded font-black text-xs inline-block"
                    :class="dept.avgScore >= 85
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-400'"
                  >
                    {{ dept.avgScore }}%
                  </span>
                </td>
              </tr>
              <tr v-if="departmentStats.length === 0">
                <td colspan="7" class="py-8 text-center text-text-muted text-sm">{{ $t('No department statistics available.') }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ── Project Neglect & Progress Summary ── -->
      <div class="card p-5">
        <h3 class="section-title mb-4">{{ $t('Active Projects Progress & Deadlines') }}</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse text-sm">
            <thead>
              <tr class="border-b border-border text-text-muted text-xs font-semibold uppercase">
                <th class="py-3 px-4">{{ $t('Project Name') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Status') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Tasks Created') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Tasks Completed') }}</th>
                <th class="py-3 px-4 text-center">{{ $t('Overdue Cards') }}</th>
                <th class="py-3 px-4 pr-6">{{ $t('Deadline') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in projectSummaries"
                :key="p.id"
                class="border-b border-border last:border-0 hover:bg-soft/40 transition-colors"
              >
                <td class="py-4 px-4 font-semibold text-text-main">{{ p.name }}</td>
                <td class="py-4 px-4 text-center">
                  <span
                    class="px-2 py-1 rounded text-xs font-bold uppercase tracking-wider"
                    :class="p.isNeglected
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-emerald-500/10 text-emerald-400'"
                  >
                    {{ p.isNeglected ? 'Neglected' : 'Active' }}
                  </span>
                </td>
                <td class="py-4 px-4 text-center font-medium">{{ p.createdCount }}</td>
                <td class="py-4 px-4 text-center font-semibold text-emerald-400">{{ p.completedCount }}</td>
                <td class="py-4 px-4 text-center font-bold" :class="p.overdueCount > 0 ? 'text-rose-500' : 'text-text-muted'">
                  {{ p.overdueCount }}
                </td>
                <td class="py-4 px-4 pr-6 text-xs text-text-muted font-medium">
                  {{ p.deadline || 'No Deadline' }}
                </td>
              </tr>
              <tr v-if="projectSummaries.length === 0">
                <td colspan="6" class="py-8 text-center text-text-muted text-sm">{{ $t('No active projects loaded.') }}</td>
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
import { useDataStore } from '@/stores/data';

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
const dataStore = useDataStore();
const loading = ref(true);
const summaries = ref<MemberAccountabilitySummary[]>([]);
const alerts = ref<ManagementAlert[]>([]);

// Group members by department/position
const departmentStats = computed(() => {
  const deptsMap = new Map<string, {
    name: string;
    memberCount: number;
    totalCompliance: number;
    totalFollowup: number;
    totalCompleted: number;
    totalScore: number;
  }>();

  for (const s of summaries.value) {
    const role = dataStore.memberById(s.id)?.position || 'General Operations';
    if (!deptsMap.has(role)) {
      deptsMap.set(role, {
        name: role,
        memberCount: 0,
        totalCompliance: 0,
        totalFollowup: 0,
        totalCompleted: 0,
        totalScore: 0
      });
    }

    const d = deptsMap.get(role)!;
    d.memberCount++;
    d.totalCompliance += s.workflowComplianceScore;
    d.totalFollowup += s.followUpCompletionRate;
    d.totalCompleted += s.tasksCompleted;
    d.totalScore += s.teamAccountabilityScore;
  }

  return Array.from(deptsMap.values()).map(d => ({
    name: d.name,
    memberCount: d.memberCount,
    avgCompliance: Math.round(d.totalCompliance / d.memberCount),
    avgFollowup: Math.round(d.totalFollowup / d.memberCount),
    totalCompleted: d.totalCompleted,
    avgScore: Math.round(d.totalScore / d.memberCount)
  })).sort((a, b) => b.avgScore - a.avgScore);
});

// Project accountability summary
const projectSummaries = computed(() => {
  const list = dataStore.projects;
  const assignments = dataStore.assignments;

  return list.map(p => {
    const pAssignments = assignments.filter(a => a.projectId === p.id);
    const createdCount = pAssignments.length;
    const completedCount = pAssignments.filter(a => a.status === 'approved').length;
    
    // Check if neglected from active alerts list
    const isNeglected = alerts.value.some(a => a.type === 'neglected_project' && a.projectId === p.id);

    const overdueCount = pAssignments.filter(a => {
      const due = a.dueDate;
      if (!due) return false;
      return ['pending', 'in_progress', 'needs_fix', 'postponed'].includes(a.status) && due < new Date().toISOString().split('T')[0];
    }).length;

    return {
      id: p.id,
      name: p.name,
      deadline: p.deadline,
      createdCount,
      completedCount,
      overdueCount,
      isNeglected
    };
  });
});

const loadData = async () => {
  loading.value = true;
  try {
    const res = await reportsStore.getAggregatedMetrics(props.filters);
    summaries.value = res.summaries;
    alerts.value = res.alerts;
  } catch (err) {
    console.error('[TeamAnalyticsPage] Failed to load data', err);
  } finally {
    loading.value = false;
  }
};

watch(() => props.filters, loadData, { deep: true });

onMounted(async () => {
  await Promise.allSettled([
    dataStore.fetchMembers(),
    dataStore.fetchProjects()
  ]);
  await loadData();
});
</script>

<style scoped>
.team-analytics-page {
  width: 100%;
}
</style>
