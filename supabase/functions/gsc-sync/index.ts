// Supabase Edge Function: gsc-sync
// Pulls real Google Search Console (Search Analytics API) data for one or all
// connected websites and stores daily / query / page snapshots. Only
// Owner/Admin/Head/Supervisor may call it.
//
// Body: { website_id?: string, all?: boolean, days?: 7 | 28 | 90 }
//
// Secrets: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Debug logging is SAFE — it never prints the client secret, refresh token,
// access token, or auth code.

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

/** Strip protocol / www / trailing slash → bare registrable domain. */
const bare = (d: string) => d.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
/** A `sc-domain:` property must be a BARE domain. A URL-prefix property is left as-is. */
const normalizeProperty = (raw: string): string => {
  const v = (raw || '').trim();
  if (/^sc-domain:/i.test(v)) return `sc-domain:${bare(v.replace(/^sc-domain:/i, ''))}`;
  return v;
};

/** Map a Google API HTTP status to a clear, frontend-safe message. */
const friendlyError = (status?: number): string =>
  status === 403 ? 'This Google account does not have access to this Search Console property.'
  : status === 400 ? 'Invalid Search Console property URL format.'
  : status === 404 ? 'Search Console property not found. Check the mapped property URL.'
  : status === 401 ? 'Google token expired and refresh failed. Please reconnect.'
  : 'Could not fetch Search Console data. Please try again.';

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
  // Note: we log the OUTCOME, never the token itself.
  if (!res.ok || !j.access_token) throw new Error(`token_refresh_failed_${res.status}`);
  return j.access_token as string;
}

interface GscRow { keys?: string[]; clicks: number; impressions: number; ctr: number; position: number }

