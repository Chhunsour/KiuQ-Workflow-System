-- Migration: 0130_performance_permissions_update.sql
-- Description: Update Website Performance Center permissions to allow all active authenticated team members to read GSC and indexing stats, while restricting write/sync permissions to management.

begin;

-- Helper function: is the user an active team member?
create or replace function public.is_active_team_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
  );
$$;
revoke all on function public.is_active_team_member() from public;
grant execute on function public.is_active_team_member() to authenticated;

-- Recreate select policy on websites table to allow select for all active team members
drop policy if exists "websites_select_policy" on public.websites;
create policy "websites_select_policy"
on public.websites
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_gsc_connections
drop policy if exists "gsc_connections_select" on public.website_gsc_connections;
create policy "gsc_connections_select"
on public.website_gsc_connections
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_gsc_daily_stats
drop policy if exists "gsc_daily_select" on public.website_gsc_daily_stats;
create policy "gsc_daily_select"
on public.website_gsc_daily_stats
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_gsc_hourly_stats
drop policy if exists "gsc_hourly_select" on public.website_gsc_hourly_stats;
create policy "gsc_hourly_select"
on public.website_gsc_hourly_stats
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_gsc_query_stats
drop policy if exists "gsc_query_select" on public.website_gsc_query_stats;
create policy "gsc_query_select"
on public.website_gsc_query_stats
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_gsc_page_stats
drop policy if exists "gsc_page_select" on public.website_gsc_page_stats;
create policy "gsc_page_select"
on public.website_gsc_page_stats
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_gsc_sync_logs
drop policy if exists "gsc_logs_select" on public.website_gsc_sync_logs;
create policy "gsc_logs_select"
on public.website_gsc_sync_logs
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_indexing_urls
drop policy if exists "indexing_urls_select" on public.website_indexing_urls;
create policy "indexing_urls_select"
on public.website_indexing_urls
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_indexing_status
drop policy if exists "indexing_status_select" on public.website_indexing_status;
create policy "indexing_status_select"
on public.website_indexing_status
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate select policy on website_indexing_sync_logs
drop policy if exists "indexing_logs_select" on public.website_indexing_sync_logs;
create policy "indexing_logs_select"
on public.website_indexing_sync_logs
for select
to authenticated
using (
  public.is_active_team_member()
);

-- Recreate the get_page_indexing_summary RPC to allow active team members
create or replace function public.get_page_indexing_summary(p_website_id uuid default null)
returns table (
  website_id uuid,
  known_pages bigint,
  indexed_pages bigint,
  not_indexed_pages bigint,
  warning_pages bigint,
  last_checked timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with urls_count as (
    select
      u.website_id,
      count(*) as known_count
    from public.website_indexing_urls u
    where (p_website_id is null or u.website_id = p_website_id)
      and (public.is_active_team_member())
    group by u.website_id
  ),
  status_count as (
    select
      s.website_id,
      count(*) filter (where s.inspection_status = 'indexed') as indexed_count,
      count(*) filter (where s.inspection_status = 'not_indexed') as not_indexed_count,
      count(*) filter (where s.inspection_status = 'warning') as warning_count,
      max(s.inspected_at) as max_inspected
    from public.website_indexing_status s
    where (p_website_id is null or s.website_id = p_website_id)
      and (public.is_active_team_member())
    group by s.website_id
  )
  select
    w.id as website_id,
    coalesce(u.known_count, 0)::bigint as known_pages,
    coalesce(s.indexed_count, 0)::bigint as indexed_pages,
    coalesce(s.not_indexed_count, 0)::bigint as not_indexed_pages,
    coalesce(s.warning_count, 0)::bigint as warning_pages,
    s.max_inspected as last_checked
  from public.websites w
  left join urls_count u on w.id = u.website_id
  left join status_count s on w.id = s.website_id
  where (p_website_id is null or w.id = p_website_id)
    and (public.is_active_team_member());
end;
$$;

revoke all on function public.get_page_indexing_summary(uuid) from public;
grant execute on function public.get_page_indexing_summary(uuid) to authenticated;

commit;
