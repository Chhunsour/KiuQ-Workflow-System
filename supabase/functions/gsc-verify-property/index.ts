// Supabase Edge Function: gsc-verify-property
// Verifies if the calling user's Google account has access to the requested GSC property.
//
// Body: { website_id: string, gsc_property_url: string }
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

const bare = (d: string) => d.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '');
const normalizeProperty = (raw: string): string => {
  const v = (raw || '').trim();
  if (/^sc-domain:/i.test(v)) return `sc-domain:${bare(v.replace(/^sc-domain:/i, ''))}`;
  return v;
};

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
  if (!res.ok || !j.access_token) throw new Error(`token_refresh_failed_${res.status}`);
  return j.access_token as string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error: userErr } = await admin.auth.getUser(authHeader.slice(7));
  if (userErr || !user) return json({ error: 'unauthorized' }, 401);

  let body: { website_id?: string; gsc_property_url?: string } = {};
  try { body = await req.json(); } catch { /* default */ }

  const gscPropertyUrl = body.gsc_property_url?.trim();
  if (!gscPropertyUrl) {
    return json({ error: 'missing_property_url', message: 'Missing property URL.' }, 400);
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return json({ error: 'not_configured', message: 'Google API is not configured (missing secrets).' }, 200);
  }

  // 1. Resolve token for this user
  let refreshToken = '';
  const { data: userConn } = await admin.from('user_google_connections').select('refresh_token').eq('user_id', user.id).maybeSingle();
  if (userConn?.refresh_token) {
    refreshToken = userConn.refresh_token;
  } else {
    // Check legacy fallback for admin/management roles
    const { data: prof } = await admin.from('profiles').select('role').eq('id', user.id).single();
    const role = String(prof?.role ?? '').toLowerCase();
    if (['admin', 'owner', 'head', 'supervisor'].includes(role)) {
      const { data: acct } = await admin.from('gsc_oauth_accounts').select('refresh_token').limit(1).maybeSingle();
      if (acct?.refresh_token) {
        refreshToken = acct.refresh_token;
      }
    }
  }

  if (!refreshToken) {
    return json({ error: 'not_connected', message: 'Connect your Google account first.' }, 200);
  }

  // 2. Refresh Google access token
  let accessToken = '';
  try {
    accessToken = await getAccessToken(refreshToken);
  } catch (e) {
    console.error('[gsc-verify-property] token refresh failed:', String(e));
    return json({ error: 'auth_failed', message: 'Google connection expired. Please reconnect.' }, 200);
  }

  // 3. Fetch list of sites/properties accessible by the user
  try {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[gsc-verify-property] Google API returned error status=', res.status, 'body=', text);
      if (res.status === 403) {
        return json({ error: 'api_disabled', message: 'Search Console API is not available. Check Google project settings.' }, 200);
      }
      return json({ error: 'api_error', message: 'Could not fetch properties from Google Search Console.' }, 200);
    }

    const data = await res.json();
    const siteEntries = (data.siteEntry ?? []) as { siteUrl: string; permissionLevel: string }[];
    const targetNorm = normalizeProperty(gscPropertyUrl).toLowerCase();
    const hasAccess = siteEntries.some(entry => normalizeProperty(entry.siteUrl || '').toLowerCase() === targetNorm);

    if (!hasAccess) {
      return json({ error: 'forbidden', message: 'This Google account does not have access to this Search Console property.' }, 200);
    }

    return json({ ok: true }, 200);
  } catch (err) {
    console.error('[gsc-verify-property] exception:', err);
    return json({ error: 'server_error', message: 'Could not verify Search Console property access.' }, 200);
  }
});
