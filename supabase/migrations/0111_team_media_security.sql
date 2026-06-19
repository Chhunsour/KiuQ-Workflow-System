-- Migration: 0111_team_media_security.sql
-- Description: Overrides loose RLS policies for team_folders and team_images to restrict editing/deletion to managers and resource creators.

begin;

-- 1. Drop existing loose RLS policies on team_folders
drop policy if exists "team_folders_update" on public.team_folders;
drop policy if exists "team_folders_delete" on public.team_folders;

-- 2. Create restricted policies for team_folders
create policy "team_folders_update" on public.team_folders
  for update to authenticated
  using (public.is_admin() or auth.uid() = created_by);

create policy "team_folders_delete" on public.team_folders
  for delete to authenticated
  using (public.is_admin() or auth.uid() = created_by);

-- 3. Drop existing loose RLS policies on team_images
drop policy if exists "team_images_update" on public.team_images;
drop policy if exists "team_images_delete" on public.team_images;

-- 4. Create restricted policies for team_images
create policy "team_images_update" on public.team_images
  for update to authenticated
  using (public.is_admin() or auth.uid() = uploaded_by);

create policy "team_images_delete" on public.team_images
  for delete to authenticated
  using (public.is_admin() or auth.uid() = uploaded_by);

commit;