async function gscQuery(token: string, property: string, body: Record<string, unknown>): Promise<GscRow[]> {
  console.log(`[gsc-sync] GSC API Query Request: property=${property} body=${JSON.stringify(body)}`);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`,
    { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
  );
  console.log(`[gsc-sync] GSC API Response Status: ${res.status} for property=${property}`);
  if (!res.ok) {
    const text = await res.text();
    console.error(`[gsc-sync] GSC API Error status=${res.status} response=${text.slice(0, 500)}`);
    const err = new Error(`GSC ${res.status}: ${text.slice(0, 300)}`);
    (err as Record<string, unknown>).status = res.status;
    (err as Record<string, unknown>).detail = text.slice(0, 400);
    throw err;
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

  let body: { website_id?: string; all?: boolean; days?: number | string } = {};
  try { body = await req.json(); } catch { /* default */ }
  const is24h = body.days === '24h';
  const days = is24h ? 3 : [7, 28, 90].includes(Number(body.days)) ? Number(body.days) : 28;

  // GSC data lags ~2 days.
  const end = new Date(); end.setUTCDate(end.getUTCDate() - 2);
  const start = new Date(end); start.setUTCDate(start.getUTCDate() - (days - 1));
  const startDate = ymd(start);
  const endDate = ymd(end);

  console.log(`[gsc-sync] starting sync: website_id=${body.website_id || 'all'} sync_mode=${is24h ? 'hourly' : 'daily'} days=${body.days} user=${user.id}`);

  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('[gsc-sync] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing');
    return json({ error: 'not_configured' }, 200);
  }

  const { data: acct } = await admin.from('gsc_oauth_accounts').select('refresh_token').limit(1).maybeSingle();
  if (!acct?.refresh_token) {
    console.error('[gsc-sync] no stored google_oauth_accounts row found');
    return json({ error: 'not_connected' }, 200);
  }

  let accessToken: string;
  try {
    accessToken = await getAccessToken(acct.refresh_token);
    console.log('[gsc-sync] access token refreshed successfully');
  } catch (e) {
    console.error('[gsc-sync] Google token refresh failed:', String(e));
    return json({ error: 'auth_failed' }, 200);
  }

  let q = admin.from('website_gsc_connections').select('id, website_id, gsc_property_url');
  if (body.website_id && !body.all) q = q.eq('website_id', body.website_id);
  const { data: conns } = await q;
  if (!conns || conns.length === 0) {
    const code = body.website_id && !body.all ? 'not_mapped' : 'no_connections';
    console.log(`[gsc-sync] connections selection empty: ${code}`);
    return json({ ok: true, results: [], message: code, error: code === 'not_mapped' ? 'not_mapped' : undefined }, 200);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const c of conns) {
    const property = normalizeProperty(String(c.gsc_property_url));
    console.log(`[gsc-sync] [website=${c.website_id}] starting sync for property=${property} mode=${is24h ? 'hourly' : 'daily'}`);

    // Self-heal: persist the cleaned property so a previously bad value stops failing.
    if (property !== c.gsc_property_url) {
      await admin.from('website_gsc_connections').update({ gsc_property_url: property }).eq('id', c.id);
    }

    const { data: log } = await admin
      .from('website_gsc_sync_logs')
      .insert({
        website_id: c.website_id,
        status: 'running',
        sync_type: is24h ? 'hourly' : 'daily',
        created_by: user.id
      })
      .select('id')
      .single();

    await admin.from('website_gsc_connections').update({ sync_status: 'syncing', sync_error: null }).eq('id', c.id);

    try {
      if (!property.startsWith('sc-domain:') && !property.startsWith('http://') && !property.startsWith('https://')) {
        const err = new Error('Invalid Search Console property URL format.');
        (err as Record<string, unknown>).status = 400;
        throw err;
      }

      let rows = 0;

      if (is24h) {
        // --- HOURLY PERFORMANCE SYNC ---
        // Request today and yesterday with dimensions ["date", "hour"] using dataState: "hourly_all"
        const hEnd = new Date();
        const hStart = new Date(hEnd); hStart.setUTCDate(hStart.getUTCDate() - 1);
        const hStartDate = ymd(hStart);
        const hEndDate = ymd(hEnd);

        console.log(`[gsc-sync] [website=${c.website_id}] executing hourly query range=${hStartDate}..${hEndDate}`);

        try {
          const hourly = await gscQuery(accessToken, property, {
            startDate: hStartDate,
            endDate: hEndDate,
            dimensions: ['date', 'hour'],
            dataState: 'hourly_all',
            rowLimit: 25000
          });
          const hourlyRows = hourly.filter((r) => r.keys?.length >= 2).map((r) => {
            const d = r.keys![0];
            const h = Number(r.keys![1]);
            const hStr = String(h).padStart(2, '0');
            return {
              website_id: c.website_id,
              property_url: property,
              date: d,
              hour: h,
              datetime: `${d}T${hStr}:00:00Z`,
              clicks: Math.round(r.clicks),
              impressions: Math.round(r.impressions),
              ctr: r.ctr,
              position: r.position,
              synced_at: nowIso()
            };
          });

          if (hourlyRows.length) {
            const { error: dbErr } = await admin.from('website_gsc_hourly_stats').upsert(hourlyRows, { onConflict: 'website_id,datetime' });
            if (dbErr) {
              console.error(`[gsc-sync] [website=${c.website_id}] database error upserting hourly_stats:`, dbErr.message);
              throw dbErr;
            }
            rows += hourlyRows.length;
            console.log(`[gsc-sync] [website=${c.website_id}] successfully upserted ${hourlyRows.length} hourly rows`);
          } else {
            console.log(`[gsc-sync] [website=${c.website_id}] GSC API returned 0 hourly rows`);
          }
        } catch (hourlyErr) {
          const status = (hourlyErr as Record<string, unknown>)?.status as number | undefined;
          console.error(`[gsc-sync] [website=${c.website_id}] hourly fetch/save failed status=${status ?? '?'}:`, String(hourlyErr));
          const friendly = status === 400 ? 'Hourly data is not available for this property yet.' : friendlyError(status);
          throw new Error(friendly);
        }

        // 2. Hourly Top Queries (optional breakdown)
        try {
          const queries = await gscQuery(accessToken, property, {
            startDate: hStartDate,
            endDate: hEndDate,
            dimensions: ['query'],
            dataState: 'hourly_all',
            rowLimit: 100
          });
          const { error: delErr } = await admin.from('website_gsc_query_stats').delete().eq('website_id', c.website_id).eq('date', hEndDate);
          if (delErr) console.error(`[gsc-sync] [website=${c.website_id}] database error delete hourly query_stats:`, delErr.message);
          
          const qRows = queries.filter((r) => r.keys?.length).map((r) => ({
            website_id: c.website_id, date: hEndDate, query: r.keys![0],
            clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
          }));
          if (qRows.length) {
            const { error: insErr } = await admin.from('website_gsc_query_stats').insert(qRows);
            if (insErr) console.error(`[gsc-sync] [website=${c.website_id}] database error insert hourly query_stats:`, insErr.message);
            else console.log(`[gsc-sync] [website=${c.website_id}] successfully inserted ${qRows.length} hourly query rows`);
          }
        } catch (qErr) {
          console.error(`[gsc-sync] [website=${c.website_id}] hourly queries breakdown failed:`, String(qErr));
        }

        // 3. Hourly Top Pages (optional breakdown)
        try {
          const pages = await gscQuery(accessToken, property, {
            startDate: hStartDate,
            endDate: hEndDate,
            dimensions: ['page'],
            dataState: 'hourly_all',
            rowLimit: 100
          });
          const { error: delErr } = await admin.from('website_gsc_page_stats').delete().eq('website_id', c.website_id).eq('date', hEndDate);
          if (delErr) console.error(`[gsc-sync] [website=${c.website_id}] database error delete hourly page_stats:`, delErr.message);
          
          const pRows = pages.filter((r) => r.keys?.length).map((r) => ({
            website_id: c.website_id, date: hEndDate, page_url: r.keys![0],
            clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
          }));
          if (pRows.length) {
            const { error: insErr } = await admin.from('website_gsc_page_stats').insert(pRows);
            if (insErr) console.error(`[gsc-sync] [website=${c.website_id}] database error insert hourly page_stats:`, insErr.message);
            else console.log(`[gsc-sync] [website=${c.website_id}] successfully inserted ${pRows.length} hourly page rows`);
          }
        } catch (pErr) {
          console.error(`[gsc-sync] [website=${c.website_id}] hourly pages breakdown failed:`, String(pErr));
        }
      } else {
        // --- DAILY PERFORMANCE SYNC ---
        console.log(`[gsc-sync] [website=${c.website_id}] executing daily sync range=${startDate}..${endDate}`);

        // 1. Daily overall stats
        const daily = await gscQuery(accessToken, property, { startDate, endDate, dimensions: ['date'], rowLimit: 25000 });
        const dailyRows = daily.filter((r) => r.keys?.length).map((r) => ({
          website_id: c.website_id, date: r.keys![0],
          clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
        }));

        if (dailyRows.length) {
          const { error: dbErr } = await admin.from('website_gsc_daily_stats').upsert(dailyRows, { onConflict: 'website_id,date' });
          if (dbErr) {
            console.error(`[gsc-sync] [website=${c.website_id}] database error upserting daily_stats:`, dbErr.message);
            throw dbErr;
          }
          rows += dailyRows.length;
          console.log(`[gsc-sync] [website=${c.website_id}] successfully upserted ${dailyRows.length} daily rows`);
        } else {
          console.log(`[gsc-sync] [website=${c.website_id}] GSC API returned 0 daily rows`);
        }

        // 2. Query breakdown
        try {
          const queries = await gscQuery(accessToken, property, { startDate, endDate, dimensions: ['query'], rowLimit: 100 });
          const { error: delErr } = await admin.from('website_gsc_query_stats').delete().eq('website_id', c.website_id).eq('date', endDate);
          if (delErr) console.error(`[gsc-sync] [website=${c.website_id}] error deleting query_stats:`, delErr.message);

          const qRows = queries.filter((r) => r.keys?.length).map((r) => ({
            website_id: c.website_id, date: endDate, query: r.keys![0],
            clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
          }));
          if (qRows.length) {
            const { error: insErr } = await admin.from('website_gsc_query_stats').insert(qRows);
            if (insErr) {
              console.error(`[gsc-sync] [website=${c.website_id}] database error inserting query_stats:`, insErr.message);
              throw insErr;
            }
            rows += qRows.length;
            console.log(`[gsc-sync] [website=${c.website_id}] inserted ${qRows.length} query stats rows`);
          }
        } catch (qErr) {
          console.error(`[gsc-sync] [website=${c.website_id}] queries breakdown sync failed:`, String(qErr));
        }

        // 3. Page breakdown
        try {
          const pages = await gscQuery(accessToken, property, { startDate, endDate, dimensions: ['page'], rowLimit: 100 });
          const { error: delErr } = await admin.from('website_gsc_page_stats').delete().eq('website_id', c.website_id).eq('date', endDate);
          if (delErr) console.error(`[gsc-sync] [website=${c.website_id}] error deleting page_stats:`, delErr.message);

          const pRows = pages.filter((r) => r.keys?.length).map((r) => ({
            website_id: c.website_id, date: endDate, page_url: r.keys![0],
            clicks: Math.round(r.clicks), impressions: Math.round(r.impressions), ctr: r.ctr, position: r.position
          }));
          if (pRows.length) {
            const { error: insErr } = await admin.from('website_gsc_page_stats').insert(pRows);
            if (insErr) {
              console.error(`[gsc-sync] [website=${c.website_id}] database error inserting page_stats:`, insErr.message);
              throw insErr;
            }
            rows += pRows.length;
            console.log(`[gsc-sync] [website=${c.website_id}] inserted ${pRows.length} page stats rows`);
          }
        } catch (pErr) {
          console.error(`[gsc-sync] [website=${c.website_id}] pages breakdown sync failed:`, String(pErr));
        }
      }

      if (rows === 0) {
        const msg = is24h ? 'No hourly data available yet.' : 'No Search Console data found for this date range.';
        await admin.from('website_gsc_connections')
          .update({ sync_status: 'ok', sync_error: msg, last_synced_at: nowIso() }).eq('id', c.id);
        if (log?.id) {
          await admin.from('website_gsc_sync_logs')
            .update({ status: 'ok', rows_synced: 0, error_message: msg, sync_finished_at: nowIso() })
            .eq('id', log.id);
        }
        results.push({ website_id: c.website_id, ok: true, rows: 0, warning: 'no_data' });
      } else {
        await admin.from('website_gsc_connections')
          .update({ sync_status: 'ok', sync_error: null, last_synced_at: nowIso() }).eq('id', c.id);
        if (log?.id) {
          await admin.from('website_gsc_sync_logs')
            .update({ status: 'ok', rows_synced: rows, sync_finished_at: nowIso() })
            .eq('id', log.id);
        }
        results.push({ website_id: c.website_id, ok: true, rows });
      }
    } catch (e) {
      const status = (e as Record<string, unknown>)?.status as number | undefined;
      const friendly = friendlyError(status);
      const detail = String((e as Record<string, unknown>)?.detail ?? e).slice(0, 500);
      console.error(`[gsc-sync] error website=${c.website_id} property=${property} status=${status ?? '?'} detail=${detail}`);
      await admin.from('website_gsc_connections').update({ sync_status: 'error', sync_error: friendly }).eq('id', c.id);
      if (log?.id) {
        await admin.from('website_gsc_sync_logs')
          .update({ status: 'error', error_message: `${friendly} (${status ?? '?'})`, sync_finished_at: nowIso() })
          .eq('id', log.id);
      }
      results.push({ website_id: c.website_id, ok: false, error: friendly, status });
    }

    await sleep(300); // gentle on the API
  }

  console.log(`[gsc-sync] sync loop complete: ok=${results.filter((r) => r.ok).length} errors=${results.filter((r) => !r.ok).length}`);
  return json({ ok: true, range: { startDate, endDate }, results }, 200);
});


