-- Migration: add machine_category text field to team_folders for hierarchical categorization.
begin;

alter table public.team_folders
  add column if not exists machine_category text null;

create index if not exists team_folders_machine_category_idx
  on public.team_folders (machine_category)
  where machine_category is not null;

commit;
