import { ref } from 'vue';
import { defineStore } from 'pinia';
import { supabase, supabaseConfigured } from '@/lib/supabase';

export interface IndexingUrl {
  id: string;
  website_id: string;
  url: string;
  source: string;
  page_type: string;
  title: string | null;
  last_seen_at: string;
}

export interface IndexingStatus {
  id: string;
  website_id: string;
  url_id: string | null;
  url: string;
  inspection_status: 'indexed' | 'not_indexed' | 'warning';
  verdict: string | null;
  coverage_state: string | null;
  indexing_state: string | null;
  robots_txt_state: string | null;
  page_fetch_state: string | null;
  google_canonical: string | null;
  user_canonical: string | null;
  last_crawl_time: string | null;
  crawled_as: string | null;
  raw_response: unknown;
  inspected_at: string;
}

export interface IndexingSummary {
  websiteId: string;
  known: number;
  indexed: number;
  notIndexed: number;
  warning: number;
  checked: number;
  lastChecked: string | null;
}

export const useIndexingStore = defineStore('indexing', () => {
  const summaries = ref<Map<string, IndexingSummary>>(new Map());
  const urls = ref<IndexingUrl[]>([]);          // for the currently-open website
  const statuses = ref<IndexingStatus[]>([]);   // for the currently-open website
  const loading = ref(false);
  const detailLoading = ref(false);
  const error = ref<string | null>(null);
  const message = ref<string | null>(null);
  const busyIds = ref<Set<string>>(new Set());  // websites currently discovering/checking

  const blankSummary = (id: string): IndexingSummary =>
    ({ websiteId: id, known: 0, indexed: 0, notIndexed: 0, warning: 0, checked: 0, lastChecked: null });

  const summaryFor = (id: string): IndexingSummary => summaries.value.get(id) ?? blankSummary(id);
  const health = (s: IndexingSummary): number => (s.known ? Math.round((s.indexed / s.known) * 1000) / 10 : 0);

  const setBusy = (id: string, on: boolean) => {
    const next = new Set(busyIds.value);
    if (on) next.add(id); else next.delete(id);
    busyIds.value = next;
  };

  /** Per-website counts across all readable websites (RLS-scoped). */
  const fetchSummaries = async () => {
    if (!supabaseConfigured) return;
    loading.value = true;
    error.value = null;
    try {
      const { data, error: err } = await supabase.rpc('get_page_indexing_summary');
      if (err) {
        error.value = err.message;
        return;
      }
      const map = new Map<string, IndexingSummary>();
      for (const row of (data as any[]) ?? []) {
        map.set(row.website_id, {
          websiteId: row.website_id,
          known: Number(row.known_pages ?? 0),
          indexed: Number(row.indexed_pages ?? 0),
          notIndexed: Number(row.not_indexed_pages ?? 0),
          warning: Number(row.warning_pages ?? 0),
          checked: Number(row.indexed_pages ?? 0) + Number(row.not_indexed_pages ?? 0) + Number(row.warning_pages ?? 0),
          lastChecked: row.last_checked
        });
      }
      summaries.value = map;
    } catch (e: any) {
      error.value = e.message || String(e);
    } finally {
      loading.value = false;
    }
  };

  /** URLs + statuses for one website (for the detail drawer). */
  const fetchWebsiteUrls = async (websiteId: string) => {
    if (!supabaseConfigured) return;
    urls.value = [];
    statuses.value = [];
    detailLoading.value = true;
    try {
      const allUrls: IndexingUrl[] = [];
      let pageU = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error: err } = await supabase
          .from('website_indexing_urls')
          .select('*')
          .eq('website_id', websiteId)
          .order('url')
          .range(pageU * pageSize, (pageU + 1) * pageSize - 1);
        if (err || !data || data.length === 0) break;
        allUrls.push(...(data as IndexingUrl[]));
        if (data.length < pageSize) break;
        pageU++;
      }

      const allStatuses: IndexingStatus[] = [];
      let pageS = 0;
      while (true) {
        const { data, error: err } = await supabase
          .from('website_indexing_status')
          .select('*')
          .eq('website_id', websiteId)
          .range(pageS * pageSize, (pageS + 1) * pageSize - 1);
        if (err || !data || data.length === 0) break;
        allStatuses.push(...(data as IndexingStatus[]));
        if (data.length < pageSize) break;
        pageS++;
      }

      urls.value = allUrls;
      statuses.value = allStatuses;
    } finally {
      detailLoading.value = false;
    }
  };

  const discoverUrls = async (websiteId: string): Promise<boolean> => {
    setBusy(websiteId, true);
    message.value = null;
    try {
      const { data, error: err } = await supabase.functions.invoke('gsc-discover-urls', { body: { website_id: websiteId } });
      if (err) { message.value = 'Could not reach the discovery service.'; return false; }
      const res = data as { success?: boolean; discovered_urls_count?: number; inserted_count?: number; error?: string; message?: string };
      if (res?.success === false || res?.error) {
        message.value = res.message ?? 'Could not read sitemap. You can add URLs manually.';
        return false;
      }
      message.value = `Found ${res.discovered_urls_count ?? 0} URLs · imported ${res.inserted_count ?? 0} new.`;
      await Promise.all([fetchSummaries(), fetchWebsiteUrls(websiteId)]);
      return true;
    } finally {
      setBusy(websiteId, false);
    }
  };

  const checkIndexing = async (
    websiteId: string,
    mode: 'new' | 'not_indexed' | 'all' | 'selected' = 'new',
    urlIds?: string[],
    limit?: number
  ): Promise<boolean> => {
    setBusy(websiteId, true);
    message.value = null;
    try {
      const { data, error: err } = await supabase.functions.invoke('gsc-inspect-urls', {
        body: { website_id: websiteId, mode, url_ids: urlIds, limit }
      });
      if (err) { message.value = 'Could not reach the inspection service.'; return false; }
      const res = data as {
        success?: boolean;
        inspected_count?: number;
        indexed_count?: number;
        not_indexed_count?: number;
        warning_count?: number;
        failed_count?: number;
        stopped_early?: boolean;
        error?: string;
        message?: string;
      };
      if (res?.success === false || res?.error) {
        message.value =
          res.error === 'not_connected' ? 'Connect Search Console first.'
          : res.error === 'auth_failed' ? 'Google sign-in expired. Please reconnect.'
          : res.error === 'not_mapped' ? 'No Search Console property is mapped to this website.'
          : res.message ?? 'Could not check indexing. Please try again.';
        return false;
      }
      const inspected = res.inspected_count ?? 0;
      if (inspected === 0) {
        message.value = 'No URLs needed checking.';
      } else {
        message.value = `Checked ${inspected} URL(s): ${res.indexed_count ?? 0} indexed, ${res.not_indexed_count ?? 0} not indexed${res.stopped_early ? ' (stopped early — rate limit, resume later)' : ''}.`;
      }
      await Promise.all([fetchSummaries(), fetchWebsiteUrls(websiteId)]);
      return true;
    } finally {
      setBusy(websiteId, false);
    }
  };

  const inspectOne = (websiteId: string, urlId: string) => checkIndexing(websiteId, 'selected', [urlId], 1);

  const addManualUrls = async (websiteId: string, urlsList: string[]): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    detailLoading.value = true;
    error.value = null;
    message.value = null;
    try {
      const determinePageType = (url: string): 'page' | 'blog' | 'product' | 'category' | 'other' => {
        const u = url.toLowerCase();
        if (u.includes('/product-category') || u.includes('/category')) return 'category';
        if (u.includes('/product')) return 'product';
        if (u.includes('/blog') || u.includes('/post') || u.includes('/news') || u.includes('/article')) return 'blog';
        return 'page';
      };

      const rows = urlsList
        .map(u => u.trim())
        .filter(u => u.length > 0)
        .map(u => ({
          website_id: websiteId,
          url: u,
          source: 'manual',
          page_type: determinePageType(u),
          last_seen_at: new Date().toISOString()
        }));

      if (rows.length === 0) return false;

      const { error: err } = await supabase
        .from('website_indexing_urls')
        .upsert(rows, { onConflict: 'website_id,url' });

      if (err) {
        error.value = err.message;
        return false;
      }

      message.value = `Successfully added ${rows.length} URL(s) manually.`;
      await Promise.all([fetchSummaries(), fetchWebsiteUrls(websiteId)]);
      return true;
    } catch (e: any) {
      error.value = e.message || String(e);
      return false;
    } finally {
      detailLoading.value = false;
    }
  };

  return {
    summaries, urls, statuses, loading, detailLoading, error, message, busyIds,
    summaryFor, health,
    fetchSummaries, fetchWebsiteUrls, discoverUrls, checkIndexing, inspectOne, addManualUrls
  };
});
