-- Migration: 0099_winner_center_testing_mode.sql
-- Description: Adds Winner Center testing mode, test-spin isolation, and reset audit logging.
-- Idempotent: safe to re-run.

begin;

-- Winner Center is now available to Owner/Admin/Head/Supervisor. Testing-mode
-- controls are deliberately narrower and are handled by the helper below.
create or replace function public.can_manage_winner_center()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('owner', 'admin', 'head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.can_manage_winner_center() from public;
grant execute on function public.can_manage_winner_center() to authenticated;

create or replace function public.can_toggle_winner_center_testing()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.can_toggle_winner_center_testing() from public;
grant execute on function public.can_toggle_winner_center_testing() to authenticated;

create table if not exists public.winner_center_settings (
  id                   text primary key default 'global' check (id = 'global'),
  testing_mode_enabled boolean not null default false,
  updated_by           uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

insert into public.winner_center_settings (id, testing_mode_enabled)
values ('global', false)
on conflict (id) do nothing;

create table if not exists public.winner_center_audit_log (
  id             uuid primary key default gen_random_uuid(),
  action         text not null,
  month_key      text,
  winner_user_id uuid references public.profiles(id) on delete set null,
  actor_id       uuid references public.profiles(id) on delete set null default auth.uid(),
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.winner_center_wheel_spins
  add column if not exists spin_result jsonb not null default '{}'::jsonb,
  add column if not exists is_test_spin boolean not null default false;

create index if not exists winner_center_wheel_spins_test_idx
  on public.winner_center_wheel_spins (is_test_spin, month_key, spun_at desc);

create index if not exists winner_center_audit_log_month_idx
  on public.winner_center_audit_log (month_key, created_at desc);

alter table public.winner_center_settings enable row level security;
alter table public.winner_center_audit_log enable row level security;

drop policy if exists "winner_center_settings_select" on public.winner_center_settings;
create policy "winner_center_settings_select" on public.winner_center_settings
  for select to authenticated
  using (public.can_manage_winner_center());

drop policy if exists "winner_center_settings_insert" on public.winner_center_settings;
create policy "winner_center_settings_insert" on public.winner_center_settings
  for insert to authenticated
  with check (public.can_toggle_winner_center_testing());

drop policy if exists "winner_center_settings_update" on public.winner_center_settings;
create policy "winner_center_settings_update" on public.winner_center_settings
  for update to authenticated
  using (public.can_toggle_winner_center_testing())
  with check (public.can_toggle_winner_center_testing());

drop policy if exists "winner_center_audit_log_select" on public.winner_center_audit_log;
create policy "winner_center_audit_log_select" on public.winner_center_audit_log
  for select to authenticated
  using (public.can_manage_winner_center());

drop policy if exists "winner_center_audit_log_insert" on public.winner_center_audit_log;
create policy "winner_center_audit_log_insert" on public.winner_center_audit_log
  for insert to authenticated
  with check (public.can_manage_winner_center());

drop trigger if exists touch_updated_at on public.winner_center_settings;
create trigger touch_updated_at before update on public.winner_center_settings
  for each row execute function public.touch_updated_at();

do $$
declare
  target_table text;
  realtime_tables text[] := array[
    'winner_center_settings',
    'winner_center_audit_log'
  ];
begin
  foreach target_table in array realtime_tables
  loop
    execute format('alter table public.%I replica identity full', target_table);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end $$;

commit;

-- Verify:
--   select * from public.winner_center_settings;
--   select public.can_toggle_winner_center_testing();
--   select is_test_spin, spin_result from public.winner_center_wheel_spins limit 5;
