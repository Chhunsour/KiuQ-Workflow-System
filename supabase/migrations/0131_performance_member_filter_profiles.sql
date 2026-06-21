-- Migration: 0131_performance_member_filter_profiles.sql
-- Description: Create a secure, safe security definer RPC for fetching basic team member profile information and their assigned website counts.

begin;

create or replace function public.get_team_member_filter_profiles()
returns table (
  user_id uuid,
  full_name text,
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
    p.full_name,
    p.avatar_url,
    p.role,
    p.status,
    count(w.id)::bigint as assigned_website_count
  from public.profiles p
  left join public.websites w on w.created_by = p.id
  where p.status = 'active'
    and p.role in ('admin', 'owner', 'head', 'supervisor', 'assistant_head', 'team_member', 'member')
  group by p.id, p.full_name, p.avatar_url, p.role, p.status
  order by p.full_name asc;
end;
$$;

revoke all on function public.get_team_member_filter_profiles() from public;
grant execute on function public.get_team_member_filter_profiles() to authenticated;

commit;
