-- Migration: 0116_test_summary.sql
-- Description: Adds a temporary testing RPC function to mock auth.uid() claims so we can debug get_team_member_dashboard_summary.

begin;

create or replace function public.test_summary(p_user_id uuid, p_start_date date, p_end_date date)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_res jsonb;
begin
  -- Set request.jwt.claims sub to mock auth.uid()
  perform set_config('request.jwt.claims', json_build_object('sub', p_user_id::text)::text, true);
  
  select coalesce(json_agg(t), '[]'::json) into v_res from public.get_team_member_dashboard_summary(p_start_date, p_end_date) t;
  return v_res;
end;
$$;

grant execute on function public.test_summary(uuid, date, date) to authenticated;

commit;
