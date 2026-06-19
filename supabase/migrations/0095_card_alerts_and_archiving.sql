  -- 0095_card_alerts_and_archiving.sql
  -- Migration to support task alert integration, archiving, and require_ack controls

  begin;

  -- 1. Add columns for archiving and require_ack
  alter table public.prompt_assignments 
    add column if not exists is_archived boolean not null default false;

  alter table public.quality_issues 
    add column if not exists is_archived boolean not null default false;

  alter table public.task_alerts 
    add column if not exists require_ack boolean not null default true;

  -- 2. Create performance indexes
  create index if not exists prompt_assignments_is_archived_idx on public.prompt_assignments(is_archived);
  create index if not exists quality_issues_is_archived_idx on public.quality_issues(is_archived);
  create index if not exists task_alerts_require_ack_idx on public.task_alerts(require_ack);

  -- 3. Re-define trigger to guard member updates on quality issues
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
      or new.is_archived is distinct from old.is_archived
    then
      raise exception 'Employees cannot modify protected fields (assignee, priority, details, archive status).';
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
