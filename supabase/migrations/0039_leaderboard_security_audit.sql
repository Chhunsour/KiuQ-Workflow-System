-- ============================================================
-- 0039 — Leaderboard Security Audit & Anti-Farming Hardening
--
-- Changes:
--  1. Lock RLS on leaderboard_scores  (members cannot write own scores)
--  2. Lock RLS on leaderboard_winner_popups (already done in 0038, re-affirmed)
--  3. Replace recalculate_monthly_leaderboard with anti-farming version:
--     - Prompt copies: dedup per (user, prompt_id, day), cap 3 pts/day
--     - Comments:      max 2 per (user, task, day)
--     - Docs/resources: cap 3 per day, exclude untitled/empty
--     - Website creation: cap 2 per day, dedup by related_id
--     - Submit farming: dedup by (assignment_id, day)
--     - Followup:      dedup by slot_id (once per slot)
--     - Active time:   daily cap unchanged (3 pts/day)
--  4. Add get_member_score_breakdown RPC — admin audit tool
--  5. Add get_suspicious_activity_flags RPC — admin audit tool
-- ============================================================

-- ── Step 1: Harden RLS on leaderboard_scores ────────────────
-- Members can ONLY read. Only admins may write (upsert/delete).
-- This prevents any frontend code from inflating scores directly.

drop policy if exists "ls_member_own"          on public.leaderboard_scores;
drop policy if exists "ls_member_read"         on public.leaderboard_scores;
drop policy if exists "ls_admin_all"           on public.leaderboard_scores;
drop policy if exists "ls_authenticated_read"  on public.leaderboard_scores;
drop policy if exists "ls_read_authenticated"  on public.leaderboard_scores;
drop policy if exists "ls_admin_write"         on public.leaderboard_scores;

alter table public.leaderboard_scores enable row level security;

create policy "ls_read_authenticated"
  on public.leaderboard_scores for select to authenticated using (true);

create policy "ls_admin_write"
  on public.leaderboard_scores for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ── Step 2: Affirm RLS on monthly_leaderboard_results ────────
-- (Already created in 0038, just verify policies are correct.)

drop policy if exists "mlr_member_write" on public.monthly_leaderboard_results;

-- No insert/update policy for non-admins — selection only.
-- Policies created in 0038 (mlr_read_authenticated, mlr_admin_all) remain.

-- ── Step 3: Anti-farming recalculate RPC ─────────────────────
-- Full replacement of recalculate_monthly_leaderboard.
-- All farming caps are enforced server-side here.

