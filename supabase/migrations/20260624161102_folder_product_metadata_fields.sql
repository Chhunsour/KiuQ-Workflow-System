-- Separate scanned product metadata from product descriptions.
--
-- GTIN, price, and category are metadata. They must not be written into
-- team_folders.description as a fallback full description.

begin;

alter table public.team_folders
  add column if not exists product_gtin text null,
  add column if not exists product_price text null,
  add column if not exists product_category text null;

create index if not exists team_folders_product_gtin_idx
  on public.team_folders (product_gtin)
  where product_gtin is not null;

create index if not exists team_folders_product_category_idx
  on public.team_folders (product_category)
  where product_category is not null;

commit;
