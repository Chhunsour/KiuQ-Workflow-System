-- 0045 — Make leaderboard reset SCORE-ONLY (supersedes 0044)
--
-- 0044 deleted activity_logs during reset. That is wrong: activity_logs is
-- real source data and scores are recalculated FROM it. Deleting it makes
-- recalculation impossible and destroys workflow history.
--
-- This version clears ONLY calculated/cached score records for the month:
--   • leaderboard_scores            (cached computed scores)
--   • monthly_leaderboard_results   (non-final monthly rows only)
--
-- It does NOT touch: activity_logs, submissions, prompt_assignments,
-- task_cards, blog/plugin/ebay followup records, monthly_reports,
-- profiles/members, review_comments, or any source data.
--
-- Finalized months stay locked.

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

  -- Clear cached computed monthly scores (recomputed from activity on recalc)
  delete from public.leaderboard_scores
  where period_type = 'monthly'
    and period_start = v_start;

  -- Clear pre-calculated monthly result rows (non-final only)
  delete from public.monthly_leaderboard_results
  where month_key = p_month_key and is_final = false;

  -- NOTE: activity_logs and all source data are intentionally preserved
  -- so recalculate_monthly_leaderboard() can rebuild scores from real work.
end;
$$;

revoke all on function public.reset_monthly_leaderboard(text) from public;
grant execute on function public.reset_monthly_leaderboard(text) to authenticated;
