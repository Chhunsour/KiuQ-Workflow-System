-- Migration: 0132_temp_debug.sql
-- Description: Temporary debug script to test RLS policies for different user roles.

begin;

create table if not exists public.temp_debug_rls (
  user_name text,
  websites_count integer,
  gsc_conn_count integer,
  rpc_member_count integer
);

truncate table public.temp_debug_rls;

do $$
declare
  r record;
  v_websites_count integer;
  v_gsc_conn_count integer;
  v_rpc_member_count integer;
begin
  -- User 1: Samnang (assistant_head)
  perform set_config('request.jwt.claim.sub', '1d463b79-438f-4f2b-9e88-acd42a324c27', true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_websites_count from public.websites;
  select count(*) into v_gsc_conn_count from public.website_gsc_connections;
  select count(*) into v_rpc_member_count from public.get_team_member_filter_profiles();
  insert into public.temp_debug_rls values ('Samnang (assistant_head)', v_websites_count, v_gsc_conn_count, v_rpc_member_count);

  -- User 2: Sor (member)
  perform set_config('request.jwt.claim.sub', 'de556b47-6ca2-4153-8215-f47795f6015e', true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_websites_count from public.websites;
  select count(*) into v_gsc_conn_count from public.website_gsc_connections;
  select count(*) into v_rpc_member_count from public.get_team_member_filter_profiles();
  insert into public.temp_debug_rls values ('Sor (member)', v_websites_count, v_gsc_conn_count, v_rpc_member_count);

  -- User 3: BIG CHUNGUS (team_member)
  perform set_config('request.jwt.claim.sub', '944ca229-744a-43a6-8b27-7f7bfef3c618', true);
  perform set_config('role', 'authenticated', true);
  select count(*) into v_websites_count from public.websites;
  select count(*) into v_gsc_conn_count from public.website_gsc_connections;
  select count(*) into v_rpc_member_count from public.get_team_member_filter_profiles();
  insert into public.temp_debug_rls values ('BIG CHUNGUS (team_member)', v_websites_count, v_gsc_conn_count, v_rpc_member_count);

  -- Reset config
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

commit;
