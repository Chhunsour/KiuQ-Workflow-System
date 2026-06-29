<template>
  <div class="fw-page">
    <PageHeader :title="$t('Framework Website')" :subtitle="subtitle" eyebrow="Product Distribution" :icon="ICON.globe">
      <template #actions>
        <button type="button" class="btn-ghost fw-icon-btn" :disabled="loading" :aria-label="$t('Refresh')" :title="$t('Refresh')" @click="loadAll">
          <span class="fw-ico" :class="{ 'fw-spin': loading }" v-html="ICON.refresh" />
        </button>
        <RouterLink to="/product-sync/websites" class="btn-secondary fw-link-btn">
          <span class="fw-ico" v-html="ICON.plus" /> {{ $t('Add website') }}
        </RouterLink>
        <RouterLink to="/product-sync" class="btn-primary fw-link-btn">
          <span class="fw-ico" v-html="ICON.dashboard" /> {{ $t('Open Sync Center') }}
        </RouterLink>
      </template>
    </PageHeader>

    <transition name="fw-fade">
      <div v-if="errorMsg" class="fw-banner fw-banner--error">
        <span class="fw-ico" v-html="ICON.alert" /> {{ errorMsg }}
        <button type="button" class="fw-banner-x" :aria-label="$t('Dismiss')" @click="errorMsg = null">×</button>
      </div>
    </transition>

    <!-- KPI summary -->
    <div class="fw-kpis">
      <div v-for="k in kpis" :key="k.key" class="fw-kpi" :class="`fw-kpi--${k.tone}`">
        <span class="fw-kpi-ico" v-html="k.icon" />
        <span class="fw-kpi-body">
          <span class="fw-kpi-val">{{ loading ? '—' : k.value }}</span>
          <span class="fw-kpi-lbl">{{ k.label }}</span>
        </span>
      </div>
    </div>

    <!-- Connected sites -->
    <section>
      <div class="fw-section-head">
        <h2 class="fw-h2">{{ $t('Connected framework sites') }}</h2>
        <RouterLink to="/product-sync/websites" class="fw-textlink">{{ $t('Manage all') }} →</RouterLink>
      </div>

      <div v-if="loading" class="fw-sites">
        <div v-for="n in 2" :key="`sk-${n}`" class="card card-pad fw-site fw-site--skel">
          <span class="fw-skel" style="width: 40%; height: 1rem;" />
          <span class="fw-skel" style="width: 60%;" />
          <span class="fw-skel" style="width: 100%; height: 2.4rem; margin-top: 0.6rem;" />
        </div>
      </div>

      <p v-else-if="store.websites.length === 0" class="card card-pad fw-empty">
        <span class="fw-ico fw-empty-ico" v-html="ICON.globe" />
        <span class="fw-strong">{{ $t('No framework sites connected yet.') }}</span>
        <RouterLink to="/product-sync/websites" class="btn-primary fw-link-btn">{{ $t('Connect a website') }}</RouterLink>
      </p>

      <div v-else class="fw-sites">
        <article v-for="w in store.websites" :key="w.id" class="card card-pad fw-site" :class="{ 'fw-site--off': !w.active }">
          <header class="fw-site-head">
            <div class="min-w-0">
              <p class="fw-site-name">{{ w.name }}</p>
              <a :href="`https://${w.domain}`" target="_blank" rel="noopener" class="fw-site-domain">
                {{ w.domain }} <span class="fw-ico fw-ico-xs" v-html="ICON.external" />
              </a>
            </div>
            <SyncBadge :status="w.active ? (w.last_status ?? 'pending') : 'inactive'" />
          </header>

          <!-- per-site sync progress -->
          <div class="fw-progress" :title="`${stats(w.id).synced} synced / ${stats(w.id).total} total`">
            <span class="fw-progress-fill" :style="{ width: pct(w.id) + '%' }" />
          </div>
          <div class="fw-mini-stats">
            <span class="fw-mini fw-mini--green">{{ stats(w.id).synced }} {{ $t('current') }}</span>
            <span class="fw-mini fw-mini--blue">{{ stats(w.id).waiting }} {{ $t('waiting') }}</span>
            <span class="fw-mini fw-mini--red">{{ stats(w.id).failed }} {{ $t('failed') }}</span>
          </div>

          <dl class="fw-meta">
            <div><dt>{{ $t('Last sync') }}</dt><dd>{{ formatDateTime(w.last_sync_at) }}</dd></div>
            <div><dt>{{ $t('Platform') }}</dt><dd class="truncate">{{ w.platform }}</dd></div>
          </dl>

          <p v-if="testResults[w.id]" class="fw-test" :class="testResults[w.id]?.ok ? 'fw-test--ok' : 'fw-test--bad'">
            <template v-if="testResults[w.id]?.ok">
              ✓ {{ testResults[w.id]?.response?.product_count ?? 0 }} {{ $t('products on site') }} ·
              {{ testResults[w.id]?.response?.writable ? $t('writable') : $t('NOT writable') }}
              <span v-if="testResults[w.id]?.response?.version" class="fw-muted">· v{{ testResults[w.id]?.response?.version }}</span>
            </template>
            <template v-else>✕ {{ testResults[w.id]?.error || `HTTP ${testResults[w.id]?.status}` }}</template>
          </p>

          <footer class="fw-site-actions">
            <button type="button" class="btn-secondary fw-btn" :disabled="testingId === w.id" @click="testConnection(w)">
              <span class="fw-ico" v-html="ICON.plug" /> {{ testingId === w.id ? $t('Testing…') : $t('Test') }}
            </button>
            <button type="button" class="btn-primary fw-btn" :disabled="!w.active" @click="syncSite(w)">
              <span class="fw-ico" v-html="ICON.bolt" /> {{ $t('Sync this site') }}
            </button>
            <button type="button" class="btn-ghost fw-btn" @click="overridesSite = w">
              <span class="fw-ico" v-html="ICON.sliders" /> {{ $t('Overrides') }}
            </button>
            <span class="fw-toolbar-spacer" />
            <label class="fw-toggle" :title="w.active ? $t('Active') : $t('Inactive')">
              <input type="checkbox" :checked="w.active" :disabled="togglingId === w.id" @change="toggleActive(w)" />
              <span>{{ w.active ? $t('Active') : $t('Off') }}</span>
            </label>
          </footer>
        </article>
      </div>
    </section>

    <!-- Quick links + recent activity -->
    <div class="fw-cols">
      <section class="card card-pad">
        <h2 class="fw-h2 mb-3">{{ $t('Quick actions') }}</h2>
        <div class="fw-shortcuts">
          <RouterLink v-for="s in shortcuts" :key="s.to" :to="s.to" class="fw-shortcut">
            <span class="fw-shortcut-ico" v-html="s.icon" />
            <span class="min-w-0">
              <span class="fw-shortcut-title">{{ s.title }}</span>
              <span class="fw-shortcut-desc">{{ s.desc }}</span>
            </span>
            <span class="fw-shortcut-arrow" v-html="ICON.chevron" />
          </RouterLink>
        </div>
      </section>

      <section class="card card-pad">
        <div class="fw-section-head mb-3">
          <h2 class="fw-h2">{{ $t('Recent activity') }}</h2>
          <RouterLink to="/product-sync/logs" class="fw-textlink">{{ $t('All logs') }} →</RouterLink>
        </div>
        <p v-if="recent.length === 0" class="fw-muted text-sm py-2">{{ $t('No syncs yet.') }}</p>
        <ul v-else class="fw-ul">
          <li v-for="l in recent" :key="l.id" class="fw-act-row">
            <span class="fw-dot" :class="`fw-dot--${l.status === 'success' ? 'green' : l.status === 'failed' ? 'red' : 'blue'}`" />
            <div class="min-w-0 flex-1">
              <p class="fw-strong truncate">{{ l.product_name ?? '—' }} <span class="fw-muted">→ {{ l.website_name ?? '—' }}</span></p>
              <p class="fw-mono">{{ l.sync_type }} · {{ formatDateTime(l.created_at) }}</p>
            </div>
            <SyncBadge :status="l.status" />
          </li>
        </ul>
      </section>
    </div>

    <SyncProductModal v-if="syncTarget" :target="syncTarget" @close="syncTarget = null" @done="onSyncDone" />
    <OverridesModal v-if="overridesSite" :website="overridesSite" @close="overridesSite = null" />
    <transition name="fw-fade">
      <p v-if="toast" class="fw-toast" role="status">{{ toast }}</p>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import SyncBadge from '@/components/sync/SyncBadge.vue';
