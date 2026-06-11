-- 0091_smart_task_alert_center.sql
-- Migration to support the Smart Task Alert Center

begin;

-- 1. Extend the public.notification_type enum values
-- Note: In postgres, ALTER TYPE ADD VALUE cannot be executed inside a multi-statement transaction block in older versions, 
-- but newer pg versions (including Supabase PG15+) support it if the type is not used in a table column defined in the same transaction.
-- To be safe, we wrap it in a DO block or execute directly.
alter type public.notification_type add value if not exists 'announcement';
alter type public.notification_type add value if not exists 'daily_summary';

-- 2. Extend the public.quality_issue_status enum values
alter type public.quality_issue_status add value if not exists 'acknowledged';
alter type public.quality_issue_status add value if not exists 'rejected';

-- 3. Alter notifications table to add priority, seen_at, acknowledged_at, started_at, completed_at, and escalation_level
alter table public.notifications
  add column if not exists priority text not null default 'normal'
    check (priority in ('critical', 'high', 'normal', 'low')),
  add column if not exists seen_at timestamptz,
  add column if not exists acknowledged_at timestamptz,
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists escalation_level integer not null default 0;

-- 4. Alter notification_preferences to add switches
alter table public.notification_preferences
  add column if not exists task_alerts_enabled boolean not null default true,
  add column if not exists followup_alerts_enabled boolean not null default true,
  add column if not exists quality_alerts_enabled boolean not null default true,
  add column if not exists sound_enabled boolean not null default true,
  add column if not exists desktop_enabled boolean not null default true;

