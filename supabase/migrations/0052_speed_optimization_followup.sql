-- Migration: Website Speed Optimization weekly followup tracker
--
-- One row per (website, week_start) — Monday of the ISO week.
-- Team members tick "Done" once per week after running through the
-- speed-optimization checklist on that website.
--
-- Status values match the Plugin Update tracker semantics for UI reuse:
--   pending           — current week, not yet checked
--   done              — checked off this week
--   missed            — a past week with no completion (set by the app)
--   needs_attention   — issue found / member asked for admin help
--
-- Optional detail fields are nullable; the default checkbox-only flow
-- never requires them.

create table if not exists public.speed_optimization_slots (
  id                uuid primary key default gen_random_uuid(),
  website_id        uuid not null references public.websites(id) on delete cascade,
  week_start        date not null,                              -- Monday (ISO week)
  status            text not null default 'pending'
                       check (status in ('pending', 'done', 'missed', 'needs_attention')),
  assigned_to       uuid references auth.users(id) on delete set null,
  -- Optional "Add details" payload — none of these are required for a basic check.
  before_score      smallint,
  after_score       smallint,
  notes             text,
  screenshot_url    text,
  issue_found       boolean not null default false,
  needs_admin_help  boolean not null default false,
  completed_by      uuid references auth.users(id) on delete set null,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (website_id, week_start)
);

create index if not exists sos_website_idx on public.speed_optimization_slots (website_id, week_start desc);
create index if not exists sos_status_idx  on public.speed_optimization_slots (status);

-- updated_at trigger
create or replace function public.sos_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sos_updated_at_trigger on public.speed_optimization_slots;
create trigger sos_updated_at_trigger
  before update on public.speed_optimization_slots
  for each row execute function public.sos_set_updated_at();

-- RLS — same "open to authenticated, app-enforced visibility" pattern as
-- blog_upload_slots and plugin_update_slots (see 0028_followup.sql).
alter table public.speed_optimization_slots enable row level security;

create policy "sos_select" on public.speed_optimization_slots
  for select to authenticated using (true);

create policy "sos_insert" on public.speed_optimization_slots
  for insert to authenticated with check (true);

create policy "sos_update" on public.speed_optimization_slots
  for update to authenticated
  using (true) with check (true);

create policy "sos_delete" on public.speed_optimization_slots
  for delete to authenticated using (true);

-- Realtime
alter publication supabase_realtime add table public.speed_optimization_slots;
