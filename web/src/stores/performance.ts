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
  status: string | null;
  last_error: string | null;
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

export type DateRange = 'today' | 'yesterday' | 7 | 28 | 90 | 'last_16_months' | 'this_month' | 'last_month' | 'custom';

export const getRangeDurationDays = (start: string, end: string): number => {
  const s = new Date(start);
  const e = new Date(end);
  const diffTime = Math.abs(e.getTime() - s.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

export const usePerformanceStore = defineStore('performance', () => {
  const auth = useAuthStore();

  const connections = ref<GscConnection[]>([]);
  const daily = ref<GscDaily[]>([]);
  const queries = ref<GscTermStat[]>([]);
  const pages = ref<GscTermStat[]>([]);
  const connectionInfo = ref<GscConnectionInfo>({
    connected: false,
    google_email: null,
    connected_at: null,
    status: null,
    last_error: null
  });

  const rangeDays = ref<DateRange>(28);
  const customStartDate = ref<string>('');
  const customEndDate = ref<string>('');
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
    if (rangeDays.value === 'today') {
      return ymd(d);
    } else if (rangeDays.value === 'yesterday') {
      d.setUTCDate(d.getUTCDate() - 1);
      return ymd(d);
    } else if (rangeDays.value === 7) {
      d.setUTCDate(d.getUTCDate() - 7);
      return ymd(d);
    } else if (rangeDays.value === 28) {
      d.setUTCDate(d.getUTCDate() - 28);
      return ymd(d);
    } else if (rangeDays.value === 90) {
      d.setUTCDate(d.getUTCDate() - 90);
      return ymd(d);
    } else if (rangeDays.value === 'last_16_months') {
      const dCopy = new Date(d.getTime());
      dCopy.setUTCMonth(dCopy.getUTCMonth() - 16);
      return ymd(dCopy);
    } else if (rangeDays.value === 'this_month') {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      return ymd(start);
    } else if (rangeDays.value === 'last_month') {
      const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
      return ymd(start);
    } else if (rangeDays.value === 'custom') {
      return customStartDate.value || ymd(d);
    }
    return ymd(d);
  });

  const endDateStr = computed(() => {
    const d = new Date();
    if (rangeDays.value === 'today') {
      return ymd(d);
    } else if (rangeDays.value === 'yesterday') {
      d.setUTCDate(d.getUTCDate() - 1);
      return ymd(d);
    } else if (rangeDays.value === 'last_16_months' || rangeDays.value === 7 || rangeDays.value === 28 || rangeDays.value === 90 || rangeDays.value === 'this_month') {
      return ymd(d);
    } else if (rangeDays.value === 'last_month') {
      const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 0));
      return ymd(end);
    } else if (rangeDays.value === 'custom') {
      return customEndDate.value || ymd(d);
    }
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
    try {
      const { data: userConn, error: userConnErr } = await supabase
        .from('user_google_connections')
        .select('google_email, connected_at, status, last_error')
        .eq('user_id', auth.user?.id)
        .maybeSingle();

      if (userConnErr) {
        console.error('Error fetching user google connection:', userConnErr);
      }

      if (userConn) {
        connectionInfo.value = {
          connected: userConn.status === 'connected',
          google_email: userConn.google_email ?? null,
          connected_at: userConn.connected_at ?? null,
          status: userConn.status ?? null,
          last_error: userConn.last_error ?? null
        };
        return;
      }
    } catch (e) {
      console.error('Failed to query user_google_connections:', e);
    }

    // Fallback to legacy RPC
    const { data } = await supabase.rpc('gsc_connection_info');
    const row = Array.isArray(data) ? data[0] : data;
    if (row) {
      connectionInfo.value = {
        connected: !!row.connected,
        google_email: row.google_email ?? null,
        connected_at: row.connected_at ?? null,
        status: row.connected ? 'connected' : null,
        last_error: null
      };
    } else {
      connectionInfo.value = {
        connected: false,
        google_email: null,
        connected_at: null,
        status: null,
        last_error: null
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
    const until = endDateStr.value;
    const queriesPromise = supabase.from('website_gsc_query_stats')
      .select('website_id, date, query, clicks, impressions, ctr, position')
      .gte('date', since)
      .lte('date', until)
      .order('date', { ascending: false })
      .limit(5000);
    const pagesPromise = supabase.from('website_gsc_page_stats')
      .select('website_id, date, page_url, clicks, impressions, ctr, position')
      .gte('date', since)
      .lte('date', until)
      .order('date', { ascending: false })
      .limit(5000);
    
    const [{ data: q }, { data: p }] = await Promise.all([queriesPromise, pagesPromise]);
    daily.value = await fetchDailyRange(since, until);
    queries.value = ((q as GscTermStat[]) ?? []);
    pages.value = ((p as GscTermStat[]) ?? []);
  };

  const fetchAll = async (days?: DateRange) => {
    if (days) rangeDays.value = days;
    loading.value = true;
    error.value = null;
    try {
      await Promise.all([fetchConnectionInfo(), fetchConnections(), fetchStats()]);
    } finally {
      loading.value = false;
    }
  };

  const setRange = async (days: DateRange) => {
    rangeDays.value = days;
    await Promise.all([fetchStats(), fetchCompare()]);
  };

  const getCompareDates = () => {
    const start = startDateStr.value;
    const end = endDateStr.value;
    const sDate = new Date(start);
    const eDate = new Date(end);
    const duration = getRangeDurationDays(start, end);

    let compStart: Date;
    let compEnd: Date;

    if (compareMode.value === 'previous') {
      compStart = new Date(sDate.getTime() - duration * 24 * 60 * 60 * 1000);
      compEnd = new Date(eDate.getTime() - duration * 24 * 60 * 60 * 1000);
    } else if (compareMode.value === 'last_month') {
      compStart = new Date(sDate.getTime());
      compStart.setUTCMonth(compStart.getUTCMonth() - 1);
      compEnd = new Date(eDate.getTime());
      compEnd.setUTCMonth(compEnd.getUTCMonth() - 1);
    } else {
      return null;
    }
    return {
      start: ymd(compStart),
      end: ymd(compEnd)
    };
  };

  /** Fetch the comparison window's daily rows (real stored data). */
  const fetchCompare = async () => {
    if (!supabaseConfigured || compareMode.value === 'none') {
      compareDaily.value = [];
      return;
    }
    const cmp = getCompareDates();
    if (!cmp) {
      compareDaily.value = [];
      return;
    }
    compareDaily.value = await fetchDailyRange(cmp.start, cmp.end);
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
    const url = propertyUrl.trim();
    if (!url) return false;

    // 1. Save the mapping first so users aren't blocked by their personal Google
    //    account lacking GSC access (admin often owns the GSC property). Sync will
    //    surface any access issue as a row status afterwards.
    const { error: err } = await supabase
      .from('website_gsc_connections')
      .upsert(
        { website_id: websiteId, gsc_property_url: url, connected_by: auth.user?.id ?? null },
        { onConflict: 'website_id' }
      );
    if (err) { error.value = err.message; return false; }
    await fetchConnections();

    // 2. Best-effort verify — surface a warning if the calling user's Google
    //    account can't see this property, but the mapping is already saved.
    try {
      const { data: verifyData, error: verifyErr } = await supabase.functions.invoke('gsc-verify-property', {
        body: { website_id: websiteId, gsc_property_url: url }
      });
      if (verifyErr) {
        error.value = `Saved, but could not verify access: ${verifyErr.message}`;
      } else if (verifyData && verifyData.error) {
        error.value = `Saved. ${verifyData.message || 'Your Google account does not have access to this property — sync may fail.'}`;
      } else {
        error.value = null;
      }
    } catch (e: any) {
      error.value = `Saved, but verification failed: ${e?.message || 'unknown error'}`;
    }
    return true;
  };

  const removeConnection = async (websiteId: string): Promise<boolean> => {
    const { error: err } = await supabase.from('website_gsc_connections').delete().eq('website_id', websiteId);
    if (err) { error.value = err.message; return false; }
    connections.value = connections.value.filter((c) => c.website_id !== websiteId);
    return true;
  };

  // ── Sync ─────────────────────────────────────────────────────────────────────
  const runSync = async (body: { website_id?: string; all?: boolean; days: 7 | 28 | 90 | 'last_16_months' }): Promise<boolean> => {
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

  const syncWebsite = async (websiteId: string, range: DateRange = rangeDays.value): Promise<boolean> => {
    const daysParam = typeof range === 'number' || range === 'last_16_months' ? range : 28;
    syncingIds.value = new Set(syncingIds.value).add(websiteId);
    try {
      const ok = await runSync({ website_id: websiteId, days: daysParam as 7 | 28 | 90 | 'last_16_months' });
      await Promise.all([fetchConnections(), fetchStats()]);
      return ok;
    } finally {
      const next = new Set(syncingIds.value);
      next.delete(websiteId);
      syncingIds.value = next;
    }
  };

  const syncAll = async (range: DateRange = rangeDays.value): Promise<boolean> => {
    const daysParam = typeof range === 'number' || range === 'last_16_months' ? range : 28;
    syncAllRunning.value = true;
    try {
      const ok = await runSync({ all: true, days: daysParam as 7 | 28 | 90 | 'last_16_months' });
      await Promise.all([fetchConnections(), fetchStats()]);
      return ok;
    } finally {
      syncAllRunning.value = false;
    }
  };
  const teamConnections = ref<any[]>([]);

  const fetchTeamConnections = async () => {
    if (!supabaseConfigured) return;
    const { data, error: err } = await supabase
      .from('user_google_connections')
      .select('user_id, google_email, connected_at, status, last_error');
    if (err) {
      console.error('Error fetching team connections:', err.message);
      return;
    }
    teamConnections.value = data || [];
  };

  const disconnectGoogle = async (): Promise<boolean> => {
    if (!supabaseConfigured || !auth.user?.id) return false;
    const { error: err } = await supabase
      .from('user_google_connections')
      .delete()
      .eq('user_id', auth.user.id);
    if (err) {
      error.value = err.message;
      return false;
    }
    await fetchConnectionInfo();
    return true;
  };

  return {
    connections,
    daily,
    queries,
    pages,
    connectionInfo,
    rangeDays,
    startDateStr,
    endDateStr,
    customStartDate,
    customEndDate,
    loading,
    error,
    syncingIds,
    syncAllRunning,
    lastSyncMessage,
    compareMode,
    compareDaily,
    connectionByWebsite,
    latestSnapshotDate,
    comparePeriodLabel,
    teamConnections,
    // actions
    fetchAll,
    fetchStats,
    fetchConnections,
    fetchConnectionInfo,
    fetchTeamConnections,
    disconnectGoogle,
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
