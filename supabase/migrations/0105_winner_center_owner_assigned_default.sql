-- Migration: 0105_winner_center_owner_assigned_default.sql
-- Description:
--   1. Make "Owner Assigned Prize" (exact) the DEFAULT official spin mode — the
--      Head/Supervisor assigns the real prize first, then the winner spins to
--      reveal it. Random Equal stays available as an opt-in.
--   2. Include Supervisor in can_manage_winner_center() so Head AND Supervisor
--      can manage prizes / select winners / assign the official prize. (The UI
--      already grants Supervisor access; this aligns the backend so their
--      writes aren't silently blocked by RLS.) Owner/Admin remain included.
-- Idempotent: safe to re-run.

begin;

-- 1. Default official mode → owner-assigned ('exact'). Existing rows are untouched.
alter table public.winner_center_monthly_winners
  alter column official_prize_mode set default 'exact';

-- 2. Widen management access to Owner / Admin / Head / Supervisor.
create or replace function public.can_manage_winner_center()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin', 'head', 'supervisor')
      and status = 'active'
  );
$$;

revoke all on function public.can_manage_winner_center() from public;
grant execute on function public.can_manage_winner_center() to authenticated;

commit;

-- ============================================================================
-- ✅ Verify:
--   select column_default from information_schema.columns
--     where table_name = 'winner_center_monthly_winners'
--       and column_name = 'official_prize_mode';   -- 'exact'::text
--   select public.can_manage_winner_center();       -- true for owner/admin/head/supervisor
-- ============================================================================
