-- Migration: publish leaderboard_adjustments for Supabase Realtime.
--
-- Why: the Leaderboard page subscribes to leaderboard_adjustments so that
-- manual score adjustments made by an admin propagate live to every open
-- leaderboard (no manual refresh). The table was created in
-- 0074_leaderboard_adjustments.sql but never added to the supabase_realtime
-- publication, so those events never reached clients.
--
-- Idempotent — safe to run any number of times.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'leaderboard_adjustments'
  ) then
    -- REPLICA IDENTITY FULL so UPDATE/DELETE payloads carry old values.
    execute 'alter table public.leaderboard_adjustments replica identity full';

    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'leaderboard_adjustments'
    ) then
      execute 'alter publication supabase_realtime add table public.leaderboard_adjustments';
    end if;
  end if;
end $$;
