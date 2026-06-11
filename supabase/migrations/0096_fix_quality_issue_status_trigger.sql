-- 0096_fix_quality_issue_status_trigger.sql
-- Fix Postgres enum validation error by casting enum status to text in sync trigger

begin;

create or replace function public.sync_task_status_to_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- If status changed to in_progress, stamp started_at
  if new.status::text = 'in_progress' and (old.status is null or old.status::text != 'in_progress') then
    update public.notifications
    set started_at = coalesce(started_at, now())
    where (task_id = new.id or (related_type = 'quality_issue' and related_id = new.id::text))
      and started_at is null;
  end if;

  -- If status changed to a completed state, stamp completed_at
  if new.status::text in ('submitted', 'approved', 'completed', 'fixed', 'needs_review') 
     and (old.status is null or old.status::text not in ('submitted', 'approved', 'completed', 'fixed', 'needs_review')) then
    update public.notifications
    set completed_at = coalesce(completed_at, now())
    where (task_id = new.id or (related_type = 'quality_issue' and related_id = new.id::text))
      and completed_at is null;
  end if;

  return new;
end;
$$;

commit;
