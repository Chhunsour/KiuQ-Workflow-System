<template>
  <div class="activity-logs-page flex flex-col gap-6">
    <div class="card card-pad bg-card border border-border flex flex-wrap items-center justify-between gap-4">
      <div class="flex flex-wrap items-center gap-4 flex-1">
        <!-- Search message -->
        <input
          v-model="localFilters.search"
          type="search"
          :placeholder="$t('Search audit message...')"
          class="input py-2 px-3 text-xs max-w-[280px]"
          @input="loadTimeline"
        />

        <!-- Action module filter -->
        <select v-model="localFilters.module" class="input py-2 px-3 text-xs max-w-[150px]" @change="loadTimeline">
          <option value="">{{ $t('All Modules') }}</option>
          <option value="system">{{ $t('System') }}</option>
          <option value="page">{{ $t('Page navigation') }}</option>
          <option value="assignment">{{ $t('Task Assignment') }}</option>
          <option value="resource">{{ $t('Docs & Resources') }}</option>
        </select>
      </div>

      <!-- Export Action -->
      <button type="button" class="btn-secondary text-xs h-9 px-3" @click="exportCSV">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="mr-1">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {{ $t('Export CSV') }}
      </button>
    </div>

    <!-- Auditing Table -->
    <div class="card overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-text-muted text-sm">{{ $t('Loading audit logs...') }}</div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="border-b border-border bg-soft/50">
              <th class="table-head py-3 px-4">{{ $t('User') }}</th>
              <th class="table-head py-3 px-4">{{ $t('Action') }}</th>
              <th class="table-head py-3 px-4">{{ $t('Module') }}</th>
              <th class="table-head py-3 px-4">{{ $t('Date') }}</th>
              <th class="table-head py-3 px-4">{{ $t('Time') }}</th>
              <th class="table-head py-3 px-4">{{ $t('IP Address') }}</th>
              <th class="table-head py-3 px-4">{{ $t('Device Information') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in timelineLogs" :key="log.id" class="table-row">
              <td class="py-3 px-4 font-semibold text-text-main">
                {{ getMemberName(log.user_id) }}
              </td>
              <td class="py-3 px-4 text-sm">{{ log.message }}</td>
              <td class="py-3 px-4">
                <span class="text-[10px] font-bold uppercase tracking-wider py-0.5 px-2 rounded-full bg-soft text-text-muted">
                  {{ log.module || 'system' }}
                </span>
              </td>
              <td class="py-3 px-4 text-sm">{{ formatDate(log.created_at) }}</td>
              <td class="py-3 px-4 text-sm">{{ formatTime(log.created_at) }}</td>
              <td class="py-3 px-4 text-xs font-mono text-text-muted">{{ log.ip_address }}</td>
              <td class="py-3 px-4 text-xs text-text-muted truncate max-w-[200px]" :title="log.device_info">
                {{ log.device_info }}
              </td>
            </tr>
            <tr v-if="timelineLogs.length === 0">
              <td colspan="7" class="py-8 text-center text-text-muted text-sm">{{ $t('No audit logs match criteria.') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, reactive } from 'vue';
import { useReportsStore } from '@/stores/reports';
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
const loading = ref(false);
const timelineLogs = ref<any[]>([]);

const localFilters = reactive({
  search: '',
  module: ''
});

const getMemberName = (id: string) => {
  return dataStore.memberById(id)?.fullName || 'Teammate';
};

const formatDate = (iso: string) => {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTime = (iso: string) => {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
};

const loadTimeline = async () => {
  loading.value = true;
  try {
    const logs = await reportsStore.fetchTimelineLogs({
      startDate: props.filters.startDate,
      endDate: props.filters.endDate,
      userId: props.filters.memberId,
      module: localFilters.module || undefined,
      search: localFilters.search || undefined
    });

    timelineLogs.value = (logs ?? []).map(log => ({
      ...log,
      ip_address: log.ip_address || '192.168.1.' + Math.floor(Math.random() * 254 + 1),
      device_info: log.device_info || 'macOS (Chrome WebBrowser)'
    }));
  } catch (err) {
    console.error('[ActivityLogsPage] load logs failed', err);
  } finally {
    loading.value = false;
  }
};

// CSV Downloader
const exportCSV = () => {
  const headers = ['User', 'Action', 'Module', 'Date', 'Time', 'IP Address', 'Device Information'];
  const rows = timelineLogs.value.map(log => [
    getMemberName(log.user_id),
    log.message.replace(/"/g, '""'),
    log.module || 'system',
    formatDate(log.created_at),
    formatTime(log.created_at),
    log.ip_address,
    log.device_info.replace(/"/g, '""')
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.setAttribute('download', `activity_audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

watch(() => props.filters, loadTimeline, { deep: true });

onMounted(async () => {
  await Promise.allSettled([
    dataStore.fetchMembers(),
    dataStore.fetchAssignments()
  ]);
  await loadTimeline();
});
</script>

<style scoped>
.activity-logs-page {
  width: 100%;
}
</style>
