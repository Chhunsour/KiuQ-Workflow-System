-- Safe re-run: skips anything already created.
-- Paste this in Supabase Dashboard → SQL Editor if 0027_notifications.sql failed partway.

-- Enum already exists — skip it
-- create type public.notification_type ...  ← already done

-- ─── notifications ───────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id               uuid primary key default gen_random_uuid(),
  recipient_id     uuid not null references auth.users(id) on delete cascade,
  actor_id         uuid          references auth.users(id) on delete set null,
  type             public.notification_type not null,
  title            text not null,
  message          text not null,
  related_type     text,
  related_id       text,
  task_id          uuid          references public.prompt_assignments(id) on delete set null,
  submission_id    uuid          references public.submissions(id)        on delete set null,
  is_read          boolean not null default false,
  email_sent       boolean not null default false,
  email_sent_at    timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists notifications_recipient_idx on public.notifications(recipient_id, created_at desc);
create index if not exists notifications_unread_idx   on public.notifications(recipient_id, is_read) where is_read = false;

create or replace function public.set_notifications_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists notifications_updated_at on public.notifications;
create trigger notifications_updated_at
  before update on public.notifications
  for each row execute function public.set_notifications_updated_at();

-- ─── notification_preferences ────────────────────────────────────────────────
create table if not exists public.notification_preferences (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null unique references auth.users(id) on delete cascade,
  in_app_enabled          boolean not null default true,
  email_enabled           boolean not null default true,
  browser_enabled         boolean not null default false,
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

drop trigger if exists notification_prefs_updated_at on public.notification_preferences;
create trigger notification_prefs_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_notification_prefs_updated_at();

create or replace function public.create_default_notification_preferences()
returns trigger language plpgsql security definer as $$
begin
  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_profile_created_notification_prefs on public.profiles;
create trigger on_profile_created_notification_prefs
  after insert on public.profiles
  for each row execute function public.create_default_notification_preferences();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "notifications_select_own"    on public.notifications;
drop policy if exists "notifications_insert_service" on public.notifications;
drop policy if exists "notifications_update_own"    on public.notifications;

create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (recipient_id = auth.uid());

create policy "notifications_insert_service" on public.notifications
  for insert to authenticated
  with check (true);

create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

drop policy if exists "notif_prefs_select_own" on public.notification_preferences;
drop policy if exists "notif_prefs_insert_own" on public.notification_preferences;
drop policy if exists "notif_prefs_update_own" on public.notification_preferences;

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

-- ─── Backfill preferences for existing users ─────────────────────────────────
insert into public.notification_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;
