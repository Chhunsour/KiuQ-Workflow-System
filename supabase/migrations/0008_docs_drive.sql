-- WordPress Prompt System — Docs Drive (folders + files + assignments)
-- Phase: replaces the old "team docs / articles" Docs page concept
-- with a Google-Drive-style organizer for external links.
-- Run after 0007_user_profiles.sql.
--
-- This does NOT integrate with Google Drive. It only stores external URLs.

-- =========================================================
-- docs_folders
-- =========================================================
create table if not exists public.docs_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  related_project_id uuid references public.projects(id) on delete set null,
  related_website_id uuid references public.websites(id) on delete set null,
  folder_color text not null default '#3f8dfe',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docs_folders_project_idx on public.docs_folders (related_project_id);
create index if not exists docs_folders_website_idx on public.docs_folders (related_website_id);
create index if not exists docs_folders_created_by_idx on public.docs_folders (created_by);

-- =========================================================
-- docs_files
-- =========================================================
create table if not exists public.docs_files (
  id uuid primary key default gen_random_uuid(),
  folder_id uuid references public.docs_folders(id) on delete cascade,
  title text not null,
  type text not null default 'other'
    check (type in ('google_doc','google_sheet','google_drive','pdf','image_folder','website_link','other')),
  url text not null default '',
  description text not null default '',
  related_project_id uuid references public.projects(id) on delete set null,
  related_website_id uuid references public.websites(id) on delete set null,
  related_task_id uuid references public.section_tasks(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists docs_files_folder_idx on public.docs_files (folder_id);
create index if not exists docs_files_project_idx on public.docs_files (related_project_id);
create index if not exists docs_files_website_idx on public.docs_files (related_website_id);
create index if not exists docs_files_created_by_idx on public.docs_files (created_by);

-- =========================================================
-- docs_assignments  (one folder OR one file, sent to one member)
-- =========================================================
create table if not exists public.docs_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_type text not null check (assignment_type in ('folder', 'file')),
  folder_id uuid references public.docs_folders(id) on delete cascade,
  file_id uuid references public.docs_files(id) on delete cascade,
  assigned_to uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  related_project_id uuid references public.projects(id) on delete set null,
  related_website_id uuid references public.websites(id) on delete set null,
  message text not null default '',
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_date date,
  status text not null default 'sent'
    check (status in ('sent', 'viewed', 'used', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint docs_assignments_target_xor check (
    (assignment_type = 'folder' and folder_id is not null and file_id is null)
    or
    (assignment_type = 'file' and file_id is not null and folder_id is null)
  )
);

create index if not exists docs_assignments_assigned_to_idx on public.docs_assignments (assigned_to);
create index if not exists docs_assignments_folder_idx on public.docs_assignments (folder_id);
create index if not exists docs_assignments_file_idx on public.docs_assignments (file_id);
create index if not exists docs_assignments_project_idx on public.docs_assignments (related_project_id);

-- =========================================================
-- updated_at triggers
-- =========================================================
do $$
declare
  t text;
begin
  for t in
    select unnest(array['docs_folders','docs_files','docs_assignments'])
  loop
    execute format(
      'drop trigger if exists touch_updated_at on public.%I;
       create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;

-- =========================================================
-- RLS
-- =========================================================
alter table public.docs_folders     enable row level security;
alter table public.docs_files       enable row level security;
alter table public.docs_assignments enable row level security;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('docs_folders','docs_files','docs_assignments')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- ---- docs_folders
-- Admin: read/write everything.
-- Member: read folders that are assigned to them directly,
--         OR contain a file that's assigned to them.
create policy "docs_folders_admin_all" on public.docs_folders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "docs_folders_member_read" on public.docs_folders
  for select to authenticated using (
    exists (
      select 1 from public.docs_assignments da
      where da.assigned_to = auth.uid()
        and da.folder_id = docs_folders.id
    )
    or exists (
      select 1
      from public.docs_assignments da
      join public.docs_files df on df.id = da.file_id
      where da.assigned_to = auth.uid()
        and df.folder_id = docs_folders.id
    )
  );

-- ---- docs_files
-- Admin: read/write everything.
-- Member: read files directly assigned to them OR sitting in a folder assigned to them.
create policy "docs_files_admin_all" on public.docs_files
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "docs_files_member_read" on public.docs_files
  for select to authenticated using (
    exists (
      select 1 from public.docs_assignments da
      where da.assigned_to = auth.uid()
        and (da.file_id = docs_files.id or da.folder_id = docs_files.folder_id)
    )
  );

-- ---- docs_assignments
-- Admin: full control.
-- Member: read assignments addressed to them, and update their own status
--         (mark Viewed / Used / Archived).
create policy "docs_assignments_admin_all" on public.docs_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "docs_assignments_member_read" on public.docs_assignments
  for select to authenticated using (assigned_to = auth.uid());

create policy "docs_assignments_member_update" on public.docs_assignments
  for update to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());
