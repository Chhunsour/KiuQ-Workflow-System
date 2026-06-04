-- Migration: per-website Blog Followup schedules
--
-- Replaces the hardcoded "Tuesday + Saturday every week" rule with a
-- per-website configurable schedule. Websites that don't have a row in
-- this table fall back to the legacy Tue+Sat schedule in the app code,
-- so existing data and behavior are preserved.
--
-- Three schedule kinds are supported:
--
--   'weekly'  — `weekdays` int[] (0=Sun .. 6=Sat). Slots are generated
--                for those days of every week in the ±4 week window.
--   'monthly' — `monthly_target` integer. The app auto-places that many
--                slot days per calendar month (evenly distributed).
--   'custom'  — `custom_dates` date[] of explicit YYYY-MM-DD dates the
--                user picked manually. Only those become slots.
--
-- All three are mutually exclusive but only the relevant column is
-- read at runtime; the others stay null.

create table if not exists public.blog_followup_schedules (
  id              uuid primary key default gen_random_uuid(),
  website_id      uuid not null references public.websites(id) on delete cascade,
  schedule_type   text not null default 'weekly'
                     check (schedule_type in ('weekly', 'monthly', 'custom')),
  -- 0 = Sunday .. 6 = Saturday. Postgres int[].
  weekdays        integer[],
  monthly_target  smallint,
  custom_dates    date[],
  created_by      uuid references auth.users(id) on delete set null,
  updated_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  -- One schedule per website. Re-running upsert overwrites cleanly.
  unique (website_id)
);

create index if not exists bfs_website_idx on public.blog_followup_schedules (website_id);

-- updated_at trigger (same pattern as other followup tables)
create or replace function public.bfs_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists bfs_updated_at_trigger on public.blog_followup_schedules;
create trigger bfs_updated_at_trigger
  before update on public.blog_followup_schedules
  for each row execute function public.bfs_set_updated_at();

-- RLS — same "open to authenticated, app-enforced visibility" pattern as
-- the other followup tables. Session 2 will tighten member-edit-own when
-- the schedule UI is rolled out to non-admins; for now any authenticated
-- user can read; only the app surfaces a Schedule button to admins.
alter table public.blog_followup_schedules enable row level security;

create policy "bfs_select" on public.blog_followup_schedules
  for select to authenticated using (true);

create policy "bfs_insert" on public.blog_followup_schedules
  for insert to authenticated with check (true);

create policy "bfs_update" on public.blog_followup_schedules
  for update to authenticated
  using (true) with check (true);

create policy "bfs_delete" on public.blog_followup_schedules
  for delete to authenticated using (true);

-- Realtime
alter publication supabase_realtime add table public.blog_followup_schedules;
