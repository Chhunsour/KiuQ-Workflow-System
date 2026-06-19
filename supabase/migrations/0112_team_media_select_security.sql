-- Migration: 0112_team_media_select_security.sql
-- Description: Restricts select policies on team_images and team_folders to block access for Quality Checkers.

begin;

-- 1. Restruct select policy for team_folders
drop policy if exists "team_folders_select" on public.team_folders;
create policy "team_folders_select" on public.team_folders
  for select to authenticated
  using (not public.is_quality_checker());

-- 2. Restrict select policy for team_images
drop policy if exists "team_images_select" on public.team_images;
create policy "team_images_select" on public.team_images
  for select to authenticated
  using (not public.is_quality_checker());

commit;
