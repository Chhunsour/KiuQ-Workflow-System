-- Migration: Team Media Repository (Folders and Images)
-- Tables and storage bucket for uploading, managing, and organizing team images.

-- ─── Folders Table ───────────────────────────────────────
create table if not exists public.team_folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ─── Images Table ────────────────────────────────────────
create table if not exists public.team_images (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  name        text not null,
  folder_id   uuid references public.team_folders(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ─── Row Level Security (RLS) ───────────────────────────
alter table public.team_folders enable row level security;
alter table public.team_images enable row level security;

-- Policies for team_folders
create policy "team_folders_select" on public.team_folders
  for select to authenticated using (true);

create policy "team_folders_insert" on public.team_folders
  for insert to authenticated with check (auth.uid() = created_by);

create policy "team_folders_update" on public.team_folders
  for update to authenticated using (true);

create policy "team_folders_delete" on public.team_folders
  for delete to authenticated using (true);

-- Policies for team_images
create policy "team_images_select" on public.team_images
  for select to authenticated using (true);

create policy "team_images_insert" on public.team_images
  for insert to authenticated with check (auth.uid() = uploaded_by);

create policy "team_images_update" on public.team_images
  for update to authenticated using (true);

create policy "team_images_delete" on public.team_images
  for delete to authenticated using (true);

-- ─── Storage Bucket ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'team-images',
  'team-images',
  true,
  20971520, -- 20 MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Public read access to storage files
create policy "team_images_storage_read" on storage.objects
  for select using (bucket_id = 'team-images');

-- Authenticated users can upload to storage under their own folder segment
create policy "team_images_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'team-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Authenticated users can delete their own files in storage
create policy "team_images_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'team-images'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ─── Realtime ─────────────────────────────────────────────
alter publication supabase_realtime add table public.team_folders;
alter publication supabase_realtime add table public.team_images;
