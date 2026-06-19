-- Migration: 0113_followup_participants_role_expansion.sql
-- Description: Expand followup participant eligibility to include Admin, Owner, Head, and Supervisor roles.
--              Adjusts default report visibility trigger function, updates auto-fill RPC, and seeds values.

begin;

-- 1. Redefine default report visibility trigger function to preserve manual overrides on updates
create or replace function public.set_default_report_visibility()
returns trigger as $$
begin
  -- If it is an UPDATE and the record already had include_in_reports = true, preserve it!
  if tg_op = 'UPDATE' and old.include_in_reports = true then
    return new;
  end if;

  -- Default visibility is false for admin/tester roles, tester/admin departments, or containing keywords
  if new.role in ('admin', 'tester') 
     or new.department in ('admin', 'tester') 
     or new.email ilike '%admin%' 
     or new.email ilike '%tester%' 
     or new.email ilike '%system%' 
     or new.full_name ilike '%admin%' 
     or new.full_name ilike '%tester%' 
     or new.full_name ilike '%system%' 
     or (new.position ilike '%admin%' or new.position ilike '%tester%' or new.position ilike '%system%') then
    new.include_in_reports := false;
  else
    new.include_in_reports := true;
  end if;
  return new;
end;
$$ language plpgsql;

-- 2. Redefine auto-fill eBay Click RPC to include all participant roles and remove department restrictions
create or replace function public.auto_fill_ebay_click_followup(
  p_date date,
  p_action_type text default 'admin_auto_fill',
  p_reason text default null,
  p_excluded_user_ids uuid[] default '{}'::uuid[]
)
returns table (
  auto_filled_count integer,
  already_completed_count integer,
  skipped_count integer,
  affected_member_count integer,
  action_type text,
  followup_date date,
  entries jsonb
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_actor_name text := 'An admin';
  v_actor_role text := null;
  v_batch_id uuid := gen_random_uuid();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_excluded_ids uuid[] := coalesce(p_excluded_user_ids, '{}'::uuid[]);
  v_day_name text := trim(to_char(p_date, 'Day'));
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'You do not have permission to auto fill eBay Click followups.'
      using errcode = '42501';
  end if;

  if p_action_type not in ('admin_auto_fill', 'not_required_today') then
    raise exception 'Invalid eBay Click auto-fill action type.'
      using errcode = '22023';
  end if;

  select
    coalesce(nullif(full_name, ''), email, 'An admin'),
    role
  into v_actor_name, v_actor_role
  from public.profiles
  where id = v_actor;

  return query
  with target_members as (
    select p.id
    from public.profiles p
    where p.status = 'active'
      and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'supervisor', 'assistant_head', 'team_member', 'member')
      and coalesce(p.include_in_reports, true) = true
      and not (p.id = any(v_excluded_ids))
  ),
  excluded_members as (
    select p.id
    from public.profiles p
    where p.status = 'active'
      and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'supervisor', 'assistant_head', 'team_member', 'member')
      and coalesce(p.include_in_reports, true) = true
      and p.id = any(v_excluded_ids)
  ),
  existing as (
    select
      tm.id as user_id,
      e.id as existing_id,
      (
        e.id is not null
        and coalesce(
          nullif(e.completion_source, ''),
          case
            when coalesce(e.completed_by_user_id, e.completed_by) = e.user_id then 'member'
            else 'admin_manual'
          end
        ) = 'member'
      ) as member_completed
    from target_members tm
    left join public.ebay_click_followup e
      on e.user_id = tm.id
     and e.date = p_date
  ),
  preserved as (
    select count(*)::integer as count
    from existing
    where member_completed
  ),
  changed as (
    insert into public.ebay_click_followup (
      user_id,
      date,
      day_name,
      status,
      completed_at,
      completed_by,
      completed_by_user_id,
      completed_by_role,
      completion_source,
      reason,
      auto_fill_batch_id
    )
    select
      e.user_id,
      p_date,
      v_day_name,
      'done',
      now(),
      v_actor,
      v_actor,
      v_actor_role,
      p_action_type,
      v_reason,
      v_batch_id
    from existing e
    where not e.member_completed
    on conflict (user_id, date) do update
      set day_name = excluded.day_name,
          status = excluded.status,
          completed_at = excluded.completed_at,
          completed_by = excluded.completed_by,
          completed_by_user_id = excluded.completed_by_user_id,
          completed_by_role = excluded.completed_by_role,
          completion_source = excluded.completion_source,
          reason = excluded.reason,
          auto_fill_batch_id = excluded.auto_fill_batch_id,
          updated_at = now()
      where coalesce(
        nullif(public.ebay_click_followup.completion_source, ''),
        case
          when coalesce(public.ebay_click_followup.completed_by_user_id, public.ebay_click_followup.completed_by) = public.ebay_click_followup.user_id then 'member'
          else 'admin_manual'
        end
      ) <> 'member'
    returning public.ebay_click_followup.*
  ),
  counts as (
    select
      (select count(*)::integer from changed) as auto_filled_count,
      (select count from preserved) as already_completed_count,
      (select count(*)::integer from excluded_members) as skipped_count,
      (select count(*)::integer from target_members) as affected_member_count
  ),
  log_insert as (
    insert into public.ebay_click_auto_fill_logs (
      action_type,
      followup_date,
      admin_user_id,
      affected_member_count,
      already_completed_count,
      excluded_member_count,
      reason
    )
    select
      p_action_type,
      p_date,
      v_actor,
      counts.affected_member_count,
      counts.already_completed_count,
      counts.skipped_count,
      v_reason
    from counts
    where counts.affected_member_count > 0 or counts.already_completed_count > 0 or counts.skipped_count > 0
    returning id
  ),
  activity_insert as (
    insert into public.activity_logs (
      user_id,
      action,
      related_type,
      related_id,
      message
    )
    select
      v_actor,
      'ebay_click_auto_fill',
      'ebay_click_followup',
      null,
      v_actor_name || ' auto-filled eBay Click followup for all members on ' ||
        to_char(p_date, 'FMMonth FMDD, YYYY') ||
        case when v_reason is not null then '. Reason: ' || v_reason || '.' else '.' end
    from counts
    where counts.affected_member_count > 0 or counts.already_completed_count > 0 or counts.skipped_count > 0
    returning id
  )
  select
    counts.auto_filled_count,
    counts.already_completed_count,
    counts.skipped_count,
    counts.affected_member_count,
    p_action_type,
    p_date,
    coalesce(
      (
        select jsonb_agg(to_jsonb(changed) order by changed.user_id)
        from changed
      ),
      '[]'::jsonb
    ) as entries
  from counts;
end;
$$;

-- 3. Seed: Update include_in_reports to true for all active working members (including managers)
update public.profiles
set include_in_reports = true
where status = 'active'
  and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'supervisor', 'assistant_head', 'team_member', 'member')
  and email not ilike '%tester%'
  and email not ilike '%system%'
  and full_name not ilike '%tester%'
  and full_name not ilike '%system%';

commit;
