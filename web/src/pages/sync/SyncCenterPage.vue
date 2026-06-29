<template>
  <div class="sync-page">
    <PageHeader :title="$t('Sync Center')" :subtitle="centerSubtitle">
      <template #actions>
        <button type="button" class="btn-secondary" :disabled="!!running" @click="loadAll">{{ $t('Refresh') }}</button>
        <button type="button" class="btn-secondary" :disabled="!!running || metrics.failed === 0" @click="retryFailed">
          {{ running === 'retry' ? $t('Retrying…') : $t('Retry failed') }}
        </button>
        <button type="button" class="btn-primary" :disabled="!!running || activeSites.length === 0" @click="syncAll">
          {{ running === 'all' ? $t('Syncing…') : $t('Sync all → all sites') }}
        </button>
      </template>
    </PageHeader>

    <div v-if="errorMsg" class="card card-pad sync-error-card">{{ errorMsg }}</div>

    <div v-if="running" class="sync-progress card card-pad">
      <span class="spinner" /> {{ $t('Sync in progress… runs server-side in batches.') }}
    </div>
    <div v-else-if="lastResult" class="card card-pad sync-last">
      {{ $t('Last run') }}: <span class="text-status-approved-fg">{{ lastResult.success }} {{ $t('ok') }}</span> ·
      <span :class="lastResult.failed ? 'text-status-needs-fix-fg' : 'text-text-muted'">{{ lastResult.failed }} {{ $t('failed') }}</span>
      <span v-if="typeof lastResult.skipped === 'number'"> · {{ lastResult.skipped }} {{ $t('unchanged') }}</span>
    </div>

    <!-- metrics -->
    <div class="sync-stats">
      <div class="sync-stat"><span class="sync-stat-val sync-blue">{{ loading ? '—' : metrics.waiting }}</span><span class="sync-stat-lbl">{{ $t('Waiting to sync') }}</span></div>
      <div class="sync-stat"><span class="sync-stat-val sync-green">{{ loading ? '—' : metrics.synced }}</span><span class="sync-stat-lbl">{{ $t('Synced & current') }}</span></div>
      <div class="sync-stat"><span class="sync-stat-val sync-red">{{ loading ? '—' : metrics.failed }}</span><span class="sync-stat-lbl">{{ $t('Failed') }}</span></div>
      <div class="sync-stat"><span class="sync-stat-val">{{ loading ? '—' : activeSites.length }}</span><span class="sync-stat-lbl">{{ $t('Active websites') }}</span></div>
    </div>

    <!-- products with per-row sync -->
    <div class="card">
      <div class="sync-card-head">
        <h2 class="sync-h2">{{ $t('Products') }}</h2>
        <div class="flex items-center gap-2">
          <span v-if="selected.size" class="sync-muted">{{ selected.size }} {{ $t('selected') }}</span>
          <button v-if="selected.size" type="button" class="btn-primary sync-btn" @click="syncSelected">⇅ {{ $t('Sync selected') }}</button>
        </div>
      </div>
      <div class="sync-table-wrap">
        <table class="sync-table">
          <thead>
            <tr>
              <th class="w-8"><input type="checkbox" :checked="allSelected" @change="toggleAll" /></th>
              <th>{{ $t('Product') }}</th>
              <th>{{ $t('SKU') }}</th>
              <th>{{ $t('Price') }}</th>
              <th>{{ $t('Category') }}</th>
              <th class="text-right">{{ $t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in products" :key="p.id" :class="{ 'sync-selected-row': selected.has(p.id) }">
              <td><input type="checkbox" :checked="selected.has(p.id)" @change="toggleOne(p.id)" /></td>
              <td>
                <p class="sync-strong">{{ p.name || 'Untitled' }}</p>
                <p class="sync-mono">/{{ p.product_slug || '—' }}</p>
              </td>
              <td class="sync-mono">{{ p.sku || '—' }}</td>
              <td class="sync-muted">{{ p.product_price || '—' }}</td>
              <td class="sync-muted">{{ p.product_category || '—' }}</td>
              <td class="text-right">
                <button type="button" class="btn-secondary sync-btn" @click="syncOne(p)">⇅ {{ $t('Sync') }}</button>
              </td>
            </tr>
            <tr v-if="products.length === 0"><td colspan="6" class="text-center sync-muted py-6">{{ $t('No products in the master catalog yet.') }}</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="sync-cols">
      <!-- website status -->
      <div class="card card-pad">
        <h2 class="sync-h2 mb-3">{{ $t('Website status') }}</h2>
        <p v-if="activeSites.length === 0" class="sync-muted text-sm">{{ $t('No active websites.') }}</p>
        <ul v-else class="sync-ul">
          <li v-for="w in store.websites" :key="w.id" class="sync-li">
            <div class="min-w-0">
              <p class="sync-strong">{{ w.name }}</p>
              <p class="sync-mono">{{ w.domain }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span class="sync-muted text-xs">{{ formatDateTime(w.last_sync_at) }}</span>
              <SyncBadge :status="w.active ? (w.last_status ?? 'pending') : 'inactive'" />
            </div>
          </li>
        </ul>
      </div>

      <!-- recent activity -->
      <div class="card card-pad">
        <h2 class="sync-h2 mb-3">{{ $t('Recent activity') }}</h2>
        <p v-if="recent.length === 0" class="sync-muted text-sm">{{ $t('No syncs yet.') }}</p>
        <ul v-else class="sync-ul">
          <li v-for="l in recent" :key="l.id" class="sync-li">
            <div class="min-w-0">
              <p class="sync-strong truncate">{{ l.product_name ?? '—' }} <span class="sync-muted">→ {{ l.website_name ?? '—' }}</span></p>
              <p class="sync-mono">{{ l.sync_type }} · {{ formatDateTime(l.created_at) }}</p>
            </div>
            <SyncBadge :status="l.status" />
          </li>
        </ul>
      </div>
    </div>

    <SyncProductModal v-if="syncTarget" :target="syncTarget" @close="syncTarget = null" @done="onSyncDone" />
    <p v-if="toast" class="sync-toast">{{ toast }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import PageHeader from '@/components/ui/PageHeader.vue';
import SyncBadge from '@/components/sync/SyncBadge.vue';
import SyncProductModal, { type SyncTarget } from '@/components/sync/SyncProductModal.vue';
import { useProductSyncStore, type SyncResult, type SourceProduct } from '@/stores/productSync';

const store = useProductSyncStore();

const loading = ref(true);
const errorMsg = ref<string | null>(null);
const running = ref<null | 'all' | 'retry'>(null);
const lastResult = ref<SyncResult | null>(null);
const toast = ref<string | null>(null);
const selected = ref<Set<string>>(new Set());
const syncTarget = ref<SyncTarget | null>(null);

const products = computed(() => store.sourceProducts);
const activeSites = computed(() => store.websites.filter((w) => w.active));
const recent = computed(() => store.logs.slice(0, 12));

const centerSubtitle = computed(() => `${activeSites.value.length} active website(s) · ${products.value.length} products`);

const metrics = computed(() => {
  const stateMap = new Map(store.states.map((s) => [`${s.website_id}:${s.product_id}`, s]));
  let waiting = 0, synced = 0, failed = 0;
  const syncable = products.value;
  for (const w of activeSites.value) {
    for (const p of syncable) {
      const st = stateMap.get(`${w.id}:${p.id}`);
      if (!st || st.status === 'pending') waiting++;
      else if (st.status === 'failed') failed++;
      else {
        const stale = st.last_synced_at && new Date(p.updated_at) > new Date(st.last_synced_at);
        stale ? waiting++ : synced++;
      }
    }
  }
  return { waiting, synced, failed };
});

const allSelected = computed(() => products.value.length > 0 && products.value.every((p) => selected.value.has(p.id)));

const flash = (m: string) => { toast.value = m; setTimeout(() => (toast.value = null), 4000); };
const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const loadAll = async () => {
  loading.value = true; errorMsg.value = null;
  try {
    await Promise.all([
      store.sourceProducts.length === 0 ? store.fetchSourceProducts() : Promise.resolve(),
      store.fetchWebsites(),
      store.fetchStates(),
      store.fetchLogs(50),
    ]);
    if (store.error) errorMsg.value = store.error;
  } finally {
    loading.value = false;
  }
};

onMounted(loadAll);

const toggleOne = (id: string) => {
  const next = new Set(selected.value);
  next.has(id) ? next.delete(id) : next.add(id);
  selected.value = next;
};
const toggleAll = () => {
  selected.value = allSelected.value ? new Set() : new Set(products.value.map((p) => p.id));
};

const syncOne = (p: SourceProduct) => { syncTarget.value = { productIds: [p.id], label: p.name || 'product' }; };
const syncSelected = () => { syncTarget.value = { productIds: [...selected.value], label: `${selected.value.size} selected product(s)` }; };

const onSyncDone = (r: SyncResult) => { lastResult.value = r; void store.fetchStates(); void store.fetchLogs(50); };

const runSync = async (mode: 'all' | 'retry', fn: () => Promise<SyncResult>) => {
  running.value = mode; lastResult.value = null;
  try {
    const r = await fn();
    lastResult.value = r;
    flash(`${r.success} ok · ${r.failed} failed` + (typeof r.skipped === 'number' ? ` · ${r.skipped} unchanged` : ''));
    await loadAll();
  } catch (e) {
    flash(`Error: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    running.value = null;
  }
};

const syncAll = () => runSync('all', () => store.callSync({ productIds: 'all', websiteIds: 'all', syncType: 'full' }));
const retryFailed = () => runSync('retry', () => store.callSync({ action: 'retry-failed' }));
</script>

<style scoped>
.sync-page { display: flex; flex-direction: column; gap: 1.1rem; }
.sync-error-card { border: 1px solid rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); color: #dc2626; font-size: 0.85rem; }
.sync-progress { display: flex; align-items: center; gap: 0.6rem; font-size: 0.88rem; color: var(--text-main); border-color: var(--primary); }
.spinner { width: 1rem; height: 1rem; border: 2px solid var(--primary); border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.sync-last { font-size: 0.88rem; color: var(--text-main); }
.sync-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.85rem; }
.sync-stat { background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px; padding: 1.1rem 1.2rem; }
.sync-stat-val { display: block; font-size: 1.8rem; font-weight: 800; color: var(--text-main); font-family: 'Jost Numbers', sans-serif; }
.sync-blue { color: #2563eb; } .sync-green { color: #16a34a; } .sync-red { color: #dc2626; }
.sync-stat-lbl { display: block; margin-top: 0.25rem; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.sync-card-head { display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; border-bottom: 1px solid var(--border); }
.sync-h2 { font-size: 1.02rem; font-weight: 800; color: var(--text-main); margin: 0; }
.sync-table-wrap { overflow-x: auto; }
.sync-table { width: 100%; border-collapse: collapse; min-width: 44rem; }
.sync-table th, .sync-table td { text-align: left; padding: 0.6rem 0.85rem; font-size: 0.85rem; vertical-align: middle; border-bottom: 1px solid var(--border); }
.sync-table thead th { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg)); }
.sync-table tbody tr:last-child td { border-bottom: 0; }
.sync-selected-row { background: color-mix(in srgb, var(--primary) 6%, transparent); }
.sync-strong { font-weight: 700; color: var(--text-main); margin: 0; }
.sync-mono { font-family: 'Jost Numbers', monospace; font-size: 0.72rem; color: var(--text-muted); margin: 0; }
.sync-muted { color: var(--text-muted); }
.sync-btn { font-size: 0.74rem; padding: 0.3rem 0.65rem; height: auto; }
.sync-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
.sync-ul { display: flex; flex-direction: column; gap: 0.6rem; margin: 0; padding: 0; list-style: none; }
.sync-li { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.sync-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-size: 0.85rem; color: var(--text-main); }
@media (max-width: 860px) { .sync-stats { grid-template-columns: 1fr 1fr; } .sync-cols { grid-template-columns: 1fr; } }
</style>
