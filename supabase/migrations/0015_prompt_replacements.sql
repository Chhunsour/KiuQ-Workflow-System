-- WordPress Prompt System — Prompt Replacement & Reassignment
-- Adds:
--   * prompt_templates.quality_status, parent_prompt_id, usage_count + outcome counters
--   * prompt_assignments.status now allows 'needs_resubmission'
--   * prompt_replacements table — full audit trail of every prompt swap
--   * RLS so admins manage everything; members only see replacements addressed to them
-- Run after 0014_prompt_library_v2.sql.

-- =========================================================
-- prompt_templates — quality + version chain + counters
-- =========================================================
alter table public.prompt_templates
  add column if not exists quality_status text not null default 'good'
    check (quality_status in ('good', 'needs_improvement', 'weak', 'archived')),
  add column if not exists parent_prompt_id uuid references public.prompt_templates(id) on delete set null,
  add column if not exists usage_count integer not null default 0,
  add column if not exists approved_output_count integer not null default 0,
  add column if not exists rejected_output_count integer not null default 0,
  add column if not exists needs_fix_count integer not null default 0;

create index if not exists prompt_templates_quality_idx on public.prompt_templates (quality_status);
create index if not exists prompt_templates_parent_idx on public.prompt_templates (parent_prompt_id);

-- =========================================================
-- prompt_assignments — allow new "needs_resubmission" status
-- =========================================================
alter table public.prompt_assignments
  drop constraint if exists prompt_assignments_status_check;

alter table public.prompt_assignments
  add constraint prompt_assignments_status_check
  check (status in (
    'pending', 'in_progress', 'submitted',
    'approved', 'needs_fix', 'rejected',
    'needs_resubmission'
  ));

-- =========================================================
-- prompt_replacements — audit trail
-- =========================================================
create table if not exists public.prompt_replacements (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.prompt_assignments(id) on delete cascade,
  old_prompt_id uuid not null references public.prompt_templates(id) on delete restrict,
  new_prompt_id uuid not null references public.prompt_templates(id) on delete restrict,
  member_id uuid not null references public.profiles(id) on delete cascade,
  replaced_by uuid references public.profiles(id) on delete set null,
  replacement_reason text not null default 'other'
    check (replacement_reason in ('weak_prompt', 'needs_improvement', 'better_prompt_available', 'other')),
  admin_note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists prompt_replacements_assignment_idx on public.prompt_replacements (assignment_id);
create index if not exists prompt_replacements_member_idx on public.prompt_replacements (member_id);
create index if not exists prompt_replacements_old_prompt_idx on public.prompt_replacements (old_prompt_id);
create index if not exists prompt_replacements_new_prompt_idx on public.prompt_replacements (new_prompt_id);

-- =========================================================
-- RLS on prompt_replacements
-- =========================================================
alter table public.prompt_replacements enable row level security;

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'prompt_replacements'
  loop
    execute format('drop policy if exists %I on public.prompt_replacements', r.policyname);
  end loop;
end $$;

-- Admin: full control of the audit trail.
create policy "prompt_replacements_admin_all" on public.prompt_replacements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Member: read replacements addressed to them so the UI can show the "prompt replaced" notice.
create policy "prompt_replacements_member_read" on public.prompt_replacements
  for select to authenticated
  using (member_id = auth.uid());

-- =========================================================
-- Update the existing prompt_templates_member_read_approved policy
-- so members never see archived prompts even if they were approved.
-- =========================================================
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'prompt_templates'
      and policyname = 'prompt_templates_member_read_approved'
  ) then
    drop policy "prompt_templates_member_read_approved" on public.prompt_templates;
  end if;
end $$;

create policy "prompt_templates_member_read_approved" on public.prompt_templates
  for select to authenticated
  using (status = 'approved' and quality_status <> 'archived');
