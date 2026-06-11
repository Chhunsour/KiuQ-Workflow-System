// Supabase Edge Function: send-notification-email
// Sends a branded KiuQ HTML email via Resend when a notification is created.
//
// Auto-injected by Supabase (no setup needed):
//   SUPABASE_URL                — injected automatically
//   SUPABASE_SERVICE_ROLE_KEY   — injected automatically (use SUPABASE_SECRET_KEYS on newer projects)
//
// You must add these in Dashboard → Edge Functions → Secrets:
//   RESEND_API_KEY      — from resend.com
//   EMAIL_FROM_ADDRESS  — e.g. "KiuQ <noreply@kiuq.com>"
//   APP_BASE_URL        — e.g. "https://app.kiuq.com"

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY  = Deno.env.get('RESEND_API_KEY')    ?? '';
const EMAIL_FROM      = Deno.env.get('EMAIL_FROM_ADDRESS') ?? 'KiuQ <noreply@kiuq.com>';
const APP_BASE_URL    = Deno.env.get('APP_BASE_URL')       ?? 'https://app.kiuq.com';

// These are injected automatically by Supabase into every edge function
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')             ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface NotificationEmailPayload {
  notification_id: string;
  recipient_email: string;
  recipient_name: string;
  title: string;
  message: string;
  task_title?: string;
  due_date?: string;
  related_type?: string;
  related_id?: string;
  task_id?: string;
}

const subjectMap: Record<string, string> = {
  task_assigned:         '[KiuQ] New task assigned',
  task_needs_fix:        '[KiuQ] Task needs fix',
  task_approved:         '[KiuQ] Your task was approved',
  task_completed:        '[KiuQ] Task completed',
  task_comment:          '[KiuQ] Admin commented on your task',
  task_deadline_changed: '[KiuQ] Task deadline changed',
  prompt_replaced:       '[KiuQ] Prompt replaced for your task',
  submission_received:   '[KiuQ] Submission received',
  blocker_resolved:      '[KiuQ] Blocker resolved',
  mention:               '[KiuQ] You were mentioned in a task',
  work_reviewed:         '[KiuQ] Your work was reviewed',
  task_updated:          '[KiuQ] Task updated',
  blocker_reported:      '[KiuQ] Blocker reported',
};

const buildHtml = (p: NotificationEmailPayload, notifType: string): string => {
  const taskSection = p.task_title
    ? `<div style="margin:20px 0;padding:16px;background:#f8fbff;border-left:3px solid #15D6C2;border-radius:8px;">
         <div style="font-size:13px;color:#6b7280;font-weight:600;margin-bottom:4px;">TASK</div>
         <div style="font-size:15px;color:#111827;font-weight:700;">${escHtml(p.task_title)}</div>
         ${p.due_date ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">Due: ${escHtml(p.due_date)}</div>` : ''}
       </div>`
    : '';

  const openLink = p.task_id
    ? `${APP_BASE_URL}/work-board`
    : APP_BASE_URL;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escHtml(subjectMap[notifType] ?? '[KiuQ] Notification')}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Google Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background:#15D6C2;padding:24px 32px;">
              <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">KiuQ Website System</span>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h1 style="margin:0 0 8px;font-size:18px;font-weight:800;color:#111827;">${escHtml(p.title)}</h1>
              <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.6;">${escHtml(p.message)}</p>
              ${taskSection}
              <a href="${openLink}"
                 style="display:inline-block;margin-top:8px;padding:12px 28px;background:#15D6C2;color:#ffffff;border-radius:999px;font-weight:700;font-size:14px;text-decoration:none;">
                Open Task
              </a>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:11px;color:#9ca3af;">This is an internal KiuQ Website System notification. You received this because you are part of the KiuQ team.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const escHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify the caller is an authenticated Supabase user (JWT sent by supabase.functions.invoke)
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Use the user JWT to verify the caller is authenticated (not anonymous)
  if (SUPABASE_URL && SUPABASE_SERVICE) {
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
    const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7));
    if (error || !user) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  if (!RESEND_API_KEY) {
    // TODO: Configure RESEND_API_KEY in Supabase Edge Function secrets to enable email sending
    console.warn('[send-notification-email] RESEND_API_KEY not configured — email skipped');
    return new Response(JSON.stringify({ ok: false, reason: 'email_provider_not_configured' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let payload: NotificationEmailPayload & { type: string };
  try {
    payload = await req.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const subject = subjectMap[payload.type] ?? '[KiuQ] Notification';
  const html    = buildHtml(payload, payload.type);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from:    EMAIL_FROM,
        to:      [payload.recipient_email],
        subject,
        html
      })
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[send-notification-email] Resend error:', res.status, body);
      return new Response(JSON.stringify({ ok: false, reason: body }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Mark email_sent on the notification row
    if (SUPABASE_URL && SUPABASE_SERVICE && payload.notification_id) {
      const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);
      await admin
        .from('notifications')
        .update({ email_sent: true, email_sent_at: new Date().toISOString() })
        .eq('id', payload.notification_id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (err) {
    console.error('[send-notification-email] Unexpected error:', err);
    return new Response(JSON.stringify({ ok: false, reason: String(err) }), {
      status: 200, // 200 so the caller knows we processed it — email just failed
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
