-- Migration: make in-system notification inserts observable and usable from
-- authenticated member actions.
--
-- Existing app columns are recipient_id and actor_id. They map to the requested
-- recipient_user_id and actor_user_id concepts without renaming live columns.

do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
      and t.typname = 'notification_type'
  ) then
    create type public.notification_type as enum (
      'task_assigned',
      'task_updated',
      'task_comment',
      'task_deadline_changed',
      'task_needs_fix',
      'task_approved',
      'task_completed',
      'work_reviewed',
      'prompt_replaced',
      'submission_received',
      'blocker_reported',
      'blocker_resolved',
      'mention',
      'blog_followup',
      'plugin_update',
      'monthly_report',
      'ebay_click_followup',
      'speed_optimization_followup',
      'quality_issue_reported',
      'quality_issue_fixed'
    );
  end if;
end;
$$;

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

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  type public.notification_type not null,
  title text not null,
  message text not null default '',
  related_type text,
  related_id text,
  task_id uuid references public.prompt_assignments(id) on delete set null,
  submission_id uuid references public.submissions(id) on delete set null,
  is_read boolean not null default false,
  email_sent boolean not null default false,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.notifications
  add column if not exists link text,
  add column if not exists related_website_id uuid references public.websites(id) on delete set null,
  add column if not exists related_issue_id uuid references public.quality_issues(id) on delete set null;

create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, is_read)
  where is_read = false;
create index if not exists notifications_related_website_idx
  on public.notifications (related_website_id);
create index if not exists notifications_related_issue_idx
  on public.notifications (related_issue_id);

alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_service" on public.notifications;
drop policy if exists "notifs_insert_own_or_admin" on public.notifications;
drop policy if exists "Authenticated users can create notifications" on public.notifications;
drop policy if exists "authenticated_insert_notifications" on public.notifications;
drop policy if exists "notifs_insert_authenticated" on public.notifications;
drop policy if exists "Users can view own notifications" on public.notifications;
drop policy if exists "Users can update own notifications" on public.notifications;
drop policy if exists "Authenticated users can insert notifications" on public.notifications;

create policy "Users can view own notifications"
on public.notifications
for select
to authenticated
using (
  auth.uid() = recipient_id
  or auth.uid() = actor_id
);

create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id);

create policy "Authenticated users can insert notifications"
on public.notifications
for insert
to authenticated
with check (auth.uid() is not null);

do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end;
$$;
