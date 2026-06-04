-- WordPress Prompt System — user profile fields
-- Run after 0006_daily_workflow.sql.

alter table public.profiles
  add column if not exists avatar_url text not null default '',
  add column if not exists position text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists bio text not null default '',
  add column if not exists preferred_theme text not null default 'light';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_theme_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_theme_check
      check (preferred_theme in ('light', 'dark-gray'));
  end if;
end $$;

-- Members should only read their own profile. Admins can read/manage all profiles.
drop policy if exists "profiles_read_authenticated" on public.profiles;
drop policy if exists "profiles_read_self_or_admin" on public.profiles;

create policy "profiles_read_self_or_admin" on public.profiles
  for select to authenticated
  using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_self_insert" on public.profiles;

create policy "profiles_self_insert" on public.profiles
  for insert to authenticated
  with check (
    auth.uid() = id
    and role = 'member'
    and status = 'active'
  );

-- Keep members from changing their own role/status. Email is editable by the app
-- when the user confirms the change through Supabase Auth.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.role = old.role;
    new.status = old.status;
  end if;
  return new;
end;
$$;

-- Public avatar bucket. Users can only write inside their own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars_public_read" on storage.objects;
drop policy if exists "avatars_owner_insert" on storage.objects;
drop policy if exists "avatars_owner_update" on storage.objects;
drop policy if exists "avatars_owner_delete" on storage.objects;

create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatars_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "avatars_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
