-- ============================================================================
-- 0074_leaderboard_adjustments.sql
-- ----------------------------------------------------------------------------
-- Lets heads/admins add a manual score adjustment (bonus or penalty) to a
-- member for a given month, with a written reason. The live leaderboard
-- function folds these into each member's total.
--
--   • Heads/admins add via add_leaderboard_adjustment() (reason required-ish).
--   • Anyone can read the reasons (so the UI can show "why").
--   • get_team_leaderboard() now adds the month's adjustments to total_points
--     and returns an `adjustment_points` column.
--
-- Run this whole file in the Supabase SQL editor. Idempotent — safe to re-run.
-- Supersedes the 0073 version of get_team_leaderboard.
-- ============================================================================

begin;

-- ── Table ────────────────────────────────────────────────────────────────────
create table if not exists public.leaderboard_adjustments (
  id          uuid primary key default gen_random_uuid(),
  month_key   text not null,                         -- 'YYYY-MM'
  member_id   uuid not null references public.profiles(id) on delete cascade,
  points      integer not null,                      -- may be negative
  reason      text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists lb_adj_month_member_idx
  on public.leaderboard_adjustments (month_key, member_id);

alter table public.leaderboard_adjustments enable row level security;

drop policy if exists lb_adj_select on public.leaderboard_adjustments;
drop policy if exists lb_adj_admin_write on public.leaderboard_adjustments;

-- Everyone logged in can read reasons; only admins/heads can write directly.
create policy lb_adj_select on public.leaderboard_adjustments
  for select to authenticated using (true);
create policy lb_adj_admin_write on public.leaderboard_adjustments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── Add / remove RPCs (admin-only) ───────────────────────────────────────────
create or replace function public.add_leaderboard_adjustment(
  p_month_key text,
  p_member_id uuid,
  p_points    integer,
  p_reason    text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins/heads can adjust scores.';
  end if;
  insert into public.leaderboard_adjustments (month_key, member_id, points, reason, created_by)
  values (p_month_key, p_member_id, p_points, nullif(trim(p_reason), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.delete_leaderboard_adjustment(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins/heads can remove adjustments.';
  end if;
  delete from public.leaderboard_adjustments where id = p_id;
end;
$$;

revoke all on function public.add_leaderboard_adjustment(text, uuid, integer, text) from public, anon;
revoke all on function public.delete_leaderboard_adjustment(uuid) from public, anon;
grant execute on function public.add_leaderboard_adjustment(text, uuid, integer, text) to authenticated;
grant execute on function public.delete_leaderboard_adjustment(uuid) to authenticated;

-- ── Live leaderboard, now including manual adjustments ───────────────────────
-- The return shape gains an `adjustment_points` column, so the old function
-- must be dropped first (Postgres can't CHANGE a function's OUT columns).
drop function if exists public.get_team_leaderboard(text);

create function public.get_team_leaderboard(p_month_key text)
returns table (
  member_id          uuid,
  full_name          text,
  avatar_url         text,
  role               text,
  total_points       integer,
  approved_count     integer,
  submitted_count    integer,
  followups_count    integer,
  needs_fix_count    integer,
  rejected_count     integer,
  adjustment_points  integer,
  rank               integer
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
  eligible as (
    select p.id as member_id, p.full_name, p.avatar_url, p.role
    from public.profiles p
    where coalesce(p.status, 'active') = 'active'
      and replace(replace(lower(coalesce(p.role, '')), ' ', '_'), '-', '_')
            not in ('admin', 'owner', 'head', 'supervisor', 'quality_checker', 'reviewer')
  ),
  approved as (
    select a.assigned_member_id as member_id, count(*)::int as c
    from public.prompt_assignments a, v
    where a.status = 'approved' and a.updated_at >= v.v_start and a.updated_at < v.v_end
    group by a.assigned_member_id
  ),
  submitted as (
    select s.submitted_by as member_id, count(distinct s.assignment_id)::int as c
    from public.submissions s, v
    where s.submitted_by is not null and s.submitted_at >= v.v_start and s.submitted_at < v.v_end
    group by s.submitted_by
  ),
  needs_fix as (
    select a.assigned_member_id as member_id, count(*)::int as c
    from public.prompt_assignments a, v
    where a.status = 'needs_fix' and a.updated_at >= v.v_start and a.updated_at < v.v_end
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
      where e.status = 'done' and e.date >= v.v_start and e.date < v.v_end
      group by e.user_id
    ) all_fu
    group by member_id
  ),
  adjust as (
    select member_id, sum(points)::int as c
    from public.leaderboard_adjustments
    where month_key = p_month_key
    group by member_id
  ),
  scored as (
    select
      em.member_id, em.full_name, em.avatar_url, em.role,
      coalesce(ap.c, 0) as approved_count,
      coalesce(su.c, 0) as submitted_count,
      coalesce(fu.c, 0) as followups_count,
      coalesce(nf.c, 0) as needs_fix_count,
      coalesce(rj.c, 0) as rejected_count,
      coalesce(adj.c, 0) as adjustment_points,
      ( coalesce(ap.c, 0) * 15
      + coalesce(su.c, 0) * 5
      + coalesce(fu.c, 0) * 3
      - coalesce(nf.c, 0) * 3
      - coalesce(rj.c, 0) * 8
      + coalesce(adj.c, 0) ) as total_points
    from eligible em
    left join approved  ap  on ap.member_id  = em.member_id
    left join submitted su  on su.member_id  = em.member_id
    left join followups fu  on fu.member_id  = em.member_id
    left join needs_fix nf  on nf.member_id  = em.member_id
    left join rejected  rj  on rj.member_id  = em.member_id
    left join adjust    adj on adj.member_id = em.member_id
  )
  select
    s.member_id, s.full_name, s.avatar_url, s.role,
    s.total_points::int, s.approved_count::int, s.submitted_count::int,
    s.followups_count::int, s.needs_fix_count::int, s.rejected_count::int,
    s.adjustment_points::int,
    row_number() over (
      order by s.total_points desc, s.approved_count desc, s.submitted_count desc, s.full_name asc
    )::int as rank
  from scored s
  order by s.total_points desc, s.approved_count desc, s.submitted_count desc, s.full_name asc;
$$;

revoke all on function public.get_team_leaderboard(text) from public, anon;
grant execute on function public.get_team_leaderboard(text) to authenticated;

commit;

-- ✅ Verify:
--   select public.add_leaderboard_adjustment(to_char(now(),'YYYY-MM'),
--          '<member-uuid>', 25, 'Great client call');
--   select rank, full_name, total_points, adjustment_points
--   from public.get_team_leaderboard(to_char(now(),'YYYY-MM'));
