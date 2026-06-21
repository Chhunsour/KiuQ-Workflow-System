-- Migration: 0127_gsc_hourly_stats.sql
-- Description: Store real-time hourly Google Search Console (Search Analytics) data
--   for the latest 24-hour view.
--
--   Tables:
--     website_gsc_hourly_stats  — hourly clicks/impressions/ctr/position.
--
--   Access:
--     * Management (Owner/Admin/Head/Supervisor via public.is_admin()) reads
--       everything.
--     * A team member / assistant head reads performance only for websites they own
--       (websites.created_by = auth.uid()).
--
--   Unique constraint on (website_id, datetime) ensures no duplicates.

begin;

create table if not exists public.website_gsc_hourly_stats (
  id            uuid primary key default gen_random_uuid(),
  website_id    uuid not null references public.websites(id) on delete cascade,
  date          date not null,
  hour          integer not null check (hour >= 0 and hour <= 23),
  datetime      timestamptz not null,
  clicks        integer not null default 0,
  impressions   integer not null default 0,
  ctr           double precision not null default 0,
  position      double precision not null default 0,
  synced_at     timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  unique (website_id, datetime)
);

create index if not exists website_gsc_hourly_stats_idx on public.website_gsc_hourly_stats (website_id, datetime desc);

alter table public.website_gsc_hourly_stats enable row level security;

drop policy if exists "gsc_hourly_select" on public.website_gsc_hourly_stats;
create policy "gsc_hourly_select" on public.website_gsc_hourly_stats
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

commit;
