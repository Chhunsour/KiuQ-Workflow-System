-- Migration: feature_announcements_seen — per-user "I've seen this banner" flag
--
-- One row per (user, announcement_key). The app inserts a row when the user
-- dismisses or acknowledges an announcement; the popup will not appear again
-- on any of their devices.

create table if not exists public.feature_announcements_seen (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  announcement_key  text not null,
  seen_at           timestamptz not null default now(),
  unique (user_id, announcement_key)
);

create index if not exists fas_user_key_idx
  on public.feature_announcements_seen (user_id, announcement_key);

alter table public.feature_announcements_seen enable row level security;

-- Users can only read/write their own seen-rows. Admins follow the same path:
-- they're a regular user with respect to their own announcements.
create policy "fas_select_own" on public.feature_announcements_seen
  for select to authenticated
  using (auth.uid() = user_id);

create policy "fas_insert_own" on public.feature_announcements_seen
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "fas_delete_own" on public.feature_announcements_seen
  for delete to authenticated
  using (auth.uid() = user_id);
