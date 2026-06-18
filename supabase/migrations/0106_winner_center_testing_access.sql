-- Migration: 0106_winner_center_testing_access.sql
-- Description:
--   Allow Owner/Admin (not just Head/Supervisor) to toggle Winner Center
--   Testing Mode and reset test data. Everything else in Winner Center already
--   allows Owner/Admin/Head/Supervisor (can_manage_winner_center), but the
--   testing toggle was Head/Supervisor-only — which locked Owner/Admin out of
--   resetting their own test winners. This aligns the testing gate with the
--   rest of the feature.
-- Idempotent: safe to re-run.

begin;

create or replace function public.can_toggle_winner_center_testing()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_')
            in ('owner', 'admin', 'head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.can_toggle_winner_center_testing() from public;
grant execute on function public.can_toggle_winner_center_testing() to authenticated;

commit;

-- ✅ Verify: select public.can_toggle_winner_center_testing();  -- true for owner/admin/head/supervisor
