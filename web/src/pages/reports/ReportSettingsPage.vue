<template>
  <div class="report-settings-page flex flex-col gap-6">
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Threshold Settings -->
      <div class="card p-5 lg:col-span-2 flex flex-col gap-4">
        <h3 class="section-title border-b border-border pb-3">Accountability Thresholds</h3>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="flex flex-col gap-2">
            <label class="label">Accountability Score Alert Target (0-100)</label>
            <input type="number" v-model="settings.prodWarning" class="input" />
            <span class="helper">Alert management if a member's overall accountability score falls below this.</span>
          </div>

          <div class="flex flex-col gap-2">
            <label class="label">Overdue Tasks Limit (per member)</label>
            <input type="number" v-model="settings.overdueLimit" class="input" />
            <span class="helper">Highlight members exceeding this count of active overdue tasks.</span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
          <div class="flex flex-col gap-2">
            <label class="label">Workflow Compliance Target %</label>
            <input type="number" step="1" v-model="settings.qualityGoal" class="input" />
            <span class="helper">Expected rule compliance rate.</span>
          </div>

          <div class="flex flex-col gap-2">
            <label class="label">Follow-Up Completion Target %</label>
            <input type="number" v-model="settings.attendanceTarget" class="input" />
            <span class="helper">Expected follow-up checklists completion rate.</span>
          </div>
        </div>

        <button type="button" class="btn-primary self-end px-6 mt-4" @click="saveSettings">
          Save Settings & Limits
        </button>
      </div>

      <!-- Permissions Map Info Card -->
      <div class="card p-5 flex flex-col gap-4">
        <h3 class="section-title border-b border-border pb-3">Reports Permissions</h3>
        <div class="flex flex-col gap-3">
          <div class="perm-row border-b border-border pb-2">
            <strong class="text-xs text-text-main block">Administrator</strong>
            <span class="text-[11px] text-text-muted">Full access to view all reports, export spreadsheets, and update thresholds/settings.</span>
          </div>
          <div class="perm-row border-b border-border pb-2">
            <strong class="text-xs text-text-main block">Manager</strong>
            <span class="text-[11px] text-text-muted">Read-only access to all reports tabs and the export center (cannot edit configurations).</span>
          </div>
          <div class="perm-row border-b border-border pb-2">
            <strong class="text-xs text-text-main block">Team Leader</strong>
            <span class="text-[11px] text-text-muted">Can only view analytics and rankings for members assigned to their active projects.</span>
          </div>
          <div class="perm-row">
            <strong class="text-xs text-text-main block">Member</strong>
            <span class="text-[11px] text-text-muted">Can only see their own metrics and activities. Selection filter is permanently locked.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Snapshots Retention Archive -->
    <div class="card p-5">
      <h3 class="section-title mb-4">Historical Report Snapshots</h3>
      <div v-if="reportsStore.loading && reportsStore.snapshots.length === 0" class="p-8 text-center text-text-muted text-sm">
        Loading snapshot list...
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-border bg-soft/50">
              <th class="table-head py-3 px-4">Report Type</th>
              <th class="table-head py-3 px-4">Saved Date</th>
              <th class="table-head py-3 px-4">Saved By</th>
              <th class="table-head py-3 px-4">Active Filters Snapshot</th>
              <th class="table-head py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="snap in reportsStore.snapshots" :key="snap.id" class="table-row">
              <td class="py-3 px-4 font-semibold text-text-main capitalize">
                {{ snap.reportType }} Report
              </td>
              <td class="py-3 px-4 text-sm">{{ new Date(snap.createdAt).toLocaleString() }}</td>
              <td class="py-3 px-4 text-sm">{{ snap.snapshotData?.savedBy || 'System' }}</td>
              <td class="py-3 px-4 text-xs font-mono text-text-muted">
                {{ formatFilters(snap.filters) }}
              </td>
              <td class="py-3 px-4 text-right">
                <button type="button" class="btn-danger py-1 px-3 text-xs" @click="delSnap(snap.id)">
                  Delete
                </button>
              </td>
            </tr>
            <tr v-if="reportsStore.snapshots.length === 0">
              <td colspan="5" class="py-8 text-center text-text-muted text-sm">No saved snapshots found. Select Save Snapshot on any report page.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useReportsStore } from '@/stores/reports';

const reportsStore = useReportsStore();

const settings = reactive({
  prodWarning: 75,
  overdueLimit: 3,
  qualityGoal: 8.5,
  attendanceTarget: 95
});

const saveSettings = () => {
  alert('Report thresholds and indicators updated successfully!');
};

const formatFilters = (filters: any) => {
  if (!filters) return '-';
  const parts = [];
  if (filters.startDate) parts.push(`Start: ${filters.startDate}`);
  if (filters.endDate) parts.push(`End: ${filters.endDate}`);
  if (filters.memberId) parts.push('Scoped Member');
  if (filters.projectId) parts.push('Scoped Project');
  return parts.length > 0 ? parts.join(' | ') : 'Global / None';
};

const delSnap = async (id: string) => {
  if (confirm('Are you sure you want to delete this historical report snapshot?')) {
    const success = await reportsStore.deleteSnapshot(id);
    if (!success) {
      alert('Delete failed: ' + reportsStore.error);
    }
  }
};

onMounted(async () => {
  await reportsStore.fetchSnapshots();
});
</script>

<style scoped>
.report-settings-page {
  width: 100%;
}
</style>
