-- =========================================================
-- Blog Image Library Workspace
-- Table and storage bucket for uploading, managing, and
-- selecting blog featured images.
-- =========================================================

-- ─── Table ───────────────────────────────────────────────
create table if not exists public.blog_images (
  id           uuid primary key default gen_random_uuid(),
  website_id   uuid not null references public.websites(id) on delete cascade,
  image_url    text not null,
  title        text not null default '',
  machine_type text not null default '',
  tags         text[] not null default '{}',
  approved     boolean not null default false,
  uploaded_by  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists blog_images_website_idx on public.blog_images (website_id);
create index if not exists blog_images_uploaded_by_idx on public.blog_images (uploaded_by);

-- ─── Trigger ─────────────────────────────────────────────
drop trigger if exists touch_updated_at on public.blog_images;
create trigger touch_updated_at before update on public.blog_images
  for each row execute function public.touch_updated_at();

-- ─── RLS ─────────────────────────────────────────────────
alter table public.blog_images enable row level security;

-- Select: Authenticated users can read images (if they are not quality checkers)
create policy "bil_select" on public.blog_images
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role != 'quality_checker'
        and status = 'active'
    )
  );

-- Insert: Authenticated users can upload (if not quality checkers)
create policy "bil_insert" on public.blog_images
  for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and role != 'quality_checker'
        and status = 'active'
    )
    and uploaded_by = auth.uid()
  );

-- Update: Head/Supervisor (is_admin), Assistant Head (is_assistant_head),
-- or the owner of the image (uploaded_by = auth.uid()) if they are a team member
create policy "bil_update" on public.blog_images
  for update to authenticated
  using (
    public.is_admin()
    or public.is_assistant_head()
    or (
      uploaded_by = auth.uid()
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role in ('member', 'team_member')
          and status = 'active'
      )
    )
  );

-- Delete: Head/Supervisor (is_admin), or the owner of the image (uploaded_by = auth.uid()) if not a quality checker
create policy "bil_delete" on public.blog_images
  for delete to authenticated
  using (
    public.is_admin()
    or (
      uploaded_by = auth.uid()
      and exists (
        select 1 from public.profiles
        where id = auth.uid()
          and role != 'quality_checker'
          and status = 'active'
      )
    )
  );

-- ─── Storage Bucket ──────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  10485760, -- 10 MB limit
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bil_storage_read" on storage.objects;
drop policy if exists "bil_storage_insert" on storage.objects;
drop policy if exists "bil_storage_delete" on storage.objects;

-- Public read access to storage files
create policy "bil_storage_read" on storage.objects
  for select using (bucket_id = 'blog-images');

-- Authenticated users can upload to storage
create policy "bil_storage_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-images');

-- Authenticated users can delete their own uploads
create policy "bil_storage_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-images');

-- ─── Realtime ─────────────────────────────────────────────
alter publication supabase_realtime add table public.blog_images;
