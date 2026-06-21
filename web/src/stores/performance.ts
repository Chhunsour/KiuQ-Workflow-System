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

export const usePerformanceStore = defineStore('performance', () => {
  const auth = useAuthStore();

  const connections = ref<GscConnection[]>([]);
  const daily = ref<GscDaily[]>([]);
  const queries = ref<GscTermStat[]>([]);
  const pages = ref<GscTermStat[]>([]);
  const connectionInfo = ref<GscConnectionInfo>({ connected: false, google_email: null, connected_at: null });

  const rangeDays = ref<7 | 28 | 90>(28);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const syncingIds = ref<Set<string>>(new Set());
  const syncAllRunning = ref(false);
  const lastSyncMessage = ref<string | null>(null);

  const connectionByWebsite = computed(() => {
    const m = new Map<string, GscConnection>();
    for (const c of connections.value) m.set(c.website_id, c);
    return m;
  });

  const startDateStr = computed(() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - rangeDays.value);
    return ymd(d);
  });

  /** The most recent snapshot date present in the query/page tables. */
  const latestSnapshotDate = computed(() => {
    let max = '';
    for (const r of queries.value) if (r.date > max) max = r.date;
    for (const r of pages.value) if (r.date > max) max = r.date;
    return max;
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

  const fetchStats = async () => {
    if (!supabaseConfigured) return;
    const since = startDateStr.value;
    const [{ data: d, error: de }, { data: q }, { data: p }] = await Promise.all([
      supabase.from('website_gsc_daily_stats').select('website_id, date, clicks, impressions, ctr, position').gte('date', since),
      supabase.from('website_gsc_query_stats').select('website_id, date, query, clicks, impressions, ctr, position').gte('date', since).order('date', { ascending: false }).limit(5000),
      supabase.from('website_gsc_page_stats').select('website_id, date, page_url, clicks, impressions, ctr, position').gte('date', since).order('date', { ascending: false }).limit(5000)
    ]);
    if (de) { error.value = de.message; }
    daily.value = (d as GscDaily[]) ?? [];
    queries.value = ((q as GscTermStat[]) ?? []);
    pages.value = ((p as GscTermStat[]) ?? []);
  };

  const fetchAll = async (days?: 7 | 28 | 90) => {
    if (days) rangeDays.value = days;
    loading.value = true;
    error.value = null;
    try {
      await Promise.all([fetchConnectionInfo(), fetchConnections(), fetchStats()]);
    } finally {
      loading.value = false;
    }
  };

  const setRange = async (days: 7 | 28 | 90) => {
    rangeDays.value = days;
    await fetchStats();
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
  const runSync = async (body: { website_id?: string; all?: boolean; days: 7 | 28 | 90 }): Promise<boolean> => {
    const { data, error: err } = await supabase.functions.invoke('gsc-sync', { body });
    if (err) { lastSyncMessage.value = err.message; return false; }
    const res = data as { error?: string; message?: string; ok?: boolean };
    if (res?.error) {
      lastSyncMessage.value =
        res.error === 'not_connected' ? 'Connect Google Search Console first.'
        : res.error === 'auth_failed' ? 'Google sign-in expired. Please reconnect.'
        : res.message ?? 'Could not sync Search Console data.';
      return false;
    }
    return true;
  };

  const syncWebsite = async (websiteId: string, days: 7 | 28 | 90 = rangeDays.value): Promise<boolean> => {
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

  const syncAll = async (days: 7 | 28 | 90 = rangeDays.value): Promise<boolean> => {
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
    queries,
    pages,
    connectionInfo,
    rangeDays,
    loading,
    error,
    syncingIds,
    syncAllRunning,
    lastSyncMessage,
    // derived
    connectionByWebsite,
    latestSnapshotDate,
    // actions
    fetchAll,
    fetchStats,
    fetchConnections,
    fetchConnectionInfo,
    setRange,
    connectGoogle,
    saveConnection,
    removeConnection,
    syncWebsite,
    syncAll
  };
});
