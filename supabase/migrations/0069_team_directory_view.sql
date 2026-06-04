-- ============================================================================
-- 0069_team_directory_view.sql
-- ----------------------------------------------------------------------------
-- Lets ordinary team members (and Assistant Heads) see a directory of their
-- teammates WITHOUT exposing any presence or activity data.
--
-- Why a view instead of a new RLS policy on `profiles`?
--   RLS is row-level, not column-level. Opening up `profiles` for everyone
--   would also expose online status, last_active_at, last_login_at,
--   current_page, activity counts, etc. A view lets us hand out ONLY the
--   safe columns below.
--
-- This view intentionally OMITS:
--   is_online, current_status, last_active_at, last_login_at,
--   last_logout_at, today_activity_count, current_page, notes,
--   preferred_theme, updated_at
--
-- Run this whole file in the Supabase SQL editor. It is idempotent — safe to
-- run more than once.
-- ============================================================================

begin;

drop view if exists public.team_directory;

create view public.team_directory as
select
  id,
  full_name,
  email,
  role,
  status,
  avatar_url,
  username,
  position,
  phone,
  bio,
  created_at
from public.profiles
where status = 'active';

comment on view public.team_directory is
  'Safe, read-only teammate directory (no presence/activity columns). Exposed to authenticated users only.';

-- The view runs with its owner''s privileges (security_invoker is OFF by
-- default), so it reads profiles regardless of the base-table RLS — but it
-- can only ever return the safe columns selected above.
-- Expose it to logged-in users only; never to anonymous visitors.
revoke all on public.team_directory from anon;
grant select on public.team_directory to authenticated;

commit;

-- ============================================================================
-- ✅ Verify it works (run these after the migration):
--
--   -- Should list every ACTIVE teammate (no online/last-seen columns exist):
 --   select * from public.team_directory order by full_name;
--
--   -- Should return a number > 0:
--   select count(*) from public.team_directory;
--
--   -- Confirm the unsafe columns are NOT present (this should ERROR):
--   -- select last_active_at from public.team_directory;
-- ============================================================================
