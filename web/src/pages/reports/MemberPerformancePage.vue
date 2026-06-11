<template>
  <div class="member-performance-page">
    <div v-if="loadingGlobal" class="card skeleton h-[350px]" />

    <div v-else class="mp-layout">
      <!-- Left pane: Members selection list -->
      <aside class="card mp-sidebar flex flex-col p-4 bg-card border border-border">
        <h3 class="section-title mb-3">Team Directory</h3>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search members..."
          class="input py-2 px-3 mb-3 text-xs"
        />
        <div class="members-list overflow-y-auto flex-1 flex flex-col gap-1.5 max-h-[500px]">
          <button
            v-for="m in filteredMembers"
            :key="m.id"
            type="button"
            class="flex items-center gap-2.5 p-2 rounded-btn text-left text-xs font-semibold hover:bg-soft transition"
            :class="{ 'bg-primary-soft text-primary': selectedMemberId === m.id }"
            @click="selectMember(m.id)"
          >
            <div class="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
              <img v-if="m.avatarUrl" :src="m.avatarUrl" class="w-full h-full object-cover" />
              <span v-else>{{ m.fullName.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-text-main font-bold">{{ m.fullName }}</div>
              <div class="truncate text-text-muted text-[10px]">{{ m.position || 'Team Member' }}</div>
            </div>
          </button>
        </div>
      </aside>

      <!-- Right pane: Member details -->
      <main v-if="selectedMemberSummary" class="mp-details flex flex-col gap-6">
        <!-- Profile summary card -->
        <div class="card card-pad bg-card border border-border flex flex-col sm:flex-row gap-5 items-center">
          <div class="w-16 h-16 rounded-full overflow-hidden flex items-center justify-center bg-primary/10 text-primary font-bold text-xl border-2 border-primary/20">
            <img v-if="selectedMemberSummary.avatarUrl" :src="selectedMemberSummary.avatarUrl" class="w-full h-full object-cover" />
            <span v-else>{{ selectedMemberSummary.name.slice(0, 2).toUpperCase() }}</span>
          </div>
          <div class="flex-1 text-center sm:text-left">
            <h2 class="text-xl font-extrabold text-text-main leading-tight">{{ selectedMemberSummary.name }}</h2>
            <p class="text-sm text-primary font-semibold mt-0.5">{{ selectedMemberPosition }}</p>
            <p class="text-xs text-text-muted mt-1">{{ selectedMemberSummary.email }}</p>
          </div>
          <div class="text-right">
            <span
              class="text-xs font-black bg-primary/10 text-primary py-1.5 px-3.5 rounded-full uppercase tracking-wider"
            >
              Accountability Rank: #{{ memberRank }}
            </span>
          </div>
        </div>

        <!-- Metrics cards row (No Hours or Attendance) -->
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div class="kpi card card-pad text-center">
            <div>
              <div class="kpi-label text-text-muted">Completed</div>
              <div class="kpi-value text-emerald-500 mt-1">{{ selectedMemberSummary.tasksCompleted }}</div>
            </div>
          </div>
          <div class="kpi card card-pad text-center">
            <div>
              <div class="kpi-label text-text-muted">In Progress</div>
              <div class="kpi-value text-amber-500 mt-1">{{ selectedMemberSummary.tasksInProgress }}</div>
            </div>
          </div>
          <div class="kpi card card-pad text-center">
            <div>
              <div class="kpi-label text-text-muted">Postponed</div>
              <div class="kpi-value text-amber-600 mt-1">{{ selectedMemberSummary.tasksPostponed }}</div>
            </div>
          </div>
          <div class="kpi card card-pad text-center">
            <div>
              <div class="kpi-label text-text-muted">Overdue</div>
              <div class="kpi-value text-rose-500 mt-1">{{ selectedMemberSummary.tasksOverdue }}</div>
            </div>
          </div>
          <div class="kpi card card-pad text-center">
            <div>
              <div class="kpi-label text-text-muted">Violations</div>
              <div class="kpi-value text-rose-600 mt-1 font-bold">{{ selectedMemberSummary.violationsCount }}</div>
            </div>
          </div>
        </div>

        <!-- Metrics comparison grids -->
        <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <!-- Personal Metrics Progress -->
          <div class="card p-5">
            <h3 class="section-title mb-4">Performance Indicators</h3>
            <div class="flex flex-col gap-4">
              <!-- Workflow Compliance Score -->
              <div class="indicator">
                <div class="flex items-center justify-between text-xs font-semibold mb-1">
                  <span class="text-text-muted">Workflow Compliance Score</span>
                  <span class="text-text-main font-bold">{{ selectedMemberSummary.workflowComplianceScore }}%</span>
                </div>
                <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300"
                    :class="selectedMemberSummary.workflowComplianceScore >= 90 ? 'bg-emerald-500' : 'bg-rose-500'"
                    :style="{ width: `${selectedMemberSummary.workflowComplianceScore}%` }"
                  />
                </div>
              </div>

              <!-- Follow-Up Completion Rate -->
              <div class="indicator">
                <div class="flex items-center justify-between text-xs font-semibold mb-1">
                  <span class="text-text-muted">Follow-Up Completion Rate</span>
                  <span class="text-text-main font-bold">{{ selectedMemberSummary.followUpCompletionRate }}%</span>
                </div>
                <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                  <div
                    class="bg-indigo-500 h-full transition-all duration-300"
                    :style="{ width: `${selectedMemberSummary.followUpCompletionRate}%` }"
                  />
                </div>
              </div>

              <!-- Team Accountability Score -->
              <div class="indicator">
                <div class="flex items-center justify-between text-xs font-semibold mb-1">
                  <span class="text-text-muted">Overall Accountability Score</span>
                  <span class="text-text-main font-bold">{{ selectedMemberSummary.teamAccountabilityScore }}%</span>
                </div>
                <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                  <div
                    class="h-full transition-all duration-300"
                    :class="selectedMemberSummary.teamAccountabilityScore >= 85 ? 'bg-primary' : 'bg-amber-500'"
                    :style="{ width: `${selectedMemberSummary.teamAccountabilityScore}%` }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Follow-up Systems Completion Details -->
          <div class="card p-5">
            <h3 class="section-title mb-4">Follow-up checklists completion</h3>
            <div class="flex flex-col gap-4">
              <!-- Blog slots -->
              <div class="flex items-center gap-4">
                <div class="text-xs font-semibold text-text-muted w-32 flex-shrink-0">Blog Uploads</div>
                <div class="flex-1 flex flex-col gap-1">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-bold text-text-main">Completion Rate: {{ selectedMemberSummary.blogRate }}%</span>
                  </div>
                  <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                    <div class="bg-primary h-full" :style="{ width: `${selectedMemberSummary.blogRate}%` }" />
                  </div>
                </div>
              </div>

              <!-- eBay Slots -->
              <div class="flex items-center gap-4">
                <div class="text-xs font-semibold text-text-muted w-32 flex-shrink-0">eBay Checklist</div>
                <div class="flex-1 flex flex-col gap-1">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-bold text-text-main">Completion Rate: {{ selectedMemberSummary.ebayRate }}%</span>
                  </div>
                  <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                    <div class="bg-indigo-500 h-full" :style="{ width: `${selectedMemberSummary.ebayRate}%` }" />
                  </div>
                </div>
              </div>

              <!-- Speed Optimize Slots -->
              <div class="flex items-center gap-4">
                <div class="text-xs font-semibold text-text-muted w-32 flex-shrink-0">Speed Checklist</div>
                <div class="flex-1 flex flex-col gap-1">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-bold text-text-main">Completion Rate: {{ selectedMemberSummary.speedRate }}%</span>
                  </div>
                  <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                    <div class="bg-emerald-500 h-full" :style="{ width: `${selectedMemberSummary.speedRate}%` }" />
                  </div>
                </div>
              </div>

              <!-- Plugin Slots -->
              <div class="flex items-center gap-4">
                <div class="text-xs font-semibold text-text-muted w-32 flex-shrink-0">Plugins Check</div>
                <div class="flex-1 flex flex-col gap-1">
                  <div class="flex items-center justify-between text-[10px]">
                    <span class="font-bold text-text-main">Completion Rate: {{ selectedMemberSummary.pluginRate }}%</span>
                  </div>
                  <div class="w-full bg-soft h-2 rounded-full overflow-hidden">
                    <div class="bg-amber-500 h-full" :style="{ width: `${selectedMemberSummary.pluginRate}%` }" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div v-else class="card card-pad bg-card border border-border text-center text-text-muted py-12 flex-1">
        Select a team member to load accountability profile.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useReportsStore, type MemberAccountabilitySummary } from '@/stores/reports';
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

const searchQuery = ref('');
const selectedMemberId = ref<string | null>(null);
const summaries = ref<MemberAccountabilitySummary[]>([]);
const loadingGlobal = ref(true);

const filteredMembers = computed(() => {
  const query = searchQuery.value.toLowerCase().trim();
  const list = dataStore.members.filter(m => m.status === 'active');
  if (!query) return list;
  return list.filter(m => 
    (m.fullName || '').toLowerCase().includes(query) || 
    (m.email || '').toLowerCase().includes(query)
  );
});

const selectedMemberSummary = computed(() => {
  if (!selectedMemberId.value) return null;
  return summaries.value.find(s => s.id === selectedMemberId.value) || null;
});

const selectedMemberPosition = computed(() => {
  if (!selectedMemberId.value) return '';
  return dataStore.memberById(selectedMemberId.value)?.position || 'Team Member';
});

const memberRank = computed(() => {
  if (!selectedMemberId.value) return 0;
  const idx = summaries.value.findIndex(s => s.id === selectedMemberId.value);
  return idx !== -1 ? idx + 1 : 1;
});

const selectMember = (id: string) => {
  selectedMemberId.value = id;
};

const loadData = async () => {
  try {
    const res = await reportsStore.getAggregatedMetrics(props.filters);
    summaries.value = res.summaries;
    
    if (!selectedMemberId.value && summaries.value.length > 0) {
      selectedMemberId.value = summaries.value[0].id;
    }
  } catch (err) {
    console.error('[MemberPerformancePage] Failed to load statistics', err);
  } finally {
    loadingGlobal.value = false;
  }
};

watch(() => props.filters, loadData, { deep: true });

onMounted(async () => {
  loadingGlobal.value = true;
  await dataStore.fetchMembers();
  await loadData();
});
</script>

<style scoped>
.member-performance-page {
  width: 100%;
}
.mp-layout {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 1.25rem;
  align-items: start;
}
.members-list {
  scrollbar-width: thin;
}
@media (max-width: 900px) {
  .mp-layout {
    grid-template-columns: 1fr;
  }
}
</style>
