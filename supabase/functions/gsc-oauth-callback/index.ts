// Supabase Edge Function: gsc-oauth-callback
// Google redirects here with ?code=...&state=<user_id>. We exchange the code
// for a refresh token and store it (single admin account), then bounce the
// browser back to the app.
//
// IMPORTANT: deploy with JWT verification OFF (this is a top-level browser
// redirect, no Authorization header):  supabase functions deploy gsc-oauth-callback --no-verify-jwt
//
// Secrets:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GSC_REDIRECT_URI, APP_BASE_URL
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const REDIRECT_URI = Deno.env.get('GSC_REDIRECT_URI') ?? '';
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') ?? '';

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

serve(async (req) => {
  const u = new URL(req.url);
  const code = u.searchParams.get('code');
  const state = u.searchParams.get('state') ?? '';

  const back = (status: string) =>
    new Response(null, { status: 302, headers: { Location: `${APP_BASE_URL}/performance?gsc=${status}` } });

  if (!code) return back('error');
  if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) return back('not_configured');

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      })
    });
    const tok = await tokenRes.json();
    if (!tokenRes.ok || !tok.refresh_token) {
      console.error('[gsc-oauth-callback] token exchange failed', tok);
      // No refresh_token usually means the user previously consented; force re-consent.
      return back('error_norefresh');
    }

    let email: string | null = null;
    try {
      const ui = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tok.access_token}` }
      });
      const uij = await ui.json();
      email = uij.email ?? null;
    } catch {
      // email is optional
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    // Single-account model: replace any existing account.
    await admin.from('gsc_oauth_accounts').delete().not('id', 'is', null);
    const { data: insData, error: insErr } = await admin.from('gsc_oauth_accounts').insert({
      google_email: email,
      refresh_token: tok.refresh_token,
      access_token: tok.access_token ?? null,
      token_expiry: new Date(Date.now() + (Number(tok.expires_in) || 3600) * 1000).toISOString(),
      scope: tok.scope ?? null,
      connected_by: isUuid(state) ? state : null
    }).select('id, updated_at').single();
    if (insErr) {
      // Most common cause: migration 0126 not applied (table missing).
      console.error('[gsc-oauth-callback] token store failed:', insErr.message);
      return back('error_store');
    }

    // Safe log — never prints the token, only the outcome.
    console.log(`[gsc-oauth-callback] token exists: ${!!tok.refresh_token}`);
    console.log(`[gsc-oauth-callback] account id: ${insData?.id ?? 'none'}`);
    console.log(`[gsc-oauth-callback] connected user id: ${isUuid(state) ? state : 'none'}`);
    console.log(`[gsc-oauth-callback] token updated timestamp: ${insData?.updated_at ?? 'none'}`);
    return back('connected');
  } catch (err) {
    console.error('[gsc-oauth-callback] error', err);
    return back('error');
  }
});
