-- Migration: 0110_team_member_details_summary.sql
-- Description: Adds a permission-checked database function to retrieve metrics for the Team Member Details dashboard section.

begin;

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
begin
  if v_actor is null or not public.is_admin() then
    raise exception 'You do not have permission to view team member summaries.'
      using errcode = '42501';
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
        'supervisor',
        'assistant_head',
        'member',
        'team_member'
      )
  ),
  blog_stats as (
    select
      m.uid,
      coalesce(count(*) filter (where s.status in ('done', 'late')), 0)::integer as done,
      coalesce(count(*), 0)::integer as total,
      coalesce(count(*) filter (where (s.status = 'pending' or s.status is null) and gs.d::date < current_date), 0)::integer as missed,
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
      coalesce(count(*) filter (where (s.status = 'pending' or s.status is null) and ms.mon < current_date), 0)::integer as missed,
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
      coalesce(count(*) filter (where (e.status = 'pending' or e.status is null) and gs.d::date < current_date), 0)::integer as missed,
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
      coalesce(count(*) filter (where (s.status = 'pending' or s.status is null) and ms.mon < current_date), 0)::integer as missed,
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
      coalesce(count(*) filter (where status = 'in_progress'), 0)::integer as tasks_in_progress,
      coalesce(count(*) filter (where status = 'submitted'), 0)::integer as tasks_waiting_review,
      coalesce(count(*) filter (where status = 'approved'), 0)::integer as tasks_completed,
      coalesce(count(*) filter (where status <> 'approved' and due_date < current_date), 0)::integer as tasks_overdue
    from member_list m
    left join public.prompt_assignments a on a.assigned_member_id = m.uid and a.due_date >= p_start_date and a.due_date <= p_end_date
    group by m.uid
  ),
  qi_stats as (
    select
      m.uid,
      coalesce(count(*), 0)::integer as qi_assigned,
      coalesce(count(*) filter (where status = 'fixed'), 0)::integer as qi_fixed,
      coalesce(count(*) filter (where status = 'needs_review'), 0)::integer as qi_waiting_review,
      coalesce(count(*) filter (where status in ('new_issue', 'in_progress')), 0)::integer as qi_needs_fix,
      coalesce(count(*) filter (where status = 'approved'), 0)::integer as qi_approved
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

grant execute on function public.get_team_member_dashboard_summary(date, date) to authenticated;

commit;
