-- ============================================================================
-- 0071_daily_reminders.sql
-- ----------------------------------------------------------------------------
-- In-app daily reminders. A scheduled function inserts notification rows for
-- work that's due / waiting, which then appear in the existing notification
-- bell + Notifications page (with the icons added in notificationDisplay.ts).
--
-- It reminds about:
--   • Blog followups scheduled for TODAY that aren't done   → assignee
--   • Plugin updates due THIS WEEK that aren't done          → assignee
--   • Speed checks due THIS WEEK that aren't done            → assignee
--   • Tasks sent back as "needs fix" that are still open     → assignee
--
-- Every insert is de-duplicated so re-running (or the daily cron) never spams:
--   - daily reminders: skip if one already exists today for that item
--   - weekly reminders: skip if one was sent in the last 6 days for that item
--
-- Run this whole file in the Supabase SQL editor. Idempotent — safe to re-run.
-- ============================================================================

begin;

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
  if auth.uid() is not null and n
   ot public.is_admin() then
   
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

-- Cron + admins may run it; nobody else.
revoke all on function public.enqueue_daily_reminders() from public, anon;
grant execute on function public.enqueue_daily_reminders() to authenticated;

commit;

-- ============================================================================
-- ⏰ Schedule it (requires the pg_cron extension)
-- ----------------------------------------------------------------------------
-- If this errors with "extension pg_cron is not available", enable it once in
-- the Supabase Dashboard → Database → Extensions → search "pg_cron" → Enable,
-- then re-run just this section.
--
-- The schedule is in UTC. '0 6 * * *' = 06:00 UTC daily. Adjust the hour to
-- whatever lands in your team's morning.
-- ============================================================================

create extension if not exists pg_cron;

-- Replace any previous job of the same name, then (re)create it.
do $$
begin
  perform cron.unschedule('kiuq-daily-reminders');
exception when others then
  null;  -- no existing job; ignore
end $$;

select cron.schedule(
  'kiuq-daily-reminders',
  '0 6 * * *',
  $$ select public.enqueue_daily_reminders(); $$
);

-- ============================================================================
-- ✅ Verify
--
--   -- Run it once right now (returns how many reminders were created):
--   select public.enqueue_daily_reminders();
--
--   -- Confirm the cron job is registered:
--   select jobname, schedule, active from cron.job where jobname = 'kiuq-daily-reminders';
--
--   -- Remove the schedule later if needed:
--   -- select cron.unschedule('kiuq-daily-reminders');
-- ============================================================================
