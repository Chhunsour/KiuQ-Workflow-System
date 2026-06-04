-- Migration: allow safe edits to existing Quality Check issues
--
-- Members need to fix mistakes after creating an issue: missing screenshot,
-- missing page URL, wrong title, or a short note typo. Admins keep full
-- control through the existing qi_admin_all policy.

alter table public.quality_issues
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create index if not exists quality_issues_updated_by_idx
  on public.quality_issues (updated_by);

create or replace function public.qi_set_updated_by()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists qi_updated_by on public.quality_issues;
create trigger qi_updated_by
  before update on public.quality_issues
  for each row execute function public.qi_set_updated_by();

drop policy if exists "qi_member_status_update" on public.quality_issues;
drop policy if exists "qi_member_update_allowed" on public.quality_issues;

create policy "qi_member_update_allowed"
  on public.quality_issues for update to authenticated
  using (
    not public.is_admin()
    and status <> 'approved'
    and (assigned_to = auth.uid() or created_by = auth.uid())
  )
  with check (
    not public.is_admin()
    and status <> 'approved'
    and approved_by is null
    and approved_at is null
    and (assigned_to = auth.uid() or created_by = auth.uid())
  );

create or replace function public.quality_issue_member_update_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;

  if old.status = 'approved' then
    raise exception 'Approved quality issues can only be changed by admins.';
  end if;

  if old.assigned_to is distinct from auth.uid()
    and old.created_by is distinct from auth.uid()
  then
    raise exception 'You cannot edit this quality issue.';
  end if;

  if new.status = 'approved' then
    raise exception 'Only admins can approve quality issues.';
  end if;

  -- Reporters can fix content mistakes. Only the assigned member can move
  -- the issue status through the member workflow.
  if new.status is distinct from old.status
    and old.assigned_to is distinct from auth.uid()
  then
    raise exception 'Only the assigned member can move this quality issue.';
  end if;

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
    raise exception 'Members can only edit title, page URL, note, screenshot, and allowed status.';
  end if;

  return new;
end;
$$;

drop trigger if exists quality_issue_member_update_guard on public.quality_issues;
create trigger quality_issue_member_update_guard
  before update on public.quality_issues
  for each row execute function public.quality_issue_member_update_guard();
