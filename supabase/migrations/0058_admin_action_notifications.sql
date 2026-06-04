-- Migration: secure in-system admin notifications for member actions.
--
-- Member clients cannot insert notifications for admins directly because the
-- notifications insert policy is intentionally locked down. This RPC provides
-- a narrow server-side path that sends notifications only to active admins
-- (plus optional explicit admin recipients), dedupes recipients, and stamps
-- the authenticated caller as actor.

do $$
begin
  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'ebay_click_followup'
  ) then
    alter type public.notification_type add value 'ebay_click_followup';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'speed_optimization_followup'
  ) then
    alter type public.notification_type add value 'speed_optimization_followup';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'quality_issue_reported'
  ) then
    alter type public.notification_type add value 'quality_issue_reported';
  end if;

  if not exists (
    select 1 from pg_enum
    where enumtypid = 'public.notification_type'::regtype
      and enumlabel = 'quality_issue_fixed'
  ) then
    alter type public.notification_type add value 'quality_issue_fixed';
  end if;
end;
$$;

alter table public.notifications
  add column if not exists link text,
  add column if not exists related_website_id uuid references public.websites(id) on delete set null,
  add column if not exists related_issue_id uuid references public.quality_issues(id) on delete set null;

create index if not exists notifications_related_website_idx
  on public.notifications (related_website_id);
create index if not exists notifications_related_issue_idx
  on public.notifications (related_issue_id);

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
      and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('admin', 'owner')
      and status = 'active'
  )
  into v_actor_is_admin;

  with admin_recipients as (
    select id
    from public.profiles
    where replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('admin', 'owner')
      and status = 'active'
  ),
  extra_recipients as (
    select p.id
    from unnest(coalesce(p_extra_recipient_ids, '{}'::uuid[])) as x(id)
    join public.profiles p on p.id = x.id
    where replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_') in ('admin', 'owner')
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

revoke all on function public.create_admin_notifications(
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
) from public;

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
