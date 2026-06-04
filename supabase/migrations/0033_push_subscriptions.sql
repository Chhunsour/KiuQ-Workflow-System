-- Push notification device token registry
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  fcm_token    text not null,
  device_name  text not null default '',
  browser      text not null default '',
  platform     text not null default '',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  unique (user_id, fcm_token)
);

-- Index for fast lookup when sending notifications
create index if not exists push_subscriptions_user_active
  on public.push_subscriptions (user_id, is_active);

-- RLS: users can only manage their own tokens
alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Admins can read all (needed to send notifications to others)
create policy "push_subscriptions_admin_read" on public.push_subscriptions
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