-- 5. Redefine create_default_notification_preferences trigger function to write defaults
create or replace function public.create_default_notification_preferences()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notification_preferences (
    user_id,
    in_app_enabled,
    email_enabled,
    browser_enabled,
    task_alerts_enabled,
    followup_alerts_enabled,
    quality_alerts_enabled,
    sound_enabled,
    desktop_enabled
  )
  values (
    new.id,
    true,
    true,
    false,
    true,
    true,
    true,
    true,
    true
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- 6. Trigger to automatically sync task start/completion times to notification records
create or replace function public.sync_task_status_to_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If status changed to in_progress, stamp started_at
  if new.status = 'in_progress' and (old.status is null or old.status != 'in_progress') then
    update public.notifications
    set started_at = coalesce(started_at, now())
    where (task_id = new.id or (related_type = 'quality_issue' and related_id = new.id::text))
      and started_at is null;
  end if;

  -- If status changed to a completed state, stamp completed_at
  if new.status in ('submitted', 'approved', 'completed', 'fixed', 'needs_review') 
     and (old.status is null or old.status not in ('submitted', 'approved', 'completed', 'fixed', 'needs_review')) then
    update public.notifications
    set completed_at = coalesce(completed_at, now())
    where (task_id = new.id or (related_type = 'quality_issue' and related_id = new.id::text))
      and completed_at is null;
  end if;

  return new;
end;
$$;

-- Triggers for prompt_assignments status changes
drop trigger if exists tr_sync_prompt_assignment_status on public.prompt_assignments;
create trigger tr_sync_prompt_assignment_status
  after update on public.prompt_assignments
  for each row execute function public.sync_task_status_to_notification();

-- Triggers for quality_issues status changes
drop trigger if exists tr_sync_quality_issue_status on public.quality_issues;
create trigger tr_sync_quality_issue_status
  after update on public.quality_issues
  for each row execute function public.sync_task_status_to_notification();

-- 7. Escalation Service: function to check and enqueue reminders/escalations
create or replace function public.check_notification_escalations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  leader record;
  v_count int := 0;
begin
  -- 1) 1-Hour Escalation (level 0 -> 1): Gentle warning reminder
  for r in
    select n.id, n.recipient_id, n.title, n.message, n.task_id, n.related_id, n.related_type
    from public.notifications n
    where n.is_read = false
      and n.acknowledged_at is null
      and n.type in ('task_assigned', 'quality_issue_reported')
      and n.escalation_level = 0
      and n.created_at <= now() - interval '1 hour'
  loop
    insert into public.notifications
      (recipient_id, actor_id, type, title, message, related_type, related_id, task_id, is_read, priority, escalation_level)
    values
      (r.recipient_id, null, 'task_assigned', 'Reminder: Unread Task Alert', 
       'Gentle Reminder: You have a task assigned to you that is still unread/unacknowledged: "' || r.title || '"', 
       r.related_type, r.related_id, r.task_id, false, 'high', 1);

    update public.notifications
    set escalation_level = 1
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  -- 2) 24-Hour Escalation (level 1 -> 2): Stronger warning
  for r in
    select n.id, n.recipient_id, n.title, n.message, n.task_id, n.related_id, n.related_type
    from public.notifications n
    where n.is_read = false
      and n.acknowledged_at is null
      and n.type in ('task_assigned', 'quality_issue_reported')
      and n.escalation_level = 1
      and n.created_at <= now() - interval '24 hours'
  loop
    insert into public.notifications
      (recipient_id, actor_id, type, title, message, related_type, related_id, task_id, is_read, priority, escalation_level)
    values
      (r.recipient_id, null, 'task_assigned', 'Warning: Task Unacknowledged for 24h', 
       'Strong Warning: You have NOT read or acknowledged the task "' || r.title || '" in 24 hours. Acknowledge this immediately.', 
       r.related_type, r.related_id, r.task_id, false, 'critical', 2);

    update public.notifications
    set escalation_level = 2
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  -- 3) 48-Hour Escalation (level 2 -> 3): Notify team leaders / heads
  for r in
    select n.id, n.recipient_id, n.title, n.message, n.task_id, n.related_id, n.related_type, p.full_name as recipient_name
    from public.notifications n
    join public.profiles p on p.id = n.recipient_id
    where n.is_read = false
      and n.acknowledged_at is null
      and n.type in ('task_assigned', 'quality_issue_reported')
      and n.escalation_level = 2
      and n.created_at <= now() - interval '48 hours'
  loop
    -- Insert alert for all active admins/owners/heads/supervisors
    for leader in
      select id from public.profiles
      where role in ('admin', 'owner', 'head', 'supervisor')
        and status = 'active'
        and id != r.recipient_id
    loop
      insert into public.notifications
        (recipient_id, actor_id, type, title, message, related_type, related_id, task_id, is_read, priority, escalation_level)
      values
        (leader.id, null, 'task_assigned', 'Escalation Alert: Task Ignored', 
         'Escalation: Teammate ' || r.recipient_name || ' has not read or acknowledged the task "' || r.title || '" for over 48 hours.', 
         r.related_type, r.related_id, r.task_id, false, 'critical', 3);
    end loop;

    update public.notifications
    set escalation_level = 3
    where id = r.id;

    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- 8. Daily Summary Service: function to generate daily summaries at 8:00 AM
create or replace function public.enqueue_daily_summaries()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := current_date;
  v_dow int := extract(dow from now()); -- 0=Sunday, 1=Monday, etc.
  v_monday date := date_trunc('week', current_date)::date;
  user_row record;
  v_tasks_today int;
  v_tasks_overdue int;
  v_followups int;
  v_quality_issues int;
  v_count int := 0;
  v_msg text;
