-- Migration: 0102_remove_winner_center_percentage.sql
-- Description: Remove chance_percentage column from winner_center_prizes table.
--   Simplifies the reward system to equal chances / manual exact landing choice.

begin;

alter table public.winner_center_prizes
  drop column if exists chance_percentage;

commit;
