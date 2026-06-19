-- Migration: 0118_hide_supervisor_from_dashboard_followups.sql
-- Description: Exclude the supervisor role from dashboard summaries, followups, and auto-fills.
--              Sets include_in_reports = false for supervisor profiles.

begin;

-- 1. Redefine get_team_member_dashboard_summary without 'supervisor' in the visible roles
create or replace function public.get_team_member_dashboard_summary(
  p_start_date date,
  p_end_date date
)
returns table (
  member_id uuid,
  full_name text,
  role text,
  email text,
  status text,
  avatar_url text,
  current_status text,
  last_active_at timestamptz,
  created_at timestamptz,
  followups_done integer,
  followups_total integer,
  followups_pending integer,
  followups_missed integer,
  followups_not_required integer,
  followups_auto_completed integer,
  tasks_in_progress integer,
  tasks_waiting_review integer,
  tasks_completed integer,
  tasks_overdue integer,
  qi_assigned integer,
  qi_fixed integer,
  qi_waiting_review integer,
  qi_needs_fix integer,
  completed_work_count integer
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_is_mgr boolean;
begin
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  v_is_mgr := public.is_manager();

  -- Access control: Quality checkers are blocked completely.
  if public.is_quality_checker() then
    raise exception 'Access denied for Quality Checkers.' using errcode = '42501';
  end if;

  return query
  with member_list as (
    select p.id as uid, p.full_name as fname, p.role as urole, p.email as uemail, p.status as ustatus, 
           p.avatar_url as uavatar, p.current_status as ucstatus, p.last_active_at as uactive, p.created_at as ucreated
    from public.profiles p
    where lower(coalesce(p.status, '')) = 'active'
      and coalesce(p.include_in_reports, true) = true
      and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in (
        'head',
        'admin',
        'owner',
        'assistant_head',
        'member',
        'team_member'
      )
      -- Non-managers can ONLY see their own row
      and (v_is_mgr or p.id = v_actor)
  ),
  blog_stats as (
    select
      m.uid,
      coalesce(count(*) filter (where s.status in ('done', 'late')), 0)::integer as done,
      coalesce(count(*), 0)::integer as total,
      coalesce(count(*) filter (
        where (s.status = 'pending' or s.status is null) 
          and gs.d::date < current_date
          and coalesce(s.completion_source, '') not in ('admin_marked_not_required', 'not_required_today')
      ), 0)::integer as missed,
      coalesce(count(*) filter (where s.completion_source = 'admin_marked_not_required'), 0)::integer as not_required,
      coalesce(count(*) filter (where s.completion_source = 'admin_auto_completed'), 0)::integer as auto_completed
    from member_list m
    join public.websites w on w.created_by = m.uid and w.status = 'active'
    cross join generate_series(p_start_date, p_end_date, '1 day'::interval) gs(d)
    left join public.blog_upload_slots s on s.website_id = w.id and s.scheduled_date = gs.d::date
    where public.is_blog_followup_due(w.id, gs.d::date)
    group by m.uid
  ),
  plugin_stats as (
    select
      m.uid,
      coalesce(count(*) filter (where s.status = 'done'), 0)::integer as done,
      coalesce(count(*), 0)::integer as total,
      coalesce(count(*) filter (
        where (s.status = 'pending' or s.status is null) 
          and ms.mon < current_date
          and coalesce(s.completion_source, '') not in ('admin_marked_not_required', 'not_required_today')
      ), 0)::integer as missed,
      coalesce(count(*) filter (where s.completion_source = 'admin_marked_not_required'), 0)::integer as not_required,
      coalesce(count(*) filter (where s.completion_source = 'admin_auto_completed'), 0)::integer as auto_completed
    from member_list m
    join public.websites w on w.created_by = m.uid and w.status = 'active'
    cross join (
      select distinct (date_trunc('week', d)::date) as mon
      from generate_series(p_start_date, p_end_date, '1 day'::interval) d
    ) ms
    left join public.plugin_update_slots s on s.website_id = w.id and s.week_start = ms.mon
    group by m.uid
  ),
  ebay_stats as (
    select
      m.uid,
      coalesce(count(*) filter (where e.status = 'done'), 0)::integer as done,
      coalesce(count(*), 0)::integer as total,
      coalesce(count(*) filter (
        where (e.status = 'pending' or e.status is null) 
          and gs.d::date < current_date
          and coalesce(e.completion_source, '') not in ('admin_marked_not_required', 'not_required_today')
      ), 0)::integer as missed,
      coalesce(count(*) filter (where e.completion_source = 'not_required_today'), 0)::integer as not_required,
      coalesce(count(*) filter (where e.completion_source = 'admin_auto_fill'), 0)::integer as auto_completed
    from member_list m
    cross join generate_series(p_start_date, p_end_date, '1 day'::interval) gs(d)
    left join public.ebay_click_followup e on e.user_id = m.uid and e.date = gs.d::date
    where extract(dow from gs.d) <> 0
    group by m.uid
  ),
  speed_stats as (
    select
      m.uid,
      coalesce(count(*) filter (where s.status = 'done'), 0)::integer as done,
      coalesce(count(*), 0)::integer as total,
      coalesce(count(*) filter (
        where (s.status = 'pending' or s.status is null) 
          and ms.mon < current_date
          and coalesce(s.completion_source, '') not in ('admin_marked_not_required', 'not_required_today')
      ), 0)::integer as missed,
      coalesce(count(*) filter (where s.completion_source = 'admin_marked_not_required'), 0)::integer as not_required,
      coalesce(count(*) filter (where s.completion_source = 'admin_auto_completed'), 0)::integer as auto_completed
    from member_list m
    join public.websites w on w.created_by = m.uid and w.status = 'active'
    cross join (
      select distinct (date_trunc('week', d)::date) as mon
      from generate_series(p_start_date, p_end_date, '1 day'::interval) d
    ) ms
    left join public.speed_optimization_slots s on s.website_id = w.id and s.week_start = ms.mon
    group by m.uid
  ),
  task_stats as (
    select
      m.uid,
      coalesce(count(*) filter (where a.status in ('in_progress', 'progress', 'working')), 0)::integer as tasks_in_progress,
      coalesce(count(*) filter (where a.status in ('submitted', 'review', 'pending_review', 'waiting_review')), 0)::integer as tasks_waiting_review,
      coalesce(count(*) filter (where a.status = 'approved'), 0)::integer as tasks_completed,
      coalesce(count(*) filter (where a.status <> 'approved' and a.due_date < current_date), 0)::integer as tasks_overdue
    from member_list m
    left join public.prompt_assignments a on a.assigned_member_id = m.uid and a.due_date >= p_start_date and a.due_date <= p_end_date
    group by m.uid
  ),
  qi_stats as (
    select
      m.uid,
      coalesce(count(*), 0)::integer as qi_assigned,
      coalesce(count(*) filter (where i.status = 'fixed'), 0)::integer as qi_fixed,
      coalesce(count(*) filter (where i.status = 'needs_review'), 0)::integer as qi_waiting_review,
      coalesce(count(*) filter (where i.status in ('new_issue', 'in_progress')), 0)::integer as qi_needs_fix,
      coalesce(count(*) filter (where i.status = 'approved'), 0)::integer as qi_approved
    from member_list m
    left join public.quality_issues i on i.assigned_to = m.uid and (i.due_date is null or (i.due_date >= p_start_date and i.due_date <= p_end_date))
    group by m.uid
  )
  select
    m.uid,
    m.fname::text,
    m.urole::text,
    m.uemail::text,
    m.ustatus::text,
    m.uavatar::text,
    m.ucstatus::text,
    m.uactive,
    m.ucreated,
    (coalesce(b.done, 0) + coalesce(p.done, 0) + coalesce(e.done, 0) + coalesce(s.done, 0))::integer,
    (coalesce(b.total, 0) + coalesce(p.total, 0) + coalesce(e.total, 0) + coalesce(s.total, 0))::integer,
    ((coalesce(b.total, 0) + coalesce(p.total, 0) + coalesce(e.total, 0) + coalesce(s.total, 0)) - (coalesce(b.done, 0) + coalesce(p.done, 0) + coalesce(e.done, 0) + coalesce(s.done, 0)))::integer,
    (coalesce(b.missed, 0) + coalesce(p.missed, 0) + coalesce(e.missed, 0) + coalesce(s.missed, 0))::integer,
    (coalesce(b.not_required, 0) + coalesce(p.not_required, 0) + coalesce(e.not_required, 0) + coalesce(s.not_required, 0))::integer,
    (coalesce(b.auto_completed, 0) + coalesce(p.auto_completed, 0) + coalesce(e.auto_completed, 0) + coalesce(s.auto_completed, 0))::integer,
    coalesce(t.tasks_in_progress, 0)::integer,
    coalesce(t.tasks_waiting_review, 0)::integer,
    coalesce(t.tasks_completed, 0)::integer,
    coalesce(t.tasks_overdue, 0)::integer,
    coalesce(q.qi_assigned, 0)::integer,
    coalesce(q.qi_fixed, 0)::integer,
    coalesce(q.qi_waiting_review, 0)::integer,
    coalesce(q.qi_needs_fix, 0)::integer,
    (coalesce(t.tasks_completed, 0) + coalesce(q.qi_approved, 0))::integer
  from member_list m
  left join blog_stats b on b.uid = m.uid
  left join plugin_stats p on p.uid = m.uid
  left join ebay_stats e on e.uid = m.uid
  left join speed_stats s on s.uid = m.uid
  left join task_stats t on t.uid = m.uid
  left join qi_stats q on q.uid = m.uid
  order by lower(coalesce(m.fname, m.uemail, m.uid::text));
end;
$$;


-- 2. Redefine auto_fill_ebay_click_followup without 'supervisor' in the target/excluded roles
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
      and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'assistant_head', 'team_member', 'member')
      and coalesce(p.include_in_reports, true) = true
      and not (p.id = any(v_excluded_ids))
  ),
  excluded_members as (
    select p.id
    from public.profiles p
    where p.status = 'active'
      and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'assistant_head', 'team_member', 'member')
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


-- 3. Exclude supervisor profiles from reports
update public.profiles
set include_in_reports = false
where replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') = 'supervisor';

commit;
