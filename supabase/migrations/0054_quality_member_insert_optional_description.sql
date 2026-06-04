-- Migration: relax member-insert policy on quality_issues
--
-- The simplified "New Quality Issue" modal makes description optional —
-- members should be able to create an issue with only title + assigned
-- member (+ optional screenshot/page-url). The previous member-insert
-- policy (from 0051) required `length(trim(description)) > 0`, which
-- caused:
--
--   new row violates row-level security policy for table "quality_issues"
--
-- whenever a member submitted the simplified form without a note. This
-- drops the description requirement (title is still required) while
-- keeping every other guarantee — created_by must be the caller, status
-- must be 'new_issue', not pre-approved, and assigned_to must be set.

drop policy if exists "qi_member_insert" on public.quality_issues;

create policy "qi_member_insert"
  on public.quality_issues for insert to authenticated
  with check (
    not public.is_admin()
    and created_by = auth.uid()
    and assigned_to is not null
    and status = 'new_issue'
    and length(trim(title)) > 0
    and approved_by is null
    and approved_at is null
  );
