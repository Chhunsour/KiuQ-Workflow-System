-- Migration: Add website platform type tracking
-- Adds platform_type field with default 'unknown' and safe backfilling of old records.

alter table public.websites
  add column if not exists platform_type text default 'unknown';

-- Check constraint to ensure only wordpress, framework, and unknown are allowed
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'websites_platform_type_check'
  ) then
    alter table public.websites
      add constraint websites_platform_type_check
      check (platform_type in ('wordpress', 'framework', 'unknown'));
  end if;
end $$;

-- Backfill old records
-- If the website was previously marked is_framework, set it to framework, otherwise unknown
update public.websites
  set platform_type = 'framework'
  where platform_type is null and is_framework = true;

update public.websites
  set platform_type = 'unknown'
  where platform_type is null;
