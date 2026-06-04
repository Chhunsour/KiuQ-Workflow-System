-- WordPress Prompt System — Row Level Security
-- Run after 0001_initial_schema.sql.

-- =========================================================
-- is_admin() helper. SECURITY DEFINER so it bypasses RLS
-- on profiles when checking the caller's role.
-- =========================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- =========================================================
-- Enable RLS on every table
-- =========================================================
alter table public.profiles            enable row level security;
alter table public.websites            enable row level security;
alter table public.website_products    enable row level security;
alter table public.folders             enable row level security;
alter table public.prompt_templates    enable row level security;
alter table public.projects            enable row level security;
alter table public.project_members     enable row level security;
alter table public.project_pages       enable row level security;
alter table public.section_tasks       enable row level security;
alter table public.prompt_assignments  enable row level security;
alter table public.generated_prompts   enable row level security;
alter table public.submissions         enable row level security;
alter table public.review_comments     enable row level security;
alter table public.notes               enable row level security;

-- =========================================================
-- Drop any existing policies (idempotent re-runs)
-- =========================================================
do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'profiles','websites','website_products','folders','prompt_templates',
        'projects','project_members','project_pages','section_tasks',
        'prompt_assignments','generated_prompts','submissions',
        'review_comments','notes'
      )
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- =========================================================
-- profiles
--   - any authenticated user can read all profiles (members table)
--   - users can update their own row
--   - admin can do everything
-- =========================================================
create policy "profiles_read_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_self_update" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles_admin_all" on public.profiles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- websites
-- =========================================================
create policy "websites_read_authenticated" on public.websites
  for select to authenticated using (true);

create policy "websites_admin_write" on public.websites
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- website_products
-- =========================================================
create policy "website_products_read_authenticated" on public.website_products
  for select to authenticated using (true);

create policy "website_products_admin_write" on public.website_products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- folders
-- =========================================================
create policy "folders_read_authenticated" on public.folders
  for select to authenticated using (true);

create policy "folders_admin_write" on public.folders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =========================================================
-- prompt_templates
--   - admin: read/write everything
--   - member: read approved only, no write
-- =========================================================
create policy "prompt_templates_admin_all" on public.prompt_templates
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "prompt_templates_member_read_approved" on public.prompt_templates
  for select to authenticated using (status = 'approved');

-- =========================================================
-- projects
--   - admin: everything
--   - member: read where they are in project_members
-- =========================================================
create policy "projects_admin_all" on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "projects_member_read" on public.projects
  for select to authenticated
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = projects.id and pm.member_id = auth.uid()
    )
  );

-- =========================================================
-- project_members
-- =========================================================
create policy "project_members_admin_all" on public.project_members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "project_members_self_read" on public.project_members
  for select to authenticated using (member_id = auth.uid());

-- =========================================================
-- project_pages
-- =========================================================
create policy "project_pages_admin_all" on public.project_pages
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "project_pages_member_read" on public.project_pages
  for select to authenticated
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_pages.project_id
        and pm.member_id = auth.uid()
    )
  );

-- =========================================================
-- section_tasks
-- =========================================================
create policy "section_tasks_admin_all" on public.section_tasks
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "section_tasks_member_read_assigned" on public.section_tasks
  for select to authenticated using (assigned_member_id = auth.uid());

-- =========================================================
-- prompt_assignments
--   - admin: everything
--   - member: read + update where assigned_member_id = self
-- =========================================================
create policy "prompt_assignments_admin_all" on public.prompt_assignments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "prompt_assignments_member_read" on public.prompt_assignments
  for select to authenticated using (assigned_member_id = auth.uid());

create policy "prompt_assignments_member_update" on public.prompt_assignments
  for update to authenticated
  using (assigned_member_id = auth.uid())
  with check (assigned_member_id = auth.uid());

-- =========================================================
-- generated_prompts
-- =========================================================
create policy "generated_prompts_admin_all" on public.generated_prompts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "generated_prompts_member_read" on public.generated_prompts
  for select to authenticated
  using (
    exists (
      select 1 from public.prompt_assignments pa
      where pa.id = generated_prompts.assignment_id
        and pa.assigned_member_id = auth.uid()
    )
  );

create policy "generated_prompts_member_insert" on public.generated_prompts
  for insert to authenticated
  with check (
    exists (
      select 1 from public.prompt_assignments pa
      where pa.id = generated_prompts.assignment_id
        and pa.assigned_member_id = auth.uid()
    )
  );

-- =========================================================
-- submissions
-- =========================================================
create policy "submissions_admin_all" on public.submissions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "submissions_member_read_own" on public.submissions
  for select to authenticated using (submitted_by = auth.uid());

create policy "submissions_member_insert" on public.submissions
  for insert to authenticated
  with check (submitted_by = auth.uid());

create policy "submissions_member_update_own" on public.submissions
  for update to authenticated
  using (submitted_by = auth.uid()) with check (submitted_by = auth.uid());

-- =========================================================
-- review_comments
-- =========================================================
create policy "review_comments_admin_all" on public.review_comments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "review_comments_member_read_own_submission" on public.review_comments
  for select to authenticated
  using (
    exists (
      select 1 from public.submissions s
      where s.id = review_comments.submission_id
        and s.submitted_by = auth.uid()
    )
  );

-- =========================================================
-- notes  (admin-only writes, all authed users can read)
-- =========================================================
create policy "notes_read_authenticated" on public.notes
  for select to authenticated using (true);

create policy "notes_admin_write" on public.notes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
