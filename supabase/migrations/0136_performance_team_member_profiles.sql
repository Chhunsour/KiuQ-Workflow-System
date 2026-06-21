-- Migration: 0136_performance_team_member_profiles.sql
-- Description: Create a secure, safe security definer RPC for fetching basic team member profiles and assigned website counts for the Performance dashboard.

create or replace function public.performance_team_member_profiles()
returns table (
  user_id uuid,
  display_name text,
  avatar_url text,
  role text,
  status text,
  assigned_website_count bigint
)
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Secure check: only active team members can run this query
  if not public.is_active_team_member() then
    raise exception 'Unauthorized';
  end if;

  return query
  select 
    p.id as user_id,
    coalesce(nullif(p.full_name, ''), nullif(p.username, ''), split_part(p.email, '@', 1), 'Unknown User') as display_name,
    p.avatar_url,
    p.role,
    p.status,
    count(w.id)::bigint as assigned_website_count
  from public.profiles p
  left join public.websites w on w.created_by = p.id
  where p.status = 'active'
    and p.role in ('admin', 'owner', 'head', 'supervisor', 'assistant_head', 'team_member', 'member')
  group by p.id, p.full_name, p.username, p.email, p.avatar_url, p.role, p.status
  order by coalesce(nullif(p.full_name, ''), nullif(p.username, ''), split_part(p.email, '@', 1), 'Unknown User') asc;
end;
$$;

revoke all on function public.performance_team_member_profiles() from public;
grant execute on function public.performance_team_member_profiles() to authenticated;
