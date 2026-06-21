-- Migration: 0129_indexing_summary_rpc.sql
-- Description: RPC for page indexing stats to calculate counts efficiently.

begin;

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
      and (public.is_admin() or public.owns_website(u.website_id))
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
      and (public.is_admin() or public.owns_website(s.website_id))
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
    and (public.is_admin() or public.owns_website(w.id));
end;
$$;

revoke all on function public.get_page_indexing_summary(uuid) from public;
grant execute on function public.get_page_indexing_summary(uuid) to authenticated;

commit;
