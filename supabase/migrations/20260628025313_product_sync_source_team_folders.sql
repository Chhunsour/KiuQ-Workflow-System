-- ────────────────────────────────────────────────────────────────────────────
--  Repoint product sync source: cms_products → team_folders
--
--  The real product catalog (the Image/Product Content Dashboard at /images)
--  lives in public.team_folders (+ team_images), with sku/price/descriptions/
--  images. The sync tables originally referenced cms_products; this repoints
--  their product_id foreign keys to team_folders. The sync tables are empty
--  (no syncs run yet), so re-pointing the FKs is safe.
-- ────────────────────────────────────────────────────────────────────────────

begin;

-- product_website_overrides.product_id → team_folders(id)
alter table public.product_website_overrides
  drop constraint if exists product_website_overrides_product_id_fkey;
alter table public.product_website_overrides
  add constraint product_website_overrides_product_id_fkey
  foreign key (product_id) references public.team_folders(id) on delete cascade;

-- product_sync_state.product_id → team_folders(id)
alter table public.product_sync_state
  drop constraint if exists product_sync_state_product_id_fkey;
alter table public.product_sync_state
  add constraint product_sync_state_product_id_fkey
  foreign key (product_id) references public.team_folders(id) on delete cascade;

-- product_sync_logs.product_id → team_folders(id)
alter table public.product_sync_logs
  drop constraint if exists product_sync_logs_product_id_fkey;
alter table public.product_sync_logs
  add constraint product_sync_logs_product_id_fkey
  foreign key (product_id) references public.team_folders(id) on delete set null;

commit;
