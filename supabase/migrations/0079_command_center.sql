-- Migration: 0079_command_center.sql
-- Description: Create command_center_entries and command_center_metrics tables, role helper function, and RLS policies.

-- 1. Helper function to check if user is Head or Supervisor
create or replace function public.is_head_or_supervisor()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.is_head_or_supervisor() from public;
grant execute on function public.is_head_or_supervisor() to authenticated;

-- 2. Create command_center_entries table
create table if not exists public.command_center_entries (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('daily_log', 'idea', 'decision', 'strategy', 'meeting_notes', 'reminder', 'note')),
  title text not null,
  content text not null default '',
  tags text[] not null default '{}',
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete cascade default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. Create command_center_metrics table
create table if not exists public.command_center_metrics (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  value text not null,
  trend text not null default '',
  updated_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. Enable Row Level Security
alter table public.command_center_entries enable row level security;
alter table public.command_center_metrics enable row level security;

-- 5. Create RLS Policies
create policy "command_center_entries_head_supervisor" on public.command_center_entries
  for all to authenticated
  using (public.is_head_or_supervisor())
  with check (public.is_head_or_supervisor());

create policy "command_center_metrics_head_supervisor" on public.command_center_metrics
  for all to authenticated
  using (public.is_head_or_supervisor())
  with check (public.is_head_or_supervisor());

-- 6. Attach updated_at triggers
drop trigger if exists touch_updated_at on public.command_center_entries;
create trigger touch_updated_at before update on public.command_center_entries
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.command_center_metrics;
create trigger touch_updated_at before update on public.command_center_metrics
  for each row execute function public.touch_updated_at();

-- 7. Seed initial metrics
insert into public.command_center_metrics (label, value, trend) values
  ('Monthly Revenue', '$48,250', '+12.4%'),
  ('Web Traffic (Monthly)', '124,500', '+5.8%'),
  ('Active Projects', '14', 'stable'),
  ('Conversion Rate', '3.1%', '+0.4%')
on conflict do nothing;
 