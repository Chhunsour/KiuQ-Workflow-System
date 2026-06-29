-- Add gtin text field to team_folders if missing
alter table public.team_folders add column if not exists gtin text null;

-- Add index on gtin for optimization
create index if not exists team_folders_gtin_idx
  on public.team_folders (gtin)
  where gtin is not null;
