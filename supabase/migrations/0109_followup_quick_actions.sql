-- Migration: 0109_followup_quick_actions.sql
-- Description: Adds administrative quick bulk actions metadata columns and permission-checked RPC functions for Blog Followup, Plugin Updates, and Speed Optimization.

begin;

-- ─── Alter slot tables ───

-- 1. Blog upload slots
alter table public.blog_upload_slots
  add column if not exists completed_by_role text,
  add column if not exists completed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists completion_source text not null default 'member_completed',
  add column if not exists reason text;

alter table public.blog_upload_slots
  drop constraint if exists blog_upload_slots_completion_source_check;

alter table public.blog_upload_slots
  add constraint blog_upload_slots_completion_source_check
  check (completion_source in ('member_completed', 'admin_auto_completed', 'admin_marked_not_required'));

create index if not exists blog_upload_slots_completion_source_idx
  on public.blog_upload_slots (completion_source);

-- 2. Plugin update slots
alter table public.plugin_update_slots
  add column if not exists completed_by_role text,
  add column if not exists completed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists completion_source text not null default 'member_completed',
  add column if not exists reason text;

alter table public.plugin_update_slots
  drop constraint if exists plugin_update_slots_completion_source_check;

alter table public.plugin_update_slots
  add constraint plugin_update_slots_completion_source_check
  check (completion_source in ('member_completed', 'admin_auto_completed', 'admin_marked_not_required'));

create index if not exists plugin_update_slots_completion_source_idx
  on public.plugin_update_slots (completion_source);

-- 3. Speed optimization slots
alter table public.speed_optimization_slots
  add column if not exists completed_by_role text,
  add column if not exists completed_by_user_id uuid references public.profiles(id) on delete set null,
  add column if not exists completion_source text not null default 'member_completed',
  add column if not exists reason text;

alter table public.speed_optimization_slots
  drop constraint if exists speed_optimization_slots_completion_source_check;

alter table public.speed_optimization_slots
  add constraint speed_optimization_slots_completion_source_check
  check (completion_source in ('member_completed', 'admin_auto_completed', 'admin_marked_not_required'));

create index if not exists speed_optimization_slots_completion_source_idx
  on public.speed_optimization_slots (completion_source);

-- ─── Migrate existing data ───

update public.blog_upload_slots
set completed_by_user_id = completed_by,
    completed_by_role = (select role from public.profiles where id = completed_by)
where completed_by is not null;

update public.plugin_update_slots
set completed_by_user_id = completed_by,
    completed_by_role = (select role from public.profiles where id = completed_by)
where completed_by is not null;

update public.speed_optimization_slots
set completed_by_user_id = completed_by,
    completed_by_role = (select role from public.profiles where id = completed_by)
where completed_by is not null;

-- ─── Logs table ───

