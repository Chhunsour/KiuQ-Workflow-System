-- ============================================================================
-- 0072_leaderboard_include_assistant_head.sql
-- ----------------------------------------------------------------------------
-- Assistant Heads use the Team Member dashboard and do member-class work, so
-- they should compete on the leaderboard too. Migration 0070 only counted
-- roles 'member' / 'team_member', which left Assistant Heads off the board.
--
-- This re-creates get_team_leaderboard() with 'assistant_head' added to the
-- eligible roles. Everything else (scoring, columns, ranking) is unchanged.
--
-- Run this whole file in the Supabase SQL editor. Supersedes 0070's function.
-- ============================================================================

begin;

create or replace function public.get_team_leaderboard(p_month_key text)
returns table (
  member_id        uuid,
  full_name        text,
  avatar_url       text,
  role             text,
  total_points     integer,
  approved_count   integer,
  submitted_count  integer,
  followups_count  integer,
  needs_fix_count  integer,
  rejected_count   integer,
  rank             integer
)
language sql
security definer
set search_path = public
as $$
  with
  v as (
    select
      (p_month_key || '-01')::date                          as v_start,
      ((p_month_key || '-01')::date + interval '1 month')    as v_end
  ),

  -- Ordinary team members AND assistant heads compete (no admins / leads / QC).
  eligible as (
    select p.id as member_id, p.full_name, p.avatar_url, p.role
    from public.profiles p
    where replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_')
            in ('member', 'team_member', 'assistant_head')
      and coalesce(p.status, 'active') = 'active'
  ),

  approved as (
    select a.assigned_member_id as member_id, count(*)::int as c
    from public.prompt_assignments a, v
    where a.status = 'approved'
      and a.updated_at >= v.v_start and a.updated_at < v.v_end
    group by a.assigned_member_id
  ),

  submitted as (
    select s.submitted_by as member_id, count(distinct s.assignment_id)::int as c
    from public.submissions s, v
    where s.submitted_by is not null
      and s.submitted_at >= v.v_start and s.submitted_at < v.v_end
    group by s.submitted_by
  ),

  needs_fix as (
    select a.assigned_member_id as member_id, count(*)::int as c
    from public.prompt_assignments a, v
    where a.status = 'needs_fix'
      and a.updated_at >= v.v_start and a.updated_at < v.v_end
    group by a.assigned_member_id
  ),

  rejected as (
    select s.submitted_by as member_id, count(*)::int as c
    from public.submissions s, v
    where s.status = 'rejected' and s.submitted_by is not null
      and s.submitted_at >= v.v_start and s.submitted_at < v.v_end
    group by s.submitted_by
  ),

  followups as (
    select member_id, sum(c)::int as c
    from (
      select b.completed_by as member_id, count(*)::int as c
      from public.blog_upload_slots b, v
      where b.status = 'done' and b.completed_by is not null
        and b.completed_at >= v.v_start and b.completed_at < v.v_end
      group by b.completed_by
      union all
      select pu.completed_by, count(*)::int
      from public.plugin_update_slots pu, v
      where pu.status = 'done' and pu.completed_by is not null
        and pu.completed_at >= v.v_start and pu.completed_at < v.v_end
      group by pu.completed_by
      union all
      select so.completed_by, count(*)::int
      from public.speed_optimization_slots so, v
      where so.status = 'done' and so.completed_by is not null
        and so.completed_at >= v.v_start and so.completed_at < v.v_end
      group by so.completed_by
      union all
      select e.user_id, count(*)::int
      from public.ebay_click_followup e, v
      where e.status = 'done'
        and e.date >= v.v_start and e.date < v.v_end
      group by e.user_id
    ) all_fu
    group by member_id
  ),

  scored as (
    select
      em.member_id,
      em.full_name,
      em.avatar_url,
      em.role,
      coalesce(ap.c, 0) as approved_count,
      coalesce(su.c, 0) as submitted_count,
      coalesce(fu.c, 0) as followups_count,
      coalesce(nf.c, 0) as needs_fix_count,
      coalesce(rj.c, 0) as rejected_count,
      ( coalesce(ap.c, 0) * 15
      + coalesce(su.c, 0) * 5
      + coalesce(fu.c, 0) * 3
      - coalesce(nf.c, 0) * 3
      - coalesce(rj.c, 0) * 8 ) as total_points
    from eligible em
    left join approved  ap on ap.member_id = em.member_id
    left join submitted su on su.member_id = em.member_id
    left join followups fu on fu.member_id = em.member_id
    left join needs_fix nf on nf.member_id = em.member_id
    left join rejected  rj on rj.member_id = em.member_id
  )

  select
    s.member_id,
    s.full_name,
    s.avatar_url,
    s.role,
    s.total_points::int,
    s.approved_count::int,
    s.submitted_count::int,
    s.followups_count::int,
    s.needs_fix_count::int,
    s.rejected_count::int,
    row_number() over (
      order by s.total_points desc,
               s.approved_count desc,
               s.submitted_count desc,
               s.full_name asc
    )::int as rank
  from scored s
  order by s.total_points desc,
           s.approved_count desc,
           s.submitted_count desc,
           s.full_name asc;
$$;

revoke all on function public.get_team_leaderboard(text) from public, anon;
grant execute on function public.get_team_leaderboard(text) to authenticated;

commit;

-- ✅ Verify the Assistant Head now shows up:
--   select rank, full_name, role, total_points
--   from public.get_team_leaderboard(to_char(now(), 'YYYY-MM'));
