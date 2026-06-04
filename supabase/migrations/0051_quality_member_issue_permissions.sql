-- 0051 — Quality Check member issue creation + screenshots
--
-- Quality Check is a website-fix workflow, separate from prompt_assignments.
-- Admins keep full control. Team members can create issue cards, assign them,
-- add screenshots/comments, and move only their own assigned issue through
-- the non-approval workflow.

-- Treat workspace owners as admin-level in RLS too, matching the frontend role helper.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and replace(replace(lower(coalesce(role, '')), ' ', '_'), '-', '_') in ('admin', 'owner')
      and status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Public bucket for quality issue screenshots.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'quality-screenshots',
  'quality-screenshots',
  true,
  15728640,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "quality_screenshots_public_read" on storage.objects;
drop policy if exists "quality_screenshots_owner_insert" on storage.objects;
drop policy if exists "quality_screenshots_owner_update" on storage.objects;
drop policy if exists "quality_screenshots_owner_delete" on storage.objects;

create policy "quality_screenshots_public_read" on storage.objects
  for select using (bucket_id = 'quality-screenshots');

create policy "quality_screenshots_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'quality-screenshots'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "quality_screenshots_owner_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'quality-screenshots'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id = 'quality-screenshots'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "quality_screenshots_owner_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'quality-screenshots'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- Allow members to create issue cards. Admin full-control policy still applies.
drop policy if exists "qi_member_insert" on public.quality_issues;
create policy "qi_member_insert"
  on public.quality_issues for insert to authenticated
  with check (
    not public.is_admin()
    and created_by = auth.uid()
    and assigned_to is not null
    and status = 'new_issue'
    and length(trim(title)) > 0
    and length(trim(description)) > 0
    and approved_by is null
    and approved_at is null
  );

-- Member updates must stay status-only. This backs up the UI and closes the
-- direct-API gap left by RLS alone.
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

  if old.assigned_to is distinct from auth.uid() then
    raise exception 'Only the assigned member can update this quality issue.';
  end if;

  if new.status = 'approved' then
    raise exception 'Only admins can approve quality issues.';
  end if;

  if new.id is distinct from old.id
    or new.website_id is distinct from old.website_id
    or new.title is distinct from old.title
    or new.description is distinct from old.description
    or new.page_url is distinct from old.page_url
    or new.issue_type is distinct from old.issue_type
    or new.priority is distinct from old.priority
    or new.assigned_to is distinct from old.assigned_to
    or new.screenshot_url is distinct from old.screenshot_url
    or new.due_date is distinct from old.due_date
    or new.created_by is distinct from old.created_by
    or new.created_at is distinct from old.created_at
    or new.approved_by is distinct from old.approved_by
    or new.approved_at is distinct from old.approved_at
  then
    raise exception 'Members can only move their assigned quality issue status.';
  end if;

  return new;
end;
$$;

drop trigger if exists quality_issue_member_update_guard on public.quality_issues;
create trigger quality_issue_member_update_guard
  before update on public.quality_issues
  for each row execute function public.quality_issue_member_update_guard();

-- Members can comment on issues they created or are assigned to.
drop policy if exists "qic_member_insert_own" on public.quality_issue_comments;
create policy "qic_member_insert_own"
  on public.quality_issue_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.quality_issues qi
      where qi.id = issue_id
        and (qi.assigned_to = auth.uid() or qi.created_by = auth.uid())
    )
  );
