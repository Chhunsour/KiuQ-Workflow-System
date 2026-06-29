-- Soft-delete ("Trash bin") for the Image/Product Content Dashboard folders.
--
-- Instead of hard-deleting a folder (which would orphan/move its images),
-- folders are flagged with deleted_at so they can be reviewed and restored.
-- All normal folder queries filter `deleted_at is null`; the Trash view shows
-- `deleted_at is not null`. Permanent delete still removes the row (and its
-- images fall back to Uncategorized via the existing ON DELETE SET NULL FK).

begin;

alter table public.team_folders
  add column if not exists deleted_at timestamptz null,
  add column if not exists deleted_by uuid null references public.profiles(id) on delete set null;

create index if not exists team_folders_deleted_at_idx
  on public.team_folders (deleted_at)
  where deleted_at is not null;

commit;
