-- Migration: allow any team member to move any Quality Check card.
--
-- Previous behaviour (0057_quality_issue_edit_permissions):
--   Non-admin UPDATEs were locked to rows where (assigned_to = me OR created_by = me).
--   The per-row trigger also restricted status changes to the assigned member only.
--   This meant team members could only drag cards they personally owned — the
--   opposite of the intended UX where the whole team can collaborate on the board.
--
-- New behaviour:
--   Any authenticated user may UPDATE any quality_issue row, EXCEPT:
--     * Rows already in 'approved' status cannot be touched by non-admins.
--     * Non-admins / non-assistant-heads cannot set status = 'approved'.
--     * Protected fields (id, website_id, issue_type, priority, assigned_to,
--       due_date, created_by, created_at, approved_by, approved_at) are still
--       locked for regular members — only title, page_url, description,
--       screenshot_url, and status are writable.
--   Admins and Assistant Heads retain unrestricted UPDATE power.

-- ── RLS policy: any authenticated user can update non-approved issues ────
drop policy if exists "qi_member_update_allowed" on public.quality_issues;

create policy "qi_member_update_allowed"
  on public.quality_issues for update to authenticated
  using (
    not public.is_admin()
    and status <> 'approved'
  )
  with check (
    not public.is_admin()
    and (
      public.is_assistant_head()
      or (
        status <> 'approved'
        and approved_by is null
        and approved_at is null
      )
    )
  );

-- ── Per-row trigger: drop the assigned-member-only status restriction ────
create or replace function public.quality_issue_member_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins and Assistant Heads: full update power, no extra checks.
  if public.is_admin() or public.is_assistant_head() then
    return new;
  end if;

  -- Nobody except admins/AH may touch an already-approved issue.
  if old.status = 'approved' then
    raise exception 'Approved quality issues can only be changed by admins.';
  end if;

  -- Regular members cannot set status to 'approved'.
  if new.status = 'approved' then
    raise exception 'Only admins or assistant heads can approve quality issues.';
  end if;

  -- Members cannot change protected structural fields.
  if new.id is distinct from old.id
    or new.website_id is distinct from old.website_id
    or new.issue_type is distinct from old.issue_type
    or new.priority is distinct from old.priority
    or new.assigned_to is distinct from old.assigned_to
    or new.due_date is distinct from old.due_date
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
  then
    raise exception 'Members can only update title, page URL, description, screenshot, and status.';
  end if;

  return new;
end;
$$;
