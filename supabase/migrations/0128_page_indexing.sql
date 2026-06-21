-- Migration: 0128_page_indexing.sql
-- Description: Page Indexing Center for the Website Performance Center.
--   Tracks which pages of each website are indexed by Google, using real data
--   from the Search Console URL Inspection API (results stored per URL).
--
--   Tables:
--     website_indexing_urls       — discovered URLs per website (sitemap/cms/manual).
--     website_indexing_status     — latest URL Inspection result per URL.
--     website_indexing_sync_logs  — history of discover / inspect runs.
--
--   Access mirrors the rest of the Performance Center:
--     * management (is_admin) reads everything; a member reads only websites
--       they own (owns_website).
--     * URL status + logs are written ONLY by the edge functions (service role) —
--       no authenticated write policies on those.
--     * URLs (manual add / edit / delete) are managed by management.
--
--   Idempotent & additive. Reuses public.is_admin() and public.owns_website().

begin;

-- ── 1. Discovered URLs ───────────────────────────────────────────────────────
create table if not exists public.website_indexing_urls (
  id           uuid primary key default gen_random_uuid(),
  website_id   uuid not null references public.websites(id) on delete cascade,
  url          text not null,
  source       text not null default 'sitemap'
                 check (source in ('sitemap', 'cms', 'manual', 'crawl')),
  page_type    text not null default 'page'
                 check (page_type in ('page', 'blog', 'product', 'category', 'other')),
  title        text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (website_id, url)
);
create index if not exists website_indexing_urls_website_idx on public.website_indexing_urls (website_id);

-- ── 2. Inspection status (latest result per URL) ─────────────────────────────
create table if not exists public.website_indexing_status (
  id                uuid primary key default gen_random_uuid(),
  website_id        uuid not null references public.websites(id) on delete cascade,
  url_id            uuid references public.website_indexing_urls(id) on delete cascade,
  url               text not null,
  -- KiuQ classification: indexed | not_indexed | warning
  inspection_status text not null default 'warning',
  verdict           text,
  coverage_state    text,
  indexing_state    text,
  robots_txt_state  text,
  page_fetch_state  text,
  google_canonical  text,
  user_canonical    text,
  last_crawl_time   timestamptz,
  crawled_as        text,
  sitemap_urls      jsonb,
  referring_urls    jsonb,
  raw_response      jsonb,
  inspected_at      timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (website_id, url)
);
create index if not exists website_indexing_status_website_idx on public.website_indexing_status (website_id, inspection_status);

-- ── 3. Sync logs ─────────────────────────────────────────────────────────────
create table if not exists public.website_indexing_sync_logs (
  id                uuid primary key default gen_random_uuid(),
  website_id        uuid references public.websites(id) on delete cascade,
  sync_type         text not null
                      check (sync_type in ('discover_urls', 'inspect_urls', 'full_indexing_check')),
  started_at        timestamptz not null default now(),
  finished_at       timestamptz,
  status            text not null default 'running'
                      check (status in ('running', 'success', 'failed', 'partial')),
  total_urls        integer not null default 0,
  inspected_urls    integer not null default 0,
  indexed_count     integer not null default 0,
  not_indexed_count integer not null default 0,
  error_message     text,
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists website_indexing_sync_logs_idx on public.website_indexing_sync_logs (website_id, started_at desc);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.website_indexing_urls       enable row level security;
alter table public.website_indexing_status      enable row level security;
alter table public.website_indexing_sync_logs   enable row level security;

-- URLs: management manages; members read their own websites' URLs.
drop policy if exists "indexing_urls_select" on public.website_indexing_urls;
create policy "indexing_urls_select" on public.website_indexing_urls
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

drop policy if exists "indexing_urls_manage" on public.website_indexing_urls;
create policy "indexing_urls_manage" on public.website_indexing_urls
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Status + logs: read only (written by the service-role edge functions).
drop policy if exists "indexing_status_select" on public.website_indexing_status;
create policy "indexing_status_select" on public.website_indexing_status
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

drop policy if exists "indexing_logs_select" on public.website_indexing_sync_logs;
create policy "indexing_logs_select" on public.website_indexing_sync_logs
  for select to authenticated
  using (public.is_admin() or public.owns_website(website_id));

-- ── updated_at triggers ──────────────────────────────────────────────────────
drop trigger if exists touch_updated_at on public.website_indexing_urls;
create trigger touch_updated_at before update on public.website_indexing_urls
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.website_indexing_status;
create trigger touch_updated_at before update on public.website_indexing_status
  for each row execute function public.touch_updated_at();

-- ── Realtime (sync logs so the dashboard can show progress) ──────────────────
do $$
declare
  target_table text;
  realtime_tables text[] := array['website_indexing_sync_logs'];
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
--   select website_id, count(*) from public.website_indexing_urls group by 1;
--   select inspection_status, count(*) from public.website_indexing_status group by 1;
-- ============================================================================