create or replace function public.recalculate_monthly_leaderboard(
  p_month_key text   -- 'YYYY-MM'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start  date;
  v_end    date;
begin
  if not public.is_admin() then
    raise exception 'Only admins can recalculate leaderboard.';
  end if;

  if exists (
    select 1 from public.monthly_leaderboard_results
    where month_key = p_month_key and is_final = true
    limit 1
  ) then
    raise exception 'Month % is already finalized. Cannot recalculate.', p_month_key;
  end if;

  v_start := (p_month_key || '-01')::date;
  v_end   := v_start + interval '1 month';

  delete from public.monthly_leaderboard_results
  where month_key = p_month_key and is_final = false;

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
    row_number() over (
      order by m.total_points desc,
               m.approved_work desc,
               m.on_time_count desc,
               m.tasks_completed desc,
               m.submissions_made desc
    ),
    m.total_points,
    m.tasks_completed,
    m.approved_work,
    m.submissions_made,
    m.on_time_count,
    m.followups_done,
    m.reports_submitted,
    m.prompts_copied,
    m.docs_created,
    m.active_pts,
    m.penalties,
    now(),
    false
  from (
    with

    -- ── Members eligible for leaderboard (no admin/team-lead) ──
    eligible_members as (
      select id as user_id
      from public.profiles
      where replace(replace(lower(coalesce(role,'')), ' ', '_'), '-', '_')
              in ('member', 'team_member')
        and coalesce(status, 'active') = 'active'
    ),

    -- ── Period logs for eligible members only ──────────────────
    period_logs as (
      select l.*
      from public.activity_logs l
      join eligible_members em on em.user_id = l.user_id
      where l.created_at >= v_start
        and l.created_at <  v_end
    ),

    -- ── Prompt copies: dedup per (user, prompt_id, day), cap 3pts/day ──
    prompt_scored as (
      select
        user_id,
        sum(day_pts) as prompt_pts,
        sum(day_count) as prompt_count
      from (
        select
          user_id,
          created_at::date as day,
          -- count distinct prompt ids per day
          count(distinct coalesce(related_id::text, created_at::text)) as day_count,
          -- cap at 3 pts/day
          least(
            count(distinct coalesce(related_id::text, created_at::text))::integer,
            3
          ) as day_pts
        from period_logs
        where action in ('prompt_copied', 'copied_prompt')
        group by user_id, created_at::date
      ) daily_prompt
      group by user_id
    ),

    -- ── Comments: max 2 per (user, task_id, day), need related_id ──
    comment_scored as (
      select
        user_id,
        sum(capped_count) as comment_count,
        sum(capped_count) as comment_pts   -- 1 pt each
      from (
        select
          user_id,
          coalesce(related_id::text, 'no_task') as task_id,
          created_at::date as day,
          least(count(*)::integer, 2) as capped_count
        from period_logs
        where action = 'task_comment'
          and related_id is not null       -- must link to a task
        group by user_id, related_id, created_at::date
      ) daily_comment
      group by user_id
    ),

    -- ── Docs/resources: cap 3 per day, exclude untitled ────────
    docs_scored as (
      select
        user_id,
        sum(day_pts) as docs_pts,
        sum(day_count) as docs_count
      from (
        select
          user_id,
          created_at::date as day,
          least(count(*)::integer, 3) as day_count,
          least(count(*)::integer, 3) * 3 as day_pts
        from period_logs
        where action in (
          'created_resource', 'doc_created', 'added_doc',
          'uploaded_file', 'uploaded_resource'
        )
        -- Exclude logs with metadata indicating empty/untitled content
        -- (metadata->>'name' filter — gracefully skips if null)
        and (
          metadata->>'name' is null
          or length(trim(coalesce(metadata->>'name', ''))) > 5
          and lower(trim(coalesce(metadata->>'name', ''))) not in
              ('untitled', 'untitled doc', 'new document', '')
        )
        group by user_id, created_at::date
      ) daily_docs
      group by user_id
    ),

    -- ── Website creation: dedup by related_id, cap 2/day ────────
    website_scored as (
      select
        user_id,
        sum(day_pts) as website_pts,
        sum(day_count) as website_count
      from (
        select
          user_id,
          created_at::date as day,
          least(
            count(distinct coalesce(related_id::text, created_at::text))::integer,
            2
          ) as day_count,
          least(
            count(distinct coalesce(related_id::text, created_at::text))::integer,
            2
          ) * 5 as day_pts
        from period_logs
        where action in ('website_created', 'created_website')
        group by user_id, created_at::date
      ) daily_website
      group by user_id
    ),

    -- ── Submissions: dedup by (assignment_id, day) ──────────────
    submit_scored as (
      select
        user_id,
        count(distinct task_day_key) as submit_count,
        count(distinct task_day_key)::integer * 5 as submit_pts
      from (
        select
          user_id,
          concat(
            coalesce(related_id::text, 'none'),
            ':',
            created_at::date::text
          ) as task_day_key
        from period_logs
        where action in ('output_submitted', 'submitted_work', 'resubmitted_work')
      ) sub_keys
      group by user_id
    ),

    -- ── Approved work (from activity logs — admin triggered) ────
    approved_scored as (
      select
        user_id,
        count(*) filter (
          where action in ('task_approved', 'approved_submission', 'approved_work')
        )::integer as approved_count
      from period_logs
      group by user_id
    ),

    -- ── Penalties ────────────────────────────────────────────────
    penalty_scored as (
      select
        user_id,
        sum(
          case
            when action in ('task_needs_fix', 'needs_fix') then -3
            when action = 'rejected_submission'             then -8
            when action = 'overdue_task'                    then -5
            else 0
          end
        )::integer as penalty_pts,
        sum(
          case
            when action in ('task_needs_fix', 'needs_fix') then 3
            when action = 'rejected_submission'             then 8
            when action = 'overdue_task'                    then 5
            else 0
          end
        )::integer as penalty_abs
      from period_logs
      group by user_id
    ),

    -- ── Blog/plugin followups: dedup by slot id (once per slot) ─
    followup_scored as (
      select
        coalesce(b.member_id, pl.member_id) as user_id,
        coalesce(b.blog_pts, 0) + coalesce(pl.plugin_pts, 0) as followup_pts,
        coalesce(b.blog_count, 0) + coalesce(pl.plugin_count, 0) as followup_count
      from (
        select
          completed_by as member_id,
          count(distinct id) * 3 as blog_pts,
          count(distinct id) as blog_count
        from public.blog_followup_slots
        where status = 'done'
          and completed_at >= v_start
          and completed_at <  v_end
          and completed_by is not null
        group by completed_by
      ) b
      full outer join (
        select
          completed_by as member_id,
          count(distinct id) * 3 as plugin_pts,
          count(distinct id) as plugin_count
        from public.plugin_update_slots
        where status = 'done'
          and completed_at >= v_start
          and completed_at <  v_end
          and completed_by is not null
        group by completed_by
      ) pl on pl.member_id = b.member_id
    ),

    -- ── Monthly reports: one per month max ──────────────────────
    report_scored as (
      select
        member_id as user_id,
        count(distinct month) * 8 as report_pts,
        count(distinct month) as report_count
      from public.monthly_reports
      where submitted_at >= v_start
        and submitted_at <  v_end
      group by member_id
    ),

    -- ── Active time: cap 3 pts/day ───────────────────────────────
    active_scored as (
      select
        user_id,
        sum(day_pts) as active_pts
      from (
        select
          user_id,
          created_at::date as day,
          -- each row ≈ one minute of activity; 30 logs = 30 min = 1 pt, cap 3
          least(floor(count(*) / 30.0)::integer, 3) as day_pts
        from period_logs
        group by user_id, created_at::date
      ) daily_active
      group by user_id
    )

    -- ── Final assembly ────────────────────────────────────────────
    select
      em.user_id,
      -- Total points (quality work wins, active time cannot be deciding factor)
      (
        coalesce(s.submit_pts,   0) +
        coalesce(a.approved_count, 0) * 15 +
        coalesce(pr.prompt_pts,  0) +
        coalesce(cm.comment_pts, 0) +
        coalesce(d.docs_pts,     0) +
        coalesce(w.website_pts,  0) +
        coalesce(f.followup_pts, 0) +
        coalesce(r.report_pts,   0) +
        coalesce(at.active_pts,  0) +
        coalesce(pe.penalty_pts, 0)
      )::integer as total_points,
      -- Individual breakdowns
      coalesce(a.approved_count,  0)::integer as approved_work,
      coalesce(a.approved_count,  0)::integer as tasks_completed,
      coalesce(s.submit_count,    0)::integer as submissions_made,
      0::integer                              as on_time_count,  -- computed frontend-side
      coalesce(f.followup_count,  0)::integer as followups_done,
      coalesce(r.report_count,    0)::integer as reports_submitted,
      coalesce(pr.prompt_count,   0)::integer as prompts_copied,
      coalesce(d.docs_count,      0)::integer as docs_created,
      coalesce(at.active_pts,     0)::integer as active_pts,
      coalesce(pe.penalty_abs,    0)::integer as penalties
    from eligible_members em
    left join submit_scored   s   on s.user_id   = em.user_id
    left join approved_scored a   on a.user_id   = em.user_id
    left join prompt_scored   pr  on pr.user_id  = em.user_id
    left join comment_scored  cm  on cm.user_id  = em.user_id
    left join docs_scored     d   on d.user_id   = em.user_id
    left join website_scored  w   on w.user_id   = em.user_id
    left join followup_scored f   on f.user_id   = em.user_id
    left join report_scored   r   on r.user_id   = em.user_id
    left join active_scored   at  on at.user_id  = em.user_id
    left join penalty_scored  pe  on pe.user_id  = em.user_id
    -- Only include members with any recorded activity
    where (
      coalesce(s.submit_count,   0) > 0 or
      coalesce(a.approved_count, 0) > 0 or
      coalesce(pr.prompt_count,  0) > 0 or
      coalesce(d.docs_count,     0) > 0 or
      coalesce(f.followup_count, 0) > 0 or
      coalesce(r.report_count,   0) > 0 or
      coalesce(at.active_pts,    0) > 0
    )
  ) m
  on conflict (month_key, member_id)
  do update set
    rank              = excluded.rank,
    total_points      = excluded.total_points,
    tasks_completed   = excluded.tasks_completed,
    approved_work     = excluded.approved_work,
    submissions_made  = excluded.submissions_made,
    on_time_count     = excluded.on_time_count,
    followups_done    = excluded.followups_done,
    reports_submitted = excluded.reports_submitted,
    prompts_copied    = excluded.prompts_copied,
    docs_created      = excluded.docs_created,
    active_pts        = excluded.active_pts,
    penalties         = excluded.penalties,
    calculated_at     = now(),
    is_final          = false;
end;
$$;

revoke all on function public.recalculate_monthly_leaderboard(text) from public;
grant execute on function public.recalculate_monthly_leaderboard(text) to authenticated;

-- ── Step 4: Score breakdown RPC (admin audit tool) ─────────
-- Returns per-category point totals for one member in a given month.

create or replace function public.get_member_score_breakdown(
  p_member_id  uuid,
  p_month_key  text
)
returns table (
  category    text,
  raw_count   integer,
  capped_count integer,
  points      integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end   date;
begin
  if not public.is_admin() then
    raise exception 'Admin only.';
  end if;

  v_start := (p_month_key || '-01')::date;
  v_end   := v_start + interval '1 month';

  return query
  with period_logs as (
    select * from public.activity_logs
    where user_id = p_member_id
      and created_at >= v_start
      and created_at <  v_end
  )

  -- Submissions
  select
    'Submitted tasks'::text,
    count(distinct concat(coalesce(related_id::text,'none'),':',created_at::date::text))::integer,
    count(distinct concat(coalesce(related_id::text,'none'),':',created_at::date::text))::integer,
    count(distinct concat(coalesce(related_id::text,'none'),':',created_at::date::text))::integer * 5
  from period_logs where action in ('output_submitted','submitted_work','resubmitted_work')

  union all

  -- Approved work
  select
    'Approved work'::text,
    count(*)::integer, count(*)::integer, count(*)::integer * 15
  from period_logs where action in ('task_approved','approved_submission','approved_work')

  union all

  -- Prompt copies (deduped, capped)
  select
    'Prompts copied'::text,
    count(distinct coalesce(related_id::text, created_at::text))::integer as raw,
    (
      select sum(least(cnt::integer, 3))
      from (
        select count(distinct coalesce(related_id::text, created_at::text)) as cnt
        from period_logs
        where action in ('prompt_copied','copied_prompt')
        group by created_at::date
      ) d
    )::integer as capped,
    (
      select sum(least(cnt::integer, 3))
      from (
        select count(distinct coalesce(related_id::text, created_at::text)) as cnt
        from period_logs
        where action in ('prompt_copied','copied_prompt')
        group by created_at::date
      ) d
    )::integer as pts
  from period_logs where action in ('prompt_copied','copied_prompt')

  union all

  -- Task comments (capped 2/task/day)
  select
    'Task comments'::text,
    count(*)::integer as raw,
    (
      select sum(least(cnt::integer, 2))
      from (
        select count(*) as cnt
        from period_logs
        where action = 'task_comment' and related_id is not null
        group by related_id, created_at::date
      ) d
    )::integer as capped,
    (
      select sum(least(cnt::integer, 2))
      from (
        select count(*) as cnt
        from period_logs
        where action = 'task_comment' and related_id is not null
        group by related_id, created_at::date
      ) d
    )::integer as pts
  from period_logs where action = 'task_comment'

  union all

  -- Docs/resources (capped 3/day)
  select
    'Docs/resources'::text,
    count(*)::integer as raw,
    (
      select sum(least(cnt::integer, 3))
      from (
        select count(*) as cnt
        from period_logs
        where action in ('created_resource','doc_created','added_doc','uploaded_file','uploaded_resource')
        group by created_at::date
      ) d
    )::integer as capped,
    (
      select sum(least(cnt::integer, 3)) * 3
      from (
        select count(*) as cnt
        from period_logs
        where action in ('created_resource','doc_created','added_doc','uploaded_file','uploaded_resource')
        group by created_at::date
      ) d
    )::integer as pts
  from period_logs where action in ('created_resource','doc_created','added_doc','uploaded_file','uploaded_resource')

  union all

  -- Websites (capped 2/day)
  select
    'Websites created'::text,
    count(distinct coalesce(related_id::text, created_at::text))::integer as raw,
    (
      select sum(least(cnt::integer, 2))
      from (
        select count(distinct coalesce(related_id::text, created_at::text)) as cnt
        from period_logs
        where action in ('website_created','created_website')
        group by created_at::date
      ) d
    )::integer as capped,
    (
      select sum(least(cnt::integer, 2)) * 5
      from (
        select count(distinct coalesce(related_id::text, created_at::text)) as cnt
        from period_logs
        where action in ('website_created','created_website')
        group by created_at::date
      ) d
    )::integer as pts
  from period_logs where action in ('website_created','created_website')

  union all

  -- Monthly reports
  select
    'Monthly reports'::text,
    count(distinct month)::integer, count(distinct month)::integer,
    count(distinct month)::integer * 8
  from public.monthly_reports
  where member_id = p_member_id and submitted_at >= v_start and submitted_at < v_end

  union all

  -- Active time (capped 3/day)
  select
    'Active time'::text,
    count(*)::integer as raw,
    (
      select sum(least(floor(cnt / 30.0)::integer, 3))
      from (
        select count(*) as cnt
        from period_logs
        group by created_at::date
      ) d
    )::integer as capped,
    (
      select sum(least(floor(cnt / 30.0)::integer, 3))
      from (
        select count(*) as cnt
        from period_logs
        group by created_at::date
      ) d
    )::integer as pts
  from period_logs

  union all

  -- Penalties
  select
    'Penalties'::text,
    count(*)::integer,
    count(*)::integer,
    sum(
      case
        when action in ('task_needs_fix','needs_fix') then -3
        when action = 'rejected_submission'           then -8
        when action = 'overdue_task'                  then -5
        else 0
      end
    )::integer as pts
  from period_logs
  where action in ('task_needs_fix','needs_fix','rejected_submission','overdue_task');
end;
$$;

revoke all on function public.get_member_score_breakdown(uuid, text) from public;
grant execute on function public.get_member_score_breakdown(uuid, text) to authenticated;

-- ── Step 5: Suspicious activity flags RPC (admin audit tool) ─
-- Returns a list of suspicious farming signals for a member in a month.

create or replace function public.get_suspicious_activity_flags(
  p_member_id  uuid,
  p_month_key  text
)
returns table (
  flag_type   text,
  day         date,
  detail      text,
  severity    text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_start date;
  v_end   date;
begin
  if not public.is_admin() then
    raise exception 'Admin only.';
  end if;

  v_start := (p_month_key || '-01')::date;
  v_end   := v_start + interval '1 month';

  return query
  with period_logs as (
    select * from public.activity_logs
    where user_id = p_member_id
      and created_at >= v_start
      and created_at <  v_end
  )

  -- Prompt farming: >5 distinct prompts copied on a single day
  select
    'prompt_farm'::text,
    created_at::date as day,
    format('%s distinct prompt copies (threshold: 5)', count(distinct coalesce(related_id::text, created_at::text)))::text,
    'warn'::text
  from period_logs
  where action in ('prompt_copied','copied_prompt')
  group by created_at::date
  having count(distinct coalesce(related_id::text, created_at::text)) > 5

  union all

  -- Comment farming: >6 task comments on a single day
  select
    'comment_farm'::text,
    created_at::date as day,
    format('%s task comments on this day (threshold: 6)', count(*))::text,
    'high'::text
  from period_logs
  where action = 'task_comment'
  group by created_at::date
  having count(*) > 6

  union all

  -- Doc farming: >8 doc/resource logs on a single day
  select
    'doc_farm'::text,
    created_at::date as day,
    format('%s doc/resource events (threshold: 8)', count(*))::text,
    'warn'::text
  from period_logs
  where action in ('created_resource','doc_created','added_doc','uploaded_file','uploaded_resource')
  group by created_at::date
  having count(*) > 8

  union all

  -- Status churn: same task status-changed >4 times
  select
    'status_churn'::text,
    min(created_at)::date as day,
    format('Task %s status changed %s times (threshold: 4)', related_id, count(*))::text,
    'warn'::text
  from period_logs
  where action in ('task_moved','status_changed','moved_task')
    and related_id is not null
  group by related_id
  having count(*) > 4

  union all

  -- Idle time: days where active_pts = 3 (max) but zero real work actions
  select
    'idle_time'::text,
    day,
    format('Max active-time points on %s with no real work actions', day)::text,
    'high'::text
  from (
    select
      created_at::date as day,
      least(floor(count(*) / 30.0)::integer, 3) as active_pts,
      count(*) filter (
        where action in (
          'output_submitted','submitted_work','task_approved',
          'approved_submission','prompt_copied','copied_prompt',
          'monthly_report_submitted','doc_created','added_doc',
          'created_resource','uploaded_file','blocker_reported',
          'resubmitted_work','task_comment'
        )
      ) as real_work_count
    from period_logs
    group by created_at::date
  ) daily
  where active_pts >= 3 and real_work_count = 0

  order by day asc;
end;
$$;

revoke all on function public.get_suspicious_activity_flags(uuid, text) from public;
grant execute on function public.get_suspicious_activity_flags(uuid, text) to authenticated;
