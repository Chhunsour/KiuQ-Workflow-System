-- Migration: 0101_winner_center_retroactive.sql
-- Description: Supports previous month reward approval and retroactive winner selection/spin.
-- Idempotent: safe to re-run.

begin;

-- 1. Drop constraints if exist and add new ones
alter table public.winner_center_monthly_winners drop constraint if exists winner_center_monthly_winners_status_check;
alter table public.winner_center_monthly_winners add constraint winner_center_monthly_winners_status_check
  check (status in ('selected', 'prize_spun', 'prize_given', 'approved_retroactively'));

-- 2. Make winner_user_id nullable to allow retroactive approval before winner is chosen
alter table public.winner_center_monthly_winners alter column winner_user_id drop not null;

-- 3. Add retroactive columns
alter table public.winner_center_monthly_winners add column if not exists is_retroactive boolean not null default false;
alter table public.winner_center_monthly_winners add column if not exists retroactive_reason text;

commit;
