// Supabase Edge Function: gsc-inspect-urls
// Runs the Google Search Console URL Inspection API for a website's URLs and
// stores per-URL indexing status. Owner/Admin/Head/Supervisor only.
//
// Body: { website_id: string, mode?: 'new'|'not_indexed'|'all'|'selected', url_ids?: string[], limit?: number }
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//
// Quota-aware: caps the batch, delays between calls, saves each result
// immediately (partial save), and stops early on rate-limit (429).

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();
const MAX_BATCH = 50; // hard cap per call to protect the daily quota

const normalizeProperty = (raw: string): string => {
  const v = (raw || '').trim();
  if (/^sc-domain:/i.test(v)) return `sc-domain:${v.slice(v.indexOf(':') + 1).replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '')}`;
  return v;
};

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, refresh_token: refreshToken, grant_type: 'refresh_token' })
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`token_refresh_failed_${res.status}`);
  return j.access_token as string;
}

interface UrlRow { id: string; url: string }

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

  if (!CLIENT_ID || !CLIENT_SECRET) return json({ error: 'not_configured' }, 200);

  let body: { website_id?: string; mode?: string; url_ids?: string[]; limit?: number } = {};
  try { body = await req.json(); } catch { /* default */ }
  const websiteId = body.website_id;
  if (!websiteId) return json({ error: 'missing_website_id' }, 200);
  const mode = body.mode ?? 'new';
  const limit = Math.min(Math.max(Number(body.limit) || 25, 1), MAX_BATCH);

  const { data: conn } = await admin.from('website_gsc_connections').select('gsc_property_url').eq('website_id', websiteId).maybeSingle();
  if (!conn?.gsc_property_url) return json({ error: 'not_mapped', message: 'No Search Console property is mapped to this website.' }, 200);
  const siteUrl = normalizeProperty(conn.gsc_property_url);

  const { data: acct } = await admin.from('gsc_oauth_accounts').select('refresh_token').limit(1).maybeSingle();
  if (!acct?.refresh_token) return json({ error: 'not_connected' }, 200);

  // Pick which URLs to inspect.
  let urlRows: UrlRow[] = [];
  if (mode === 'selected' && body.url_ids?.length) {
    const { data } = await admin.from('website_indexing_urls').select('id, url').eq('website_id', websiteId).in('id', body.url_ids).limit(limit);
    urlRows = (data as UrlRow[]) ?? [];
  } else if (mode === 'not_indexed') {
    let notIdxIds: string[] = [];
    let pageNotIdx = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await admin.from('website_indexing_status')
        .select('url_id')
        .eq('website_id', websiteId)
        .neq('inspection_status', 'indexed')
        .range(pageNotIdx * pageSize, (pageNotIdx + 1) * pageSize - 1);
      if (error || !data || data.length === 0) break;
      notIdxIds.push(...data.map((r: { url_id: string | null }) => r.url_id).filter(Boolean) as string[]);
      if (data.length < pageSize) break;
      pageNotIdx++;
    }
    if (notIdxIds.length) {
      const { data } = await admin.from('website_indexing_urls').select('id, url').in('id', notIdxIds).limit(limit);
      urlRows = (data as UrlRow[]) ?? [];
    }
  } else if (mode === 'all') {
    const { data } = await admin.from('website_indexing_urls').select('id, url').eq('website_id', websiteId).limit(limit);
    urlRows = (data as UrlRow[]) ?? [];
  } else { // 'new' — URLs with no status row yet
    let allUrls: UrlRow[] = [];
    let pageU = 0;
    const pageSize = 1000;
    while (true) {
      const { data, error } = await admin.from('website_indexing_urls')
        .select('id, url')
        .eq('website_id', websiteId)
        .range(pageU * pageSize, (pageU + 1) * pageSize - 1);
      if (error || !data || data.length === 0) break;
      allUrls.push(...(data as UrlRow[]));
      if (data.length < pageSize) break;
      pageU++;
    }

    let doneIds: string[] = [];
    let pageDone = 0;
    while (true) {
      const { data, error } = await admin.from('website_indexing_status')
        .select('url_id')
        .eq('website_id', websiteId)
        .range(pageDone * pageSize, (pageDone + 1) * pageSize - 1);
      if (error || !data || data.length === 0) break;
      doneIds.push(...data.map((r: { url_id: string | null }) => r.url_id).filter(Boolean) as string[]);
      if (data.length < pageSize) break;
      pageDone++;
    }
    const doneSet = new Set(doneIds);
    urlRows = allUrls.filter((r) => !doneSet.has(r.id)).slice(0, limit);
  }

  if (urlRows.length === 0) return json({ success: true, website_id: websiteId, inspected_count: 0, indexed_count: 0, not_indexed_count: 0, warning_count: 0, failed_count: 0, message: 'no_urls_to_inspect' }, 200);

  let accessToken: string;
  try { accessToken = await getAccessToken(acct.refresh_token); }
  catch (e) { console.error('[gsc-inspect-urls] token refresh failed', String(e)); return json({ error: 'auth_failed' }, 200); }

  const { data: log } = await admin.from('website_indexing_sync_logs')
    .insert({ website_id: websiteId, sync_type: 'inspect_urls', status: 'running', total_urls: urlRows.length, created_by: user.id })
    .select('id').single();

  let inspected = 0, indexed = 0, notIndexed = 0, warnings = 0, stoppedEarly = false;

  for (const row of urlRows) {
    try {
      const res = await fetch('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectionUrl: row.url, siteUrl, languageCode: 'en-US' })
      });

      if (res.status === 429) { stoppedEarly = true; console.warn('[gsc-inspect-urls] rate limited, stopping early'); break; }

      if (!res.ok) {
        const text = (await res.text()).slice(0, 300);
        await admin.from('website_indexing_status').upsert({
          website_id: websiteId, url_id: row.id, url: row.url, inspection_status: 'warning',
          coverage_state: `API ${res.status}`, raw_response: { error: text }, inspected_at: nowIso()
        }, { onConflict: 'website_id,url' });
        warnings++; inspected++;
        await sleep(250);
        continue;
      }

      const data = await res.json();
      const r = data?.inspectionResult?.indexStatusResult ?? {};
      const verdict = String(r.verdict ?? '');
      const status = verdict === 'PASS' ? 'indexed' : (verdict ? 'not_indexed' : 'warning');
      if (status === 'indexed') indexed++; else if (status === 'not_indexed') notIndexed++; else warnings++;

      await admin.from('website_indexing_status').upsert({
        website_id: websiteId, url_id: row.id, url: row.url,
        inspection_status: status,
        verdict: r.verdict ?? null,
        coverage_state: r.coverageState ?? null,
        indexing_state: r.indexingState ?? null,
        robots_txt_state: r.robotsTxtState ?? null,
        page_fetch_state: r.pageFetchState ?? null,
        google_canonical: r.googleCanonical ?? null,
        user_canonical: r.userCanonical ?? null,
        last_crawl_time: r.lastCrawlTime ?? null,
        crawled_as: r.crawledAs ?? null,
        sitemap_urls: r.sitemap ?? null,
        referring_urls: r.referringUrls ?? null,
        raw_response: data?.inspectionResult ?? null,
        inspected_at: nowIso()
      }, { onConflict: 'website_id,url' });
      inspected++;
      await sleep(300); // gentle pacing
    } catch (e) {
      console.error('[gsc-inspect-urls] url error', row.url, String(e).slice(0, 200));
      warnings++; inspected++;
      await sleep(250);
    }
  }

  const finalStatus = stoppedEarly ? 'partial' : 'success';
  if (log?.id) {
    await admin.from('website_indexing_sync_logs').update({
      status: finalStatus, inspected_urls: inspected, indexed_count: indexed, not_indexed_count: notIndexed,
      error_message: stoppedEarly ? 'Stopped early due to Google API rate limit. Resume later.' : null, finished_at: nowIso()
    }).eq('id', log.id);
  }
  console.log(`[gsc-inspect-urls] website=${websiteId} inspected=${inspected} indexed=${indexed} not_indexed=${notIndexed} warnings=${warnings} stoppedEarly=${stoppedEarly}`);
  return json({
    success: true,
    website_id: websiteId,
    inspected_count: inspected,
    indexed_count: indexed,
    not_indexed_count: notIndexed,
    warning_count: warnings,
    failed_count: urlRows.length - inspected,
    stopped_early: stoppedEarly
  }, 200);
});
