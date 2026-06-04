-- WordPress Prompt System — role workflow tightening
-- Run after 0004_seed.sql if you already applied the first four migrations.

-- Optional screenshot link stored with a submission. File storage can be added later.
alter table public.submissions
  add column if not exists screenshot_url text not null default '';

-- Members should only read prompt templates assigned to them.
drop policy if exists "prompt_templates_member_read_approved" on public.prompt_templates;

create policy "prompt_templates_member_read_assigned" on public.prompt_templates
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prompt_assignments pa
      where pa.prompt_id = prompt_templates.id
        and pa.assigned_member_id = auth.uid()
    )
  );

-- Members should not see every website profile; only websites connected to their work.
drop policy if exists "websites_read_authenticated" on public.websites;

create policy "websites_member_read_assigned" on public.websites
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.prompt_assignments pa
      where pa.website_id = websites.id
        and pa.assigned_member_id = auth.uid()
    )
    or exists (
      select 1
      from public.projects p
      join public.project_members pm on pm.project_id = p.id
      where p.website_id = websites.id
        and pm.member_id = auth.uid()
    )
  );

-- Notes are admin-only in the app; remove broad member read access.
drop policy if exists "notes_read_authenticated" on public.notes;

-- Keep members from changing their own role/status/email through a profile update.
create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() = old.id and not public.is_admin() then
    new.role = old.role;
    new.status = old.status;
    new.email = old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;

create trigger protect_profile_privileged_fields
  before update on public.profiles
  for each row
  execute function public.protect_profile_privileged_fields();
