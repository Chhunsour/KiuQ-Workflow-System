-- 0094_quality_check_workflow.sql
-- Migration to support the improved Quality Check workflow

-- 1. Extend the public.quality_issue_status enum values
alter type public.quality_issue_status add value if not exists 'closed';
alter type public.quality_issue_status add value if not exists 'reopened';

begin;

-- 2. Helper function to check if current user is a quality check manager (admin, owner, head, supervisor)
create or replace function public.is_quality_manager()
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

revoke all on function public.is_quality_manager() from public;
grant execute on function public.is_quality_manager() to authenticated;

-- 3. Adjust RLS policies on public.quality_issues
drop policy if exists "qi_member_update_allowed" on public.quality_issues;
create policy "qi_member_update_allowed"
  on public.quality_issues for update to authenticated
  using (
    public.is_quality_manager()
    or (
      assigned_to = auth.uid()
      and status not in ('approved', 'closed')
    )
  )
  with check (
    public.is_quality_manager()
    or (
      assigned_to = auth.uid()
      and status not in ('approved', 'closed')
    )
  );

drop policy if exists "qi_admin_delete" on public.quality_issues;
create policy "qi_admin_delete"
  on public.quality_issues for delete to authenticated
  using (public.is_quality_manager());

-- 4. Update the trigger for updated_at and approval metadata
create or replace function public.qi_set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  -- Stamp approval metadata only when status flips to closed (or approved).
  if new.status in ('closed', 'approved') and (old is null or old.status not in ('closed', 'approved')) then
    new.approved_at = now();
    new.approved_by = coalesce(new.approved_by, auth.uid());
  end if;
  -- Clear approval metadata if it's moved back out of closed/approved.
  if new.status not in ('closed', 'approved') and old is not null and old.status in ('closed', 'approved') then
    new.approved_at = null;
    new.approved_by = null;
  end if;
  return new;
end;
$$;

-- 5. Update/Recreate trigger to guard member updates
create or replace function public.quality_issue_member_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Admins and Managers: full update power, no extra checks.
  if public.is_quality_manager() then
    return new;
  end if;

  -- Nobody except managers may touch an already-closed or already-approved issue.
  if old.status in ('closed', 'approved') then
    raise exception 'Closed or approved quality issues can only be changed by managers.';
  end if;

  -- Regular employees can only edit issues assigned to them.
  if old.assigned_to is distinct from auth.uid() then
    raise exception 'Only the assigned employee can edit this quality issue.';
  end if;

  -- Regular employees cannot set status to 'closed', 'approved', or 'reopened' (rejected).
  if new.status in ('closed', 'approved', 'reopened', 'rejected') then
    raise exception 'Only managers can approve, close, or reopen quality issues.';
  end if;

  -- Regular employees cannot change structural/protected fields
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
    raise exception 'Employees cannot modify protected fields (assignee, priority, details).';
  end if;

  -- Check status transitions for employees
  if new.status is distinct from old.status then
    -- Allowed transitions:
    -- From open (new_issue, reopened, rejected) -> in_progress
    -- From in_progress -> Ready For Review (needs_review, fixed)
    if old.status in ('new_issue', 'reopened', 'rejected') and new.status != 'in_progress' then
      raise exception 'Employees can only transition Open/Reopened issues to In Progress.';
    end if;
    if old.status = 'in_progress' and new.status not in ('needs_review', 'fixed') then
      raise exception 'Employees can only transition In Progress issues to Ready For Review.';
    end if;
    if old.status not in ('new_issue', 'reopened', 'rejected', 'in_progress') then
      raise exception 'Cannot change status of an issue in review or completed state.';
    end if;
  end if;

  return new;
end;
$$;

commit;