create table if not exists public.followup_bulk_action_logs (
  id uuid primary key default gen_random_uuid(),
  followup_type text not null check (followup_type in ('blog', 'plugin', 'ebay', 'speed')),
  action_type text not null,
  admin_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  affected_count integer not null default 0,
  skipped_count integer not null default 0,
  date_or_week text not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.followup_bulk_action_logs enable row level security;

drop policy if exists "fbal_select" on public.followup_bulk_action_logs;
create policy "fbal_select" on public.followup_bulk_action_logs
  for select to authenticated using (public.is_admin());

drop policy if exists "fbal_insert" on public.followup_bulk_action_logs;
create policy "fbal_insert" on public.followup_bulk_action_logs
  for insert to authenticated with check (public.is_admin());

-- ─── Schedule helpers ───

create or replace function public.is_blog_followup_due(p_website_id uuid, p_date date)
returns boolean
language plpgsql
stable
as $$
declare
  v_sched record;
  v_dow integer := extract(dow from p_date)::integer;
  v_dom integer := extract(day from p_date)::integer;
  v_last_dom integer := extract(day from (date_trunc('month', p_date) + interval '1 month - 1 day')::date)::integer;
  v_wanted_day integer;
begin
  select * into v_sched from public.blog_followup_schedules where website_id = p_website_id;
  
  if not found then
    return v_dow in (2, 6); -- Default Tue & Sat
  end if;

  if v_sched.schedule_type = 'weekly' then
    return v_dow = any(v_sched.weekdays);
  elsif v_sched.schedule_type = 'custom' then
    return p_date = any(v_sched.custom_dates);
  elsif v_sched.schedule_type = 'monthly' then
    if v_sched.monthly_days is not null and coalesce(cardinality(v_sched.monthly_days), 0) > 0 then
      foreach v_wanted_day in array v_sched.monthly_days loop
        if v_dom = least(v_wanted_day, v_last_dom) then
          return true;
        end if;
      end loop;
      return false;
    elsif v_sched.monthly_target is not null and v_sched.monthly_target > 0 then
      -- Fall back to checking if slot was pre-generated
      return exists (
        select 1 from public.blog_upload_slots
        where website_id = p_website_id and scheduled_date = p_date
      );
    end if;
  end if;

  return false;
end;
$$;

-- ─── RPC Functions ───

create or replace function public.bulk_complete_blog_followups(
  p_date date,
  p_action_type text,
  p_reason text default null
)
returns table (affected_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'An admin';
  v_actor_role text := null;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_affected integer := 0;
  v_skipped integer := 0;
  v_web record;
  v_slot record;
  v_dow integer := extract(dow from p_date)::integer;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'You do not have permission to perform bulk followup actions.'
      using errcode = '42501';
  end if;

  if p_action_type not in ('admin_auto_completed', 'admin_marked_not_required') then
    raise exception 'Invalid blog followup bulk action type.'
      using errcode = '22023';
  end if;

  select
    coalesce(nullif(full_name, ''), email, 'An admin'),
    role
  into v_actor_name, v_actor_role
  from public.profiles
  where id = v_actor;

  for v_web in
    select id, name, domain
    from public.websites
    where status = 'active'
  loop
    if public.is_blog_followup_due(v_web.id, p_date) then
      -- check if slot exists
      select * into v_slot
      from public.blog_upload_slots
      where website_id = v_web.id and scheduled_date = p_date;

      if found then
        if v_slot.status in ('done', 'late') or v_slot.completion_source in ('member_completed', 'admin_auto_completed', 'admin_marked_not_required') then
          v_skipped := v_skipped + 1;
        else
          update public.blog_upload_slots
          set status = 'done',
              completed_by = v_actor,
              completed_by_user_id = v_actor,
              completed_by_role = v_actor_role,
              completion_source = p_action_type,
              reason = v_reason,
              completed_at = now()
          where id = v_slot.id;
          
          v_affected := v_affected + 1;
        end if;
      else
        insert into public.blog_upload_slots (
          website_id,
          scheduled_date,
          day_of_week,
          status,
          completed_by,
          completed_by_user_id,
          completed_by_role,
          completion_source,
          reason,
          completed_at
        ) values (
          v_web.id,
          p_date,
          v_dow,
          'done',
          v_actor,
          v_actor,
          v_actor_role,
          p_action_type,
          v_reason,
          now()
        );

        v_affected := v_affected + 1;
      end if;
    end if;
  end loop;

  if v_affected > 0 or v_skipped > 0 then
    insert into public.followup_bulk_action_logs (
      followup_type,
      action_type,
      admin_user_id,
      affected_count,
      skipped_count,
      date_or_week,
      reason
    ) values (
      'blog',
      p_action_type,
      v_actor,
      v_affected,
      v_skipped,
      p_date::text,
      v_reason
    );

    insert into public.activity_logs (
      user_id,
      action,
      related_type,
      related_id,
      message
    ) values (
      v_actor,
      'blog_followup_bulk_action',
      'followup',
      null,
      v_actor_name || ' marked due Blog Followups as ' ||
        case when p_action_type = 'admin_auto_completed' then 'Admin Auto Completed' else 'Not Required' end ||
        ' for ' || v_affected || ' websites on ' || to_char(p_date, 'FMMonth FMDD, YYYY') ||
        case when v_reason is not null then '. Reason: ' || v_reason || '.' else '.' end
    );
  end if;

  return query select v_affected, v_skipped;
end;
$$;


create or replace function public.bulk_complete_plugin_updates(
  p_week_start date,
  p_action_type text,
  p_reason text default null
)
returns table (affected_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'An admin';
  v_actor_role text := null;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_affected integer := 0;
  v_skipped integer := 0;
  v_web record;
  v_slot record;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'You do not have permission to perform bulk followup actions.'
      using errcode = '42501';
  end if;

  if p_action_type not in ('admin_auto_completed', 'admin_marked_not_required') then
    raise exception 'Invalid plugin updates bulk action type.'
      using errcode = '22023';
  end if;

  select
    coalesce(nullif(full_name, ''), email, 'An admin'),
    role
  into v_actor_name, v_actor_role
  from public.profiles
  where id = v_actor;

  for v_web in
    select id, name, domain
    from public.websites
    where status = 'active'
  loop
    select * into v_slot
    from public.plugin_update_slots
    where website_id = v_web.id and week_start = p_week_start;

    if found then
      if v_slot.status = 'done' or v_slot.completion_source in ('member_completed', 'admin_auto_completed', 'admin_marked_not_required') then
        v_skipped := v_skipped + 1;
      else
        update public.plugin_update_slots
        set status = 'done',
            completed_by = v_actor,
            completed_by_user_id = v_actor,
            completed_by_role = v_actor_role,
            completion_source = p_action_type,
            reason = v_reason,
            completed_at = now()
        where id = v_slot.id;

        v_affected := v_affected + 1;
      end if;
    else
      insert into public.plugin_update_slots (
        website_id,
        week_start,
        status,
        completed_by,
        completed_by_user_id,
        completed_by_role,
        completion_source,
        reason,
        completed_at
      ) values (
        v_web.id,
        p_week_start,
        'done',
        v_actor,
        v_actor,
        v_actor_role,
        p_action_type,
        v_reason,
        now()
      );

      v_affected := v_affected + 1;
    end if;
  end loop;

  if v_affected > 0 or v_skipped > 0 then
    insert into public.followup_bulk_action_logs (
      followup_type,
      action_type,
      admin_user_id,
      affected_count,
      skipped_count,
      date_or_week,
      reason
    ) values (
      'plugin',
      p_action_type,
      v_actor,
      v_affected,
      v_skipped,
      p_week_start::text,
      v_reason
    );

    insert into public.activity_logs (
      user_id,
      action,
      related_type,
      related_id,
      message
    ) values (
      v_actor,
      'plugin_update_bulk_action',
      'followup',
      null,
      v_actor_name || ' marked Plugin Updates as ' ||
        case when p_action_type = 'admin_auto_completed' then 'Admin Auto Completed' else 'Not Required' end ||
        ' for ' || v_affected || ' websites for the week starting ' || to_char(p_week_start, 'FMMonth FMDD, YYYY') ||
        case when v_reason is not null then '. Reason: ' || v_reason || '.' else '.' end
    );
  end if;

  return query select v_affected, v_skipped;
end;
$$;


create or replace function public.bulk_complete_speed_optimization(
  p_week_start date,
  p_action_type text,
  p_reason text default null
)
returns table (affected_count integer, skipped_count integer)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'An admin';
  v_actor_role text := null;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_affected integer := 0;
  v_skipped integer := 0;
  v_web record;
  v_slot record;
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'You do not have permission to perform bulk followup actions.'
      using errcode = '42501';
  end if;

  if p_action_type not in ('admin_auto_completed', 'admin_marked_not_required') then
    raise exception 'Invalid speed check bulk action type.'
      using errcode = '22023';
  end if;

  select
    coalesce(nullif(full_name, ''), email, 'An admin'),
    role
  into v_actor_name, v_actor_role
  from public.profiles
  where id = v_actor;

  for v_web in
    select id, name, domain
    from public.websites
    where status = 'active'
  loop
    select * into v_slot
    from public.speed_optimization_slots
    where website_id = v_web.id and week_start = p_week_start;

    if found then
      if v_slot.status = 'done' or v_slot.completion_source in ('member_completed', 'admin_auto_completed', 'admin_marked_not_required') then
        v_skipped := v_skipped + 1;
      else
        update public.speed_optimization_slots
        set status = 'done',
            completed_by = v_actor,
            completed_by_user_id = v_actor,
            completed_by_role = v_actor_role,
            completion_source = p_action_type,
            reason = v_reason,
            completed_at = now()
        where id = v_slot.id;

        v_affected := v_affected + 1;
      end if;
    else
      insert into public.speed_optimization_slots (
        website_id,
        week_start,
        status,
        completed_by,
        completed_by_user_id,
        completed_by_role,
        completion_source,
        reason,
        completed_at
      ) values (
        v_web.id,
        p_week_start,
        'done',
        v_actor,
        v_actor,
        v_actor_role,
        p_action_type,
        v_reason,
        now()
      );

      v_affected := v_affected + 1;
    end if;
  end loop;

  if v_affected > 0 or v_skipped > 0 then
    insert into public.followup_bulk_action_logs (
      followup_type,
      action_type,
      admin_user_id,
      affected_count,
      skipped_count,
      date_or_week,
      reason
    ) values (
      'speed',
      p_action_type,
      v_actor,
      v_affected,
      v_skipped,
      p_week_start::text,
      v_reason
    );

    insert into public.activity_logs (
      user_id,
      action,
      related_type,
      related_id,
      message
    ) values (
      v_actor,
      'speed_optimization_bulk_action',
      'followup',
      null,
      v_actor_name || ' marked Website Speed Checks as ' ||
        case when p_action_type = 'admin_auto_completed' then 'Admin Auto Completed' else 'Not Required' end ||
        ' for ' || v_affected || ' websites for the week starting ' || to_char(p_week_start, 'FMMonth FMDD, YYYY') ||
        case when v_reason is not null then '. Reason: ' || v_reason || '.' else '.' end
    );
  end if;

  return query select v_affected, v_skipped;
end;
$$;

grant execute on function public.is_blog_followup_due(uuid, date) to authenticated;
grant execute on function public.bulk_complete_blog_followups(date, text, text) to authenticated;
grant execute on function public.bulk_complete_plugin_updates(date, text, text) to authenticated;
grant execute on function public.bulk_complete_speed_optimization(date, text, text) to authenticated;

commit;
