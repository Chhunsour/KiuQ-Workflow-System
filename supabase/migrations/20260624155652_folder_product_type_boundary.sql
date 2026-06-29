-- Product type boundary for Product Content / Image Dashboard matching.
--
-- Equipment and attachments must be separated before exact identity matching.
-- Nullable product_type keeps existing rows from being silently mislabeled;
-- unmapped rows remain manual-review candidates until the correct type is set.

begin;

alter table public.team_folders
  add column if not exists product_type text null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_folders_product_type_valid'
  ) then
    alter table public.team_folders
      add constraint team_folders_product_type_valid
      check (product_type is null or product_type in ('equipment', 'attachment'));
  end if;
end $$;

create index if not exists team_folders_product_type_idx
  on public.team_folders (product_type);

create index if not exists team_folders_product_type_slug_idx
  on public.team_folders (product_type, product_slug)
  where product_slug is not null;

alter table public.cms_products
  add column if not exists product_type text null,
  add column if not exists compatible_with jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cms_products_product_type_valid'
  ) then
    alter table public.cms_products
      add constraint cms_products_product_type_valid
      check (product_type is null or product_type in ('equipment', 'attachment'));
  end if;
end $$;

create index if not exists cms_products_product_type_idx
  on public.cms_products (product_type);

create index if not exists cms_products_product_type_category_idx
  on public.cms_products (product_type, category);

commit;