begin
  for user_row in
    select id, full_name from public.profiles where status = 'active'
  loop
    -- Calculate counts
    
    -- Today's tasks (due today, active status)
    select count(*)
    into v_tasks_today
    from public.prompt_assignments
    where assigned_member_id = user_row.id
      and status in ('pending', 'in_progress', 'needs_fix', 'needs_resubmission')
      and due_date = v_today;

    -- Overdue tasks (due in past, active status)
    select count(*)
    into v_tasks_overdue
    from public.prompt_assignments
    where assigned_member_id = user_row.id
      and status in ('pending', 'in_progress', 'needs_fix', 'needs_resubmission')
      and due_date < v_today;

    -- Quality check issues (assigned, not approved/closed)
    select count(*)
    into v_quality_issues
    from public.quality_issues
    where assigned_to = user_row.id
      and status in ('new_issue', 'acknowledged', 'in_progress', 'fixed', 'needs_review', 'rejected');

    -- Follow-ups count
    v_followups := 0;
    
    -- Blog upload slots due today or overdue
    select count(*) + v_followups
    into v_followups
    from public.blog_upload_slots
    where assigned_to = user_row.id
      and status in ('pending', 'missed')
      and scheduled_date <= v_today;

    -- Plugin update slots due this week or overdue
    select count(*) + v_followups
    into v_followups
    from public.plugin_update_slots
    where assigned_to = user_row.id
      and status in ('pending', 'needs_attention')
      and week_start <= v_monday;

    -- Speed optimization slots due this week or overdue
    select count(*) + v_followups
    into v_followups
    from public.speed_optimization_slots
    where assigned_to = user_row.id
      and status in ('pending', 'needs_attention')
      and week_start <= v_monday;

    -- eBay click followup: if Mon-Sat and not checked-in today, count as 1
    if v_dow != 0 then
      if not exists (
        select 1 from public.ebay_click_followup
        where user_id = user_row.id and date = v_today and status = 'done'
      ) then
        v_followups := v_followups + 1;
      end if;
    end if;

    -- Only enqueue if there is attention required (at least one item)
    if (v_tasks_today + v_tasks_overdue + v_followups + v_quality_issues) > 0 then
      v_msg := E'Today\'s Tasks: ' || v_tasks_today || E'\n' ||
               'Overdue Tasks: ' || v_tasks_overdue || E'\n' ||
               'Follow-Ups Due: ' || v_followups || E'\n' ||
               'Quality Check Issues: ' || v_quality_issues;

      insert into public.notifications
        (recipient_id, actor_id, type, title, message, is_read, priority)
      values
        (user_row.id, null, 'daily_summary', 'Good Morning, ' || split_part(user_row.full_name, ' ', 1), v_msg, false, 'normal');

      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- 9. Analytics: Function to retrieve admin notification metrics
create or replace function public.get_notification_analytics()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sent int;
  v_read int;
  v_ignored int;
  v_avg_resp interval;
  v_delayed_users json;
  v_result json;
begin
  -- Only allow admins/heads to fetch analytics
  if not public.is_admin() then
    raise exception 'Access Denied: Admin access required.';
  end if;

  select count(*), 
         count(*) filter (where is_read = true), 
         count(*) filter (where acknowledged_at is null)
  into v_sent, v_read, v_ignored
  from public.notifications;

  select avg(acknowledged_at - created_at)
  into v_avg_resp
  from public.notifications
  where acknowledged_at is not null;

  select json_agg(u)
  into v_delayed_users
  from (
    select p.id,
           p.full_name as name,
           p.email,
           count(n.id) filter (where n.acknowledged_at is null) as ignored_count,
           avg(n.acknowledged_at - n.created_at) as avg_response_time
    from public.profiles p
    join public.notifications n on n.recipient_id = p.id
    group by p.id, p.full_name, p.email
    order by ignored_count desc, avg_response_time desc nulls last
    limit 10
  ) u;

  v_result := json_build_object(
    'total_sent', v_sent,
    'total_read', v_read,
    'total_ignored', v_ignored,
    'avg_response_seconds', coalesce(extract(epoch from v_avg_resp), 0),
    'delayed_users', coalesce(v_delayed_users, '[]'::json)
  );

  return v_result;
end;
$$;

-- 10. Setup pg_cron Schedules
create extension if not exists pg_cron;

-- 10.1 Escalations cron (every 5 minutes)
do $$
begin
  perform cron.unschedule('kiuq-notification-escalations');
exception when others then
  null;
end $$;

select cron.schedule(
  'kiuq-notification-escalations',
  '*/5 * * * *',
  $$ select public.check_notification_escalations(); $$
);

-- 10.2 Daily Summaries cron (every day at 8:00 AM Asia/Bangkok, which is 01:00 UTC)
do $$
begin
  perform cron.unschedule('kiuq-daily-summaries');
exception when others then
  null;
end $$;

select cron.schedule(
  'kiuq-daily-summaries',
  '0 1 * * *', -- 01:00 UTC (08:00 AM UTC+7)
  $$ select public.enqueue_daily_summaries(); $$
);

-- Grant executions
grant execute on function public.check_notification_escalations() to authenticated;
grant execute on function public.enqueue_daily_summaries() to authenticated;
grant execute on function public.get_notification_analytics() to authenticated;

commit;
