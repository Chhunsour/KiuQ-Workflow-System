-- KiuQ Website System — Fix infinite RLS recursion on docs_files
-- The docs_files_member_read policy queries docs_assignments,
-- whose own RLS policies can trigger evaluation of docs_files policies again.
-- Fix: use a SECURITY DEFINER helper that bypasses RLS.

-- 1. Helper that checks if a user has access to a doc file (bypasses RLS)
create or replace function public.can_read_doc_file(p_file_id uuid, p_folder_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.docs_assignments da
    where da.assigned_to = auth.uid()
      and (da.file_id = p_file_id or da.folder_id = p_folder_id)
  );
$$;

revoke all on function public.can_read_doc_file(uuid, uuid) from public;
grant execute on function public.can_read_doc_file(uuid, uuid) to authenticated;

-- 2. Helper that checks if a user has folder-level access (for insert/update policies)
create or replace function public.can_write_doc_in_folder(p_folder_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    p_folder_id is null
    or exists (
      select 1 from public.docs_folders df
      where df.id = p_folder_id and df.created_by = auth.uid()
    )
    or exists (
      select 1 from public.docs_assignments da
      where da.assigned_to = auth.uid()
        and da.assignment_type = 'folder'
        and da.folder_id = p_folder_id
        and da.status <> 'archived'
    );
$$;

revoke all on function public.can_write_doc_in_folder(uuid) from public;
grant execute on function public.can_write_doc_in_folder(uuid) to authenticated;

-- 3. Replace the problematic docs_files policies

drop policy if exists "docs_files_member_read" on public.docs_files;
create policy "docs_files_member_read" on public.docs_files
  for select to authenticated using (
    public.can_read_doc_file(id, folder_id)
  );

drop policy if exists "docs_files_member_insert" on public.docs_files;
create policy "docs_files_member_insert" on public.docs_files
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.can_write_doc_in_folder(folder_id)
  );

drop policy if exists "docs_files_member_update" on public.docs_files;
create policy "docs_files_member_update" on public.docs_files
  for update to authenticated
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and public.can_write_doc_in_folder(folder_id)
  );

-- 4. Also fix docs_folders_member_read which has the same cross-table issue
drop policy if exists "docs_folders_member_read" on public.docs_folders;
create policy "docs_folders_member_read" on public.docs_folders
  for select to authenticated using (
    exists (
      select 1 from public.docs_assignments da
      where da.assigned_to = auth.uid()
        and da.folder_id = docs_folders.id
    )
    or public.can_read_doc_file(null, id)
  );
