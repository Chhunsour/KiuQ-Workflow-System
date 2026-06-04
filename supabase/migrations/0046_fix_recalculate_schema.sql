-- 0046 — Fix recalculate_monthly_leaderboard schema bugs (supersedes 0039's fn)
--
-- 0039's recalculate_monthly_leaderboard had two bugs that crashed the RPC
-- (surfaced as "Reset error: column metadata does not exist"):
--
--   1. Docs/resources CTE filtered on `metadata->>'name'` but
--      activity_logs has NO `metadata` column. Columns are:
--      id, user_id, action, related_type, related_id, message, created_at.
--      → Replaced with a `message`-based empty-content filter (spec intent:
--        "Do not count empty docs/resources").
--
--   2. Followup CTE read `public.blog_followup_slots` but the real table is
--      `public.blog_upload_slots`. → Fixed table name.
--
-- Everything else (scoring values, anti-farming caps, admin exclusion) is
-- unchanged from 0039 and matches the spec exactly.

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

    -- ── Members eligible for leaderboard (no admin) ──
    eligible_members as (
      select id as user_id
      from public.profiles
      where replace(replace(lower(coalesce(role,'')), ' ', '_'), '-', '_')
              in ('member', 'team_member')
        and coalesce(status, 'active') = 'active'
    ),

    -- ── Period logs for eligible members only ──
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
          count(distinct coalesce(related_id::text, created_at::text)) as day_count,
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
          and related_id is not null
        group by user_id, related_id, created_at::date
      ) daily_comment
      group by user_id
    ),

    -- ── Docs/resources: cap 3 per day, exclude empty content ──
    -- activity_logs has no metadata column; use the `message` text as the
    -- usefulness signal. Skip entries that look empty/untitled.
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
        and length(trim(coalesce(message, ''))) > 5
        and lower(trim(coalesce(message, ''))) not in
            ('untitled', 'untitled doc', 'new document', '')
        group by user_id, created_at::date
      ) daily_docs
      group by user_id
    ),

    -- ── Website creation: dedup by related_id, cap 2/day ──
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

    -- ── Submissions: dedup by (assignment_id, day), +5 each ──
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

    -- ── Approved work: +15 each (admin triggered) ──
    approved_scored as (
      select
        user_id,
        count(*) filter (
          where action in ('task_approved', 'approved_submission', 'approved_work')
        )::integer as approved_count
      from period_logs
      group by user_id
    ),

    -- ── Penalties: -3 needs_fix, -8 rejected, -5 overdue ──
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

    -- ── Blog/plugin followups: dedup by slot id (once per slot) ──
    -- FIX: table is blog_upload_slots, NOT blog_followup_slots.
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
        from public.blog_upload_slots
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

    -- ── Monthly reports: +8, one per month max ──
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

    -- ── Active time: +1 per 30 min of logs, cap 3 pts/day ──
    active_scored as (
      select
        user_id,
        sum(day_pts) as active_pts
      from (
        select
          user_id,
          created_at::date as day,
          least(floor(count(*) / 30.0)::integer, 3) as day_pts
        from period_logs
        group by user_id, created_at::date
      ) daily_active
      group by user_id
    )

    -- ── Final assembly ──
    select
      em.user_id,
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
      coalesce(a.approved_count,  0)::integer as approved_work,
      coalesce(a.approved_count,  0)::integer as tasks_completed,
      coalesce(s.submit_count,    0)::integer as submissions_made,
      0::integer                              as on_time_count,
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
