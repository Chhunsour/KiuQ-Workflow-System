-- ============================================================
-- 0040 — Notification system fixes
--
-- 1. Add missing notification_type enum values
--    (blog_followup, plugin_update, monthly_report)
-- 2. Tighten notifications RLS: only admins (or service role)
--    can insert notifications for other users — prevents a
--    logged-in member from crafting fake notifications.
-- 3. Add push_subscriptions delete policy so users can clean
--    up their own stale tokens.
-- ============================================================

-- ── Step 1: Extend notification_type enum ────────────────────
-- ALTER TYPE ... ADD VALUE is safe and non-destructive.
-- IF NOT EXISTS is supported in Postgres 14+ (Supabase runs PG15).

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'blog_followup'
  ) then
    alter type public.notification_type add value 'blog_followup';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'plugin_update'
  ) then
    alter type public.notification_type add value 'plugin_update';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'monthly_report'
  ) then
    alter type public.notification_type add value 'monthly_report';
  end if;
end;
$$;

-- ── Step 2: Tighten notifications RLS ────────────────────────
-- Drop old permissive insert policy that allowed any authenticated
-- user to insert a notification for any recipient_id.

drop policy if exists "Authenticated users can create notifications"
  on public.notifications;
drop policy if exists "authenticated_insert_notifications"
  on public.notifications;
drop policy if exists "notifs_insert_authenticated"
  on public.notifications;

-- New policy: users may only insert notifications addressed TO THEMSELVES
-- (e.g. self-test). Admins may insert for any recipient.
-- The edge function runs with SUPABASE_SERVICE_ROLE_KEY which bypasses RLS,
-- so legitimate cross-user notifications from the edge function still work.
create policy "notifs_insert_own_or_admin"
  on public.notifications for insert
  to authenticated
  with check (
    recipient_id = auth.uid()
    or public.is_admin()
  );

-- Keep existing read/update policies unchanged.
-- (Recipients can read and mark-read their own notifications.)

-- ── Step 3: push_subscriptions — allow users to delete own tokens ──
-- Needed so disablePushNotifications() can fully clean up.

drop policy if exists "Users can delete their own push subscriptions"
  on public.push_subscriptions;

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);
