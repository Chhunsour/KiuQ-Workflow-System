-- Migration: 0078_system_updates.sql
-- Create system_updates table and add last_seen_update_id to profiles

-- 1. Add last_seen_update_id to profiles table
alter table public.profiles
  add column if not exists last_seen_update_id text not null default '';

-- 2. Create system_updates table
create table if not exists public.system_updates (
  id uuid primary key default gen_random_uuid(),
  update_id text not null unique,
  type text not null check (type in ('feature', 'fix', 'improvement', 'announcement')),
  title text not null,
  message text not null,
  read_more_url text not null default '',
  is_official boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 3. RLS Policies for system_updates
alter table public.system_updates enable row level security;

create policy "system_updates_read_authenticated" on public.system_updates
  for select to authenticated
  using (true);

create policy "system_updates_admin_all" on public.system_updates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