import SyncProductModal, { type SyncTarget } from '@/components/sync/SyncProductModal.vue';
import OverridesModal from '@/components/sync/OverridesModal.vue';
import {
  useProductSyncStore, type SyncResult, type ConnectedWebsite, type TestConnectionResult,
} from '@/stores/productSync';

const store = useProductSyncStore();

const svg = (p: string) =>
  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const ICON = {
  globe: svg('<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/>'),
  dashboard: svg('<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>'),
  refresh: svg('<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'),
  bolt: svg('<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>'),
  alert: svg('<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  plug: svg('<path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v3a6 6 0 0 1-12 0V8z"/>'),
  sliders: svg('<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>'),
  external: svg('<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>'),
  cube: svg('<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  clock: svg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
  activity: svg('<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>'),
  settings: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  chevron: svg('<polyline points="9 18 15 12 9 6"/>'),
};

const loading = ref(true);
const errorMsg = ref<string | null>(null);
const toast = ref<string | null>(null);
const testingId = ref<string | null>(null);
const togglingId = ref<string | null>(null);
const testResults = ref<Record<string, TestConnectionResult>>({});
const syncTarget = ref<SyncTarget | null>(null);
const overridesSite = ref<ConnectedWebsite | null>(null);

const activeSites = computed(() => store.websites.filter((w) => w.active));
const products = computed(() => store.sourceProducts);
const recent = computed(() => store.logs.slice(0, 8));
const subtitle = computed(() => `${store.websites.length} connected site(s) · ${activeSites.value.length} active · ${products.value.length} products`);

const stateMap = computed(() => new Map(store.states.map((s) => [`${s.website_id}:${s.product_id}`, s])));

const stats = (siteId: string) => {
  let synced = 0, waiting = 0, failed = 0;
  for (const p of products.value) {
    const st = stateMap.value.get(`${siteId}:${p.id}`);
    if (!st || st.status === 'pending') waiting++;
    else if (st.status === 'failed') failed++;
    else {
      const stale = st.last_synced_at && new Date(p.updated_at) > new Date(st.last_synced_at);
      stale ? waiting++ : synced++;
    }
  }
  return { synced, waiting, failed, total: products.value.length };
};
const pct = (siteId: string) => {
  const s = stats(siteId);
  return s.total === 0 ? 0 : Math.round((s.synced / s.total) * 100);
};

const totals = computed(() => {
  let synced = 0, failed = 0;
  for (const w of activeSites.value) {
    const s = stats(w.id);
    synced += s.synced; failed += s.failed;
  }
  return { synced, failed };
});

const kpis = computed(() => [
  { key: 'sites', label: 'Connected sites', value: store.websites.length, icon: ICON.globe, tone: 'neutral' },
  { key: 'active', label: 'Active', value: activeSites.value.length, icon: ICON.check, tone: 'green' },
  { key: 'products', label: 'Products in catalog', value: products.value.length, icon: ICON.cube, tone: 'neutral' },
  { key: 'synced', label: 'Synced & current', value: totals.value.synced, icon: ICON.check, tone: 'green' },
  { key: 'failed', label: 'Failed', value: totals.value.failed, icon: ICON.alert, tone: 'red' },
]);

const shortcuts = [
  { to: '/product-sync', title: 'Sync Center', desc: 'Push products to every site', icon: ICON.dashboard },
  { to: '/product-sync/websites', title: 'Connected Websites', desc: 'Receivers, tokens & secrets', icon: ICON.globe },
  { to: '/product-sync/logs', title: 'Sync Logs', desc: 'History of every push', icon: ICON.activity },
  { to: '/product-sync/settings', title: 'Sync Settings', desc: 'Batch size, concurrency, images', icon: ICON.settings },
];

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
      store.fetchLogs(30),
    ]);
    if (store.error) errorMsg.value = store.error;
  } finally { loading.value = false; }
};
onMounted(loadAll);

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

