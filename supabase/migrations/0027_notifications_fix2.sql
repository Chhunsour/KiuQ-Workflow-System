-- Final recovery: tables + realtime already exist, just need RLS + backfill.

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "notifications_select_own"     on public.notifications;
drop policy if exists "notifications_insert_service" on public.notifications;
drop policy if exists "notifications_update_own"     on public.notifications;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy "notifications_insert_service" on public.notifications
  for insert to authenticated
  with check (true);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "notif_prefs_select_own" on public.notification_preferences;
drop policy if exists "notif_prefs_insert_own" on public.notification_preferences;
drop policy if exists "notif_prefs_update_own" on public.notification_preferences;

create policy "notif_prefs_select_own" on public.notification_preferences
  for select to authenticated
  using (user_id = auth.uid());

create policy "notif_prefs_insert_own" on public.notification_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "notif_prefs_update_own" on public.notification_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── Backfill preferences for existing users ─────────────────────────────────
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
