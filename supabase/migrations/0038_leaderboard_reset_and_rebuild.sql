-- ============================================================
-- 0038 — Leaderboard reset + rebuild
-- • Clears old score data (leaderboard_scores rows only)
-- • Creates monthly_leaderboard_results (final per-month winners)
-- • Creates leaderboard_winner_popups  (seen-once per user)
-- • Replaces get_leaderboard_summary   (new scoring formula)
-- • Adds recalculate_monthly_leaderboard (admin RPC)
-- • Adds finalize_monthly_leaderboard   (admin RPC)
-- ============================================================

-- ── Step 1: Clear old calculated score rows ──────────────────
-- Only clears computed scores; does NOT touch activity_logs,
-- submissions, assignments, members, followup records, or reports.
truncate table public.leaderboard_scores restart identity cascade;

-- ── Step 2: Monthly leaderboard results (locked end-of-month) ─
create table if not exists public.monthly_leaderboard_results (
  id              uuid primary key default gen_random_uuid(),
  month_key       text not null,          -- 'YYYY-MM'
  member_id       uuid not null references public.profiles(id) on delete cascade,
  rank            integer not null,
  total_points    integer not null default 0,
  tasks_completed integer not null default 0,
  approved_work   integer not null default 0,
  submissions_made integer not null default 0,
  on_time_count   integer not null default 0,
  followups_done  integer not null default 0,
  reports_submitted integer not null default 0,
  prompts_copied  integer not null default 0,
  docs_created    integer not null default 0,
  active_pts      integer not null default 0,
  penalties       integer not null default 0,
  calculated_at   timestamptz not null default now(),
  is_final        boolean not null default false,
  unique (month_key, member_id)
);

alter table public.monthly_leaderboard_results enable row level security;

create policy "mlr_read_authenticated"
  on public.monthly_leaderboard_results for select to authenticated using (true);

create policy "mlr_admin_all"
  on public.monthly_leaderboard_results for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create index if not exists mlr_month_rank_idx
  on public.monthly_leaderboard_results (month_key, rank asc);

-- ── Step 3: Winner popup seen-status ─────────────────────────
create table if not exists public.leaderboard_winner_popups (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  month_key        text not null,         -- 'YYYY-MM' of the past month being announced
  winner_member_id uuid references public.profiles(id) on delete set null,
  seen_at          timestamptz not null default now(),
  unique (user_id, month_key)
);

alter table public.leaderboard_winner_popups enable row level security;

-- Members can insert/read their own popup-seen records
create policy "lwp_member_own"
  on public.leaderboard_winner_popups for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "lwp_admin_all"
  on public.leaderboard_winner_popups for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── Step 4: Replace get_leaderboard_summary (new scoring) ─────
--
-- Scoring:
--   +15  task_approved
--   + 5  output_submitted
--   +10  on-time completion (before due date)  -- handled in frontend/recalc fn
--   + 5  on-deadline completion                -- handled in frontend/recalc fn
--   - 3  task_needs_fix / needs_fix
--   - 8  rejected_submission
--   - 5  overdue_task
--   + 3  blog_followup_done / plugin_update_done
--   + 8  monthly_report_submitted
--   + 5  website_created
--   + 3  created_resource / doc_created
--   + 1  task_comment
--   + 1  prompt_copied  (de-duped per day in frontend)
--   active time: +1 per 30 min, max 3 pts/day (computed in frontend)

