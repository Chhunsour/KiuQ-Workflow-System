-- Migration: 0120_add_folder_content_fields.sql
-- Description: Adds short_description, description, button_url, and updated_at columns to team_folders.
--              Updates team_folders update policies to restrict quality checkers and manage edit permissions.

begin;

-- 1. Add fields to team_folders table
alter table public.team_folders
  add column if not exists short_description text null,
  add column if not exists description text null,
  add column if not exists button_url text null,
  add column if not exists updated_at timestamptz default now() not null;

-- 2. Drop and recreate update policy on team_folders to be robust and precise
drop policy if exists "team_folders_update" on public.team_folders;

create policy "team_folders_update" on public.team_folders
  for update to authenticated
  using (
    (public.is_admin() or public.is_assistant_head() or auth.uid() = created_by)
    and not public.is_quality_checker()
  );

commit;
