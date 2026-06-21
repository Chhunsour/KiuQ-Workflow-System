import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

export interface GscConnection {
  id: string;
  website_id: string;
  gsc_property_url: string;
  verification_status: string;
  connected_by: string | null;
  connected_at: string;
  last_synced_at: string | null;
  sync_status: SyncStatus;
  sync_error: string | null;
}

export interface GscDaily {
  website_id: string;
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscHourly {
  website_id: string;
  date: string;
  hour: number;
  datetime: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  synced_at: string;
}


export interface GscTermStat {
  website_id: string;
  date: string;
  query: string | null;
  page_url: string | null;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscTotals {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscConnectionInfo {
  connected: boolean;
  google_email: string | null;
  connected_at: string | null;
}

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Sum clicks/impressions and compute blended CTR + impression-weighted avg position. */
export const sumTotals = (rows: { clicks: number; impressions: number; position: number }[]): GscTotals => {
  let clicks = 0;
  let impressions = 0;
  let weightedPos = 0;
  for (const r of rows) {
    clicks += r.clicks;
    impressions += r.impressions;
    weightedPos += r.position * r.impressions;
  }
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : 0,
    position: impressions ? weightedPos / impressions : 0
  };
};

/** Aggregate daily rows into one point per date (summed across websites). */
export const aggregateByDate = (rows: GscDaily[]): { date: string; clicks: number; impressions: number; ctr: number; position: number }[] => {
  const map = new Map<string, { clicks: number; impressions: number; weightedPos: number; impr: number }>();
  for (const r of rows) {
    const cur = map.get(r.date) ?? { clicks: 0, impressions: 0, weightedPos: 0, impr: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.weightedPos += r.position * r.impressions;
    cur.impr += r.impressions;
    map.set(r.date, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, v]) => ({
      date,
      clicks: v.clicks,
      impressions: v.impressions,
      ctr: v.impressions ? v.clicks / v.impressions : 0,
      position: v.impr ? v.weightedPos / v.impr : 0
    }));
};

/** Aggregate hourly rows into one point per hour/datetime (summed across websites). */
export const aggregateByHour = (rows: GscHourly[]): { datetime: string; date: string; hour: number; clicks: number; impressions: number; ctr: number; position: number }[] => {
  const map = new Map<string, { date: string; hour: number; clicks: number; impressions: number; weightedPos: number; impr: number }>();
  for (const r of rows) {
    const cur = map.get(r.datetime) ?? { date: r.date, hour: r.hour, clicks: 0, impressions: 0, weightedPos: 0, impr: 0 };
    cur.clicks += r.clicks;
    cur.impressions += r.impressions;
    cur.weightedPos += r.position * r.impressions;
    cur.impr += r.impressions;
    map.set(r.datetime, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([datetime, v]) => ({
      datetime,
      date: v.date,
      hour: v.hour,
      clicks: v.clicks,
      impressions: v.impressions,
      ctr: v.impressions ? v.clicks / v.impressions : 0,
      position: v.impr ? v.weightedPos / v.impr : 0
    }));
};


export const usePerformanceStore = defineStore('performance', () => {
  const auth = useAuthStore();

  const connections = ref<GscConnection[]>([]);
  const daily = ref<GscDaily[]>([]);
  const hourly = ref<GscHourly[]>([]);
  const queries = ref<GscTermStat[]>([]);
  const pages = ref<GscTermStat[]>([]);
  const connectionInfo = ref<GscConnectionInfo>({ connected: false, google_email: null, connected_at: null });

  const rangeDays = ref<'24h' | 7 | 28 | 90>(28);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const syncingIds = ref<Set<string>>(new Set());
  const syncAllRunning = ref(false);
  const lastSyncMessage = ref<string | null>(null);

  // ── Comparison (last month / previous period) ───────────────────────────────
  const compareMode = ref<'none' | 'previous' | 'last_month'>('none');
  const compareDaily = ref<GscDaily[]>([]);
  const comparePeriodLabel = computed(() =>
    compareMode.value === 'last_month' ? 'last month'
    : compareMode.value === 'previous' ? 'previous period'
    : ''
  );


  const connectionByWebsite = computed(() => {
    const m = new Map<string, GscConnection>();
    for (const c of connections.value) m.set(c.website_id, c);
    return m;
  });

  const startDateStr = computed(() => {
    const d = new Date();
    const days = rangeDays.value === '24h' ? 3 : rangeDays.value;
    d.setUTCDate(d.getUTCDate() - days);
    return ymd(d);
  });

  /** The most recent snapshot date present in the query/page tables. */
  const latestSnapshotDate = computed(() => {
    let max = '';
    for (const r of queries.value) if (r.date > max) max = r.date;
    for (const r of pages.value) if (r.date > max) max = r.date;
    return max;
  });

  const latestHourlyDatetime = computed(() => {
    if (hourly.value.length === 0) return null;
    let max = '';
    for (const r of hourly.value) {
      if (r.datetime > max) max = r.datetime;
    }
    return max;
  });

  const latest24hHourly = computed(() => {
    const maxDt = latestHourlyDatetime.value;
    if (!maxDt) return [];
    const maxTime = new Date(maxDt).getTime();
    const minTime = maxTime - 23 * 60 * 60 * 1000;
    return hourly.value.filter((r) => {
      const t = new Date(r.datetime).getTime();
      return t >= minTime && t <= maxTime;
    });
  });


  // ── Fetchers ───────────────────────────────────────────────────────────────
  const fetchConnectionInfo = async () => {
    if (!supabaseConfigured) return;
    const { data } = await supabase.rpc('gsc_connection_info');
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      connectionInfo.value = {
        connected: !!row.connected,
        google_email: row.google_email ?? null,
        connected_at: row.connected_at ?? null
      };
    }
  };

  const fetchConnections = async () => {
    if (!supabaseConfigured) return;
    const { data, error: err } = await supabase.from('website_gsc_connections').select('*');
    if (err) { error.value = err.message; return; }
    connections.value = (data as GscConnection[]) ?? [];
  };

  /** Fetch ALL daily rows in a date range, paginating past the API row cap so a
   *  long range (e.g. 90 days) across many websites is never silently truncated. */
  const fetchDailyRange = async (sinceStr: string, untilStr?: string): Promise<GscDaily[]> => {
    const out: GscDaily[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      let query = supabase
        .from('website_gsc_daily_stats')
        .select('website_id, date, clicks, impressions, ctr, position')
        .gte('date', sinceStr);
      if (untilStr) query = query.lte('date', untilStr);
      const { data, error: err } = await query.order('date', { ascending: true }).range(from, from + pageSize - 1);
      if (err) { error.value = err.message; break; }
      const rows = (data as GscDaily[]) ?? [];
      out.push(...rows);
      if (rows.length < pageSize) break;
    }
    return out;
  };

  const fetchStats = async () => {
    if (!supabaseConfigured) return;
    const since = startDateStr.value;
    const queriesPromise = supabase.from('website_gsc_query_stats').select('website_id, date, query, clicks, impressions, ctr, position').gte('date', since).order('date', { ascending: false }).limit(5000);
    const pagesPromise = supabase.from('website_gsc_page_stats').select('website_id, date, page_url, clicks, impressions, ctr, position').gte('date', since).order('date', { ascending: false }).limit(5000);
    
    if (rangeDays.value === '24h') {
      const hDaysAgo = new Date();
      hDaysAgo.setUTCDate(hDaysAgo.getUTCDate() - 4);
      const [{ data: h, error: he }, { data: q }, { data: p }] = await Promise.all([
        supabase.from('website_gsc_hourly_stats').select('website_id, date, hour, datetime, clicks, impressions, ctr, position, synced_at').gte('datetime', hDaysAgo.toISOString()).order('datetime', { ascending: true }),
        queriesPromise,
        pagesPromise
      ]);
      if (he) { error.value = he.message; }
      hourly.value = (h as GscHourly[]) ?? [];

      daily.value = await fetchDailyRange(since);
      queries.value = ((q as GscTermStat[]) ?? []);
      pages.value = ((p as GscTermStat[]) ?? []);
    } else {
      const [{ data: q }, { data: p }] = await Promise.all([queriesPromise, pagesPromise]);
      daily.value = await fetchDailyRange(since);
      queries.value = ((q as GscTermStat[]) ?? []);
      pages.value = ((p as GscTermStat[]) ?? []);
    }
  };

  const fetchAll = async (days?: '24h' | 7 | 28 | 90) => {
    if (days) rangeDays.value = days;
    loading.value = true;
    error.value = null;
    try {
      await Promise.all([fetchConnectionInfo(), fetchConnections(), fetchStats()]);
    } finally {
      loading.value = false;
    }
  };

  const setRange = async (days: '24h' | 7 | 28 | 90) => {
    rangeDays.value = days;
    await Promise.all([fetchStats(), fetchCompare()]);
  };

  /** Fetch the comparison window's daily rows (real stored data). No-op in 24h mode. */
  const fetchCompare = async () => {
    if (!supabaseConfigured || compareMode.value === 'none' || rangeDays.value === '24h') {
      compareDaily.value = [];
      return;
    }
    const n = rangeDays.value as number; // 7 | 28 | 90
    const now = new Date();
    let prevStart: Date;
    let prevEnd: Date;
    if (compareMode.value === 'previous') {
      // The n days immediately before the current window.
      prevStart = new Date(now); prevStart.setUTCDate(prevStart.getUTCDate() - 2 * n);
      prevEnd = new Date(now); prevEnd.setUTCDate(prevEnd.getUTCDate() - n - 1);
    } else {
      // Same-length window shifted back one calendar month.
      prevStart = new Date(now); prevStart.setUTCDate(prevStart.getUTCDate() - n); prevStart.setUTCMonth(prevStart.getUTCMonth() - 1);
      prevEnd = new Date(now); prevEnd.setUTCMonth(prevEnd.getUTCMonth() - 1);
    }
    compareDaily.value = await fetchDailyRange(ymd(prevStart), ymd(prevEnd));
  };

  const setCompareMode = async (mode: 'none' | 'previous' | 'last_month') => {
    compareMode.value = mode;
    await fetchCompare();
  };


  // ── Connect (admin) ─────────────────────────────────────────────────────────
  const connectGoogle = async (): Promise<string | null> => {
    const { data, error: err } = await supabase.functions.invoke('gsc-oauth-start', { body: {} });
    if (err) { error.value = err.message; return null; }
    const url = (data as { url?: string; message?: string })?.url;
    if (!url) { error.value = (data as { message?: string })?.message ?? 'Could not start Google connection.'; return null; }
    return url;
  };

  const saveConnection = async (websiteId: string, propertyUrl: string): Promise<boolean> => {
    if (!auth.isAdmin) return false;
    const url = propertyUrl.trim();
    if (!url) return false;
    const { error: err } = await supabase
      .from('website_gsc_connections')
      .upsert(
        { website_id: websiteId, gsc_property_url: url, connected_by: auth.user?.id ?? null },
        { onConflict: 'website_id' }
      );
    if (err) { error.value = err.message; return false; }
    await fetchConnections();
    return true;
  };

  const removeConnection = async (websiteId: string): Promise<boolean> => {
    if (!auth.isAdmin) return false;
    const { error: err } = await supabase.from('website_gsc_connections').delete().eq('website_id', websiteId);
    if (err) { error.value = err.message; return false; }
    connections.value = connections.value.filter((c) => c.website_id !== websiteId);
    return true;
  };

  // ── Sync ─────────────────────────────────────────────────────────────────────
  const runSync = async (body: { website_id?: string; all?: boolean; days: '24h' | 7 | 28 | 90 }): Promise<boolean> => {
    // Pre-sync validation for unmapped properties
    if (body.all) {
      if (connections.value.length === 0) {
        lastSyncMessage.value = 'No Search Console property is mapped to this website.';
        return false;
      }
    } else if (body.website_id) {
      if (!connectionByWebsite.value.has(body.website_id)) {
        lastSyncMessage.value = 'No Search Console property is mapped to this website.';
        return false;
      }
    }

    const { data, error: err } = await supabase.functions.invoke('gsc-sync', { body });
    if (err) { lastSyncMessage.value = 'Could not reach the sync service. Please try again.'; return false; }
    const res = data as { error?: string; message?: string; ok?: boolean; results?: { ok: boolean; rows?: number }[] };
    if (res?.error) {
      lastSyncMessage.value =
        res.error === 'not_connected' ? 'Search Console is not connected yet — click Connect first.'
        : res.error === 'auth_failed' ? 'Google sign-in expired. Please reconnect Search Console.'
        : res.error === 'not_mapped' ? 'No Search Console property is mapped to this website.'
        : res.error === 'not_configured' ? 'Google API is not configured (missing secrets).'
        : 'Could not sync Search Console data. Check connection.';
      return false;
    }
    // Summarize per-website outcomes for an accurate message.
    const results = res?.results ?? [];
    const okCount = results.filter((r) => r.ok).length;
    const errCount = results.length - okCount;
    const totalRows = results.reduce((s, r) => s + (r.rows ?? 0), 0);
    if (results.length === 0) lastSyncMessage.value = 'No website is mapped to a Search Console property yet.';
    else if (okCount === 0) lastSyncMessage.value = 'Sync failed for all sites — check the Status column for the reason.';
    else if (errCount > 0) lastSyncMessage.value = `Synced ${okCount} site(s); ${errCount} had errors (see Status column).`;
    else lastSyncMessage.value = `Sync complete — ${totalRows} rows updated.`;
    return okCount > 0 || results.length === 0;
  };

  const syncWebsite = async (websiteId: string, days: '24h' | 7 | 28 | 90 = rangeDays.value): Promise<boolean> => {
    syncingIds.value = new Set(syncingIds.value).add(websiteId);
    try {
      const ok = await runSync({ website_id: websiteId, days });
      await Promise.all([fetchConnections(), fetchStats()]);
      return ok;
    } finally {
      const next = new Set(syncingIds.value);
      next.delete(websiteId);
      syncingIds.value = next;
    }
  };

  const syncAll = async (days: '24h' | 7 | 28 | 90 = rangeDays.value): Promise<boolean> => {
    syncAllRunning.value = true;
    try {
      const ok = await runSync({ all: true, days });
      await Promise.all([fetchConnections(), fetchStats()]);
      return ok;
    } finally {
      syncAllRunning.value = false;
    }
  };


  return {
    // state
    connections,
    daily,
    hourly,
    queries,
    pages,
    connectionInfo,
    rangeDays,
    loading,
    error,
    syncingIds,
    syncAllRunning,
    lastSyncMessage,
    compareMode,
    compareDaily,
    // derived
    connectionByWebsite,
    latestSnapshotDate,
    latestHourlyDatetime,
    latest24hHourly,
    comparePeriodLabel,
    // actions
    fetchAll,
    fetchStats,
    fetchConnections,
    fetchConnectionInfo,
    setRange,
    fetchCompare,
    setCompareMode,
    connectGoogle,
    saveConnection,
    removeConnection,
    syncWebsite,
    syncAll
  };

});
