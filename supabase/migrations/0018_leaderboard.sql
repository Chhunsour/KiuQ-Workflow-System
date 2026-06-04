-- WordPress Prompt System - Leaderboard support
-- Prepares persisted score, badge, and activity session tables.
-- The frontend can derive scores from activity_logs now; these tables are ready
-- for scheduled recalculation or admin reset/recalculate tools later.
-- Run after 0017_structured_prompt_templates.sql.

create table if not exists public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly', 'all_time')),
  period_start date,
  period_end date,
  total_points integer not null default 0,
  active_seconds integer not null default 0,
  tasks_started integer not null default 0,
  tasks_completed integer not null default 0,
  submissions_made integer not null default 0,
  approved_submissions integer not null default 0,
  rejected_submissions integer not null default 0,
  prompts_copied integer not null default 0,
  resources_created integer not null default 0,
  files_uploaded integer not null default 0,
  links_saved integer not null default 0,
  monthly_reports_submitted integer not null default 0,
  blockers_reported integer not null default 0,
  current_streak integer not null default 0,
  updated_at timestamptz not null default now(),
  unique (user_id, period_type, period_start)
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text not null,
  badge_name text not null,
  badge_description text not null default '',
  earned_at timestamptz,
  progress integer not null default 0,
  target integer not null default 1,
  unique (user_id, badge_key)
);

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  active_seconds integer not null default 0,
  last_interaction_at timestamptz not null default now()
);

create index if not exists leaderboard_scores_period_idx on public.leaderboard_scores (period_type, period_start, total_points desc);
create index if not exists leaderboard_scores_user_idx on public.leaderboard_scores (user_id);
create index if not exists user_badges_user_idx on public.user_badges (user_id);
create index if not exists activity_sessions_user_started_idx on public.activity_sessions (user_id, started_at desc);

alter table public.leaderboard_scores enable row level security;
alter table public.user_badges enable row level security;
alter table public.activity_sessions enable row level security;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('leaderboard_scores', 'user_badges', 'activity_sessions')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- Leaderboard scores are public team summaries, not private notes.
create policy "leaderboard_scores_read_authenticated" on public.leaderboard_scores
  for select to authenticated using (true);

create policy "leaderboard_scores_admin_all" on public.leaderboard_scores
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Badge details are personal unless admin is viewing team progress.
create policy "user_badges_admin_all" on public.user_badges
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "user_badges_member_read_own" on public.user_badges
  for select to authenticated using (user_id = auth.uid());

-- Sessions are private active-time records. Members can write/read their own.
create policy "activity_sessions_admin_read" on public.activity_sessions
  for select to authenticated using (public.is_admin());

create policy "activity_sessions_member_read_own" on public.activity_sessions
  for select to authenticated using (user_id = auth.uid());

create policy "activity_sessions_member_insert_own" on public.activity_sessions
  for insert to authenticated with check (user_id = auth.uid());

create policy "activity_sessions_member_update_own" on public.activity_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
