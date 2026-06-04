-- WordPress Prompt System — daily workflow, docs, reports, blockers, activity
-- Run after 0005_role_workflow_updates.sql.

alter table public.prompt_assignments
  add column if not exists due_date date,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists admin_note text not null default '',
  add column if not exists started_at timestamptz,
  add column if not exists completed_at timestamptz;

alter table public.section_tasks
  add column if not exists due_date date,
  add column if not exists priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  add column if not exists admin_note text not null default '';

create table if not exists public.docs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'system'
    check (category in (
      'system', 'assigned_prompts', 'submissions', 'wordpress', 'elementor',
      'design', 'seo', 'images', 'mistakes', 'admin'
    )),
  content text not null default '',
  related_project_id uuid references public.projects(id) on delete set null,
  related_website_id uuid references public.websites(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.monthly_reports (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  month text not null,
  completed_summary text not null default '',
  struggles text not null default '',
  help_needed text not null default '',
  blockers text not null default '',
  next_month_plan text not null default '',
  submitted_at timestamptz not null default now(),
  admin_comment text not null default '',
  status text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  unique (member_id, month)
);

create table if not exists public.blockers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid,
  member_id uuid not null references public.profiles(id) on delete cascade,
  reason text not null default '',
  what_tried text not null default '',
  help_needed text not null default '',
  urgency text not null default 'normal' check (urgency in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'resolved')),
  admin_response text not null default '',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  related_type text not null default 'none',
  related_id uuid,
  message text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists docs_status_idx on public.docs (status);
create index if not exists monthly_reports_member_month_idx on public.monthly_reports (member_id, month);
create index if not exists blockers_member_status_idx on public.blockers (member_id, status);
create index if not exists activity_logs_user_created_idx on public.activity_logs (user_id, created_at desc);

alter table public.docs enable row level security;
alter table public.monthly_reports enable row level security;
alter table public.blockers enable row level security;
alter table public.activity_logs enable row level security;

do $$
declare
  r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('docs', 'monthly_reports', 'blockers', 'activity_logs')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

create policy "docs_admin_all" on public.docs
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "docs_member_read_published" on public.docs
  for select to authenticated using (status = 'published');

create policy "monthly_reports_admin_all" on public.monthly_reports
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "monthly_reports_member_read_own" on public.monthly_reports
  for select to authenticated using (member_id = auth.uid());

create policy "monthly_reports_member_insert_own" on public.monthly_reports
  for insert to authenticated with check (member_id = auth.uid());

create policy "monthly_reports_member_update_own" on public.monthly_reports
  for update to authenticated
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create policy "blockers_admin_all" on public.blockers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "blockers_member_read_own" on public.blockers
  for select to authenticated using (member_id = auth.uid());

create policy "blockers_member_insert_own" on public.blockers
  for insert to authenticated with check (member_id = auth.uid());

create policy "blockers_member_update_own_open" on public.blockers
  for update to authenticated
  using (member_id = auth.uid() and status = 'open')
  with check (member_id = auth.uid());

create policy "activity_logs_admin_read" on public.activity_logs
  for select to authenticated using (public.is_admin());

create policy "activity_logs_member_read_own" on public.activity_logs
  for select to authenticated using (user_id = auth.uid());

create policy "activity_logs_insert_authenticated" on public.activity_logs
  for insert to authenticated with check (user_id = auth.uid() or public.is_admin());

create or replace function public.protect_monthly_report_admin_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.admin_comment = old.admin_comment;
    new.status = old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_monthly_report_admin_fields on public.monthly_reports;

create trigger protect_monthly_report_admin_fields
  before update on public.monthly_reports
  for each row
  execute function public.protect_monthly_report_admin_fields();

do $$
declare
  t text;
begin
  for t in
    select unnest(array['docs'])
  loop
    execute format(
      'drop trigger if exists touch_updated_at on public.%I;
       create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;
