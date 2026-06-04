-- Migration: add 'quality_checker' role + 'pending' status to profiles
--
-- New role:
--   quality_checker — outside or limited internal reviewers who can only
--   access the Quality Check dashboard. They must not see team work,
--   member boards, docs, prompts, reports, etc.
--
-- New status:
--   pending — newly self-registered accounts wait here until an admin
--   approves them and chooses a real role.
--
-- This migration is the SECURITY SPINE only. The follow-up session adds:
--   - quality_checker_assignments(user_id, scope_kind, scope_id)
--   - RLS policies on quality_issues / quality_classes / websites scoping
--     a QC's reads to assigned websites only.
--
-- Until that follow-up runs, a QC's RLS reach equals an unauthenticated
-- member's — which is roughly nothing — so this migration is safe to
-- ship on its own.

-- ── profiles.role ────────────────────────────────────────────────────
-- Drop the old constraint and add a new one that includes quality_checker.
-- 'reviewer' is already used by some legacy rows; including it keeps any
-- existing data valid.
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin', 'member', 'reviewer', 'owner', 'quality_checker'));

-- ── profiles.status ──────────────────────────────────────────────────
alter table public.profiles
  drop constraint if exists profiles_status_check;

alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'inactive', 'deactivated', 'pending'));

-- ── RLS helper: is_quality_checker() ─────────────────────────────────
-- Mirrors public.is_admin() so RLS policies elsewhere can scope reads
-- to QCs cleanly. Uses security definer + locked search_path, same as
-- the existing is_admin() helper.
create or replace function public.is_quality_checker()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'quality_checker'
      and status <> 'pending'
      and status <> 'deactivated'
  );
$$;

revoke all on function public.is_quality_checker() from public;
grant execute on function public.is_quality_checker() to authenticated;

-- Helpful index for the most common lookups: "is this user pending?"
create index if not exists profiles_status_idx on public.profiles (status);
