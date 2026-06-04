-- Migration: extend role enum + admin/AH RLS helpers
--
-- Adds the new role hierarchy (head / supervisor / assistant_head /
-- team_member) alongside existing values (admin, member, reviewer,
-- owner, quality_checker). NO data migration here — old roles stay
-- valid and existing rows keep working. The follow-up session does
-- the visible label sweep + optional `admin → head` data migration.
--
-- Key invariant: `is_admin()` continues to return true for EVERY user
-- that returned true before this migration. We just expand it to also
-- recognize head / supervisor as admin-equivalent.

-- ── profiles.role: union of old + new values ─────────────────────────
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'admin', 'owner', 'reviewer', 'member',         -- legacy
    'quality_checker',                              -- added in 0056
    'head', 'supervisor', 'assistant_head', 'team_member'  -- new hierarchy
  ));

-- ── is_admin(): now recognizes head + supervisor too ────────────────
-- Every RLS policy that calls is_admin() inherits this expansion
-- automatically; no per-policy changes needed.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner', 'head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── is_assistant_head(): for the AH-only carve-outs ─────────────────
-- The Quality Check approval session will use this in policies that
-- give AH the same approval power as admins on team-member fixes,
-- while still blocking AH from approving their own work.
create or replace function public.is_assistant_head()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'assistant_head'
      and status = 'active'
  );
$$;

revoke all on function public.is_assistant_head() from public;
grant execute on function public.is_assistant_head() to authenticated;
