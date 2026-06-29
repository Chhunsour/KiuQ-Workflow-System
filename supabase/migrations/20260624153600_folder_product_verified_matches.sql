-- Persist manual/verified matches for the Product Content / Image Dashboard.
-- These fields are separate from imported content so users can save a safe
-- mapping without immediately writing SKU or descriptions.

begin;

alter table public.team_folders
  add column if not exists matched_product_url text null,
  add column if not exists matched_product_title text null,
  add column if not exists matched_product_sku text null,
  add column if not exists match_method text null,
  add column if not exists match_confidence integer null,
  add column if not exists match_verified_by_user boolean not null default false,
  add column if not exists matched_at timestamptz null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'team_folders_match_method_valid'
  ) then
    alter table public.team_folders
      add constraint team_folders_match_method_valid
      check (match_method is null or match_method in ('auto', 'manual'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'team_folders_match_confidence_range'
  ) then
    alter table public.team_folders
      add constraint team_folders_match_confidence_range
      check (match_confidence is null or (match_confidence >= 0 and match_confidence <= 100));
  end if;
end $$;

create index if not exists team_folders_matched_product_url_idx
  on public.team_folders (matched_product_url)
  where matched_product_url is not null;

commit;
