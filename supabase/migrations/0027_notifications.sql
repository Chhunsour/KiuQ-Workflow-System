-- Notification types enum
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
  'mention'
);

-- ─── notifications ───────────────────────────────────────────────────────────
create table public.notifications (
  id               uuid primary key default gen_random_uuid(),
  recipient_id     uuid not null references auth.users(id) on delete cascade,
  actor_id         uuid          references auth.users(id) on delete set null,
  type             public.notification_type not null,
  title            text not null,
  message          text not null,
  related_type     text,                    -- 'task' | 'submission' | 'comment' etc.
  related_id       text,                    -- id of the related entity
  task_id          uuid          references public.prompt_assignments(id) on delete set null,
  submission_id    uuid          references public.submissions(id)        on delete set null,
  is_read          boolean not null default false,
  email_sent       boolean not null default false,
  email_sent_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- index for fast "my notifications" queries
create index notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index notifications_unread_idx   on public.notifications(recipient_id, is_read) where is_read = false;

-- auto-update updated_at
create or replace function public.set_notifications_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_notifications_updated_at();

-- ─── notification_preferences ────────────────────────────────────────────────
create table public.notification_preferences (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  in_app_enabled          boolean not null default true,
  email_enabled           boolean not null default true,
  browser_enabled         boolean not null default false,
  -- granular email toggles
  task_assigned_email     boolean not null default true,
  comments_email          boolean not null default true,
  review_email            boolean not null default true,
  prompt_replaced_email   boolean not null default true,
  deadline_email          boolean not null default true,
  mention_email           boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create or replace function public.set_notification_prefs_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger notification_prefs_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_notification_prefs_updated_at();

-- auto-create default preferences when a new user profile is created
create or replace function public.create_default_notification_preferences()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- attach to the profiles table so every new member gets defaults
create trigger on_profile_created_notification_prefs
  after insert on public.profiles
  for each row execute function public.create_default_notification_preferences();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;

-- recipient sees their own; actor sees rows they created (to read back the inserted id)
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid() or actor_id = auth.uid());

-- any authenticated user can insert for any recipient (actor validated in app code)
create policy "notifications_insert_service" on public.notifications
  for insert to authenticated



-- only the recipient can mark their notifications as read
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- notification_preferences: each user manages their own
create policy "notif_prefs_select_own" on public.notification_preferences
  for select to authenticated
  using (user_id = auth.uid());

create policy "notif_prefs_insert_own" on public.notification_preferences
  for insert to authenticated
  with check (user_id = auth.uid());

create policy "notif_prefs_update_own" on public.notification_preferences
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── Enable realtime ─────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.notification_preferences;
