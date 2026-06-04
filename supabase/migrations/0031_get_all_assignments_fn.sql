-- Security-definer function so authenticated users can read all assignments
-- for the Member Board transparency view. The function runs as the DB owner,
-- bypassing RLS. Members still cannot INSERT/UPDATE/DELETE other members' rows.

create or replace function public.get_all_assignments()
returns setof public.prompt_assignments
language sql
security definer
set search_path = public
as $$
  select * from public.prompt_assignments order by assigned_at desc;
$$;

revoke all on function public.get_all_assignments() from public;
grant execute on function public.get_all_assignments() to authenticated;
