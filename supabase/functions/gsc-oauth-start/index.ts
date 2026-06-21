// Supabase Edge Function: gsc-oauth-start
// Returns the Google OAuth consent URL for connecting Search Console.
// Only Owner/Admin/Head/Supervisor may call it.
//
// Secrets (Dashboard → Edge Functions → Secrets):
//   GOOGLE_CLIENT_ID      — OAuth client id from Google Cloud Console
//   GSC_REDIRECT_URI      — the gsc-oauth-callback function URL (must match Google console)
// Auto-injected: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const REDIRECT_URI = Deno.env.get('GSC_REDIRECT_URI') ?? '';
const SCOPE = 'openid email https://www.googleapis.com/auth/webmasters.readonly';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7));
  if (error || !user) return json({ error: 'unauthorized' }, 401);

  const { data: prof } = await admin.from('profiles').select('role, status').eq('id', user.id).single();
  const role = String(prof?.role ?? '').toLowerCase();
  if (!['admin', 'owner', 'head', 'supervisor'].includes(role) || prof?.status !== 'active') {
    return json({ error: 'forbidden' }, 403);
  }

  if (!CLIENT_ID || !REDIRECT_URI) {
    return json({ error: 'not_configured', message: 'Set GOOGLE_CLIENT_ID and GSC_REDIRECT_URI secrets.' }, 200);
  }

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', CLIENT_ID);
  url.searchParams.set('redirect_uri', REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPE);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('state', user.id);

  return json({ url: url.toString() }, 200);
});
