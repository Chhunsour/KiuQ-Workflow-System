-- Migration: 0133_exec_sql.sql
-- Description: Helper function to execute dynamic SQL from service-role clients.

begin;

create or replace function public.exec_sql(sql text)
returns text
language plpgsql
security definer
as $$
declare
  v_res text;
begin
  execute sql;
  return 'OK';
exception when others then
  return 'ERROR: ' || sqlerrm;
end;
$$;

commit;
