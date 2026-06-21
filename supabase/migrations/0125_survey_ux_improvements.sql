-- Migration: 0125_survey_ux_improvements.sql
-- Description: Update survey_responses table to support multi-select dashboards,
--              issue chips, improvement chips, mood tags, generated summaries, and custom notes.

begin;

alter table public.survey_responses
  add column if not exists dashboard_keys text[] not null default '{}'::text[],
  add column if not exists issue_tags text[] not null default '{}'::text[],
  add column if not exists improvement_tags text[] not null default '{}'::text[],
  add column if not exists mood_tags text[] not null default '{}'::text[],
  add column if not exists generated_summary text,
  add column if not exists custom_note text;

-- Backfill dashboard_keys from old single dashboard_key
update public.survey_responses
set dashboard_keys = array[dashboard_key]
where dashboard_key is not null and (dashboard_keys is null or cardinality(dashboard_keys) = 0);

commit;
