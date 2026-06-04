-- ============================================================================
-- 0081_fix_team_directory_security_warning.sql
-- ----------------------------------------------------------------------------
-- Resolves the SECURITY DEFINER View warning for public.team_directory
-- by converting the view into a secure SECURITY DEFINER function (RPC).
-- This satisfies the security linter and maintains the exact same columns and
-- performance without exposing presence/activity data to non-admins.
-- ============================================================================

begin;

-- 1. Drop the old SECURITY DEFINER view
drop view if exists public.team_directory;

-- 2. Create the SECURITY DEFINER function with a secure search_path explicitly set
create or replace function public.get_team_directory()
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  status text,
  avatar_url text,
  username text,
  "position" text,
  phone text,
  bio text,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_catalog
as $$
  select
    id,
    full_name,
    email,
    role,
    status,
    avatar_url,
    username,
    "position",
    phone,
    bio,
    created_at
  from public.profiles
  where status = 'active';
$$;

-- 3. Add documentation comment
comment on function public.get_team_directory() is
  'Safe, read-only teammate directory (no presence/activity columns). Exposed to authenticated users only.';

-- 4. Restrict execution of the function to authenticated users only
revoke all on function public.get_team_directory() from public, anon;
grant execute on function public.get_team_directory() to authenticated;

commit;
