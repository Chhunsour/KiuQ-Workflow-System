-- Migration: broaden quality_issue_comments insert policy
--
-- Previous behaviour (0051_quality_member_issue_permissions):
--   Members could only insert comments on issues they personally
--   created or were assigned to. This was too restrictive after 0065
--   gave every team member the ability to move (update) any card on
--   the board — they should be able to discuss those cards too.
--
-- New behaviour:
--   • Admins: covered by the existing "qic_admin_all" policy (no change).
--   • Non-admin team members (including assistant_head): may comment on
--     ANY quality issue, provided:
--       - user_id = their own auth.uid()  (no impersonation)
--       - They are NOT a quality_checker (QC role has scoped access)
--   • Quality checkers: may comment on issues they can see
--     (assigned to them, created by them, or in their assigned scope).
--   The delete policy is unchanged — users can still delete their own
--   comments regardless of which issue it is on.

drop policy if exists "qic_member_insert_own" on public.quality_issue_comments;

-- Non-admin, non-QC team members: comment on any issue
create policy "qic_member_insert_team"
  on public.quality_issue_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and not public.is_admin()
    and not public.is_quality_checker()
  );

-- Quality checkers: comment only on issues within their assigned scope
create policy "qic_qc_insert_scoped"
  on public.quality_issue_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_quality_checker()
    and exists (
      select 1
      from public.quality_issues qi
      where qi.id = issue_id
        and (
          qi.assigned_to = auth.uid()
          or qi.created_by = auth.uid()
          or public.qc_has_website_access(qi.website_id)
        )
    )
  );
