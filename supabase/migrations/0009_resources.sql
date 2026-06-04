-- WordPress Prompt System — Resources
-- A user-created library of files, links, notes, documents, references, and screenshots,
-- organized into folders / projects / websites / tasks.
-- Run after 0008_docs_drive.sql.

-- =========================================================
-- resources table
-- =========================================================
create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null
    check (type in ('file', 'link', 'note', 'document', 'website_ref', 'screenshot')),
  description text not null default '',
  folder_id uuid references public.folders(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  task_id uuid references public.section_tasks(id) on delete set null,
  -- File metadata (when type in ('file','screenshot')). file_url stores the
  -- Supabase Storage path within the 'resources' bucket, NOT a public URL.
  -- The client requests a signed URL on demand.
  file_url text,
  file_name text,
  file_type text,
  file_size bigint,
  -- Link target (when type in ('link','website_ref')).
  external_url text,
  -- Inline text (when type in ('note','document')).
  text_content text,
  visibility text not null default 'team'
    check (visibility in ('private', 'team', 'admin_only')),
  status text not null default 'published' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists resources_folder_idx on public.resources (folder_id);
create index if not exists resources_project_idx on public.resources (project_id);
create index if not exists resources_website_idx on public.resources (website_id);
create index if not exists resources_task_idx on public.resources (task_id);
create index if not exists resources_owner_idx on public.resources (created_by);
create index if not exists resources_type_idx on public.resources (type);

-- updated_at trigger (touch_updated_at exists from 0001_initial_schema.sql)
drop trigger if exists touch_updated_at on public.resources;
create trigger touch_updated_at before update on public.resources
  for each row execute function public.touch_updated_at();

-- =========================================================
-- RLS on resources
-- =========================================================
alter table public.resources enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'resources'
  loop
    execute format('drop policy if exists %I on public.resources', r.policyname);
  end loop;
end $$;

-- Admin: full control
create policy "resources_admin_all" on public.resources
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Member SELECT: their own + team-visible published + items where they're the owner
-- (admin_only visibility is hidden from members)
create policy "resources_member_select" on public.resources
  for select to authenticated using (
    created_by = auth.uid()
    or (visibility = 'team' and status = 'published')
  );

-- Member INSERT: must set themselves as creator
create policy "resources_member_insert" on public.resources
  for insert to authenticated
  with check (created_by = auth.uid() and visibility in ('private', 'team'));

-- Member UPDATE: only their own; cannot upgrade visibility to admin_only
create policy "resources_member_update" on public.resources
  for update to authenticated
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and visibility in ('private', 'team')
  );

-- Member DELETE: only their own
create policy "resources_member_delete" on public.resources
  for delete to authenticated
  using (created_by = auth.uid());

-- =========================================================
-- Storage bucket for uploaded files
-- =========================================================
insert into storage.buckets (id, name, public)
values ('resources', 'resources', false)
on conflict (id) do nothing;

-- Drop old policies before re-creating (idempotent re-runs).
do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname like 'resources_storage_%'
  loop
    execute format('drop policy if exists %I on storage.objects', r.policyname);
  end loop;
end $$;

-- Upload: authenticated users can write only into a folder named after their own user id.
create policy "resources_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'resources'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: owner of the folder, admin, or anyone for whom there's a published team-visible
-- resource pointing at this object.
create policy "resources_storage_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'resources'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
      or exists (
        select 1 from public.resources r
        where r.file_url = storage.objects.name
          and r.visibility = 'team'
          and r.status = 'published'
      )
    )
  );

-- Update: owner or admin (rare; needed if file is replaced).
create policy "resources_storage_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'resources'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  )
  with check (
    bucket_id = 'resources'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );

-- Delete: owner or admin.
create policy "resources_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'resources'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.is_admin()
    )
  );
