-- 0048 — Server-only "zero everyone" for the rebuilt leaderboard
--
-- The leaderboard is now SERVER-ONLY: the page reads exclusively from
-- monthly_leaderboard_results via get_monthly_leaderboard_results. There is
-- no live browser computation anymore, so "zero everyone" just needs to make
-- that table contain explicit 0-point rows for the month.
--
-- This function:
--   1. Refuses if the month is finalized (locked).
--   2. Deletes the month's non-final rows.
--   3. Inserts one explicit 0-point row per eligible member (so the read
--      RPC returns real zeros — every member visibly at 0).
--
-- Deletes NOTHING real: activity_logs, submissions, tasks, followups,
-- monthly_reports, profiles all stay intact. Recalculate rebuilds real
-- scores from activity whenever an admin chooses.

create or replace function public.zero_monthly_leaderboard(
  p_month_key text   -- 'YYYY-MM'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can zero the leaderboard.';
  end if;

  if exists (
    select 1 from public.monthly_leaderboard_results
    where month_key = p_month_key and is_final = true
    limit 1
  ) then
    raise exception 'Month % is finalized and cannot be zeroed. Unlock it first.', p_month_key;
  end if;

  delete from public.monthly_leaderboard_results
  where month_key = p_month_key and is_final = false;

  insert into public.monthly_leaderboard_results (
    month_key, member_id, rank,
    total_points, tasks_completed, approved_work, submissions_made,
    on_time_count, followups_done, reports_submitted,
    prompts_copied, docs_created, active_pts, penalties,
    calculated_at, is_final
  )
  select
    p_month_key,
    p.id,
    row_number() over (order by coalesce(nullif(p.full_name, ''), p.id::text)),
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    now(),
    false
  from public.profiles p
  where replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_')
          in ('member', 'team_member')
    and coalesce(p.status, 'active') = 'active'
  on conflict (month_key, member_id)
  do update set
    rank              = excluded.rank,
    total_points      = 0,
    tasks_completed   = 0,
    approved_work     = 0,
    submissions_made  = 0,
    on_time_count     = 0,
    followups_done    = 0,
    reports_submitted = 0,
    prompts_copied    = 0,
    docs_created      = 0,
    active_pts        = 0,
    penalties         = 0,
    calculated_at     = now(),
    is_final          = false;
end;
$$;

revoke all on function public.zero_monthly_leaderboard(text) from public;
grant execute on function public.zero_monthly_leaderboard(text) to authenticated;
