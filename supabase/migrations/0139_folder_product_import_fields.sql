-- Migration: 0139_folder_product_import_fields.sql
-- Description: Adds SKU + product-import metadata to team_folders so the
--              Image/Product Content Dashboard can store data imported from an
--              external WooCommerce product catalog (scan-product-category).
--              short_description / description / button_url already exist (0120).

begin;

alter table public.team_folders
  -- imported product fields
  add column if not exists sku text null,
  -- import provenance / audit metadata
  add column if not exists imported_from_url text null,
  add column if not exists imported_product_title text null,
  add column if not exists import_confidence integer null,
  add column if not exists imported_at timestamptz null,
  add column if not exists imported_by uuid null references public.profiles(id) on delete set null;

-- Guard the confidence range (0–100) when present.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_folders_import_confidence_range'
  ) then
    alter table public.team_folders
      add constraint team_folders_import_confidence_range
      check (import_confidence is null or (import_confidence >= 0 and import_confidence <= 100));
  end if;
end $$;

commit;
