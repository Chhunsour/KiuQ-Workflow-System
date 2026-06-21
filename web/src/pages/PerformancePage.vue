<template>
  <div>
    <PageHeader
      title="Website Performance Center"
      subtitle="Real Google Search Console data for every team website — clicks, impressions, CTR, position."
    >
      <template #actions>
        <div class="seg">
          <button v-for="d in [7, 28, 90]" :key="d" type="button" :class="{ active: perf.rangeDays === d }" @click="changeRange(d as 7 | 28 | 90)">{{ d }}d</button>
        </div>
        <button v-if="auth.isAdmin" class="btn-secondary" type="button" :disabled="perf.syncAllRunning" @click="onSyncAll">
          {{ perf.syncAllRunning ? 'Syncing…' : 'Sync all' }}
        </button>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="onConnect">
          {{ perf.connectionInfo.connected ? 'Reconnect Google' : 'Connect Search Console' }}
        </button>
      </template>
    </PageHeader>

    <!-- Connect result / status -->
    <div v-if="connectMsg" class="mb-4 rounded-card border px-4 py-3 text-sm" :class="connectOk ? 'border-status-approved-bg bg-status-approved-bg/30 text-status-approved-fg' : 'border-status-needs-fix-bg bg-status-needs-fix-bg/30 text-status-needs-fix-fg'">
      {{ connectMsg }}
      <button class="ml-2 underline" type="button" @click="connectMsg = ''">Dismiss</button>
    </div>
    <div v-else-if="auth.isAdmin && perf.connectionInfo.connected" class="mb-4 text-xs text-text-muted">
      Connected to Google as <strong class="text-text-main">{{ perf.connectionInfo.google_email || 'admin account' }}</strong>.
    </div>
    <div v-else-if="auth.isAdmin && !perf.connectionInfo.connected" class="mb-4 rounded-card border border-border bg-soft/40 px-4 py-3 text-sm text-text-muted">
      Search Console is not connected yet. Click <strong class="text-text-main">Connect Search Console</strong> to start pulling real data.
    </div>

    <!-- Overview cards -->
    <div class="grid grid-cols-2 gap-4 lg:grid-cols-6">
      <StatCard label="Clicks" :value="fmtNum(totals.clicks)" :icon="ICON.click" icon-bg="bg-soft" icon-color="text-primary" />
      <StatCard label="Impressions" :value="fmtNum(totals.impressions)" :icon="ICON.eye" icon-bg="bg-soft" icon-color="text-primary" />
      <StatCard label="Avg CTR" :value="fmtPct(totals.ctr)" :icon="ICON.pct" icon-bg="bg-soft" icon-color="text-primary" />
      <StatCard label="Avg Position" :value="fmtPos(totals.position)" :icon="ICON.target" icon-bg="bg-soft" icon-color="text-primary" />
      <StatCard label="Connected" :value="connectedCount" :icon="ICON.link" icon-bg="bg-status-approved-bg" icon-color="text-status-approved-fg" />
      <StatCard label="Not connected" :value="notConnectedCount" :icon="ICON.unlink" icon-bg="bg-status-submitted-bg" icon-color="text-status-submitted-fg" />
    </div>

    <!-- Filters -->
    <div class="mt-5 flex flex-wrap items-end gap-2">
      <select v-model="websiteFilter" class="input perf-filter">
        <option value="">All websites</option>
        <option v-for="w in visibleWebsites" :key="w.id" :value="w.id">{{ w.name || w.domain }}</option>
      </select>
      <select v-if="auth.isAdmin" v-model="memberFilter" class="input perf-filter">
        <option value="">All members</option>
        <option v-for="m in memberOptions" :key="m.id" :value="m.id">{{ m.label }}</option>
      </select>
      <select v-model="platformFilter" class="input perf-filter">
        <option value="">All platforms</option>
        <option value="wordpress">WordPress</option>
        <option value="framework">Framework</option>
        <option value="unknown">Unknown</option>
      </select>
      <select v-model="connFilter" class="input perf-filter">
        <option value="all">Connected & not</option>
        <option value="connected">Connected only</option>
        <option value="not">Not connected</option>
      </select>
    </div>

    <LoadingBlock :loading="perf.loading" :error="perf.error" :retry="() => perf.fetchAll()">
      <!-- Charts -->
      <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div class="card card-pad">
          <h3 class="section-title mb-1">Clicks over time</h3>
          <LineChart v-if="hasTrend" :data="clicksSeries" color="#15D6C2" :height="200" />
          <p v-else class="py-10 text-center text-sm text-text-muted">{{ noDataMsg }}</p>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-1">Impressions over time</h3>
          <LineChart v-if="hasTrend" :data="impressionsSeries" color="#3b82f6" :height="200" />
          <p v-else class="py-10 text-center text-sm text-text-muted">{{ noDataMsg }}</p>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-1">CTR trend (%)</h3>
          <LineChart v-if="hasTrend" :data="ctrSeries" color="#22c55e" :height="200" />
          <p v-else class="py-10 text-center text-sm text-text-muted">{{ noDataMsg }}</p>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-1">Average position</h3>
          <LineChart v-if="hasTrend" :data="positionSeries" color="#f59e0b" :height="200" />
          <p v-else class="py-10 text-center text-sm text-text-muted">{{ noDataMsg }}</p>
        </div>
      </div>

      <!-- Top websites / queries / pages -->
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="card card-pad">
          <h3 class="section-title mb-2">Top websites by clicks</h3>
          <table class="perf-table">
            <tbody>
              <tr v-for="r in topWebsites" :key="r.id" class="cursor-pointer" @click="openDetail(r.id)">
                <td class="font-medium text-text-main">{{ r.name }}</td>
                <td class="text-right">{{ fmtNum(r.clicks) }}</td>
              </tr>
              <tr v-if="!topWebsites.length"><td class="py-6 text-center text-sm text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-2">Top searches</h3>
          <table class="perf-table">
            <tbody>
              <tr v-for="(r, i) in topQueries" :key="i">
                <td class="text-text-main">{{ r.label }}</td>
                <td class="text-right">{{ fmtNum(r.clicks) }}</td>
              </tr>
              <tr v-if="!topQueries.length"><td class="py-6 text-center text-sm text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-2">Top pages</h3>
          <table class="perf-table">
            <tbody>
              <tr v-for="(r, i) in topPages" :key="i">
                <td class="truncate text-text-main" :title="r.label">{{ shortUrl(r.label) }}</td>
                <td class="text-right">{{ fmtNum(r.clicks) }}</td>
              </tr>
              <tr v-if="!topPages.length"><td class="py-6 text-center text-sm text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Growth / drop / attention -->
      <div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div class="card card-pad">
          <h3 class="section-title mb-2">Biggest growth</h3>
          <table class="perf-table">
            <tbody>
              <tr v-for="r in biggestGrowth" :key="r.id" class="cursor-pointer" @click="openDetail(r.id)">
                <td class="font-medium text-text-main">{{ r.name }}</td>
                <td class="text-right text-status-approved-fg">+{{ fmtNum(r.delta) }}</td>
              </tr>
              <tr v-if="!biggestGrowth.length"><td class="py-6 text-center text-sm text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-2">Biggest drop</h3>
          <table class="perf-table">
            <tbody>
              <tr v-for="r in biggestDrop" :key="r.id" class="cursor-pointer" @click="openDetail(r.id)">
                <td class="font-medium text-text-main">{{ r.name }}</td>
                <td class="text-right text-status-needs-fix-fg">{{ fmtNum(r.delta) }}</td>
              </tr>
              <tr v-if="!biggestDrop.length"><td class="py-6 text-center text-sm text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody>
          </table>
        </div>
        <div class="card card-pad">
          <h3 class="section-title mb-2">Needs attention</h3>
          <table class="perf-table">
            <tbody>
              <tr v-for="r in needsAttention" :key="r.id">
                <td class="font-medium text-text-main">{{ r.name }}</td>
                <td class="text-right text-xs text-text-muted">{{ r.reason }}</td>
              </tr>
              <tr v-if="!needsAttention.length"><td class="py-6 text-center text-sm text-text-muted">All good 🎉</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Connections management (admin) -->
      <div v-if="auth.isAdmin" class="card card-pad mt-4">
        <h3 class="section-title mb-1">Search Console connections</h3>
        <p class="helper mb-3">Map each website to its Search Console property (e.g. <code>sc-domain:example.com</code> or <code>https://example.com/</code>), then sync.</p>
        <div class="overflow-x-auto">
          <table class="perf-table perf-table--lined">
            <thead>
              <tr><th>Website</th><th>GSC property</th><th>Status</th><th>Last sync</th><th></th></tr>
            </thead>
            <tbody>
              <tr v-for="w in visibleWebsites" :key="w.id">
                <td class="font-medium text-text-main">{{ w.name || w.domain }}</td>
                <td><input v-model="propInputs[w.id]" class="input h-8 text-xs" :placeholder="`sc-domain:${w.domain}`" /></td>
                <td>
                  <span class="perf-status" :class="`perf-status--${perf.connectionByWebsite.get(w.id)?.sync_status ?? 'none'}`">
                    {{ perf.connectionByWebsite.get(w.id)?.sync_status ?? 'not set' }}
                  </span>
                  <span v-if="perf.connectionByWebsite.get(w.id)?.sync_error" class="ml-1 text-[10px] text-status-needs-fix-fg" :title="perf.connectionByWebsite.get(w.id)?.sync_error || ''">⚠</span>
                </td>
                <td class="whitespace-nowrap text-xs text-text-muted">{{ fmtDateTime(perf.connectionByWebsite.get(w.id)?.last_synced_at) }}</td>
                <td class="whitespace-nowrap text-right">
                  <button class="btn-ghost px-2 py-1 text-xs" type="button" @click="onSaveConnection(w.id)">Save</button>
                  <button class="btn-ghost px-2 py-1 text-xs" type="button" :disabled="perf.syncingIds.has(w.id) || !perf.connectionByWebsite.get(w.id)" @click="perf.syncWebsite(w.id)">
                    {{ perf.syncingIds.has(w.id) ? 'Syncing…' : 'Sync' }}
                  </button>
                  <button v-if="perf.connectionByWebsite.get(w.id)" class="btn-ghost px-2 py-1 text-xs text-status-needs-fix-fg" type="button" @click="onRemoveConnection(w.id)">Remove</button>
                </td>
              </tr>
              <tr v-if="!visibleWebsites.length"><td colspan="5" class="py-6 text-center text-sm text-text-muted">No websites.</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </LoadingBlock>

    <!-- Website detail modal -->
    <Modal :open="!!detailId" :title="detailWebsite?.name || detailWebsite?.domain || 'Website'" subtitle="Search Console performance" size="lg" @close="detailId = null">
      <div v-if="detailId" class="space-y-4">
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div class="perf-kv"><div class="perf-kv-l">Clicks</div><div class="perf-kv-v">{{ fmtNum(detailTotals.clicks) }}</div></div>
          <div class="perf-kv"><div class="perf-kv-l">Impressions</div><div class="perf-kv-v">{{ fmtNum(detailTotals.impressions) }}</div></div>
          <div class="perf-kv"><div class="perf-kv-l">CTR</div><div class="perf-kv-v">{{ fmtPct(detailTotals.ctr) }}</div></div>
          <div class="perf-kv"><div class="perf-kv-l">Position</div><div class="perf-kv-v">{{ fmtPos(detailTotals.position) }}</div></div>
        </div>
        <LineChart v-if="detailSeries.length > 1" :data="detailSeries" color="#15D6C2" :height="180" />
        <p v-else class="text-center text-sm text-text-muted">{{ noDataMsg }}</p>
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h4 class="perf-kv-l mb-1">Top searches</h4>
            <table class="perf-table"><tbody>
              <tr v-for="(r, i) in detailQueries" :key="i"><td class="text-text-main">{{ r.label }}</td><td class="text-right">{{ fmtNum(r.clicks) }}</td></tr>
              <tr v-if="!detailQueries.length"><td class="py-4 text-center text-xs text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody></table>
          </div>
          <div>
            <h4 class="perf-kv-l mb-1">Top pages</h4>
            <table class="perf-table"><tbody>
              <tr v-for="(r, i) in detailPages" :key="i"><td class="truncate text-text-main" :title="r.label">{{ shortUrl(r.label) }}</td><td class="text-right">{{ fmtNum(r.clicks) }}</td></tr>
              <tr v-if="!detailPages.length"><td class="py-4 text-center text-xs text-text-muted">{{ noDataMsg }}</td></tr>
            </tbody></table>
          </div>
        </div>
        <div class="text-xs text-text-muted">Last sync: {{ fmtDateTime(perf.connectionByWebsite.get(detailId)?.last_synced_at) }}</div>
      </div>
      <template #footer>
        <button class="btn-secondary" type="button" @click="detailId = null">Close</button>
        <button v-if="auth.isAdmin && perf.connectionByWebsite.get(detailId || '')" class="btn-primary" type="button" :disabled="!!detailId && perf.syncingIds.has(detailId)" @click="detailId && perf.syncWebsite(detailId)">
          {{ detailId && perf.syncingIds.has(detailId) ? 'Syncing…' : 'Sync this website' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatCard from '@/components/ui/StatCard.vue';
import LineChart from '@/components/ui/LineChart.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import Modal from '@/components/ui/Modal.vue';
import { usePerformanceStore, aggregateByDate, sumTotals, type GscDaily, type GscTermStat } from '@/stores/performance';
import { useDataStore } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';

const perf = usePerformanceStore();
const data = useDataStore();
const auth = useAuthStore();
const route = useRoute();

const ICON = {
  click: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 9 5 12 1.8-5.2L21 14Z"/><path d="M7.2 2.2 8 5.1"/><path d="m5.1 8-2.9-.8"/><path d="M14 4.1 12 6"/><path d="m6 12-1.9 2"/></svg>',
  eye: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>',
  pct: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>',
  target: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  link: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  unlink: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="m5.17 11.75-1.71 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71"/><line x1="8" y1="2" x2="8" y2="5"/><line x1="2" y1="8" x2="5" y2="8"/><line x1="16" y1="19" x2="16" y2="22"/><line x1="19" y1="16" x2="22" y2="16"/></svg>'
};

// ── Filters ──────────────────────────────────────────────────────────────
const websiteFilter = ref('');
const memberFilter = ref('');
const platformFilter = ref('');
const connFilter = ref<'all' | 'connected' | 'not'>('all');

const websiteName = (id: string) => {
  const w = data.websites.find((x) => x.id === id);
  return w?.name || w?.domain || 'Website';
};

const memberOptions = computed(() => {
  const ids = new Set(data.websites.map((w) => w.createdBy).filter(Boolean) as string[]);
  return [...ids].map((id) => ({ id, label: data.memberById(id)?.fullName || data.memberById(id)?.email || 'Member' }));
});

const visibleWebsites = computed(() =>
  data.websites.filter((w) => {
    if (memberFilter.value && w.createdBy !== memberFilter.value) return false;
    if (platformFilter.value && w.platformType !== platformFilter.value) return false;
    const connected = perf.connectionByWebsite.has(w.id);
    if (connFilter.value === 'connected' && !connected) return false;
    if (connFilter.value === 'not' && connected) return false;
    return true;
  })
);

const activeWebsiteIds = computed(() => {
  const ids = new Set(visibleWebsites.value.map((w) => w.id));
  if (websiteFilter.value) return new Set([websiteFilter.value].filter((id) => ids.has(id)));
  return ids;
});

const filteredDaily = computed(() => perf.daily.filter((r) => activeWebsiteIds.value.has(r.website_id)));

// ── Overview ─────────────────────────────────────────────────────────────
const totals = computed(() => sumTotals(filteredDaily.value));
const connectedCount = computed(() => visibleWebsites.value.filter((w) => perf.connectionByWebsite.has(w.id)).length);
const notConnectedCount = computed(() => visibleWebsites.value.length - connectedCount.value);

// ── Trends ───────────────────────────────────────────────────────────────
const trend = computed(() => aggregateByDate(filteredDaily.value));
const hasTrend = computed(() => trend.value.length > 1);
const shortDate = (d: string) => d.slice(5);
const clicksSeries = computed(() => trend.value.map((p) => ({ label: shortDate(p.date), value: p.clicks })));
const impressionsSeries = computed(() => trend.value.map((p) => ({ label: shortDate(p.date), value: p.impressions })));
const ctrSeries = computed(() => trend.value.map((p) => ({ label: shortDate(p.date), value: Math.round(p.ctr * 1000) / 10 })));
const positionSeries = computed(() => trend.value.map((p) => ({ label: shortDate(p.date), value: Math.round(p.position * 10) / 10 })));

// ── Top tables ───────────────────────────────────────────────────────────
const topWebsites = computed(() => {
  const map = new Map<string, number>();
  for (const r of filteredDaily.value) map.set(r.website_id, (map.get(r.website_id) ?? 0) + r.clicks);
  return [...map.entries()]
    .map(([id, clicks]) => ({ id, name: websiteName(id), clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
});

const latestTerms = (rows: GscTermStat[]): GscTermStat[] => {
  const snap = perf.latestSnapshotDate;
  return rows.filter((r) => r.website_id && activeWebsiteIds.value.has(r.website_id) && (!snap || r.date === snap));
};
const groupTerms = (rows: GscTermStat[], key: 'query' | 'page_url') => {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = r[key];
    if (!k) continue;
    map.set(k, (map.get(k) ?? 0) + r.clicks);
  }
  return [...map.entries()].map(([label, clicks]) => ({ label, clicks })).sort((a, b) => b.clicks - a.clicks).slice(0, 10);
};
const topQueries = computed(() => groupTerms(latestTerms(perf.queries), 'query'));
const topPages = computed(() => groupTerms(latestTerms(perf.pages), 'page_url'));

// ── Growth / drop (first half vs second half of the range) ────────────────
const halfSplitClicks = (rows: GscDaily[]) => {
  const dates = [...new Set(rows.map((r) => r.date))].sort();
  if (dates.length < 2) return null;
  const mid = dates[Math.floor(dates.length / 2)];
  let first = 0, second = 0;
  for (const r of rows) { if (r.date < mid) first += r.clicks; else second += r.clicks; }
  return second - first;
};
const websiteDeltas = computed(() => {
  const byWebsite = new Map<string, GscDaily[]>();
  for (const r of filteredDaily.value) {
    const arr = byWebsite.get(r.website_id) ?? [];
    arr.push(r);
    byWebsite.set(r.website_id, arr);
  }
  const out: { id: string; name: string; delta: number }[] = [];
  for (const [id, rows] of byWebsite) {
    const delta = halfSplitClicks(rows);
    if (delta !== null && delta !== 0) out.push({ id, name: websiteName(id), delta });
  }
  return out;
});
const biggestGrowth = computed(() => websiteDeltas.value.filter((d) => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 5));
const biggestDrop = computed(() => websiteDeltas.value.filter((d) => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 5));

const needsAttention = computed(() => {
  const out: { id: string; name: string; reason: string }[] = [];
  for (const w of visibleWebsites.value) {
    const c = perf.connectionByWebsite.get(w.id);
    if (!c) out.push({ id: w.id, name: w.name || w.domain, reason: 'Not connected' });
    else if (c.sync_status === 'error') out.push({ id: w.id, name: w.name || w.domain, reason: 'Sync failed' });
  }
  return out.slice(0, 10);
});

// ── Detail modal ─────────────────────────────────────────────────────────
const detailId = ref<string | null>(null);
const detailWebsite = computed(() => (detailId.value ? data.websites.find((w) => w.id === detailId.value) : null));
const detailDaily = computed(() => perf.daily.filter((r) => r.website_id === detailId.value));
const detailTotals = computed(() => sumTotals(detailDaily.value));
const detailSeries = computed(() => aggregateByDate(detailDaily.value).map((p) => ({ label: shortDate(p.date), value: p.clicks })));
const detailQueries = computed(() => groupTerms(latestTerms(perf.queries).filter((r) => r.website_id === detailId.value), 'query'));
const detailPages = computed(() => groupTerms(latestTerms(perf.pages).filter((r) => r.website_id === detailId.value), 'page_url'));
const openDetail = (id: string) => { detailId.value = id; };

// ── Connections management ───────────────────────────────────────────────
const propInputs = reactive<Record<string, string>>({});
watch(
  () => perf.connections,
  (conns) => { for (const c of conns) propInputs[c.website_id] = c.gsc_property_url; },
  { deep: true, immediate: true }
);
const onSaveConnection = async (websiteId: string) => {
  await perf.saveConnection(websiteId, propInputs[websiteId] ?? '');
};
const onRemoveConnection = async (websiteId: string) => {
  if (!confirm('Remove this Search Console connection? Stored stats are kept.')) return;
  await perf.removeConnection(websiteId);
};

// ── Connect / sync ───────────────────────────────────────────────────────
const connectMsg = ref('');
const connectOk = ref(false);
const onConnect = async () => {
  const url = await perf.connectGoogle();
  if (url) window.location.href = url;
  else { connectMsg.value = perf.error || 'Could not start Google connection. Check the edge function setup.'; connectOk.value = false; }
};
const onSyncAll = async () => {
  const ok = await perf.syncAll();
  connectMsg.value = ok ? 'Sync complete.' : (perf.lastSyncMessage || 'Could not sync Search Console data. Check connection.');
  connectOk.value = ok;
};
const changeRange = (d: 7 | 28 | 90) => { void perf.setRange(d); };

// ── Formatters ───────────────────────────────────────────────────────────
const fmtNum = (n: number) => (n >= 1000 ? n.toLocaleString() : String(n));
const fmtPct = (ctr: number) => `${(ctr * 100).toFixed(1)}%`;
const fmtPos = (p: number) => (p ? p.toFixed(1) : '—');
const fmtDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : 'Never');
const shortUrl = (u: string) => { try { const url = new URL(u); return url.pathname === '/' ? url.hostname : url.pathname; } catch { return u; } };
const noDataMsg = 'No Search Console data found for this date range.';

onMounted(() => {
  void data.fetchWebsites();
  void data.fetchMembers();
  void perf.fetchAll(28);

  const gsc = route.query.gsc;
  if (gsc === 'connected') { connectMsg.value = 'Google Search Console connected. You can now sync websites.'; connectOk.value = true; }
  else if (gsc === 'error_norefresh') { connectMsg.value = 'Connected, but Google did not return a refresh token. Remove KiuQ access in your Google account, then reconnect.'; connectOk.value = false; }
  else if (typeof gsc === 'string' && gsc.startsWith('error')) { connectMsg.value = 'Could not connect Google Search Console. Please try again.'; connectOk.value = false; }
  else if (gsc === 'not_configured') { connectMsg.value = 'Google API is not configured yet. Set the edge function secrets first.'; connectOk.value = false; }
});
</script>

<style scoped>
.seg { display: inline-flex; border: 1px solid var(--border); border-radius: 0.6rem; overflow: hidden; }
.seg button { border: 0; background: transparent; color: var(--text-muted); font-size: 0.78rem; font-weight: 700; padding: 0.4rem 0.7rem; cursor: pointer; }
.seg button + button { border-left: 1px solid var(--border); }
.seg button.active { background: var(--primary, #15D6C2); color: #04201d; }

.perf-filter { height: 2.25rem; font-size: 0.8rem; max-width: 12rem; }

.perf-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.perf-table td { padding: 0.4rem 0.3rem; border-bottom: 1px solid var(--border); }
.perf-table--lined th { text-align: left; font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); padding: 0.4rem 0.3rem; border-bottom: 1px solid var(--border); white-space: nowrap; }
.perf-table td:last-child { text-align: right; }

.perf-status { display: inline-block; font-size: 0.66rem; font-weight: 700; padding: 0.05rem 0.45rem; border-radius: 9999px; text-transform: capitalize; background: var(--soft-bg); color: var(--text-muted); }
.perf-status--ok { background: rgba(34,197,94,0.15); color: #15803d; }
.perf-status--error { background: rgba(239,68,68,0.15); color: #b91c1c; }
.perf-status--syncing { background: rgba(21,214,194,0.15); color: var(--primary, #15D6C2); }

.perf-kv { border: 1px solid var(--border); border-radius: 0.6rem; padding: 0.6rem 0.7rem; }
.perf-kv-l { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); }
.perf-kv-v { font-size: 1.05rem; font-weight: 800; color: var(--text-main); margin-top: 0.1rem; }
</style>