const toggleActive = async (w: ConnectedWebsite) => {
  togglingId.value = w.id;
  try { await store.updateWebsite(w.id, { active: !w.active }); }
  finally { togglingId.value = null; }
};

const syncSite = (w: ConnectedWebsite) => {
  syncTarget.value = { productIds: 'all', label: `all products → ${w.name}`, websiteIds: [w.id] };
};
const onSyncDone = (_r: SyncResult) => { void store.fetchStates(); void store.fetchLogs(30); };
</script>

<style scoped>
.fw-page { display: flex; flex-direction: column; gap: 1.1rem; }
.fw-ico { display: inline-flex; }
.fw-ico :deep(svg) { width: 16px; height: 16px; }
.fw-ico-xs :deep(svg) { width: 12px; height: 12px; }
.fw-icon-btn { padding: 0.4rem; height: auto; line-height: 0; }
.fw-link-btn { display: inline-flex; align-items: center; gap: 0.4rem; text-decoration: none; }
.fw-spin :deep(svg) { animation: fw-rot 0.9s linear infinite; }
@keyframes fw-rot { to { transform: rotate(360deg); } }
.fw-strong { font-weight: 700; color: var(--text-main); }
.fw-muted { color: var(--text-muted); }
.fw-mono { font-family: 'Jost Numbers', monospace; font-size: 0.72rem; color: var(--text-muted); margin: 0; }

