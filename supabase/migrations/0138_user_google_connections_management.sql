-- Migration: 0138_user_google_connections_management.sql
-- Description: Implement per-user Google Search Console management functions and RLS policies.

-- 1. Helper function: is the user a manager? (Owner, Head, Admin, Supervisor)
create or replace function public.is_management()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner', 'head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.is_management() from public;
grant execute on function public.is_management() to authenticated;

-- 2. Update SELECT policy on user_google_connections
drop policy if exists "user_google_connections_select" on public.user_google_connections;
create policy "user_google_connections_select" on public.user_google_connections
  for select to authenticated
  using (auth.uid() = user_id or public.is_management());

-- 3. Update DELETE policy on user_google_connections to allow owner or management to disconnect/delete
drop policy if exists "user_google_connections_delete" on public.user_google_connections;
create policy "user_google_connections_delete" on public.user_google_connections
  for delete to authenticated
  using (auth.uid() = user_id or public.is_management());

-- 4. Update website_gsc_connections RLS policies to allow management OR website creator/owner to manage mappings
drop policy if exists "gsc_connections_manage" on public.website_gsc_connections;
create policy "gsc_connections_manage" on public.website_gsc_connections
  for all to authenticated
  using (
    public.is_management() or exists (
      select 1 from public.websites
      where id = website_id and created_by = auth.uid()
    )
  )
  with check (
    public.is_management() or exists (
      select 1 from public.websites
      where id = website_id and created_by = auth.uid()
    )
  );
