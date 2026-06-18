-- Migration: 0104_winner_center_official_mode.sql
-- Description: Adds official spin modes to monthly winners table, audit fields to wheel spins, and relaxes RLS checks for team member spins.
-- Idempotent: safe to re-run.

begin;

-- 1. Add official mode columns to monthly winners
alter table public.winner_center_monthly_winners add column if not exists official_prize_mode text not null default 'random' check (official_prize_mode in ('random', 'exact'));
alter table public.winner_center_monthly_winners add column if not exists exact_prize_id uuid references public.winner_center_prizes(id) on delete set null;

-- 2. Add audit fields to wheel spins
alter table public.winner_center_wheel_spins add column if not exists is_official boolean not null default false;
alter table public.winner_center_wheel_spins add column if not exists is_locked boolean not null default false;
alter table public.winner_center_wheel_spins add column if not exists prize_image_url text;

-- 3. Drop and recreate monthly winners update policy for members
drop policy if exists "winner_center_monthly_winners_member_spin" on public.winner_center_monthly_winners;
create policy "winner_center_monthly_winners_member_spin" on public.winner_center_monthly_winners
  for update to authenticated
  using (
    winner_user_id = auth.uid() 
    and (status = 'selected' or status = 'approved_retroactively')
    and prize_spun_at is null
  )
  with check (
    winner_user_id = auth.uid()
    and status = 'prize_spun'
    and prize_id is not null
    and prize_spun_at is not null
  );

-- 4. Drop and recreate wheel spins insert policy for members
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
        and mw.prize_spun_at is null
    )
  );

commit;
