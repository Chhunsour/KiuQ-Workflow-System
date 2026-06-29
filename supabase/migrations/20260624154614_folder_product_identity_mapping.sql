-- Product identity mapping for Image/Product Content Dashboard folders.
--
-- Matching must be by stable identity (product_id/product_slug/folder path),
-- not by fuzzy title similarity. Nullable fields keep existing folders working
-- while unmapped rows can be flagged for manual mapping.

begin;

alter table public.team_folders
  add column if not exists product_id text null,
  add column if not exists product_slug text null,
  add column if not exists product_folder_path text null,
  add column if not exists image_folder_path text null,
  add column if not exists product_mapping_status text not null default 'needs_manual_mapping';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_folders_product_mapping_status_valid'
  ) then
    alter table public.team_folders
      add constraint team_folders_product_mapping_status_valid
      check (product_mapping_status in ('mapped', 'needs_manual_mapping', 'unmapped'));
  end if;
end $$;

create unique index if not exists team_folders_product_id_uidx
  on public.team_folders (product_id)
  where product_id is not null;

create unique index if not exists team_folders_product_slug_uidx
  on public.team_folders (product_slug)
  where product_slug is not null;

create index if not exists team_folders_product_mapping_status_idx
  on public.team_folders (product_mapping_status);

commit;
