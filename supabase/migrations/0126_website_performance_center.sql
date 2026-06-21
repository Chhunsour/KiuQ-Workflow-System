-- Migration: 0125_website_performance_center.sql
-- Description: Website Performance Center — store real Google Search Console
--   (Search Analytics API) data per team website for central reporting.
--
--   Tables:
--     gsc_oauth_accounts        — server-only OAuth token store (single admin
--                                 Google account). NO RLS policies → only the
--                                 service role (edge functions) can touch it.
--     website_gsc_connections   — maps a website to its GSC property + sync state.
--     website_gsc_daily_stats   — per-day clicks/impressions/ctr/position.
--     website_gsc_query_stats   — top search queries (snapshot per sync range).
--     website_gsc_page_stats    — top pages (snapshot per sync range).
--     website_gsc_sync_logs     — history of every sync run.
--
--   Access:
--     * Management (Owner/Admin/Head/Supervisor via public.is_admin()) read
--       everything and manage the property mapping.
--     * A team member reads performance only for websites they own
--       (websites.created_by = auth.uid()).
--     * All STATS are written exclusively by the gsc-sync edge function
--       (service role) — there are no authenticated write policies on the stats
--       tables, so the numbers can't be tampered with from the client.
--
--   Idempotent & additive — never drops or disables existing objects.

begin;

-- ── Helper: does the current user own this website? ──────────────────────────
create or replace function public.owns_website(p_website_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.websites w
    where w.id = p_website_id
      and w.created_by = auth.uid()
  );
$$;
revoke all on function public.owns_website(uuid) from public;
grant execute on function public.owns_website(uuid) to authenticated;

-- ── 0. OAuth token store (service-role only) ─────────────────────────────────
create table if not exists public.gsc_oauth_accounts (
  id            uuid primary key default gen_random_uuid(),
  google_email  text,
  refresh_token text not null,
  access_token  text,
  token_expiry  timestamptz,
  scope         text,
  connected_by  uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.gsc_oauth_accounts enable row level security;
-- Intentionally NO policies: authenticated users get nothing; the service role
-- (edge functions) bypasses RLS. The refresh token is never exposed to clients.

-- Safe, non-sensitive connection status for the UI (no token leaked).
create or replace function public.gsc_connection_info()
returns table(connected boolean, google_email text, connected_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select (count(*) > 0) as connected,
         max(google_email) as google_email,
         max(created_at) as connected_at
  from public.gsc_oauth_accounts
  where public.is_admin();
$$;
revoke all on function public.gsc_connection_info() from public;
grant execute on function public.gsc_connection_info() to authenticated;

-- ── 1. Connections (website → GSC property) ──────────────────────────────────
create table if not exists public.website_gsc_connections (
  id                  uuid primary key default gen_random_uuid(),
  website_id          uuid not null unique references public.websites(id) on delete cascade,
  gsc_property_url    text not null,
  verification_status text not null default 'unknown',
  connected_by        uuid references public.profiles(id) on delete set null,
  connected_at        timestamptz not null default now(),
  last_synced_at      timestamptz,
  sync_status         text not null default 'idle'
                        check (sync_status in ('idle','syncing','ok','error')),
  sync_error          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ── 2. Daily stats ───────────────────────────────────────────────────────────
create table if not exists public.website_gsc_daily_stats (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites(id) on delete cascade,
  date        date not null,
  clicks      integer not null default 0,
  impressions integer not null default 0,
  ctr         double precision not null default 0,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  unique (website_id, date)
);
create index if not exists website_gsc_daily_stats_idx on public.website_gsc_daily_stats (website_id, date);

-- ── 3. Query stats ───────────────────────────────────────────────────────────
create table if not exists public.website_gsc_query_stats (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites(id) on delete cascade,
  date        date not null,
  query       text not null,
  clicks      integer not null default 0,
  impressions integer not null default 0,
  ctr         double precision not null default 0,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  unique (website_id, date, query)
);
create index if not exists website_gsc_query_stats_idx on public.website_gsc_query_stats (website_id, date);

-- ── 4. Page stats ────────────────────────────────────────────────────────────
create table if not exists public.website_gsc_page_stats (
  id          uuid primary key default gen_random_uuid(),
  website_id  uuid not null references public.websites(id) on delete cascade,
  date        date not null,
  page_url    text not null,
  clicks      integer not null default 0,
  impressions integer not null default 0,
  ctr         double precision not null default 0,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  unique (website_id, date, page_url)
);
create index if not exists website_gsc_page_stats_idx on public.website_gsc_page_stats (website_id, date);

-- ── 5. Sync logs ─────────────────────────────────────────────────────────────
create table if not exists public.website_gsc_sync_logs (
  id               uuid primary key default gen_random_uuid(),
  website_id       uuid references public.websites(id) on delete cascade,
  sync_started_at  timestamptz not null default now(),
  sync_finished_at timestamptz,
  status           text not null default 'running'
                     check (status in ('running','ok','error')),
  rows_synced      integer not null default 0,
  error_message    text,
  created_at       timestamptz not null default now()
);
create index if not exists website_gsc_sync_logs_idx on public.website_gsc_sync_logs (website_id, sync_started_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.website_gsc_connections  enable row level security;
alter table public.website_gsc_daily_stats  enable row level security;
alter table public.website_gsc_query_stats  enable row level security;
alter table public.website_gsc_page_stats   enable row level security;
alter table public.website_gsc_sync_logs    enable row level security;

-- Connections: management manages the mapping; members read their own.
drop policy if exists "gsc_connections_select" on public.website_gsc_connections;
create policy "gsc_connections_select" on public.website_gsc_connections
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

drop policy if exists "gsc_connections_manage" on public.website_gsc_connections;
create policy "gsc_connections_manage" on public.website_gsc_connections
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Stats + logs: READ for management or website owner. No authenticated writes —
-- only the service-role edge function populates these.
drop policy if exists "gsc_daily_select" on public.website_gsc_daily_stats;
create policy "gsc_daily_select" on public.website_gsc_daily_stats
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

drop policy if exists "gsc_query_select" on public.website_gsc_query_stats;
create policy "gsc_query_select" on public.website_gsc_query_stats
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

drop policy if exists "gsc_page_select" on public.website_gsc_page_stats;
create policy "gsc_page_select" on public.website_gsc_page_stats
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

drop policy if exists "gsc_logs_select" on public.website_gsc_sync_logs;
create policy "gsc_logs_select" on public.website_gsc_sync_logs
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

-- ── updated_at triggers ──────────────────────────────────────────────────────
drop trigger if exists touch_updated_at on public.gsc_oauth_accounts;
create trigger touch_updated_at before update on public.gsc_oauth_accounts
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.website_gsc_connections;
create trigger touch_updated_at before update on public.website_gsc_connections
  for each row execute function public.touch_updated_at();

-- ── Realtime (connections + sync logs only; stats refetched after sync) ──────
do $$
declare
  target_table text;
  realtime_tables text[] := array['website_gsc_connections', 'website_gsc_sync_logs'];
begin
  foreach target_table in array realtime_tables
  loop
    execute format('alter table public.%I replica identity full', target_table);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end $$;

commit;

-- ============================================================================
-- ✅ Verify:
--   select public.gsc_connection_info();
--   select website_id, gsc_property_url, sync_status, last_synced_at
--     from public.website_gsc_connections;
-- ============================================================================
