import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';

// ── Types (mirror <ts>_product_sync.sql) ─────────────────────────────────

export type SyncType = 'full' | 'price' | 'images' | 'descriptions';
export type SyncState = 'pending' | 'success' | 'failed';
export type WebsiteStatus = 'success' | 'partial' | 'failed' | null;

export interface ConnectedWebsite {
  id: string;
  name: string;
  domain: string;
  sync_endpoint: string;
  secret_token: string;
  platform: string;
  active: boolean;
  last_sync_at: string | null;
  last_status: WebsiteStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export type WebsiteInput = Partial<Omit<ConnectedWebsite, 'id' | 'created_at' | 'updated_at'>>
  & { name: string; domain: string; sync_endpoint: string };

export interface ProductOverride {
  id: string;
  website_id: string;
  product_id: string;
  enabled: boolean;
  title: string | null;
  price: number | null;
  sale_price: number | null;
  short_description: string | null;
  full_description: string | null;
  featured_image: string | null;
  status: string | null;
  button_url: string | null;
}

export interface ProductSyncStateRow {
  id: string;
  website_id: string;
  product_id: string;
  status: SyncState;
  last_synced_at: string | null;
  last_synced_hash: string | null;
  last_error: string | null;
  retry_count: number;
}

export interface SyncLog {
  id: string;
  website_id: string | null;
  product_id: string | null;
  website_name: string | null;
  product_name: string | null;
  product_slug: string | null;
  sync_type: SyncType;
  status: SyncState;
  error: string | null;
  retry_count: number;
  created_at: string;
  finished_at: string | null;
}

/** A product from the master Image Dashboard (public.team_folders). */
export interface SourceProduct {
  id: string;
  name: string;
  sku: string | null;
  product_price: string | null;
  product_category: string | null;
  product_slug: string | null;
  short_description: string | null;
  button_url: string | null;
  updated_at: string;
}

export interface SyncSettings {
  id: number;
  batch_size: number;
  concurrency: number;
  request_timeout_s: number;
  compress_images: boolean;
  updated_at: string;
}

export interface SyncResult {
  ok: boolean;
  success: number;
  failed: number;
  skipped?: number;
  message?: string;
  error?: string;
  results?: Array<{ website: string; product: string; ok: boolean; error?: string | null; images?: string[] }>;
}

export interface TestConnectionResult {
  ok: boolean;
  status: number;
  error?: string;
  response?: { ok?: boolean; version?: string; product_count?: number; writable?: boolean; [k: string]: unknown } | null;
}

export interface SyncArgs {
  action?: 'sync' | 'retry-failed' | 'test-connection';
  productIds?: string[] | 'all';
  websiteIds?: string[] | 'all';
  syncType?: SyncType;
  force?: boolean;
  websiteId?: string;
  productId?: string;
}

// ── Store ─────────────────────────────────────────────────────────────────

export const useProductSyncStore = defineStore('productSync', () => {
  const websites = ref<ConnectedWebsite[]>([]);
  const logs = ref<SyncLog[]>([]);
  const states = ref<ProductSyncStateRow[]>([]);
  const settings = ref<SyncSettings | null>(null);
  const sourceProducts = ref<SourceProduct[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const guard = () => {
    if (!supabaseConfigured) throw new Error('Supabase is not configured.');
  };

  // ── Master products (Image Dashboard = team_folders) ────────────────────
  const fetchSourceProducts = async () => {
    guard();
    const { data, error: err } = await supabase
      .from('team_folders')
      .select('id,name,sku,product_price,product_category,product_slug,short_description,button_url,updated_at')
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });
    if (err) { error.value = err.message; return; }
    sourceProducts.value = (data ?? []) as SourceProduct[];
  };

  // ── Connected websites ──────────────────────────────────────────────────
  const fetchWebsites = async () => {
    guard();
    loading.value = true; error.value = null;
    try {
      const { data, error: err } = await supabase
        .from('connected_websites').select('*').order('created_at', { ascending: true });
      if (err) { error.value = err.message; return; }
      websites.value = (data ?? []) as ConnectedWebsite[];
    } finally { loading.value = false; }
  };

  const createWebsite = async (input: WebsiteInput): Promise<ConnectedWebsite | null> => {
    guard();
    const { data, error: err } = await supabase.from('connected_websites').insert(input).select().single();
    if (err) { error.value = err.message; return null; }
    websites.value = [...websites.value, data as ConnectedWebsite];
    return data as ConnectedWebsite;
  };

  const updateWebsite = async (id: string, patch: Partial<WebsiteInput>): Promise<ConnectedWebsite | null> => {
    guard();
    const { data, error: err } = await supabase.from('connected_websites').update(patch).eq('id', id).select().single();
    if (err) { error.value = err.message; return null; }
    const idx = websites.value.findIndex((w) => w.id === id);
    if (idx !== -1) websites.value[idx] = data as ConnectedWebsite;
    return data as ConnectedWebsite;
  };

  const deleteWebsite = async (id: string): Promise<boolean> => {
    guard();
    const { error: err } = await supabase.from('connected_websites').delete().eq('id', id);
    if (err) { error.value = err.message; return false; }
    websites.value = websites.value.filter((w) => w.id !== id);
    return true;
  };

  // ── Overrides ───────────────────────────────────────────────────────────
  const fetchOverrides = async (websiteId: string): Promise<ProductOverride[]> => {
    guard();
    const { data, error: err } = await supabase
      .from('product_website_overrides').select('*').eq('website_id', websiteId);
    if (err) { error.value = err.message; return []; }
    return (data ?? []) as ProductOverride[];
  };

  const upsertOverride = async (
    o: Partial<ProductOverride> & { website_id: string; product_id: string }
  ): Promise<ProductOverride | null> => {
    guard();
    const { data, error: err } = await supabase
      .from('product_website_overrides').upsert(o, { onConflict: 'website_id,product_id' }).select().single();
    if (err) { error.value = err.message; return null; }
    return data as ProductOverride;
  };

  const deleteOverride = async (id: string): Promise<boolean> => {
    guard();
    const { error: err } = await supabase.from('product_website_overrides').delete().eq('id', id);
    if (err) { error.value = err.message; return false; }
    return true;
  };

  // ── State + logs ────────────────────────────────────────────────────────
  const fetchStates = async () => {
    guard();
    const { data, error: err } = await supabase.from('product_sync_state').select('*');
    if (err) { error.value = err.message; return; }
    states.value = (data ?? []) as ProductSyncStateRow[];
  };

  const fetchLogs = async (limit = 200) => {
    guard();
    const { data, error: err } = await supabase
      .from('product_sync_logs').select('*').order('created_at', { ascending: false }).limit(limit);
    if (err) { error.value = err.message; return; }
    logs.value = (data ?? []) as SyncLog[];
  };

  const clearLogs = async (): Promise<boolean> => {
    guard();
    const { error: err } = await supabase.from('product_sync_logs').delete().not('id', 'is', null);
    if (err) { error.value = err.message; return false; }
    logs.value = [];
    return true;
  };

  // ── Settings ────────────────────────────────────────────────────────────
  const fetchSettings = async () => {
    guard();
    const { data, error: err } = await supabase.from('product_sync_settings').select('*').eq('id', 1).maybeSingle();
    if (err) { error.value = err.message; return; }
    settings.value = (data as SyncSettings) ?? null;
  };

  const updateSettings = async (patch: Partial<Omit<SyncSettings, 'id' | 'updated_at'>>): Promise<boolean> => {
    guard();
    const { data, error: err } = await supabase
      .from('product_sync_settings').update(patch).eq('id', 1).select().single();
    if (err) { error.value = err.message; return false; }
    settings.value = data as SyncSettings;
    return true;
  };

  // ── The orchestrator call (Edge Function) ───────────────────────────────
  const callSync = async (args: SyncArgs): Promise<SyncResult> => {
    guard();
    const { data, error: err } = await supabase.functions.invoke('product-sync', {
      body: { action: 'sync', ...args },
    });
    if (err) {
      // Edge function returns a JSON error body even on non-2xx; surface it.
      const ctx = (err as { context?: { error?: string } })?.context;
      throw new Error(ctx?.error || err.message || 'Sync failed.');
    }
    return data as SyncResult;
  };

  const testConnection = async (websiteId: string): Promise<TestConnectionResult> => {
    guard();
    const { data, error: err } = await supabase.functions.invoke('product-sync', {
      body: { action: 'test-connection', websiteId },
    });
    if (err) throw new Error(err.message || 'Test failed.');
    return data as TestConnectionResult;
  };

  return {
    websites, logs, states, settings, sourceProducts, loading, error,
    fetchSourceProducts,
    fetchWebsites, createWebsite, updateWebsite, deleteWebsite,
    fetchOverrides, upsertOverride, deleteOverride,
    fetchStates, fetchLogs, clearLogs,
    fetchSettings, updateSettings,
    callSync, testConnection,
  };
});

export const OVERRIDE_FIELDS: { key: keyof ProductOverride; label: string; type: 'text' | 'number' | 'area' }[] = [
  { key: 'title', label: 'Product title', type: 'text' },
  { key: 'price', label: 'Price', type: 'number' },
  { key: 'sale_price', label: 'Sale price', type: 'number' },
  { key: 'status', label: 'Status', type: 'text' },
  { key: 'featured_image', label: 'Featured image URL', type: 'text' },
  { key: 'button_url', label: 'Button / product URL', type: 'text' },
  { key: 'short_description', label: 'Short description', type: 'area' },
  { key: 'full_description', label: 'Full description', type: 'area' },
];
