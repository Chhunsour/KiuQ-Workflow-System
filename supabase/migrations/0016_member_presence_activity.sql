-- WordPress Prompt System — member presence and workflow activity visibility
-- Run after 0015_prompt_replacements.sql.

alter table public.profiles
  add column if not exists is_online boolean not null default false,
  add column if not exists current_status text not null default 'offline',
  add column if not exists last_active_at timestamptz,
  add column if not exists last_login_at timestamptz,
  add column if not exists last_logout_at timestamptz,
  add column if not exists today_activity_count integer not null default 0,
  add column if not exists current_page text not null default '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_current_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_current_status_check
      check (current_status in ('online', 'away', 'offline'));
  end if;
end $$;

create index if not exists profiles_last_active_idx on public.profiles (last_active_at desc);
create index if not exists profiles_current_status_idx on public.profiles (current_status);

create or replace function public.touch_profile_presence(
  p_current_page text default null,
  p_status text default 'online'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_now timestamptz := now();
begin
  if v_uid is null then
    return;
  end if;

  update public.profiles
  set
    is_online = p_status = 'online',
    current_status = case
      when p_status in ('online', 'away', 'offline') then p_status
      else 'online'
    end,
    last_active_at = case when p_status = 'online' then v_now else last_active_at end,
    current_page = coalesce(left(p_current_page, 180), current_page, ''),
    updated_at = v_now
  where id = v_uid;
end;
$$;

create or replace function public.record_activity_log(
  p_user_id uuid default null,
  p_action text default '',
  p_related_type text default 'none',
  p_related_id uuid default null,
  p_message text default '',
  p_current_page text default null,
  p_touch_presence boolean default true
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid := coalesce(p_user_id, auth.uid());
  v_now timestamptz := now();
begin
  if v_uid is null or v_target is null then
    return;
  end if;

  if v_target <> v_uid and not public.is_admin() then
    raise exception 'Not allowed to write activity for another user';
  end if;

  insert into public.activity_logs (
    user_id,
    action,
    related_type,
    related_id,
    message,
    created_at
  )
  values (
    v_target,
    coalesce(nullif(p_action, ''), 'activity'),
    coalesce(nullif(p_related_type, ''), 'none'),
    p_related_id,
    coalesce(p_message, ''),
    v_now
  );

  if p_touch_presence then
    update public.profiles
    set
      is_online = true,
      current_status = 'online',
      last_active_at = v_now,
      today_activity_count = case
        when last_active_at::date = v_now::date then today_activity_count + 1
        else 1
      end,
      current_page = coalesce(left(p_current_page, 180), current_page, ''),
      updated_at = v_now
    where id = v_target;
  end if;
end;
$$;