.fw-banner { position: relative; display: flex; align-items: center; gap: 0.55rem; padding: 0.7rem 0.95rem; border-radius: 12px; font-size: 0.85rem; border: 1px solid var(--border); }
.fw-banner--error { border-color: rgba(220,38,38,0.4); background: rgba(220,38,38,0.06); color: #dc2626; }
.fw-banner-x { position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); border: 0; background: none; cursor: pointer; font-size: 1.1rem; line-height: 1; color: var(--text-muted); }

/* KPI */
.fw-kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 0.85rem; }
.fw-kpi { display: flex; align-items: center; gap: 0.75rem; padding: 0.95rem 1.05rem; border: 1px solid var(--border); border-radius: 14px; background: var(--card-bg); }
.fw-kpi-ico { display: inline-flex; width: 2.1rem; height: 2.1rem; align-items: center; justify-content: center; border-radius: 10px; background: var(--soft-bg); color: var(--text-secondary); flex-shrink: 0; }
.fw-kpi-ico :deep(svg) { width: 18px; height: 18px; }
.fw-kpi--green .fw-kpi-ico { color: #16a34a; background: rgba(22,163,74,0.10); }
.fw-kpi--red .fw-kpi-ico { color: #dc2626; background: rgba(220,38,38,0.10); }
.fw-kpi-body { display: flex; flex-direction: column; min-width: 0; }
.fw-kpi-val { font-size: 1.55rem; font-weight: 800; line-height: 1.1; color: var(--text-main); font-family: 'Jost Numbers', sans-serif; }
.fw-kpi-lbl { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }

/* section heads */
.fw-section-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
.fw-h2 { font-size: 1rem; font-weight: 800; color: var(--text-main); margin: 0; }
.fw-textlink { font-size: 0.75rem; font-weight: 700; color: var(--primary); text-decoration: none; }
.fw-textlink:hover { text-decoration: underline; }

/* site cards */
.fw-sites { display: grid; grid-template-columns: repeat(auto-fill, minmax(20rem, 1fr)); gap: 1rem; }
.fw-site { display: flex; flex-direction: column; gap: 0.6rem; transition: box-shadow 160ms, border-color 160ms; }
.fw-site:hover { box-shadow: 0 4px 16px rgba(16,24,40,0.08); }
.fw-site--off { opacity: 0.72; }
.fw-site--skel { gap: 0.5rem; }
.fw-site-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.6rem; }
.fw-site-name { font-weight: 800; color: var(--text-main); font-size: 0.98rem; margin: 0; }
.fw-site-domain { display: inline-flex; align-items: center; gap: 0.25rem; font-family: 'Jost Numbers', monospace; font-size: 0.74rem; color: var(--text-muted); text-decoration: none; }
.fw-site-domain:hover { color: var(--primary); }

.fw-progress { height: 6px; border-radius: 999px; background: var(--soft-bg); overflow: hidden; }
.fw-progress-fill { display: block; height: 100%; border-radius: 999px; background: #16a34a; transition: width 300ms ease; }
.fw-mini-stats { display: flex; gap: 0.6rem; flex-wrap: wrap; }
.fw-mini { font-size: 0.72rem; font-weight: 700; font-family: 'Jost Numbers', monospace; }
.fw-mini--green { color: #16a34a; }
.fw-mini--blue { color: #2563eb; }
.fw-mini--red { color: #dc2626; }

.fw-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin: 0; }
.fw-meta dt { font-size: 0.62rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 800; }
.fw-meta dd { font-size: 0.8rem; color: var(--text-secondary); margin: 0; }

.fw-test { font-size: 0.72rem; margin: 0; font-family: 'Jost Numbers', monospace; padding: 0.35rem 0.5rem; border-radius: 8px; background: var(--soft-bg); }
.fw-test--ok { color: #16a34a; }
.fw-test--bad { color: #dc2626; }

.fw-site-actions { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; padding-top: 0.5rem; border-top: 1px solid var(--border); margin-top: auto; }
.fw-btn { font-size: 0.74rem; padding: 0.32rem 0.6rem; height: auto; display: inline-flex; align-items: center; gap: 0.3rem; }
.fw-toolbar-spacer { flex: 1 1 auto; }
.fw-toggle { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.74rem; color: var(--text-secondary); cursor: pointer; }

/* shortcuts + activity */
.fw-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 1.1rem; }
.fw-shortcuts { display: flex; flex-direction: column; gap: 0.5rem; }
.fw-shortcut { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.8rem; border: 1px solid var(--border); border-radius: 12px; text-decoration: none; transition: border-color 140ms, background 140ms; }
.fw-shortcut:hover { border-color: var(--primary); background: var(--soft-bg); }
.fw-shortcut-ico { display: inline-flex; width: 2.1rem; height: 2.1rem; align-items: center; justify-content: center; border-radius: 10px; background: var(--soft-bg); color: var(--primary); flex-shrink: 0; }
.fw-shortcut-title { display: block; font-weight: 700; color: var(--text-main); font-size: 0.85rem; }
.fw-shortcut-desc { display: block; font-size: 0.74rem; color: var(--text-muted); }
.fw-shortcut-arrow { margin-left: auto; color: var(--text-muted); }
.fw-shortcut-arrow :deep(svg) { width: 16px; height: 16px; }

.fw-ul { display: flex; flex-direction: column; gap: 0.55rem; margin: 0; padding: 0; list-style: none; }
.fw-act-row { display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.45rem 0; border-bottom: 1px solid var(--border); }
.fw-act-row:last-child { border-bottom: 0; }
.fw-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 0.35rem; }
.fw-dot--green { background: #16a34a; }
.fw-dot--blue { background: #2563eb; }
.fw-dot--red { background: #dc2626; }

.fw-empty { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; text-align: center; padding: 2.4rem 1rem; }
.fw-empty-ico :deep(svg) { width: 28px; height: 28px; color: var(--text-muted); }
.fw-skel { display: block; height: 0.85rem; border-radius: 6px; background: linear-gradient(90deg, var(--soft-bg) 25%, color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg)) 50%, var(--soft-bg) 75%); background-size: 200% 100%; animation: fw-shimmer 1.3s infinite; }
@keyframes fw-shimmer { to { background-position: -200% 0; } }

.fw-toast { position: fixed; bottom: 1.5rem; left: 50%; transform: translateX(-50%); z-index: 60; background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 0.7rem 1.2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.18); font-size: 0.85rem; color: var(--text-main); }
.fw-fade-enter-active, .fw-fade-leave-active { transition: opacity 200ms ease; }
.fw-fade-enter-from, .fw-fade-leave-to { opacity: 0; }

@media (max-width: 1100px) { .fw-kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 860px) { .fw-kpis { grid-template-columns: repeat(2, 1fr); } .fw-cols { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .fw-spin :deep(svg), .fw-skel, .fw-progress-fill { animation: none; transition: none; }
  .fw-site, .fw-shortcut, .fw-fade-enter-active, .fw-fade-leave-active { transition: none; }
}
</style>
