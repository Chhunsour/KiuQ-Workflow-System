<template>
  <div class="sync-page">
    <PageHeader :title="failedOnly ? $t('Failed Syncs') : $t('Sync Logs')" :subtitle="logsSubtitle">
      <template #actions>
        <button type="button" class="btn-secondary" @click="reload">{{ $t('Refresh') }}</button>
        <button type="button" class="btn-secondary" @click="clearAll">{{ $t('Clear logs') }}</button>
      </template>
    </PageHeader>

    <div class="sync-filters">
      <div class="seg">
        <button
          v-for="s in STATUSES" :key="s" type="button"
          class="seg-btn" :class="{ 'seg-btn--active': statusFilter === s }"
          @click="statusFilter = s"
        >{{ s }}</button>
      </div>
      <select v-model="typeFilter" class="sync-select">
        <option v-for="t in TYPES" :key="t" :value="t">{{ t === 'all' ? $t('All types') : t }}</option>
      </select>
      <input v-model="search" type="search" class="sync-search" :placeholder="$t('Search product, website or error…')" />
    </div>

    <div v-if="store.error" class="card card-pad sync-error-card">{{ store.error }}</div>

    <div class="card sync-table-wrap">
      <table class="sync-table">
        <thead>
          <tr>
            <th>{{ $t('Product / Slug') }}</th>
            <th>{{ $t('Website') }}</th>
            <th>{{ $t('Type') }}</th>
            <th>{{ $t('Status') }}</th>
            <th>{{ $t('Error') }}</th>
            <th>{{ $t('Created') }}</th>
            <th class="text-right">{{ $t('Retry') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in filtered" :key="l.id">
            <td>
              <p class="sync-strong">{{ l.product_name ?? '—' }}</p>
              <p v-if="l.product_slug" class="sync-mono">/{{ l.product_slug }}</p>
            </td>
            <td class="sync-muted">{{ l.website_name ?? '—' }}</td>
            <td class="sync-mono">{{ l.sync_type }}</td>
            <td>
              <SyncBadge :status="l.status" />
              <span v-if="l.retry_count > 0" class="sync-retry">retry ×{{ l.retry_count }}</span>
            </td>
            <td class="sync-errtext">{{ l.error ?? '—' }}</td>
            <td class="sync-muted">{{ formatDateTime(l.created_at) }}</td>
            <td class="text-right">
              <button
                v-if="l.status === 'failed' && l.website_id && l.product_id"
                type="button" class="btn-secondary sync-btn" :disabled="retryingId === l.id" @click="retryOne(l)"
              >{{ retryingId === l.id ? '…' : $t('Retry') }}</button>
            </td>
          </tr>
          <tr v-if="filtered.length === 0"><td colspan="7" class="text-center sync-muted py-8">{{ $t('No log entries match your filters.') }}</td></tr>
        </tbody>
      </table>
    </div>

    <p v-if="toast" class="sync-toast">{{ toast }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import SyncBadge from '@/components/sync/SyncBadge.vue';
import { useProductSyncStore, type SyncLog, type SyncState, type SyncType } from '@/stores/productSync';

const route = useRoute();
const store = useProductSyncStore();

const STATUSES: ('all' | SyncState)[] = ['all', 'success', 'failed', 'pending'];
const TYPES: ('all' | SyncType)[] = ['all', 'full', 'price', 'images', 'descriptions'];

const failedOnly = computed(() => route.query.status === 'failed');
const statusFilter = ref<'all' | SyncState>(failedOnly.value ? 'failed' : 'all');
const typeFilter = ref<'all' | SyncType>('all');
const search = ref('');
const retryingId = ref<string | null>(null);
const toast = ref<string | null>(null);

const logsSubtitle = computed(() =>
  `${store.logs.length} entries · ${store.logs.filter((l) => l.status === 'success').length} success · ${store.logs.filter((l) => l.status === 'failed').length} failed`
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return store.logs.filter((l) => {
    if (statusFilter.value !== 'all' && l.status !== statusFilter.value) return false;
    if (typeFilter.value !== 'all' && l.sync_type !== typeFilter.value) return false;
    if (q && !`${l.product_name ?? ''} ${l.product_slug ?? ''} ${l.website_name ?? ''} ${l.error ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
});

const flash = (m: string) => { toast.value = m; setTimeout(() => (toast.value = null), 3500); };
const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const reload = () => store.fetchLogs(300);
onMounted(reload);

const retryOne = async (l: SyncLog) => {
  if (!l.website_id || !l.product_id) return;
  retryingId.value = l.id;
  try {
    const r = await store.callSync({ action: 'retry-failed', websiteId: l.website_id, productId: l.product_id });
    flash(`Retry: ${r.success} ok · ${r.failed} failed`);
    await reload();
  } catch (e) {
    flash(`Error: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    retryingId.value = null;
  }
};

const clearAll = async () => {
  if (!window.confirm('Clear all sync logs? History cannot be recovered.')) return;
  if (await store.clearLogs()) flash('Logs cleared.');
};
</script>

<style scoped>
.sync-page { display: flex; flex-direction: column; gap: 1.1rem; }
.sync-filters { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
.seg { display: flex; gap: 0.25rem; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.25rem; }
.seg-btn { padding: 0.35rem 0.7rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); border: 0; background: none; border-radius: 7px; cursor: pointer; }
.seg-btn--active { background: var(--primary); color: #fff; }
.sync-select, .sync-search { border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main); font-size: 0.85rem; padding: 0.45rem 0.7rem; outline: none; }
.sync-search { flex: 1; min-width: 14rem; }
.sync-error-card { border: 1px solid rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); color: #dc2626; font-size: 0.85rem; }
.sync-table-wrap { overflow-x: auto; }
.sync-table { width: 100%; border-collapse: collapse; min-width: 56rem; }
.sync-table th, .sync-table td { text-align: left; padding: 0.6rem 0.85rem; font-size: 0.85rem; vertical-align: top; border-bottom: 1px solid var(--border); }
.sync-table thead th { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg)); }
.sync-table tbody tr:last-child td { border-bottom: 0; }
.sync-strong { font-weight: 700; color: var(--text-main); margin: 0; }
.sync-mono { font-family: 'Jost Numbers', monospace; font-size: 0.72rem; color: var(--text-muted); margin: 0; }
.sync-muted { color: var(--text-muted); white-space: nowrap; }
.sync-errtext { color: #dc2626; font-size: 0.78rem; max-width: 18rem; }
.sync-retry { display: block; font-size: 0.66rem; color: var(--text-muted); margin-top: 0.2rem; }
.sync-btn { font-size: 0.74rem; padding: 0.3rem 0.6rem; height: auto; }
.sync-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-size: 0.85rem; color: var(--text-main); }
</style>
