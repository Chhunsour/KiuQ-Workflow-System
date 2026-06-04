-- 0044 — Add reset_monthly_leaderboard RPC
-- Full reset: deletes activity_logs, leaderboard_scores, and monthly_leaderboard_results
-- for the given month. Scores go to zero and cannot be recovered.

create or replace function public.reset_monthly_leaderboard(
  p_month_key text   -- 'YYYY-MM'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end   date;
begin
  if not public.is_admin() then
    raise exception 'Only admins can reset the leaderboard.';
  end if;

  if exists (
    select 1 from public.monthly_leaderboard_results
    where month_key = p_month_key and is_final = true
    limit 1
  ) then
    raise exception 'Month % is already finalized and cannot be reset.', p_month_key;
  end if;

  v_start := (p_month_key || '-01')::date;
  v_end   := v_start + interval '1 month';

  -- Wipe all activity logs for the month (scores become 0)
  delete from public.activity_logs
  where created_at >= v_start
    and created_at <  v_end;

  -- Clear persisted monthly scores
  delete from public.leaderboard_scores
  where period_type = 'monthly'
    and period_start = v_start;

  -- Clear pre-calculated monthly results
  delete from public.monthly_leaderboard_results
  where month_key = p_month_key and is_final = false;
end;
$$;

revoke all on function public.reset_monthly_leaderboard(text) from public;
grant execute on function public.reset_monthly_leaderboard(text) to authenticated;