create or replace function public.get_leaderboard_summary(
  p_period_type  text default 'monthly',
  p_period_start date default date_trunc('month', now())::date
)
returns table (
  id                       uuid,
  full_name                text,
  role                     text,
  avatar_url               text,
  status                   text,
  is_online                boolean,
  current_status           text,
  last_active_at           timestamptz,
  last_logout_at           timestamptz,
  total_points             integer,
  active_seconds           integer,
  tasks_started            integer,
  tasks_completed          integer,
  submissions_made         integer,
  approved_submissions     integer,
  rejected_submissions     integer,
  prompts_copied           integer,
  resources_created        integer,
  files_uploaded           integer,
  links_saved              integer,
  monthly_reports_submitted integer,
  blockers_reported        integer,
  current_streak           integer,
  updated_at               timestamptz
)
language sql
security definer
set search_path = public
as $$
  with bounds as (
    select
      case
        when p_period_type = 'monthly' then coalesce(p_period_start, date_trunc('month', now())::date)
        when p_period_type = 'weekly'  then coalesce(p_period_start, date_trunc('week',  now())::date)
        when p_period_type = 'daily'   then coalesce(p_period_start, now()::date)
        else null::date
      end as start_date,
      case
        when p_period_type = 'monthly' then (coalesce(p_period_start, date_trunc('month', now())::date) + interval '1 month')
        when p_period_type = 'weekly'  then (coalesce(p_period_start, date_trunc('week',  now())::date) + interval '1 week')
        when p_period_type = 'daily'   then (coalesce(p_period_start, now()::date)                       + interval '1 day')
        else null::timestamp
      end as end_at
  ),
  period_logs as (
    select l.*
    from public.activity_logs l
    cross join bounds b
    where p_period_type = 'all_time'
       or (b.start_date is not null and l.created_at >= b.start_date and l.created_at < b.end_at)
  ),
  computed as (
    select
      l.user_id,
      -- New scoring (active-time daily cap is applied in the frontend)
      sum(
        case
          when l.action in ('task_approved', 'approved_submission', 'approved_work')        then 15
          when l.action in ('submitted_work', 'output_submitted')                            then  5
          when l.action in ('task_needs_fix', 'needs_fix')                                  then -3
          when l.action = 'rejected_submission'                                              then -8
          when l.action = 'overdue_task'                                                     then -5
          when l.action in ('blog_followup_done', 'plugin_update_done')                     then  3
          when l.action in ('submitted_monthly_report', 'monthly_report_submitted')         then  8
          when l.action in ('website_created', 'created_website')                           then  5
          when l.action in ('created_resource', 'doc_created', 'added_doc',
                            'uploaded_file', 'uploaded_resource')                           then  3
          when l.action = 'task_comment'                                                     then  1
          when l.action in ('copied_prompt', 'prompt_copied')                               then  1
          else 0
        end
      )::integer as total_points,
      -- Active seconds (capping to 3 pts/day done in frontend)
      (count(*) * 60)::integer as active_seconds,
      count(*) filter (
        where l.action in ('opened_task', 'marked_task_in_progress', 'task_started')
      )::integer as tasks_started,
      count(*) filter (
        where l.action in ('task_approved', 'approved_submission', 'approved_work', 'completed_task')
      )::integer as tasks_completed,
      count(*) filter (
        where l.action in ('submitted_work', 'output_submitted', 'resubmitted_work')
      )::integer as submissions_made,
      count(*) filter (
        where l.action in ('task_approved', 'approved_submission', 'approved_work')
      )::integer as approved_submissions,
      count(*) filter (
        where l.action = 'rejected_submission'
      )::integer as rejected_submissions,
      count(*) filter (
        where l.action in ('copied_prompt', 'prompt_copied')
      )::integer as prompts_copied,
      count(*) filter (
        where l.action in ('created_resource', 'uploaded_file', 'uploaded_resource',
                           'saved_link', 'doc_created', 'added_doc')
      )::integer as resources_created,
      count(*) filter (
        where l.action in ('uploaded_file', 'uploaded_resource')
      )::integer as files_uploaded,
      count(*) filter (
        where l.action = 'saved_link'
      )::integer as links_saved,
      count(*) filter (
        where l.action in ('submitted_monthly_report', 'monthly_report_submitted')
      )::integer as monthly_reports_submitted,
      count(*) filter (
        where l.action in ('reported_blocker', 'blocker_reported')
      )::integer as blockers_reported,
      max(l.created_at) as updated_at
    from period_logs l
    group by l.user_id
  ),
  -- Pull persisted streak from leaderboard_scores if available
  scores as (
    select s.user_id, s.total_points, s.active_seconds,
           s.tasks_started, s.tasks_completed, s.submissions_made,
           s.approved_submissions, s.rejected_submissions, s.prompts_copied,
           s.resources_created, s.files_uploaded, s.links_saved,
           s.monthly_reports_submitted, s.blockers_reported,
           s.current_streak, s.updated_at
    from public.leaderboard_scores s
    where s.period_type = p_period_type
      and (
        (p_period_start is null and s.period_start is null)
        or s.period_start = p_period_start
      )
  )
  select
    p.id,
    coalesce(nullif(p.full_name, ''), 'Team member') as full_name,
    p.role,
    p.avatar_url,
    p.status,
    coalesce(p.is_online, false)           as is_online,
    coalesce(p.current_status, 'offline')  as current_status,
    p.last_active_at,
    p.last_logout_at,
    -- Prefer persisted score if non-zero, else computed
    coalesce(nullif(sc.total_points, 0), c.total_points, 0)                    as total_points,
    coalesce(nullif(sc.active_seconds, 0), c.active_seconds, 0)                as active_seconds,
    coalesce(nullif(sc.tasks_started, 0), c.tasks_started, 0)                  as tasks_started,
    coalesce(nullif(sc.tasks_completed, 0), c.tasks_completed, 0)              as tasks_completed,
    coalesce(nullif(sc.submissions_made, 0), c.submissions_made, 0)            as submissions_made,
    coalesce(nullif(sc.approved_submissions, 0), c.approved_submissions, 0)    as approved_submissions,
    coalesce(nullif(sc.rejected_submissions, 0), c.rejected_submissions, 0)    as rejected_submissions,
    coalesce(nullif(sc.prompts_copied, 0), c.prompts_copied, 0)                as prompts_copied,
    coalesce(nullif(sc.resources_created, 0), c.resources_created, 0)          as resources_created,
    coalesce(nullif(sc.files_uploaded, 0), c.files_uploaded, 0)                as files_uploaded,
    coalesce(nullif(sc.links_saved, 0), c.links_saved, 0)                      as links_saved,
    coalesce(nullif(sc.monthly_reports_submitted, 0), c.monthly_reports_submitted, 0) as monthly_reports_submitted,
    coalesce(nullif(sc.blockers_reported, 0), c.blockers_reported, 0)          as blockers_reported,
    coalesce(sc.current_streak, 0)                                              as current_streak,
    coalesce(sc.updated_at, c.updated_at, p.updated_at)                        as updated_at
  from public.profiles p
  left join computed c  on c.user_id  = p.id
  left join scores   sc on sc.user_id = p.id
  where replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_')
          in ('member', 'team_member')
    and coalesce(p.status, 'active') = 'active'
  order by
    coalesce(sc.total_points, 0) desc,
    coalesce(sc.approved_submissions, 0) desc,
    coalesce(sc.tasks_completed, 0) desc,
    coalesce(sc.submissions_made, 0) desc,
    coalesce(sc.prompts_copied, 0) desc,
    coalesce(sc.active_seconds, 0) desc,
    coalesce(nullif(p.full_name, ''), p.id::text) asc;
