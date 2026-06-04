-- Migration: let members delete their own unapproved quality issues
--
-- Members occasionally need to remove issues they created by mistake
-- (typo, wrong assignee, accidental click). Previously only admins could
-- delete via qi_admin_all. This policy adds a narrow path: a member may
-- delete an issue if they created it AND it hasn't been approved yet
-- (status != 'approved', approved_by/at null). Admins remain unaffected
-- by qi_admin_all.

drop policy if exists "qi_member_delete_own" on public.quality_issues;

create policy "qi_member_delete_own"
  on public.quality_issues for delete to authenticated
  using (
    not public.is_admin()
    and created_by = auth.uid()
    and status <> 'approved'
    and approved_by is null
    and approved_at is null
  );
