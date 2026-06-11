-- Migration: fix notification daily reminders and admin notifications roles.
begin;

-- Recreate public.create_admin_notifications function with head and supervisor roles
create or replace function public.create_admin_notifications(
  p_actor_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_link text default null,
  p_related_type text default null,
  p_related_id text default null,
  p_task_id uuid default null,
  p_submission_id uuid default null,
  p_related_website_id uuid default null,
  p_related_issue_id uuid default null,
  p_extra_recipient_ids uuid[] default '{}'::uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(p_actor_id, auth.uid());
  v_actor_is_admin boolean := false;
  v_inserted integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Not signed in.';
  end if;

  if v_actor is distinct from auth.uid() and not public.is_admin() then
    raise exception 'Actor must be the authenticated user.';
  end if;

  select exists (
    select 1
    from public.profiles
    where id = v_actor
      and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'supervisor')
      and status = 'active'
  )
  into v_actor_is_admin;

  with admin_recipients as (
    select id
    from public.profiles
    where replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'supervisor')
      and status = 'active'
  ),
  extra_recipients as (
    select p.id
    from unnest(coalesce(p_extra_recipient_ids, '{}'::uuid[])) as x(id)
    join public.profiles p on p.id = x.id
    where replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('admin', 'owner', 'head', 'supervisor')
      and p.status = 'active'
  ),
  recipients as (
    select distinct id
    from (
      select id from admin_recipients
      union all
      select id from extra_recipients
    ) r
    where id is not null
      and not (v_actor_is_admin and id = v_actor)
  ),
  inserted as (
    insert into public.notifications (
      recipient_id,
      actor_id,
      type,
      title,
      message,
      link,
      related_type,
      related_id,
      task_id,
      submission_id,
      related_website_id,
      related_issue_id,
      is_read,
      email_sent
    )
    select
      id,
      v_actor,
      p_type,
      p_title,
      p_message,
      p_link,
      p_related_type,
      p_related_id,
      p_task_id,
      p_submission_id,
      p_related_website_id,
      p_related_issue_id,
      false,
      false
    from recipients
    returning 1
  )
  select count(*) into v_inserted from inserted;

  return coalesce(v_inserted, 0);
end;
$$;

-- Grant execute
grant execute on function public.create_admin_notifications(
  uuid,
  public.notification_type,
  text,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  uuid,
  uuid,
  uuid[]
) to authenticated;

-- Recreate enqueue_daily_reminders to fix the broken IF condition syntax error
create or replace function public.enqueue_daily_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today        date := current_date;
  v_week_monday  date := date_trunc('week', current_date)::date;  -- Monday
  c1 int := 0; c2 int := 0; c3 int := 0; c4 int := 0;
begin
  -- Allow the cron job (no auth.uid) or an admin to run this; block everyone else.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Only admins can enqueue reminders.';
  end if;

  -- 1) Blog followups due today (not done) ------------------------------------
  insert into public.notifications
    (recipient_id, actor_id, type, title, message, related_type, related_id, is_read, email_sent)
  select b.assigned_to, null, 'blog_followup',
         'Blog followup due today',
         'You have a blog followup scheduled for today. Open the blog tracker to complete it.',
         'blog', b.id, false, false
  from public.blog_upload_slots b
  where b.assigned_to is not null
    and b.scheduled_date = v_today
    and b.status in ('pending', 'missed')
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = b.assigned_to
        and n.type = 'blog_followup'
        and n.related_id = b.id
        and n.created_at::date = v_today
    );
  get diagnostics c1 = row_count;

  -- 2) Plugin updates due this week (not done) --------------------------------
  insert into public.notifications
    (recipient_id, actor_id, type, title, message, related_type, related_id, is_read, email_sent)
  select pu.assigned_to, null, 'plugin_update',
         'Plugin update due this week',
         'A plugin update for one of your websites is still pending this week.',
         'plugin', pu.id, false, false
  from public.plugin_update_slots pu
  where pu.assigned_to is not null
    and pu.week_start = v_week_monday
    and pu.status in ('pending', 'needs_attention')
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = pu.assigned_to
        and n.type = 'plugin_update'
        and n.related_id = pu.id
        and n.created_at > now() - interval '6 days'
    );
  get diagnostics c2 = row_count;

  -- 3) Speed checks due this week (not done) ----------------------------------
  insert into public.notifications
    (recipient_id, actor_id, type, title, message, related_type, related_id, is_read, email_sent)
  select so.assigned_to, null, 'speed_optimization_followup',
         'Speed check due this week',
         'A website speed optimization check is still pending this week.',
         'speed', so.id, false, false
  from public.speed_optimization_slots so
  where so.assigned_to is not null
    and so.week_start = v_week_monday
    and so.status in ('pending', 'needs_attention')
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = so.assigned_to
        and n.type = 'speed_optimization_followup'
        and n.related_id = so.id
        and n.created_at > now() - interval '6 days'
    );
  get diagnostics c3 = row_count;

  -- 4) Open "needs fix" tasks (daily nudge) -----------------------------------
  insert into public.notifications
    (recipient_id, actor_id, type, title, message, related_type, task_id, is_read, email_sent)
  select a.assigned_member_id, null, 'task_needs_fix',
         'Task still needs fixing',
         'You have a task that was sent back for changes. Open your work board to resubmit.',
         'task', a.id, false, false
  from public.prompt_assignments a
  where a.assigned_member_id is not null
    and a.status = 'needs_fix'
    and not exists (
      select 1 from public.notifications n
      where n.recipient_id = a.assigned_member_id
        and n.type = 'task_needs_fix'
        and n.task_id = a.id
        and n.created_at::date = v_today
    );
  get diagnostics c4 = row_count;

  return c1 + c2 + c3 + c4;
end;
$$;

-- Grant execute
grant execute on function public.enqueue_daily_reminders() to authenticated;

commit;
