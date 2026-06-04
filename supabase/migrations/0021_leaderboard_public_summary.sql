-- WordPress Prompt System - public leaderboard summary
-- Lets authenticated users see safe team-member leaderboard profile summaries
-- without exposing full private profile rows through the profiles RLS policy.

create or replace function public.get_leaderboard_summary(
  p_period_type text default 'monthly',
  p_period_start date default date_trunc('month', now())::date
)
returns table (
  id uuid,
  full_name text,
  role text,
  avatar_url text,
  status text,
  is_online boolean,
  current_status text,
  last_active_at timestamptz,
  last_logout_at timestamptz,
  total_points integer,
  active_seconds integer,
  tasks_started integer,
  tasks_completed integer,
  submissions_made integer,
  approved_submissions integer,
  rejected_submissions integer,
  prompts_copied integer,
  resources_created integer,
  files_uploaded integer,
  links_saved integer,
  monthly_reports_submitted integer,
  blockers_reported integer,
  current_streak integer,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select
      case
        when p_period_type = 'monthly' then coalesce(p_period_start, date_trunc('month', now())::date)
        when p_period_type = 'weekly' then coalesce(p_period_start, date_trunc('week', now())::date)
        when p_period_type = 'daily' then coalesce(p_period_start, now()::date)
        else null::date
      end as start_date,
      case
        when p_period_type = 'monthly' then (coalesce(p_period_start, date_trunc('month', now())::date) + interval '1 month')
        when p_period_type = 'weekly' then (coalesce(p_period_start, date_trunc('week', now())::date) + interval '1 week')
        when p_period_type = 'daily' then (coalesce(p_period_start, now()::date) + interval '1 day')
        else null::timestamp
      end as end_at
  ),
  period_logs as (
    select l.*
    from public.activity_logs l
    cross join bounds b
    where p_period_type = 'all_time'
      or (
        b.start_date is not null
        and l.created_at >= b.start_date
        and l.created_at < b.end_at
      )
  ),
  computed as (
    select
      l.user_id,
      sum(
        case
          when l.action in ('user_login', 'user_logged_in') then 1
          when l.action = 'opened_today_work' then 1
          when l.action = 'opened_task' then 1
          when l.action in ('marked_task_in_progress', 'task_started') then 2
          when l.action in ('copied_prompt', 'prompt_copied') then 2
          when l.action in ('submitted_work', 'output_submitted') then 5
          when l.action in ('approved_submission', 'approved_work', 'task_approved') then 10
          when l.action = 'resubmitted_work' then 5
          when l.action = 'created_resource' then 3
          when l.action in ('uploaded_file', 'uploaded_resource') then 3
          when l.action = 'saved_link' then 2
          when l.action in ('submitted_monthly_report', 'monthly_report_submitted') then 8
          when l.action in ('reported_blocker', 'blocker_reported') then 3
          when l.action = 'rejected_submission' then -3
          when l.action = 'overdue_task' then -5
          else 0
        end
      )::integer as total_points,
      (count(*) * 60)::integer as active_seconds,
      count(*) filter (where l.action in ('opened_task', 'marked_task_in_progress', 'task_started'))::integer as tasks_started,
      count(*) filter (where l.action = 'completed_task')::integer as tasks_completed,
      count(*) filter (where l.action in ('submitted_work', 'output_submitted', 'resubmitted_work'))::integer as submissions_made,
      count(*) filter (where l.action in ('approved_submission', 'approved_work', 'task_approved'))::integer as approved_submissions,
      count(*) filter (where l.action = 'rejected_submission')::integer as rejected_submissions,
      count(*) filter (where l.action in ('copied_prompt', 'prompt_copied'))::integer as prompts_copied,
      count(*) filter (where l.action in ('created_resource', 'uploaded_file', 'uploaded_resource', 'saved_link'))::integer as resources_created,
      count(*) filter (where l.action in ('uploaded_file', 'uploaded_resource'))::integer as files_uploaded,
      count(*) filter (where l.action = 'saved_link')::integer as links_saved,
      count(*) filter (where l.action in ('submitted_monthly_report', 'monthly_report_submitted'))::integer as monthly_reports_submitted,
      count(*) filter (where l.action in ('reported_blocker', 'blocker_reported'))::integer as blockers_reported,
      max(l.created_at) as updated_at
    from period_logs l
    group by l.user_id
  )
  select
    p.id,
    coalesce(nullif(p.full_name, ''), 'Team member') as full_name,
    p.role,
    p.avatar_url,
    p.status,
    coalesce(p.is_online, false) as is_online,
    coalesce(p.current_status, 'offline') as current_status,
    p.last_active_at,
    p.last_logout_at,
    coalesce(nullif(s.total_points, 0), c.total_points, 0) as total_points,
    coalesce(nullif(s.active_seconds, 0), c.active_seconds, 0) as active_seconds,
    coalesce(nullif(s.tasks_started, 0), c.tasks_started, 0) as tasks_started,
    coalesce(nullif(s.tasks_completed, 0), c.tasks_completed, 0) as tasks_completed,
    coalesce(nullif(s.submissions_made, 0), c.submissions_made, 0) as submissions_made,
    coalesce(nullif(s.approved_submissions, 0), c.approved_submissions, 0) as approved_submissions,
    coalesce(nullif(s.rejected_submissions, 0), c.rejected_submissions, 0) as rejected_submissions,
    coalesce(nullif(s.prompts_copied, 0), c.prompts_copied, 0) as prompts_copied,
    coalesce(nullif(s.resources_created, 0), c.resources_created, 0) as resources_created,
    coalesce(nullif(s.files_uploaded, 0), c.files_uploaded, 0) as files_uploaded,
    coalesce(nullif(s.links_saved, 0), c.links_saved, 0) as links_saved,
    coalesce(nullif(s.monthly_reports_submitted, 0), c.monthly_reports_submitted, 0) as monthly_reports_submitted,
    coalesce(nullif(s.blockers_reported, 0), c.blockers_reported, 0) as blockers_reported,
    coalesce(s.current_streak, 0) as current_streak,
    coalesce(s.updated_at, c.updated_at, p.updated_at) as updated_at
  from public.profiles p
  left join computed c
    on c.user_id = p.id
  left join public.leaderboard_scores s
    on s.user_id = p.id
    and s.period_type = p_period_type
    and (
      (p_period_start is null and s.period_start is null)
      or s.period_start = p_period_start
    )
  where replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('member', 'team_member')
    and coalesce(p.status, 'active') = 'active'
  order by
    coalesce(s.total_points, 0) desc,
    coalesce(s.tasks_completed, 0) desc,
    coalesce(s.approved_submissions, 0) desc,
    coalesce(s.submissions_made, 0) desc,
    coalesce(s.prompts_copied, 0) desc,
    coalesce(s.resources_created, 0) desc,
    coalesce(s.active_seconds, 0) desc,
    coalesce(nullif(p.full_name, ''), p.id::text) asc;
$$;

revoke all on function public.get_leaderboard_summary(text, date) from public;
grant execute on function public.get_leaderboard_summary(text, date) to authenticated;
