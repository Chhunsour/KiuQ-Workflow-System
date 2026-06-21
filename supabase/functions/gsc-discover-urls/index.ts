// Supabase Edge Function: gsc-discover-urls
// Discovers a website's page URLs from its sitemap(s) and stores them in
// website_indexing_urls. Owner/Admin/Head/Supervisor only.
//
// Body: { website_id: string }
// Secrets: (none beyond auto-injected SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const nowIso = () => new Date().toISOString();

const SITEMAP_CANDIDATES = ['/sitemap.xml', '/sitemap_index.xml', '/wp-sitemap.xml', '/page-sitemap.xml', '/post-sitemap.xml', '/product-sitemap.xml'];
const MAX_URLS = 3000;
const MAX_CHILD_SITEMAPS = 50;

const baseFromProperty = (property: string, fallbackDomain: string): string => {
  const p = (property || '').trim();
  if (/^sc-domain:/i.test(p)) return `https://${p.slice(p.indexOf(':') + 1).replace(/^\/+|\/+$/g, '')}`;
  if (/^https?:\/\//i.test(p)) return p.replace(/\/+$/, '');
  const d = (fallbackDomain || '').replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return d ? `https://${d}` : '';
};

const fetchText = async (url: string): Promise<string | null> => {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KiuQ-Indexing/1.0' } });
    if (!res.ok) return null;
    const text = await res.text();
    return text.includes('<') ? text : null;
  } catch {
    return null;
  }
};
const parseLocs = (xml: string): string[] => {
  const out: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) out.push(m[1].trim());
  return out;
};
const isSitemapIndex = (xml: string) => /<sitemapindex/i.test(xml);

const pageType = (url: string): string => {
  const u = url.toLowerCase();
  if (u.includes('/product-category') || u.includes('/category')) return 'category';
  if (u.includes('/product')) return 'product';
  if (u.includes('/blog') || u.includes('/post') || u.includes('/news') || u.includes('/article')) return 'blog';
  return 'page';
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);
  const { data: prof } = await admin.from('profiles').select('role, status').eq('id', user.id).single();
  if (!['admin', 'owner', 'head', 'supervisor'].includes(String(prof?.role ?? '').toLowerCase()) || prof?.status !== 'active') {
    return json({ error: 'forbidden' }, 403);
  }

  let body: { website_id?: string } = {};
  try { body = await req.json(); } catch { /* default */ }
  const websiteId = body.website_id;
  if (!websiteId) return json({ error: 'missing_website_id' }, 200);

  const { data: web } = await admin.from('websites').select('id, domain').eq('id', websiteId).single();
  const { data: conn } = await admin.from('website_gsc_connections').select('gsc_property_url').eq('website_id', websiteId).maybeSingle();
  const base = baseFromProperty(conn?.gsc_property_url ?? '', web?.domain ?? '');
  if (!base) return json({ error: 'no_base_url', message: 'Could not determine the website URL.' }, 200);

  const { data: log } = await admin.from('website_indexing_sync_logs')
    .insert({ website_id: websiteId, sync_type: 'discover_urls', status: 'running', created_by: user.id })
    .select('id').single();

  try {
    const found = new Set<string>();
    const childSitemaps = new Set<string>();
    let host = '';
    try { host = new URL(base).host; } catch { /* ignore */ }

    for (const path of SITEMAP_CANDIDATES) {
      const xml = await fetchText(base + path);
      if (!xml) continue;
      const locs = parseLocs(xml);
      if (isSitemapIndex(xml)) for (const l of locs) childSitemaps.add(l);
      else for (const l of locs) found.add(l);
    }

    let count = 0;
    for (const sm of childSitemaps) {
      if (count++ >= MAX_CHILD_SITEMAPS || found.size >= MAX_URLS) break;
      const xml = await fetchText(sm);
      if (!xml) continue;
      for (const l of parseLocs(xml)) found.add(l);
    }

    // Keep only same-host, non-sitemap URLs, capped.
    const urls = [...found]
      .filter((u) => { try { return !host || new URL(u).host === host; } catch { return false; } })
      .filter((u) => !/\.xml($|\?)/i.test(u))
      .slice(0, MAX_URLS);

    if (urls.length === 0) {
      if (log?.id) await admin.from('website_indexing_sync_logs').update({ status: 'failed', total_urls: 0, error_message: 'No URLs found in sitemap.', finished_at: nowIso() }).eq('id', log.id);
      return json({ error: 'no_sitemap', message: 'Could not read sitemap. You can add URLs manually.' }, 200);
    }

    const existingUrls: string[] = [];
    let pageExisting = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await admin.from('website_indexing_urls')
        .select('url')
        .eq('website_id', websiteId)
        .range(pageExisting * pageSize, (pageExisting + 1) * pageSize - 1);
      if (error || !data || data.length === 0) break;
      existingUrls.push(...data.map((r: { url: string }) => r.url));
      if (data.length < pageSize) break;
      pageExisting++;
    }
    const existingSet = new Set(existingUrls);
    const newCount = urls.filter((u) => !existingSet.has(u)).length;

    // Upsert in chunks (updates last_seen_at for known URLs, inserts new ones).
    const rows = urls.map((u) => ({ website_id: websiteId, url: u, source: 'sitemap', page_type: pageType(u), last_seen_at: nowIso() }));
    for (let i = 0; i < rows.length; i += 500) {
      await admin.from('website_indexing_urls').upsert(rows.slice(i, i + 500), { onConflict: 'website_id,url' });
    }

    if (log?.id) await admin.from('website_indexing_sync_logs').update({ status: 'success', total_urls: urls.length, finished_at: nowIso() }).eq('id', log.id);
    console.log(`[gsc-discover-urls] website=${websiteId} found=${urls.length} new=${newCount}`);
    return json({
      success: true,
      website_id: websiteId,
      discovered_urls_count: urls.length,
      inserted_count: newCount,
      skipped_duplicate_count: urls.length - newCount
    }, 200);
  } catch (e) {
    const msg = String(e).slice(0, 400);
    console.error('[gsc-discover-urls] error', msg);
    if (log?.id) await admin.from('website_indexing_sync_logs').update({ status: 'failed', error_message: msg, finished_at: nowIso() }).eq('id', log.id);
    return json({ success: false, website_id: websiteId, error: 'discover_failed', message: 'Could not read sitemap. You can add URLs manually.' }, 200);
  }
});
