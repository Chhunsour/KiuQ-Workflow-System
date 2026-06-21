// Supabase Edge Function: gsc-sync
// Pulls real Google Search Console (Search Analytics API) data for one or all
// connected websites and stores daily / query / page snapshots. Only
// Owner/Admin/Head/Supervisor may call it.
//
// Body: { website_id?: string, all?: boolean, days?: 7 | 28 | 90 }
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

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
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

async function getAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token'
    })
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`token_refresh_failed: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

interface GscRow { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }

async function gscQuery(
  token: string,
  property: string,
  body: Record<string, unknown>
): Promise<GscRow[]> {
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GSC ${res.status}: ${text.slice(0, 300)}`);
  }
  const j = await res.json();
  return (j.rows ?? []) as GscRow[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  const { data: prof } = await admin.from('profiles').select('role, status').eq('id', user.id).single();
  const role = String(prof?.role ?? '').toLowerCase();
  if (!['admin', 'owner', 'head', 'supervisor'].includes(role) || prof?.status !== 'active') {
    return json({ error: 'forbidden' }, 403);
  }

  let body: { website_id?: string; all?: boolean; days?: number } = {};
  try { body = await req.json(); } catch { /* default */ }
  const days = [7, 28, 90].includes(Number(body.days)) ? Number(body.days) : 28;

  // GSC data lags ~2 days.
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = ymd(start);
  const endDate = ymd(end);

  const { data: acct } = await admin.from('gsc_oauth_accounts').select('refresh_token').limit(1).maybeSingle();
  if (!acct?.refresh_token) return json({ error: 'not_connected' }, 200);

  let accessToken: string;
  try {
    accessToken = await getAccessToken(acct.refresh_token);
  } catch (e) {
    return json({ error: 'auth_failed', message: String(e) }, 200);
  }

  let q = admin.from('website_gsc_connections').select('id, website_id, gsc_property_url');
  if (body.website_id && !body.all) q = q.eq('website_id', body.website_id);
  const { data: conns } = await q;
  if (!conns || conns.length === 0) return json({ ok: true, results: [], message: 'no_connections' }, 200);

  const results: Array<Record<string, unknown>> = [];

  for (const c of conns) {
    const { data: log } = await admin
      .from('website_gsc_sync_logs')
      .insert({ website_id: c.website_id, status: 'running' })
      .select('id')
      .single();
    await admin.from('website_gsc_connections')
      .update({ sync_status: 'syncing', sync_error: null })
      .eq('id', c.id);

    try {
      let rows = 0;
      const property = c.gsc_property_url as string;

      // Daily (per-date trend)
      const daily = await gscQuery(accessToken, property, {
        startDate, endDate, dimensions: ['date'], rowLimit: 25000
      });
      const dailyRows = daily
        .filter((r) => r.keys?.length)
        .map((r) => ({
          website_id: c.website_id,
          date: r.keys![0],
          clicks: Math.round(r.clicks),
          impressions: Math.round(r.impressions),
          ctr: r.ctr,
          position: r.position
        }));
      if (dailyRows.length) {
        await admin.from('website_gsc_daily_stats').upsert(dailyRows, { onConflict: 'website_id,date' });
        rows += dailyRows.length;
      }

      // Top queries (snapshot for the range, stored under endDate)
      const queries = await gscQuery(accessToken, property, {
        startDate, endDate, dimensions: ['query'], rowLimit: 100
      });
      await admin.from('website_gsc_query_stats').delete().eq('website_id', c.website_id).eq('date', endDate);
      const qRows = queries.filter((r) => r.keys?.length).map((r) => ({
        website_id: c.website_id, date: endDate, query: r.keys![0],
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
      }));
      if (qRows.length) { await admin.from('website_gsc_query_stats').insert(qRows); rows += qRows.length; }

      // Top pages (snapshot for the range, stored under endDate)
      const pages = await gscQuery(accessToken, property, {
        startDate, endDate, dimensions: ['page'], rowLimit: 100
      });
      await admin.from('website_gsc_page_stats').delete().eq('website_id', c.website_id).eq('date', endDate);
      const pRows = pages.filter((r) => r.keys?.length).map((r) => ({
        website_id: c.website_id, date: endDate, page_url: r.keys![0],
        clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
      }));
      if (pRows.length) { await admin.from('website_gsc_page_stats').insert(pRows); rows += pRows.length; }

      await admin.from('website_gsc_connections')
        .update({ sync_status: 'ok', sync_error: null, last_synced_at: nowIso() })
        .eq('id', c.id);
      if (log?.id) {
        await admin.from('website_gsc_sync_logs')
          .update({ status: 'ok', rows_synced: rows, sync_finished_at: nowIso() })
          .eq('id', log.id);
      }
      results.push({ website_id: c.website_id, ok: true, rows });
    } catch (e) {
      const msg = String(e).slice(0, 500);
      await admin.from('website_gsc_connections')
        .update({ sync_status: 'error', sync_error: msg })
        .eq('id', c.id);
      if (log?.id) {
        await admin.from('website_gsc_sync_logs')
          .update({ status: 'error', error_message: msg, sync_finished_at: nowIso() })
          .eq('id', log.id);
      }
      results.push({ website_id: c.website_id, ok: false, error: msg });
    }

    await sleep(300); // gentle on the API
  }

  return json({ ok: true, range: { startDate, endDate }, results }, 200);
});
