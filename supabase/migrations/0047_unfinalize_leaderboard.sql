-- 0047 — Add unfinalize_monthly_leaderboard RPC (admin un-lock)
--
-- A month locked via finalize_monthly_leaderboard cannot be recalculated
-- or reset. There was no way to undo an accidental finalize. This adds an
-- admin-only RPC that flips is_final back to false so the month can be
-- corrected (then re-finalized later if desired).
--
-- It does NOT delete any data — only clears the lock flag.

create or replace function public.unfinalize_monthly_leaderboard(
  p_month_key text   -- 'YYYY-MM'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can unfinalize the leaderboard.';
  end if;

  update public.monthly_leaderboard_results
  set is_final = false, calculated_at = now()
  where month_key = p_month_key
    and is_final = true;
end;
$$;

revoke all on function public.unfinalize_monthly_leaderboard(text) from public;
grant execute on function public.unfinalize_monthly_leaderboard(text) to authenticated;
