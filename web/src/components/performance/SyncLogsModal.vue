<template>
  <Modal :open="open" title="Sync Logs" subtitle="View performance syncs and indexing check history" size="lg" @close="$emit('close')">
    <div class="space-y-4 font-sans text-text-main">
      <!-- Tabs -->
      <div class="flex gap-2 border-b border-border pb-2">
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
          :class="activeTab === 'performance' ? 'bg-primary text-black' : 'text-text-muted hover:text-text-main hover:bg-soft/20'"
          @click="activeTab = 'performance'"
        >
          Performance Sync
        </button>
        <button
          type="button"
          class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
          :class="activeTab === 'indexing' ? 'bg-primary text-black' : 'text-text-muted hover:text-text-main hover:bg-soft/20'"
          @click="activeTab = 'indexing'"
        >
          Indexing Checks
        </button>
      </div>

      <!-- Filters & Stats -->
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div class="flex items-center gap-2">
          <span class="text-text-muted font-sans">Website:</span>
          <select v-model="filterWebsiteId" class="input h-8 py-0 px-2 text-xs bg-card-bg border-border text-text-main font-sans">
            <option value="">All Websites</option>
            <option v-for="w in data.websites" :key="w.id" :value="w.id">{{ w.name || w.domain }}</option>
          </select>
        </div>
        <button type="button" class="btn-secondary h-8 py-0 px-3 text-xs" :disabled="loading" @click="fetchLogs">
          Refresh Logs
        </button>
      </div>

      <!-- Content -->
      <div v-if="loading" class="space-y-2 py-8 text-center text-xs text-text-muted">
        <div class="animate-pulse flex flex-col items-center gap-2">
          <div class="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span>Loading sync logs...</span>
        </div>
      </div>
      <div v-else-if="error" class="py-8 text-center text-xs text-status-needs-fix-fg">
        {{ error }}
      </div>
      <div v-else-if="logs.length === 0" class="py-12 text-center text-xs text-text-muted">
        No logs found for this filter.
      </div>
      <div v-else class="overflow-x-auto border border-border rounded-lg bg-card-bg max-h-96 overflow-y-auto">
        <table class="w-full border-collapse text-left text-xs">
          <thead>
            <tr class="border-b border-border bg-soft/10 text-text-muted uppercase tracking-wider text-[10px] font-bold">
              <th v-if="!filterWebsiteId" class="p-3 font-semibold">Website</th>
              <th class="p-3 font-semibold">Started At</th>
              <th class="p-3 font-semibold">Status</th>
              <th v-if="activeTab === 'performance'" class="p-3 text-right font-semibold">Rows Synced</th>
              <th v-if="activeTab === 'indexing'" class="p-3 font-semibold">Type</th>
              <th v-if="activeTab === 'indexing'" class="p-3 text-right font-semibold">Progress</th>
              <th class="p-3 max-w-xs font-semibold">Details/Error</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <tr v-for="log in logs" :key="log.id" class="hover:bg-soft/10 transition-colors">
              <td v-if="!filterWebsiteId" class="p-3 max-w-xs truncate font-medium text-text-main">
                <div class="flex items-center gap-2">
                  <WebsiteFavicon :favicon-url="websiteObj(log.website_id)?.faviconUrl" :domain="websiteObj(log.website_id)?.domain" :name="websiteName(log.website_id)" :size="18" />
                  <span class="truncate font-sans">{{ websiteName(log.website_id) }}</span>
                </div>
              </td>
              <td class="p-3 whitespace-nowrap text-text-muted font-sans">
                {{ fmtDateTime(log.startedAt) }}
              </td>
              <td class="p-3 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold font-sans" :class="statusClass(log.status)">
                  {{ log.status }}
                </span>
              </td>
              <td v-if="activeTab === 'performance'" class="p-3 text-right font-medium text-text-main font-sans">
                {{ log.rowsSynced ?? 0 }}
              </td>
              <td v-if="activeTab === 'indexing'" class="p-3 whitespace-nowrap capitalize text-text-muted font-sans">
                {{ log.syncType?.replace(/_/g, ' ') }}
              </td>
              <td v-if="activeTab === 'indexing'" class="p-3 text-right font-medium text-text-main whitespace-nowrap font-sans">
                <div class="flex flex-col items-end gap-0.5">
                  <span>{{ log.inspectedUrls }} / {{ log.totalUrls }}</span>
                  <span class="text-[10px] text-text-muted font-sans" v-if="log.indexedCount || log.notIndexedCount">
                    Idx: {{ log.indexedCount }} · Not: {{ log.notIndexedCount }}
                  </span>
                </div>
              </td>
              <td class="p-3 max-w-xs truncate text-text-muted font-sans" :title="log.errorMessage">
                {{ log.errorMessage || '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <template #footer>
      <button class="btn-secondary h-9 text-xs px-4" type="button" @click="$emit('close')">Close</button>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useDataStore } from '@/stores/data';
import Modal from '@/components/ui/Modal.vue';
import WebsiteFavicon from '@/components/ui/WebsiteFavicon.vue';

const props = defineProps<{
  open: boolean;
  websiteId?: string;
}>();

defineEmits(['close']);

const data = useDataStore();
const activeTab = ref<'performance' | 'indexing'>('performance');
const filterWebsiteId = ref(props.websiteId || '');
const loading = ref(false);
const error = ref('');
const rawLogs = ref<any[]>([]);

const websiteObj = (id?: string | null) => (id ? data.websites.find((x) => x.id === id) ?? null : null);
const websiteName = (id: string) => {
  const w = data.websites.find((x) => x.id === id);
  return w?.name || w?.domain || 'Website';
};

const logs = computed(() => {
  return rawLogs.value.map((log) => {
    if (activeTab.value === 'performance') {
      return {
        id: log.id,
        website_id: log.website_id,
        startedAt: log.sync_started_at,
        finishedAt: log.sync_finished_at,
        status: log.status,
        rowsSynced: log.rows_synced,
        errorMessage: log.error_message
      };
    } else {
      return {
        id: log.id,
        website_id: log.website_id,
        syncType: log.sync_type,
        startedAt: log.started_at,
        finishedAt: log.finished_at,
        status: log.status,
        totalUrls: log.total_urls,
        inspectedUrls: log.inspected_urls,
        indexedCount: log.indexed_count,
        notIndexedCount: log.not_indexed_count,
        errorMessage: log.error_message
      };
    }
  });
});

const statusClass = (status: string) => {
  const s = status?.toLowerCase();
  if (s === 'ok' || s === 'success') return 'bg-status-approved-bg/20 text-status-approved-fg';
  if (s === 'error' || s === 'failed') return 'bg-status-needs-fix-bg/20 text-status-needs-fix-fg';
  if (s === 'running') return 'bg-status-submitted-bg/20 text-status-submitted-fg';
  return 'bg-soft text-text-muted';
};

const fetchLogs = async () => {
  if (!supabaseConfigured) return;
  loading.value = true;
  error.value = '';
  try {
    let query;
    if (activeTab.value === 'performance') {
      query = supabase
        .from('website_gsc_sync_logs')
        .select('*')
        .order('sync_started_at', { ascending: false })
        .limit(100);
    } else {
      query = supabase
        .from('website_indexing_sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
    }

    if (filterWebsiteId.value) {
      query = query.eq('website_id', filterWebsiteId.value);
    }

    const { data: res, error: err } = await query;
    if (err) {
      error.value = 'Failed to fetch logs: ' + err.message;
    } else {
      rawLogs.value = res || [];
    }
  } catch (err: any) {
    error.value = 'Failed to fetch logs.';
    console.error(err);
  } finally {
    loading.value = false;
  }
};

watch(
  () => props.open,
  (val) => {
    if (val) {
      filterWebsiteId.value = props.websiteId || '';
      void fetchLogs();
    }
  }
);

watch([activeTab, filterWebsiteId], () => {
  void fetchLogs();
});

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
};
</script>
