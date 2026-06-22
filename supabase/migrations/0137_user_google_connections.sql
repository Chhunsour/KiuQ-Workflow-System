-- Migration: 0137_user_google_connections.sql
-- Description: Create user_google_connections table to allow every user to connect their own Search Console Google account.

create table if not exists public.user_google_connections (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade unique,
  google_email     text,
  provider         text not null default 'google',
  access_token     text,
  refresh_token    text not null,
  token_expires_at timestamptz,
  scopes           text,
  connected_at     timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  status           text not null default 'connected',
  last_error       text
);

-- Enable Row Level Security
alter table public.user_google_connections enable row level security;

-- Policies for Row Level Security
drop policy if exists "user_google_connections_select" on public.user_google_connections;
create policy "user_google_connections_select" on public.user_google_connections
  for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "user_google_connections_delete" on public.user_google_connections;
create policy "user_google_connections_delete" on public.user_google_connections
  for delete to authenticated
  using (auth.uid() = user_id);

-- Restrict select privilege on raw tokens (access_token/refresh_token) to service_role only
revoke select on public.user_google_connections from public, authenticated;
grant select(id, user_id, google_email, provider, token_expires_at, scopes, connected_at, updated_at, status, last_error) on public.user_google_connections to authenticated;
grant all on public.user_google_connections to service_role;

-- Migrate existing legacy connections into user_google_connections to ensure zero downtime/disruption
insert into public.user_google_connections (
  user_id,
  google_email,
  provider,
  access_token,
  refresh_token,
  token_expires_at,
  scopes,
  connected_at,
  updated_at,
  status
)
select 
  coalesce(connected_by, (select id from public.profiles where role in ('owner', 'admin', 'head') order by role limit 1)),
  google_email,
  'google',
  access_token,
  refresh_token,
  token_expiry,
  scope,
  created_at,
  updated_at,
  'connected'
from public.gsc_oauth_accounts
on conflict (user_id) do nothing;
