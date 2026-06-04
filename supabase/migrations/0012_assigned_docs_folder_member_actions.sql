-- WordPress Prompt System — member actions inside assigned Docs Drive folders
-- Run after 0011_member_docs_drive_create.sql.
--
-- Members may add and move their own files inside folders assigned to them.
-- They still cannot edit/delete admin-created files or delete admin folders.

drop policy if exists "docs_files_member_insert" on public.docs_files;
create policy "docs_files_member_insert" on public.docs_files
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      folder_id is null
      or exists (
        select 1 from public.docs_folders df
        where df.id = docs_files.folder_id
          and df.created_by = auth.uid()
      )
      or exists (
        select 1 from public.docs_assignments da
        where da.assigned_to = auth.uid()
          and da.assignment_type = 'folder'
          and da.folder_id = docs_files.folder_id
          and da.status <> 'archived'
      )
    )
  );

drop policy if exists "docs_files_member_update" on public.docs_files;
create policy "docs_files_member_update" on public.docs_files
  for update to authenticated
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and (
      folder_id is null
      or exists (
        select 1 from public.docs_folders df
        where df.id = docs_files.folder_id
          and df.created_by = auth.uid()
      )
      or exists (
        select 1 from public.docs_assignments da
        where da.assigned_to = auth.uid()
          and da.assignment_type = 'folder'
          and da.folder_id = docs_files.folder_id
          and da.status <> 'archived'
      )
    )
  );
