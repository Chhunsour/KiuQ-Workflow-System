-- WordPress Prompt System — Initial schema
-- Run this first.

create extension if not exists "pgcrypto";

-- =========================================================
-- profiles  (extends auth.users)
-- =========================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_idx on public.profiles (role);

-- =========================================================
-- websites
-- =========================================================
create table if not exists public.websites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  domain text not null default '',
  website_type text not null default '',
  primary_color text not null default '#3f8dfe',
  secondary_color text not null default '#0f172a',
  accent_color text not null default '#22c55e',
  font_family text not null default 'Inter',
  button_font_family text not null default 'Inter',
  max_width text not null default '1200px',
  border_radius text not null default '12px',
  design_style_notes text not null default '',
  target_audience text not null default '',
  product_categories text not null default '',
  important_pages text not null default '',
  brand_notes text not null default '',
  seo_notes text not null default '',
  internal_linking_notes text not null default '',
  extra_instructions text not null default '',
  status text not null default 'in_development'
    check (status in ('in_development', 'active', 'inactive')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- website_products  (children of websites)
-- =========================================================
create table if not exists public.website_products (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  name text not null default '',
  category text not null default '',
  url text not null default '',
  image_url text not null default '',
  short_description text not null default '',
  key_specs text not null default '',
  price text not null default '',
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists website_products_website_idx on public.website_products (website_id);

-- =========================================================
-- folders
-- =========================================================
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

-- =========================================================
-- prompt_templates
-- =========================================================
create table if not exists public.prompt_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default '',
  folder_id uuid references public.folders(id) on delete set null,
  prompt_type text not null default 'section'
    check (prompt_type in ('section', 'full_page', 'seo', 'blog', 'image', 'fixing')),
  locked_rules text not null default '',
  editable_fields jsonb not null default '[]'::jsonb,
  template_content text not null default '',
  output_type text not null default 'html_css'
    check (output_type in ('html_css', 'text', 'seo_fields', 'image_prompt', 'full_page')),
  status text not null default 'draft' check (status in ('draft', 'approved')),
  version integer not null default 1,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompt_templates_folder_idx on public.prompt_templates (folder_id);

-- =========================================================
-- projects
-- =========================================================
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  website_id uuid references public.websites(id) on delete set null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'review', 'approved', 'completed')),
  deadline date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_website_idx on public.projects (website_id);

-- =========================================================
-- project_members  (many-to-many: project ↔ profile)
-- =========================================================
create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  primary key (project_id, member_id)
);

create index if not exists project_members_member_idx on public.project_members (member_id);

-- =========================================================
-- project_pages  (scaffold)
-- =========================================================
create table if not exists public.project_pages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  slug text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists project_pages_project_idx on public.project_pages (project_id);

-- =========================================================
-- section_tasks  (scaffold)
-- =========================================================
create table if not exists public.section_tasks (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.project_pages(id) on delete cascade,
  name text not null,
  assigned_member_id uuid references public.profiles(id) on delete set null,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'review', 'approved', 'completed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists section_tasks_page_idx on public.section_tasks (page_id);
create index if not exists section_tasks_member_idx on public.section_tasks (assigned_member_id);

-- =========================================================
-- prompt_assignments  (admin sends a prompt to a member)
-- =========================================================
create table if not exists public.prompt_assignments (
  id uuid primary key default gen_random_uuid(),
  prompt_id uuid not null references public.prompt_templates(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  website_id uuid references public.websites(id) on delete set null,
  assigned_member_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'in_progress', 'submitted', 'approved', 'needs_fix', 'rejected')),
  filled_values jsonb not null default '{}'::jsonb,
  pasted_result text not null default '',
  assigned_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prompt_assignments_member_idx on public.prompt_assignments (assigned_member_id);
create index if not exists prompt_assignments_prompt_idx on public.prompt_assignments (prompt_id);

-- =========================================================
-- generated_prompts  (scaffold)
-- =========================================================
create table if not exists public.generated_prompts (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.prompt_assignments(id) on delete cascade,
  content text not null,
  generated_at timestamptz not null default now()
);

-- =========================================================
-- submissions  (scaffold — team submits, admin reviews)
-- =========================================================
create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.prompt_assignments(id) on delete cascade,
  content text not null default '',
  status text not null default 'submitted'
    check (status in ('submitted', 'approved', 'needs_fix', 'rejected')),
  submitted_by uuid references public.profiles(id) on delete set null,
  submitted_at timestamptz not null default now()
);

create index if not exists submissions_assignment_idx on public.submissions (assignment_id);
create index if not exists submissions_submitter_idx on public.submissions (submitted_by);

-- =========================================================
-- review_comments  (scaffold)
-- =========================================================
create table if not exists public.review_comments (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  reviewer_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

-- =========================================================
-- notes
-- =========================================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  related_type text not null default 'none'
    check (related_type in ('project', 'website', 'prompt', 'team', 'none')),
  related_id uuid,
  content text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- updated_at triggers (keep updated_at fresh on UPDATE)
-- =========================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'profiles','websites','prompt_templates','projects',
      'section_tasks','prompt_assignments','notes'
    ])
  loop
    execute format(
      'drop trigger if exists touch_updated_at on public.%I;
       create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;
