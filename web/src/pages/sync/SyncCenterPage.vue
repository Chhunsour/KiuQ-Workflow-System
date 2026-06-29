<template>
  <div class="sync-page">
    <PageHeader :title="$t('Sync Center')" :subtitle="centerSubtitle" eyebrow="Product Distribution" :icon="ICON.dashboard">
      <template #actions>
        <button type="button" class="btn-ghost sync-icon-btn" :disabled="!!running" :aria-label="$t('Refresh')" :title="$t('Refresh')" @click="loadAll">
          <span class="sync-ico" :class="{ 'sync-spin': loading }" v-html="ICON.refresh" />
        </button>
        <button type="button" class="btn-secondary" :disabled="!!running || metrics.failed === 0" @click="retryFailed">
          <span class="sync-ico" v-html="ICON.retry" />
          {{ running === 'retry' ? $t('Retrying…') : $t('Retry failed') }}
          <span v-if="metrics.failed" class="sync-pill sync-pill--red">{{ metrics.failed }}</span>
        </button>
        <button type="button" class="btn-primary" :disabled="!!running || activeSites.length === 0" @click="syncAll">
          <span class="sync-ico" v-html="ICON.bolt" />
          {{ running === 'all' ? $t('Syncing…') : $t('Sync all → all sites') }}
        </button>
      </template>
    </PageHeader>

    <!-- live status strip -->
    <transition name="sync-fade">
      <div v-if="errorMsg" class="sync-banner sync-banner--error">
        <span class="sync-ico" v-html="ICON.alert" /> {{ errorMsg }}
        <button type="button" class="sync-banner-x" :aria-label="$t('Dismiss')" @click="errorMsg = null">×</button>
      </div>
    </transition>
    <transition name="sync-fade">
      <div v-if="running" class="sync-banner sync-banner--info">
        <span class="spinner" /> {{ $t('Sync in progress… running server-side in batches.') }}
      </div>
      <div v-else-if="lastResult" class="sync-banner sync-banner--ok">
        <span class="sync-ico" v-html="ICON.check" />
        {{ $t('Last run') }} —
        <strong class="text-status-approved-fg">{{ lastResult.success }} {{ $t('ok') }}</strong>
        <span :class="lastResult.failed ? 'text-status-needs-fix-fg' : 'text-text-muted'">· {{ lastResult.failed }} {{ $t('failed') }}</span>
        <span v-if="typeof lastResult.skipped === 'number'" class="text-text-muted">· {{ lastResult.skipped }} {{ $t('unchanged') }}</span>
        <button type="button" class="sync-banner-x" :aria-label="$t('Dismiss')" @click="lastResult = null">×</button>
      </div>
    </transition>

    <!-- KPI cards (clickable → filter table) -->
    <div class="sync-kpis">
      <button
        v-for="k in kpis" :key="k.key" type="button" class="sync-kpi"
        :class="[`sync-kpi--${k.tone}`, { 'sync-kpi--active': statusFilter === k.filter }]"
        :aria-pressed="statusFilter === k.filter"
        @click="k.filter ? toggleStatusFilter(k.filter) : null"
      >
        <span class="sync-kpi-ico" v-html="k.icon" />
        <span class="sync-kpi-body">
          <span class="sync-kpi-val">{{ loading ? '—' : k.value }}</span>
          <span class="sync-kpi-lbl">{{ k.label }}</span>
        </span>
        <span v-if="k.filter" class="sync-kpi-hint">{{ statusFilter === k.filter ? $t('Filtering') : $t('Filter') }}</span>
      </button>
    </div>

    <!-- Products control table -->
    <section class="card sync-products">
      <header class="sync-toolbar">
        <div class="sync-toolbar-row">
          <div class="sync-search">
            <span class="sync-ico sync-search-ico" v-html="ICON.search" />
            <input
              v-model="search" type="search" class="sync-search-input"
              :placeholder="$t('Search products, SKU, slug…')" :aria-label="$t('Search products')"
            />
            <button v-if="search" type="button" class="sync-search-x" :aria-label="$t('Clear')" @click="search = ''">×</button>
          </div>

          <select v-model="categoryFilter" class="sync-select" :aria-label="$t('Filter by category')">
            <option value="">{{ $t('All categories') }}</option>
            <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
          </select>

          <select v-model="siteScope" class="sync-select" :aria-label="$t('Scope to website')">
            <option value="all">{{ $t('All active sites') }}</option>
            <option v-for="w in activeSites" :key="w.id" :value="w.id">{{ w.name }}</option>
          </select>

          <select v-model="sortBy" class="sync-select" :aria-label="$t('Sort products')">
            <option value="updated">{{ $t('Recently updated') }}</option>
            <option value="name">{{ $t('Name A–Z') }}</option>
            <option value="price">{{ $t('Price (high→low)') }}</option>
            <option value="status">{{ $t('Sync status') }}</option>
          </select>

          <span class="sync-toolbar-spacer" />
          <span class="sync-count">{{ filteredProducts.length }} / {{ products.length }}</span>
        </div>

        <!-- status filter chips -->
        <div class="sync-chips" role="tablist" :aria-label="$t('Filter by sync status')">
          <button
            v-for="f in statusFilters" :key="f.value" type="button" role="tab"
            class="chip" :class="{ 'chip-active': statusFilter === f.value }"
            :aria-selected="statusFilter === f.value" @click="statusFilter = f.value"
          >
            {{ f.label }}
            <span v-if="f.count !== null" class="sync-chip-num">{{ f.count }}</span>
          </button>
        </div>
      </header>

      <!-- bulk action bar -->
      <transition name="sync-slide">
        <div v-if="selected.size" class="sync-bulk">
          <span class="sync-bulk-count">{{ selected.size }} {{ $t('selected') }}</span>
          <span class="sync-bulk-label">{{ $t('Sync selected:') }}</span>
          <button type="button" class="chip chip-active" @click="syncSelected('full')">{{ $t('Full') }}</button>
          <button type="button" class="chip" @click="syncSelected('price')">{{ $t('Price') }}</button>
          <button type="button" class="chip" @click="syncSelected('images')">{{ $t('Images') }}</button>
          <button type="button" class="chip" @click="syncSelected('descriptions')">{{ $t('Descriptions') }}</button>
          <span class="sync-toolbar-spacer" />
          <button type="button" class="btn-ghost sync-btn" @click="clearSelection">{{ $t('Clear') }}</button>
        </div>
      </transition>

      <div class="sync-table-wrap">
        <table class="sync-table">
          <thead>
            <tr>
              <th class="sync-col-check"><input type="checkbox" :checked="pageAllSelected" :aria-label="$t('Select all')" @change="togglePage" /></th>
              <th>{{ $t('Product') }}</th>
              <th class="sync-hide-sm">{{ $t('SKU') }}</th>
              <th class="sync-hide-sm">{{ $t('Price') }}</th>
              <th class="sync-hide-md">{{ $t('Category') }}</th>
              <th>{{ siteScope === 'all' ? $t('Per-site status') : $t('Status') }}</th>
              <th class="sync-hide-md">{{ $t('Last synced') }}</th>
              <th class="text-right">{{ $t('Actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="loading">
              <tr v-for="n in 6" :key="`sk-${n}`" class="sync-skel-row">
                <td v-for="c in 8" :key="c"><span class="sync-skel" /></td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="p in pagedProducts" :key="p.id" :class="{ 'sync-row-sel': selected.has(p.id) }">
                <td><input type="checkbox" :checked="selected.has(p.id)" :aria-label="`Select ${p.name}`" @change="toggleOne(p.id)" /></td>
                <td>
                  <p class="sync-strong">{{ p.name || $t('Untitled') }}</p>
                  <p class="sync-mono">/{{ p.product_slug || '—' }}</p>
                </td>
                <td class="sync-mono sync-hide-sm">{{ p.sku || '—' }}</td>
                <td class="sync-num sync-hide-sm">{{ p.product_price || '—' }}</td>
                <td class="sync-hide-md">
                  <span v-if="p.product_category" class="sync-tag">{{ p.product_category }}</span>
                  <span v-else class="sync-muted">—</span>
                </td>
                <td>
                  <div class="sync-dots">
                    <span v-if="scopedSites.length === 0" class="sync-muted text-xs">{{ $t('No sites') }}</span>
                    <span
                      v-for="s in productStatus(p).perSite" :key="s.siteId"
                      class="sync-dot" :class="`sync-dot--${s.state}`"
                      :title="`${s.siteName}: ${s.state}`"
                    />
                    <span class="sync-status-text" :class="`sync-status-text--${productStatus(p).overall}`">
                      {{ statusLabel(productStatus(p).overall) }}
                    </span>
                  </div>
                </td>
                <td class="sync-mono sync-hide-md">{{ lastSyncedFor(p) }}</td>
                <td class="text-right">
                  <div class="sync-row-actions">
                    <button type="button" class="btn-secondary sync-btn" @click="syncOne(p, 'full')">
                      <span class="sync-ico" v-html="ICON.sync" /> {{ $t('Sync') }}
                    </button>
                    <div class="sync-menu" :class="{ open: openMenuId === p.id }">
                      <button type="button" class="btn-ghost sync-icon-btn" :aria-label="$t('More actions')" :aria-expanded="openMenuId === p.id" @click.stop="toggleMenu(p.id)">
                        <span class="sync-ico" v-html="ICON.dots" />
                      </button>
                      <div v-if="openMenuId === p.id" class="sync-menu-pop" @click.stop>
                        <button type="button" @click="syncOne(p, 'price')"><span class="sync-ico" v-html="ICON.tag" /> {{ $t('Sync price only') }}</button>
                        <button type="button" @click="syncOne(p, 'images')"><span class="sync-ico" v-html="ICON.image" /> {{ $t('Sync images only') }}</button>
                        <button type="button" @click="syncOne(p, 'descriptions')"><span class="sync-ico" v-html="ICON.text" /> {{ $t('Sync descriptions') }}</button>
                        <div class="sync-menu-sep" />
                        <button type="button" @click="copyId(p.id)"><span class="sync-ico" v-html="ICON.copy" /> {{ $t('Copy product ID') }}</button>
                      </div>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredProducts.length === 0">
                <td colspan="8" class="sync-empty">
                  <span class="sync-ico sync-empty-ico" v-html="ICON.cube" />
                  <p class="sync-strong">{{ products.length === 0 ? $t('No products in the master catalog yet.') : $t('No products match your filters.') }}</p>
                  <button v-if="products.length > 0" type="button" class="btn-ghost sync-btn" @click="resetFilters">{{ $t('Reset filters') }}</button>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- pagination -->
      <footer v-if="filteredProducts.length > pageSize" class="sync-pager">
        <span class="sync-muted text-xs">
          {{ $t('Showing') }} {{ pageStart + 1 }}–{{ pageEnd }} {{ $t('of') }} {{ filteredProducts.length }}
        </span>
        <div class="sync-pager-ctrls">
          <button type="button" class="btn-ghost sync-btn" :disabled="page === 1" @click="page--">{{ $t('Prev') }}</button>
          <span class="sync-mono text-xs">{{ page }} / {{ totalPages }}</span>
          <button type="button" class="btn-ghost sync-btn" :disabled="page === totalPages" @click="page++">{{ $t('Next') }}</button>
          <select v-model.number="pageSize" class="sync-select sync-select--sm" :aria-label="$t('Rows per page')">
            <option :value="25">25</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </footer>
    </section>

    <!-- bottom: website status + recent activity -->
    <div class="sync-cols">
      <section class="card card-pad">
        <div class="sync-panel-head">
          <h2 class="sync-h2">{{ $t('Website status') }}</h2>
          <RouterLink to="/product-sync/websites" class="sync-link">{{ $t('Manage') }} →</RouterLink>
        </div>
        <p v-if="store.websites.length === 0" class="sync-muted text-sm py-2">{{ $t('No websites connected yet.') }}</p>
        <ul v-else class="sync-ul">
          <li v-for="w in store.websites" :key="w.id" class="sync-site-row">
            <div class="min-w-0">
              <p class="sync-strong">{{ w.name }}</p>
              <p class="sync-mono">{{ w.domain }}</p>
              <p v-if="testResults[w.id]" class="sync-test-line" :class="testResults[w.id]?.ok ? 'sync-test--ok' : 'sync-test--bad'">
                <template v-if="testResults[w.id]?.ok">
                  ✓ {{ testResults[w.id]?.response?.product_count ?? 0 }} {{ $t('products') }} ·
                  {{ testResults[w.id]?.response?.writable ? $t('writable') : $t('NOT writable') }}
                </template>
                <template v-else>✕ {{ testResults[w.id]?.error || `HTTP ${testResults[w.id]?.status}` }}</template>
              </p>
            </div>
            <div class="sync-site-meta">
              <span class="sync-muted text-xs">{{ formatDateTime(w.last_sync_at) }}</span>
              <SyncBadge :status="w.active ? (w.last_status ?? 'pending') : 'inactive'" />
              <button type="button" class="btn-ghost sync-btn" :disabled="testingId === w.id" @click="testConnection(w)">
                {{ testingId === w.id ? $t('Testing…') : $t('Test') }}
              </button>
              <button type="button" class="btn-ghost sync-icon-btn" :aria-label="$t('Overrides')" :title="$t('Overrides')" @click="overridesSite = w">
                <span class="sync-ico" v-html="ICON.sliders" />
              </button>
            </div>
          </li>
        </ul>
      </section>

      <section class="card card-pad">
        <div class="sync-panel-head">
          <h2 class="sync-h2">{{ $t('Recent activity') }}</h2>
          <RouterLink to="/product-sync/logs" class="sync-link">{{ $t('All logs') }} →</RouterLink>
        </div>
        <p v-if="recent.length === 0" class="sync-muted text-sm py-2">{{ $t('No syncs yet.') }}</p>
        <ul v-else class="sync-ul">
          <li v-for="l in recent" :key="l.id" class="sync-act-row">
            <span class="sync-dot" :class="`sync-dot--${l.status === 'success' ? 'synced' : l.status === 'failed' ? 'failed' : 'waiting'}`" />
            <div class="min-w-0 flex-1">
              <p class="sync-strong truncate">{{ l.product_name ?? '—' }} <span class="sync-muted">→ {{ l.website_name ?? '—' }}</span></p>
              <p class="sync-mono">{{ l.sync_type }} · {{ formatDateTime(l.created_at) }}<span v-if="l.error" class="sync-err-inline"> · {{ l.error }}</span></p>
            </div>
            <SyncBadge :status="l.status" />
          </li>
        </ul>
      </section>
    </div>

    <SyncProductModal v-if="syncTarget" :target="syncTarget" @close="syncTarget = null" @done="onSyncDone" />
    <OverridesModal v-if="overridesSite" :website="overridesSite" @close="overridesSite = null" />
    <transition name="sync-fade">
      <p v-if="toast" class="sync-toast" role="status">{{ toast }}</p>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import SyncBadge from '@/components/sync/SyncBadge.vue';
import SyncProductModal, { type SyncTarget } from '@/components/sync/SyncProductModal.vue';
import OverridesModal from '@/components/sync/OverridesModal.vue';
import {
  useProductSyncStore, type SyncResult, type SourceProduct, type SyncType,
  type ConnectedWebsite, type TestConnectionResult,
} from '@/stores/productSync';

const store = useProductSyncStore();

/* ── icons (consistent 2px line icons) ──────────────────────────────────── */
const svg = (p: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  refresh: svg('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'),
  retry: svg('<path d="M3 2v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/>'),
  bolt: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  sync: svg('<path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  alert: svg('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  cube: svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
  globe: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  dots: svg('<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>'),
  tag: svg('<path d="M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1"/>'),
  image: svg('<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>'),
  text: svg('<path d="M4 7V5h16v2"/><path d="M9 5v14"/><path d="M7 19h4"/>'),
  copy: svg('<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>'),
  sliders: svg('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
};

/* ── state ──────────────────────────────────────────────────────────────── */
type StatusKind = 'waiting' | 'synced' | 'failed';
const loading = ref(true);
const errorMsg = ref<string | null>(null);
const running = ref<null | 'all' | 'retry'>(null);
const lastResult = ref<SyncResult | null>(null);
const toast = ref<string | null>(null);
const selected = ref<Set<string>>(new Set());
const syncTarget = ref<SyncTarget | null>(null);
const overridesSite = ref<ConnectedWebsite | null>(null);
const openMenuId = ref<string | null>(null);
const testingId = ref<string | null>(null);
const testResults = ref<Record<string, TestConnectionResult>>({});

// filters / table controls
const search = ref('');
const categoryFilter = ref('');
const siteScope = ref<'all' | string>('all');
const sortBy = ref<'updated' | 'name' | 'price' | 'status'>('updated');
const statusFilter = ref<'' | StatusKind>('');
const page = ref(1);
const pageSize = ref(25);

const products = computed(() => store.sourceProducts);
const activeSites = computed(() => store.websites.filter((w) => w.active));
const scopedSites = computed(() =>
  siteScope.value === 'all' ? activeSites.value : activeSites.value.filter((w) => w.id === siteScope.value)
);
const recent = computed(() => store.logs.slice(0, 12));
const centerSubtitle = computed(() => `${activeSites.value.length} active website(s) · ${products.value.length} products`);

const stateMap = computed(() => new Map(store.states.map((s) => [`${s.website_id}:${s.product_id}`, s])));

/* ── per-product status across scoped sites ─────────────────────────────── */
const productStatus = (p: SourceProduct) => {
  const perSite = scopedSites.value.map((w) => {
    const st = stateMap.value.get(`${w.id}:${p.id}`);
    let state: StatusKind = 'waiting';
    if (st && st.status === 'failed') state = 'failed';
    else if (st && st.status === 'success') {
      const stale = st.last_synced_at && new Date(p.updated_at) > new Date(st.last_synced_at);
      state = stale ? 'waiting' : 'synced';
    }
    return { siteId: w.id, siteName: w.name, state };
  });
  let overall: StatusKind = 'synced';
  if (perSite.length === 0) overall = 'waiting';
  else if (perSite.some((s) => s.state === 'failed')) overall = 'failed';
  else if (perSite.some((s) => s.state === 'waiting')) overall = 'waiting';
  return { perSite, overall };
};

const lastSyncedFor = (p: SourceProduct): string => {
  let latest: number | null = null;
  for (const w of scopedSites.value) {
    const st = stateMap.value.get(`${w.id}:${p.id}`);
    if (st?.last_synced_at) {
      const t = new Date(st.last_synced_at).getTime();
      if (!Number.isNaN(t) && (latest === null || t > latest)) latest = t;
    }
  }
  return latest === null ? '—' : formatDateTime(new Date(latest).toISOString());
};

/* ── metrics ────────────────────────────────────────────────────────────── */
const metrics = computed(() => {
  let waiting = 0, synced = 0, failed = 0;
  for (const w of activeSites.value) {
    for (const p of products.value) {
      const st = stateMap.value.get(`${w.id}:${p.id}`);
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

const kpis = computed(() => [
  { key: 'sites', label: 'Active websites', value: activeSites.value.length, icon: ICON.globe, tone: 'neutral', filter: null as null | StatusKind },
  { key: 'products', label: 'Total products', value: products.value.length, icon: ICON.cube, tone: 'neutral', filter: null },
  { key: 'waiting', label: 'Waiting to sync', value: metrics.value.waiting, icon: ICON.clock, tone: 'blue', filter: 'waiting' as StatusKind },
  { key: 'synced', label: 'Synced & current', value: metrics.value.synced, icon: ICON.check, tone: 'green', filter: 'synced' as StatusKind },
  { key: 'failed', label: 'Failed', value: metrics.value.failed, icon: ICON.alert, tone: 'red', filter: 'failed' as StatusKind },
]);

/* ── filtering + sorting + pagination ───────────────────────────────────── */
const categories = computed(() => {
  const set = new Set<string>();
  for (const p of products.value) if (p.product_category) set.add(p.product_category);
  return [...set].sort();
});

const filteredProducts = computed(() => {
  const q = search.value.trim().toLowerCase();
  let list = products.value.filter((p) => {
    if (q && !`${p.name} ${p.product_slug ?? ''} ${p.sku ?? ''}`.toLowerCase().includes(q)) return false;
    if (categoryFilter.value && p.product_category !== categoryFilter.value) return false;
    if (statusFilter.value && productStatus(p).overall !== statusFilter.value) return false;
    return true;
  });
  list = [...list].sort((a, b) => {
    if (sortBy.value === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy.value === 'price') return (parseFloat(b.product_price || '0') || 0) - (parseFloat(a.product_price || '0') || 0);
    if (sortBy.value === 'status') {
      const order: Record<StatusKind, number> = { failed: 0, waiting: 1, synced: 2 };
      return order[productStatus(a).overall] - order[productStatus(b).overall];
    }
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  return list;
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredProducts.value.length / pageSize.value)));
const pageStart = computed(() => (page.value - 1) * pageSize.value);
const pageEnd = computed(() => Math.min(pageStart.value + pageSize.value, filteredProducts.value.length));
const pagedProducts = computed(() => filteredProducts.value.slice(pageStart.value, pageEnd.value));
watch([filteredProducts, pageSize], () => { if (page.value > totalPages.value) page.value = totalPages.value; });
watch([search, categoryFilter, statusFilter, siteScope], () => { page.value = 1; });

const statusFilters = computed(() => [
  { value: '' as const, label: 'All', count: products.value.length },
  { value: 'waiting' as const, label: 'Waiting', count: null },
  { value: 'synced' as const, label: 'Synced', count: null },
  { value: 'failed' as const, label: 'Failed', count: null },
]);

/* ── selection ──────────────────────────────────────────────────────────── */
const pageAllSelected = computed(() => pagedProducts.value.length > 0 && pagedProducts.value.every((p) => selected.value.has(p.id)));
const toggleOne = (id: string) => { const n = new Set(selected.value); n.has(id) ? n.delete(id) : n.add(id); selected.value = n; };
const togglePage = () => {
  const n = new Set(selected.value);
  if (pageAllSelected.value) pagedProducts.value.forEach((p) => n.delete(p.id));
  else pagedProducts.value.forEach((p) => n.add(p.id));
  selected.value = n;
};
const clearSelection = () => { selected.value = new Set(); };

/* ── helpers ────────────────────────────────────────────────────────────── */
const statusLabel = (s: StatusKind) => (s === 'synced' ? 'Current' : s === 'failed' ? 'Failed' : 'Waiting');
const flash = (m: string) => { toast.value = m; setTimeout(() => (toast.value = null), 4000); };
const formatDateTime = (iso: string | null) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const toggleStatusFilter = (f: StatusKind) => { statusFilter.value = statusFilter.value === f ? '' : f; };
const toggleMenu = (id: string) => { openMenuId.value = openMenuId.value === id ? null : id; };
const resetFilters = () => { search.value = ''; categoryFilter.value = ''; statusFilter.value = ''; sortBy.value = 'updated'; };
const copyId = async (id: string) => {
  openMenuId.value = null;
  try { await navigator.clipboard.writeText(id); flash('Product ID copied'); } catch { flash(id); }
};

/* ── data loading ───────────────────────────────────────────────────────── */
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
  } finally { loading.value = false; }
};

const onClickAway = () => { openMenuId.value = null; };
onMounted(() => { loadAll(); window.addEventListener('click', onClickAway); });
onBeforeUnmount(() => window.removeEventListener('click', onClickAway));

/* ── sync actions ───────────────────────────────────────────────────────── */
const targetWebsiteIds = () => (siteScope.value === 'all' ? undefined : [siteScope.value]);
const syncOne = (p: SourceProduct, type: SyncType) => {
  openMenuId.value = null;
  syncTarget.value = { productIds: [p.id], label: p.name || 'product', defaultType: type, websiteIds: targetWebsiteIds() };
};
const syncSelected = (type: SyncType) => {
  syncTarget.value = { productIds: [...selected.value], label: `${selected.value.size} selected product(s)`, defaultType: type, websiteIds: targetWebsiteIds() };
};
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
  } finally { running.value = null; }
};
const syncAll = () => runSync('all', () => store.callSync({ productIds: 'all', websiteIds: 'all', syncType: 'full' }));
const retryFailed = () => runSync('retry', () => store.callSync({ action: 'retry-failed' }));

const testConnection = async (w: ConnectedWebsite) => {
  testingId.value = w.id;
  try {
    const r = await store.testConnection(w.id);
    testResults.value = { ...testResults.value, [w.id]: r };
    flash(r.ok ? `${w.name}: connection OK` : `${w.name}: ${r.error || 'failed'}`);
  } catch (e) {
    flash(`${w.name}: ${e instanceof Error ? e.message : String(e)}`);
  } finally { testingId.value = null; }
};
</script>

<style scoped>
.sync-page { display: flex; flex-direction: column; gap: 1.1rem; }

/* header bits */
.sync-icon-btn { padding: 0.4rem; height: auto; line-height: 0; }
.sync-ico { display: inline-flex; }
.sync-ico :deep(svg) { width: 16px; height: 16px; }
.sync-spin :deep(svg) { animation: sync-rot 0.9s linear infinite; }
.sync-pill { display: inline-flex; align-items: center; justify-content: center; min-width: 1.1rem; height: 1.1rem; padding: 0 0.3rem; border-radius: 999px; font-size: 0.66rem; font-weight: 800; }
.sync-pill--red { background: rgba(220,38,38,0.14); color: #dc2626; }

/* banners */
.sync-banner { position: relative; display: flex; align-items: center; gap: 0.55rem; padding: 0.7rem 0.95rem; border-radius: 12px; font-size: 0.85rem; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-main); }
.sync-banner--error { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); color: #dc2626; }
.sync-banner--info { border-color: var(--primary); }
.sync-banner--ok { background: var(--soft-bg); }
.sync-banner-x { position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); border: 0; background: none; cursor: pointer; font-size: 1.1rem; line-height: 1; color: var(--text-muted); }
.spinner { width: 1rem; height: 1rem; border: 2px solid var(--primary); border-top-color: transparent; border-radius: 50%; animation: sync-rot 0.8s linear infinite; }
@keyframes sync-rot { to { transform: rotate(360deg); } }

/* KPI cards */
.sync-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.85rem; }
.sync-kpi { display: flex; align-items: center; gap: 0.75rem; text-align: left; padding: 0.95rem 1.05rem; border: 1px solid var(--border); border-radius: 14px; background: var(--card-bg); cursor: default; transition: border-color 160ms, box-shadow 160ms, transform 160ms; }
.sync-kpi[aria-pressed] { cursor: pointer; }
.sync-kpi:hover { box-shadow: var(--shadow-card, 0 1px 3px rgba(16,24,40,0.08)); }
.sync-kpi--active { border-color: var(--primary); box-shadow: 0 0 0 1px var(--primary) inset; }
.sync-kpi-ico { display: inline-flex; width: 2.1rem; height: 2.1rem; align-items: center; justify-content: center; border-radius: 10px; background: var(--soft-bg); color: var(--text-secondary); flex-shrink: 0; }
.sync-kpi-ico :deep(svg) { width: 18px; height: 18px; }
.sync-kpi--blue .sync-kpi-ico { color: #2563eb; background: rgba(37,99,235,0.10); }
.sync-kpi--green .sync-kpi-ico { color: #16a34a; background: rgba(22,163,74,0.10); }
.sync-kpi--red .sync-kpi-ico { color: #dc2626; background: rgba(220,38,38,0.10); }
.sync-kpi-body { display: flex; flex-direction: column; min-width: 0; }
.sync-kpi-val { font-size: 1.55rem; font-weight: 800; line-height: 1.1; color: var(--text-main); font-family: 'Jost Numbers', var(--font-number, sans-serif); }
.sync-kpi-lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.sync-kpi-hint { margin-left: auto; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--primary); opacity: 0; transition: opacity 160ms; }
.sync-kpi:hover .sync-kpi-hint, .sync-kpi--active .sync-kpi-hint { opacity: 1; }

/* toolbar */
.sync-toolbar { padding: 0.85rem 0.95rem; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 0.7rem; }
.sync-toolbar-row { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.sync-toolbar-spacer { flex: 1 1 auto; }
.sync-search { position: relative; display: flex; align-items: center; flex: 1 1 16rem; min-width: 12rem; }
.sync-search-ico { position: absolute; left: 0.6rem; color: var(--text-muted); pointer-events: none; }
.sync-search-input { width: 100%; padding: 0.45rem 1.8rem 0.45rem 1.95rem; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main); font-size: 0.85rem; outline: none; transition: border-color 140ms; }
.sync-search-input:focus { border-color: var(--primary); }
.sync-search-x { position: absolute; right: 0.5rem; border: 0; background: none; cursor: pointer; color: var(--text-muted); font-size: 1.05rem; line-height: 1; }
.sync-select { padding: 0.45rem 0.6rem; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main); font-size: 0.82rem; outline: none; cursor: pointer; }
.sync-select:focus { border-color: var(--primary); }
.sync-select--sm { padding: 0.25rem 0.4rem; font-size: 0.75rem; }
.sync-count { font-size: 0.78rem; color: var(--text-muted); font-family: 'Jost Numbers', monospace; white-space: nowrap; }
.sync-chips { display: flex; gap: 0.4rem; flex-wrap: wrap; }
.sync-chip-num { margin-left: 0.3rem; font-size: 0.68rem; opacity: 0.7; }

/* bulk bar */
.sync-bulk { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; padding: 0.6rem 0.95rem; border-bottom: 1px solid var(--border); background: color-mix(in srgb, var(--primary) 6%, transparent); }
.sync-bulk-count { font-weight: 800; font-size: 0.82rem; color: var(--primary); }
.sync-bulk-label { font-size: 0.78rem; color: var(--text-muted); }

/* table */
.sync-table-wrap { overflow-x: auto; }
.sync-table { width: 100%; border-collapse: collapse; min-width: 52rem; }
.sync-table th, .sync-table td { text-align: left; padding: 0.62rem 0.85rem; font-size: 0.85rem; vertical-align: middle; border-bottom: 1px solid var(--border); }
.sync-table thead th { font-size: 0.68rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); background: color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg)); position: sticky; top: 0; z-index: 1; }
.sync-col-check { width: 2.2rem; }
.sync-table tbody tr { transition: background 120ms; }
.sync-table tbody tr:hover { background: color-mix(in srgb, var(--soft-bg) 50%, transparent); }
.sync-table tbody tr:last-child td { border-bottom: 0; }
.sync-row-sel { background: color-mix(in srgb, var(--primary) 6%, transparent) !important; }
.sync-strong { font-weight: 700; color: var(--text-main); margin: 0; }
.sync-mono { font-family: 'Jost Numbers', monospace; font-size: 0.72rem; color: var(--text-muted); margin: 0; }
.sync-num { font-family: 'Jost Numbers', monospace; color: var(--text-secondary); }
.sync-muted { color: var(--text-muted); }
.sync-tag { display: inline-block; padding: 0.1rem 0.5rem; border-radius: 999px; background: var(--soft-bg); border: 1px solid var(--border); font-size: 0.7rem; color: var(--text-secondary); }
.sync-btn { font-size: 0.74rem; padding: 0.3rem 0.6rem; height: auto; display: inline-flex; align-items: center; gap: 0.3rem; }

/* per-site dots */
.sync-dots { display: flex; align-items: center; gap: 0.3rem; }
.sync-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.sync-dot--synced { background: #16a34a; }
.sync-dot--waiting { background: #2563eb; }
.sync-dot--failed { background: #dc2626; }
.sync-status-text { margin-left: 0.35rem; font-size: 0.7rem; font-weight: 700; }
.sync-status-text--synced { color: #16a34a; }
.sync-status-text--waiting { color: #2563eb; }
.sync-status-text--failed { color: #dc2626; }

/* row actions menu */
.sync-row-actions { display: inline-flex; align-items: center; gap: 0.25rem; justify-content: flex-end; }
.sync-menu { position: relative; }
.sync-menu-pop { position: absolute; right: 0; top: calc(100% + 4px); z-index: 30; min-width: 12rem; padding: 0.3rem; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); box-shadow: 0 10px 30px rgba(0,0,0,0.16); display: flex; flex-direction: column; }
.sync-menu-pop button { display: flex; align-items: center; gap: 0.5rem; width: 100%; text-align: left; padding: 0.45rem 0.55rem; border: 0; background: none; border-radius: 7px; font-size: 0.8rem; color: var(--text-main); cursor: pointer; }
.sync-menu-pop button:hover { background: var(--soft-bg); }
.sync-menu-sep { height: 1px; background: var(--border); margin: 0.25rem 0; }

/* empty + skeleton */
.sync-empty { text-align: center; padding: 2.4rem 1rem; }
.sync-empty-ico { display: inline-flex; color: var(--text-muted); margin-bottom: 0.5rem; }
.sync-empty-ico :deep(svg) { width: 28px; height: 28px; }
.sync-skel { display: block; height: 0.9rem; border-radius: 6px; background: linear-gradient(90deg, var(--soft-bg) 25%, color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg)) 50%, var(--soft-bg) 75%); background-size: 200% 100%; animation: sync-shimmer 1.3s infinite; }
@keyframes sync-shimmer { to { background-position: -200% 0; } }

/* pager */
.sync-pager { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; padding: 0.7rem 0.95rem; border-top: 1px solid var(--border); flex-wrap: wrap; }
.sync-pager-ctrls { display: flex; align-items: center; gap: 0.5rem; }

/* bottom columns */
.sync-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
.sync-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
.sync-h2 { font-size: 1rem; font-weight: 800; color: var(--text-main); margin: 0; }
.sync-link { font-size: 0.75rem; font-weight: 700; color: var(--primary); text-decoration: none; }
.sync-link:hover { text-decoration: underline; }
.sync-ul { display: flex; flex-direction: column; gap: 0.55rem; margin: 0; padding: 0; list-style: none; }
.sync-site-row, .sync-act-row { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; padding: 0.5rem 0; border-bottom: 1px solid var(--border); }
.sync-site-row:last-child, .sync-act-row:last-child { border-bottom: 0; }
.sync-act-row { align-items: flex-start; }
.sync-act-row .sync-dot { margin-top: 0.35rem; }
.sync-site-meta { display: flex; align-items: center; gap: 0.45rem; flex-shrink: 0; }
.sync-test-line { font-size: 0.7rem; margin: 0.2rem 0 0; font-family: 'Jost Numbers', monospace; }
.sync-test--ok { color: #16a34a; }
.sync-test--bad { color: #dc2626; }
.sync-err-inline { color: #dc2626; }

/* toast */
.sync-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-size: 0.85rem; color: var(--text-main); }

/* transitions */
.sync-fade-enter-active, .sync-fade-leave-active { transition: opacity 200ms ease; }
.sync-fade-enter-from, .sync-fade-leave-to { opacity: 0; }
.sync-slide-enter-active, .sync-slide-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.sync-slide-enter-from, .sync-slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* responsive */
@media (max-width: 1100px) { .sync-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 860px) {
  .sync-kpis { grid-template-columns: repeat(2, 1fr); }
  .sync-cols { grid-template-columns: 1fr; }
  .sync-hide-md { display: none; }
}
@media (max-width: 620px) { .sync-hide-sm { display: none; } }

@media (prefers-reduced-motion: reduce) {
  .sync-spin :deep(svg), .spinner, .sync-skel { animation: none; }
  .sync-kpi, .sync-table tbody tr, .sync-fade-enter-active, .sync-fade-leave-active, .sync-slide-enter-active, .sync-slide-leave-active, .sync-search-input { transition: none; }
}
</style>
