-- Migration: Public CMS media bucket
--
-- Mirrors the safe pattern used by the `quality-screenshots` bucket
-- (migration 0051): public read so the framework website can serve
-- <img src="..."> directly, authenticated upload only, owners (and
-- admins) can update/delete their own files.
--
-- Paths follow the convention "<uploader-uid>/<timestamp>-<rand>-<name>"
-- so storage policies can attribute ownership to the first path segment.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cms-media',
  'cms-media',
  true,
  20971520, -- 20 MB per file; bumps from quality-screenshots' 15 MB
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "cms_media_public_read"   on storage.objects;
drop policy if exists "cms_media_owner_insert"  on storage.objects;
drop policy if exists "cms_media_owner_update"  on storage.objects;
drop policy if exists "cms_media_owner_delete"  on storage.objects;

-- Public read for the framework website (no JWT required).
create policy "cms_media_public_read" on storage.objects
  for select using (bucket_id = 'cms-media');

-- Authenticated upload — uploader's UID must be the first path segment.
-- We DO NOT block Quality Checker explicitly at the storage layer; QCs
-- can't reach any CMS UI to trigger an upload, and even if they did,
-- the cms_products RLS would reject any row referencing their upload.
create policy "cms_media_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cms-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update/delete: the owner OR an admin (Head/Supervisor/legacy admin).
create policy "cms_media_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cms-media'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id = 'cms-media'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "cms_media_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cms-media'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