$$;

revoke all on function public.get_leaderboard_summary(text, date) from public;
grant execute on function public.get_leaderboard_summary(text, date) to authenticated;

-- ── Step 5: Recalculate monthly leaderboard (admin RPC) ───────
-- Computes scores from raw activity_logs + followup tables
-- for the given month and upserts into monthly_leaderboard_results.
-- Does NOT finalize — admin must call finalize separately.

create or replace function public.recalculate_monthly_leaderboard(
  p_month_key text  -- 'YYYY-MM'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start  date;
  v_end    date;
  v_rec    record;
begin
  -- Only admins
  if not public.is_admin() then
    raise exception 'Only admins can recalculate leaderboard.';
  end if;

  -- Cannot recalculate a finalized month
  if exists (
    select 1 from public.monthly_leaderboard_results
    where month_key = p_month_key and is_final = true
    limit 1
  ) then
    raise exception 'Month % is already finalized. Cannot recalculate.', p_month_key;
  end if;

  v_start := (p_month_key || '-01')::date;
  v_end   := v_start + interval '1 month';

  -- Delete old draft rows for this month
  delete from public.monthly_leaderboard_results
  where month_key = p_month_key and is_final = false;

  -- Insert recalculated rows ranked by total_points
  insert into public.monthly_leaderboard_results (
    month_key, member_id, rank,
    total_points, tasks_completed, approved_work, submissions_made,
    on_time_count, followups_done, reports_submitted,
    prompts_copied, docs_created, active_pts, penalties,
    calculated_at, is_final
  )
  select
    p_month_key,
    m.user_id,
    row_number() over (order by m.total_points desc, m.approved_work desc, m.tasks_completed desc),
    m.total_points,
    m.tasks_completed,
    m.approved_work,
    m.submissions_made,
    0,  -- on_time_count: computed in frontend from assignment due dates
    m.followups_done,
    m.reports_submitted,
    m.prompts_copied,
    m.docs_created,
    m.active_pts,
    m.penalties,
    now(),
    false
  from (
    select
      l.user_id,
      -- Core scoring from activity logs
      sum(
        case
          when l.action in ('task_approved','approved_submission','approved_work') then 15
          when l.action in ('submitted_work','output_submitted')                   then  5
          when l.action in ('task_needs_fix','needs_fix')                          then -3
          when l.action = 'rejected_submission'                                    then -8
          when l.action = 'overdue_task'                                           then -5
          when l.action in ('blog_followup_done','plugin_update_done')             then  3
          when l.action in ('submitted_monthly_report','monthly_report_submitted') then  8
          when l.action in ('website_created','created_website')                   then  5
          when l.action in ('created_resource','doc_created','added_doc',
                            'uploaded_file','uploaded_resource')                   then  3
          when l.action = 'task_comment'                                           then  1
          when l.action in ('copied_prompt','prompt_copied')                       then  1
          else 0
        end
      )::integer as total_points,
      count(*) filter (where l.action in
        ('task_approved','approved_submission','approved_work','completed_task')
      )::integer as tasks_completed,
      count(*) filter (where l.action in
        ('task_approved','approved_submission','approved_work')
      )::integer as approved_work,
      count(*) filter (where l.action in
        ('submitted_work','output_submitted','resubmitted_work')
      )::integer as submissions_made,
      count(*) filter (where l.action in
        ('blog_followup_done','plugin_update_done')
      )::integer as followups_done,
      count(*) filter (where l.action in
        ('submitted_monthly_report','monthly_report_submitted')
      )::integer as reports_submitted,
      count(*) filter (where l.action in
        ('copied_prompt','prompt_copied')
      )::integer as prompts_copied,
      count(*) filter (where l.action in
        ('created_resource','doc_created','added_doc','uploaded_file','uploaded_resource')
      )::integer as docs_created,
      -- Active time: count log rows per day, cap to 3 pts/day (1 pt per 30 min)
      (
        select coalesce(sum(least(floor(day_logs / 30.0)::integer, 3)), 0)
        from (
          select count(*) as day_logs
          from public.activity_logs il
          where il.user_id = l.user_id
            and il.created_at >= v_start
            and il.created_at <  v_end
          group by il.created_at::date
        ) daily
      )::integer as active_pts,
      -- Penalties (negative-only actions)
      sum(
        case
          when l.action in ('task_needs_fix','needs_fix')  then 3
          when l.action = 'rejected_submission'            then 8
          when l.action = 'overdue_task'                   then 5
          else 0
        end
      )::integer as penalties
    from public.activity_logs l
    join public.profiles p on p.id = l.user_id
    where l.created_at >= v_start
      and l.created_at <  v_end
      and replace(replace(lower(coalesce(p.role,'')),    ' ', '_'), '-', '_')
            in ('member','team_member')
      and coalesce(p.status,'active') = 'active'
    group by l.user_id
  ) m
  on conflict (month_key, member_id)
  do update set
    rank               = excluded.rank,
    total_points       = excluded.total_points,
    tasks_completed    = excluded.tasks_completed,
    approved_work      = excluded.approved_work,
    submissions_made   = excluded.submissions_made,
    followups_done     = excluded.followups_done,
    reports_submitted  = excluded.reports_submitted,
    prompts_copied     = excluded.prompts_copied,
    docs_created       = excluded.docs_created,
    active_pts         = excluded.active_pts,
    penalties          = excluded.penalties,
    calculated_at      = now(),
    is_final           = false;
end;
$$;

revoke all on function public.recalculate_monthly_leaderboard(text) from public;
grant execute on function public.recalculate_monthly_leaderboard(text) to authenticated;

-- ── Step 6: Finalize monthly leaderboard (admin RPC) ──────────
-- Locks the month so it cannot be recalculated again.
-- Returns the top winner row for the winner popup.

create or replace function public.finalize_monthly_leaderboard(
  p_month_key text
)
returns table (
  winner_member_id uuid,
  winner_full_name text,
  winner_points    integer,
  month_key        text
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can finalize the leaderboard.';
  end if;

  -- Must have draft rows first
  if not exists (
    select 1 from public.monthly_leaderboard_results
    where monthly_leaderboard_results.month_key = p_month_key
  ) then
    raise exception 'No leaderboard data for month %. Run recalculate first.', p_month_key;
  end if;

  -- Lock all rows for this month
  update public.monthly_leaderboard_results
  set is_final = true, calculated_at = now()
  where monthly_leaderboard_results.month_key = p_month_key;

  -- Return the winner (rank 1)
  return query
  select
    r.member_id,
    coalesce(nullif(p.full_name,''), 'Team member'),
    r.total_points,
    r.month_key
  from public.monthly_leaderboard_results r
  join public.profiles p on p.id = r.member_id
  where r.month_key = p_month_key
    and r.rank = 1
  limit 1;
end;
$$;

revoke all on function public.finalize_monthly_leaderboard(text) from public;
grant execute on function public.finalize_monthly_leaderboard(text) to authenticated;

-- ── Step 7: Get monthly results list (for history view) ───────
create or replace function public.get_monthly_leaderboard_results(
  p_month_key text
)
returns table (
  member_id        uuid,
  full_name        text,
  avatar_url       text,
  rank             integer,
  total_points     integer,
  tasks_completed  integer,
  approved_work    integer,
  submissions_made integer,
  followups_done   integer,
  reports_submitted integer,
  prompts_copied   integer,
  docs_created     integer,
  active_pts       integer,
  penalties        integer,
  is_final         boolean,
  calculated_at    timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    r.member_id,
    coalesce(nullif(p.full_name,''), 'Team member') as full_name,
    p.avatar_url,
    r.rank,
    r.total_points,
    r.tasks_completed,
    r.approved_work,
    r.submissions_made,
    r.followups_done,
    r.reports_submitted,
    r.prompts_copied,
    r.docs_created,
    r.active_pts,
    r.penalties,
    r.is_final,
    r.calculated_at
  from public.monthly_leaderboard_results r
  join public.profiles p on p.id = r.member_id
  where r.month_key = p_month_key
  order by r.rank asc;
$$;

revoke all on function public.get_monthly_leaderboard_results(text) from public;
grant execute on function public.get_monthly_leaderboard_results(text) to authenticated;
