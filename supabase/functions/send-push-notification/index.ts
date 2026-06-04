// Supabase Edge Function — send Firebase push notifications to a user's devices.
// Uses FCM HTTP v1 API with a Google service-account JWT (no Firebase Admin SDK needed in Deno).
//
// Required Supabase secrets (set via: supabase secrets set KEY=value):
//   FIREBASE_PROJECT_ID        — Firebase project ID (e.g. "website-team-4ed89")
//   FIREBASE_SERVICE_ACCOUNT   — Full service-account JSON stringified
//   SUPABASE_URL               — injected automatically by Supabase
//   SUPABASE_SERVICE_ROLE_KEY  — injected automatically by Supabase

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ── Route map — mirrors client-side ROUTE_MAP in notifications.ts ─────────────

const ROUTE_MAP: Record<string, string> = {
  task_assigned:        '/work-board/my',
  task_updated:         '/work-board/my',
  task_comment:         '/work-board/my',
  task_deadline_changed:'/work-board/my',
  task_needs_fix:       '/review-feedback',
  task_approved:        '/my-submissions',
  task_completed:       '/my-submissions',
  work_reviewed:        '/my-submissions',
  submission_received:  '/my-submissions',
  prompt_replaced:      '/prompt-library',
  blocker_reported:     '/work-board/my',
  blocker_resolved:     '/work-board/my',
  mention:              '/work-board/my',
  blog_followup:        '/followup/blog',
  plugin_update:        '/followup/plugins',
  monthly_report:       '/my-submissions',
};

// ── Google OAuth2 access token from service-account JSON ─────────────────────

async function getGoogleAccessToken(serviceAccountJson: string): Promise<string> {
  const sa  = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const header  = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud:   'https://oauth2.googleapis.com/token',
    iat:   now,
    exp:   now + 3600,
  };

  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const unsigned = `${b64url(header)}.${b64url(payload)}`;

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signBuffer = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );

  const signature = btoa(String.fromCharCode(...new Uint8Array(signBuffer)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const jwt = `${unsigned}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`Google token exchange failed (${tokenRes.status}): ${text}`);
  }

  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) throw new Error('Google token response missing access_token');
  return tokenData.access_token;
}

// ── CORS + response helpers ───────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST')    return json({ error: 'Method not allowed' }, 405);

  try {
    // ── Authenticate caller ─────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')              ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Validate the caller's JWT — getUser() cannot be faked
    const callerToken = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: authErr } =
      await supabaseAdmin.auth.getUser(callerToken);

    if (authErr || !caller) {
      console.error('[send-push] Auth failed:', authErr?.message);
      return json({ error: 'Unauthorized' }, 401);
    }

    // ── Parse and validate body ─────────────────────────────────────────────
    const body = await req.json() as {
      user_id:   string;
      title:     string;
      body_text: string;
      link?:     string;
      type?:     string;
    };

    const { user_id, title, body_text, link, type } = body;

    if (!user_id || !title || !body_text) {
      return json({ error: 'user_id, title, and body_text are required' }, 400);
    }

    // ── Authorization: must be admin to send to other users ─────────────────
    if (caller.id !== user_id) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', caller.id)
        .single();

      const role = (profile?.role as string ?? '').toLowerCase().replace(/[\s-]/g, '_');
      const isAdmin = role === 'admin' || role === 'owner' || role === 'head' || role === 'supervisor';
      if (!isAdmin) {
        console.warn('[send-push] Forbidden: non-admin tried to send to other user', caller.id);
        return json({ error: 'Forbidden: only admins can send notifications to other users' }, 403);
      }
    }

    // ── Check Firebase config ───────────────────────────────────────────────
    const projectId       = Deno.env.get('FIREBASE_PROJECT_ID')    ?? '';
    const serviceAcctJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '';

    if (!projectId || !serviceAcctJson) {
      console.error('[send-push] Firebase secrets not configured on server');
      return json({ error: 'Firebase not configured on server. Set FIREBASE_PROJECT_ID and FIREBASE_SERVICE_ACCOUNT secrets.' }, 500);
    }

    // ── Fetch active tokens ─────────────────────────────────────────────────
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id, fcm_token')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (subsErr) {
      console.error('[send-push] DB error fetching tokens:', subsErr.message);
      return json({ error: 'DB error fetching tokens' }, 500);
    }

    if (!subs?.length) {
      console.log('[send-push] No active tokens for user:', user_id);
      return json({ sent: 0, skipped: 'no active tokens for this user' });
    }

    console.log(`[send-push] Sending to user ${user_id} — ${subs.length} device(s), type=${type}`);

    // ── Resolve click URL ───────────────────────────────────────────────────
    // Priority: explicit link from caller → ROUTE_MAP by type → root
    const resolvedLink = link ?? (type ? (ROUTE_MAP[type] ?? '/') : '/');

    const accessToken = await getGoogleAccessToken(serviceAcctJson);
    const fcmUrl      = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

    let sent = 0;
    const invalidIds: string[] = [];

    await Promise.allSettled(
      subs.map(async (sub: { id: string; fcm_token: string }) => {
        const fcmBody = {
          message: {
            token: sub.fcm_token,
            // `notification` block renders the OS notification on background
            notification: { title, body: body_text },
            // `data` block is available to both foreground onMessage() and SW onBackgroundMessage()
            data: {
              link:  resolvedLink,
              type:  type ?? '',
              title,
              body:  body_text,
            },
            webpush: {
              notification: {
                title,
                body:        body_text,
                icon:        '/pwa-192x192.png',
                badge:       '/favicon.svg',
                // click_action is legacy but harmless
                click_action: resolvedLink,
              },
              fcm_options: { link: resolvedLink },
            },
          },
        };

        const res = await fetch(fcmUrl, {
          method:  'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type':  'application/json',
          },
          body: JSON.stringify(fcmBody),
        });

        if (res.ok) {
          sent++;
          console.log(`[send-push] ✓ Sent to token …${sub.fcm_token.slice(-8)}`);
          // Update last_used_at without blocking
          void supabaseAdmin
            .from('push_subscriptions')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', sub.id);
        } else {
          const errBody = await res.json() as { error?: { status?: string; message?: string } };
          const status  = errBody?.error?.status ?? '';
          const msg     = errBody?.error?.message ?? '';
          console.warn(`[send-push] ✗ FCM error for token …${sub.fcm_token.slice(-8)}: ${status} ${msg}`);

          // Mark permanently-invalid tokens inactive so we stop trying them
          if (status === 'NOT_FOUND' || status === 'INVALID_ARGUMENT' || status === 'UNREGISTERED') {
            invalidIds.push(sub.id);
          }
        }
      })
    );

    if (invalidIds.length) {
      console.log(`[send-push] Marking ${invalidIds.length} token(s) inactive`);
      await supabaseAdmin
        .from('push_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in('id', invalidIds);
    }

    console.log(`[send-push] Done — sent: ${sent}, invalid: ${invalidIds.length}`);
    return json({ sent, invalid: invalidIds.length, total: subs.length });

  } catch (e) {
    console.error('[send-push] Unhandled error:', e);
    return json({
      error: 'Internal server error',
      detail: e instanceof Error ? e.message : String(e),
    }, 500);
  }
});
