-- Migration: simpler monthly blog schedule — by day-of-month
--
-- The previous monthly mode auto-placed N dates per month based on a
-- target count. Users found it confusing because they couldn't see
-- which actual dates would be picked. This adds an explicit
-- `monthly_days` column that stores the exact day-numbers
-- (1..31) the user wants to publish on every month.
--
-- The blogDatesInRange resolver prefers monthly_days when populated,
-- and falls back to the legacy monthly_target behavior for any
-- existing rows. No data is lost; new schedules use the new column.

alter table public.blog_followup_schedules
  add column if not exists monthly_days smallint[];

-- monthly_days should only contain 1..31 entries. We don't add a
-- check constraint at the DB level because the app validates inputs;
-- adding one here would make a future "any day" mode harder to ship.
