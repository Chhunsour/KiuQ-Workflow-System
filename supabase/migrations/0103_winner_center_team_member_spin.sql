-- Migration: 0103_winner_center_team_member_spin.sql
-- Description: Allow selected monthly winners to update their monthly winner status and insert their wheel spins.
-- Idempotent: safe to re-run.

begin;

-- Allow selected monthly winners to update their monthly winner row to set the won prize
drop policy if exists "winner_center_monthly_winners_member_spin" on public.winner_center_monthly_winners;
create policy "winner_center_monthly_winners_member_spin" on public.winner_center_monthly_winners
  for update to authenticated
  using (
    winner_user_id = auth.uid() 
    and (status = 'selected' or status = 'approved_retroactively')
    and prize_id is null
    and prize_spun_at is null
  )
  with check (
    winner_user_id = auth.uid()
    and status = 'prize_spun'
    and prize_id is not null
    and prize_spun_at is not null
  );

-- Allow selected monthly winners to insert their official wheel spin result
drop policy if exists "winner_center_wheel_spins_member_spin" on public.winner_center_wheel_spins;
create policy "winner_center_wheel_spins_member_spin" on public.winner_center_wheel_spins
  for insert to authenticated
  with check (
    winner_user_id = auth.uid()
    and is_test_spin = false
    and exists (
      select 1 from public.winner_center_monthly_winners mw
      where mw.month_key = winner_center_wheel_spins.month_key
        and mw.winner_user_id = auth.uid()
        and (mw.status = 'selected' or mw.status = 'approved_retroactively')
        and mw.prize_id is null
        and mw.prize_spun_at is null
    )
  );

commit;
