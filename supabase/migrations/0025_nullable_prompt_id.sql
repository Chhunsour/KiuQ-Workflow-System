-- KiuQ Website System — Allow task cards without a prompt template
-- The work board creates general task cards that don't always need a prompt.
-- Make prompt_id nullable so bulk assign and general tasks can work.

alter table public.prompt_assignments
  alter column prompt_id drop not null;
