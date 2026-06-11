-- Migration: 0088_reports_dashboard.sql
-- -------------------------------------------------------------
-- Adds columns and updates procedures for activity logging,
-- creates tables for work evidence and report snapshots,
-- and configures storage policies for evidence uploads.

-- 1. Extend activity_logs with module, IP address, and device info
alter table public.activity_logs
  add column if not exists module text default 'system',
  add column if not exists ip_address text,
  add column if not exists device_info text;

-- 2. Update record_activity_log function to support module, ip_address, and device_info
create or replace function public.record_activity_log(
  p_user_id uuid default null,
  p_action text default '',
  p_related_type text default 'none',
  p_related_id uuid default null,
  p_message text default '',
  p_current_page text default null,
  p_touch_presence boolean default true,
  p_module text default 'system',
  p_ip_address text default null,
  p_device_info text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_target uuid := coalesce(p_user_id, auth.uid());
  v_now timestamptz := now();
begin
  if v_uid is null or v_target is null then
    return;
  end if;

  if v_target <> v_uid and not public.is_admin() then
    raise exception 'Not allowed to write activity for another user';
  end if;

  insert into public.activity_logs (
    user_id,
    action,
    related_type,
    related_id,
    message,
    module,
    ip_address,
    device_info,
    created_at
  )
  values (
    v_target,
    coalesce(nullif(p_action, ''), 'activity'),
    coalesce(nullif(p_related_type, ''), 'none'),
    p_related_id,
    coalesce(p_message, ''),
    coalesce(p_module, 'system'),
    p_ip_address,
    p_device_info,
    v_now
  );

  if p_touch_presence then
    update public.profiles
    set
      is_online = true,
      current_status = 'online',
      last_active_at = v_now,
      today_activity_count = case
        when last_active_at::date = v_now::date then today_activity_count + 1
        else 1
      end,
      current_page = coalesce(left(p_current_page, 180), current_page, ''),
      updated_at = v_now
    where id = v_target;
  end if;
end;
$$;

-- 3. Create work_evidence table for storing user uploaded task evidence
create table if not exists public.work_evidence (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.prompt_assignments(id) on delete cascade,
  submission_id uuid references public.submissions(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('screenshot', 'document', 'pdf', 'image', 'video', 'link', 'note')),
  url text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Indexing for lookup performance
create index if not exists work_evidence_assignment_idx on public.work_evidence(assignment_id);
create index if not exists work_evidence_submission_idx on public.work_evidence(submission_id);
create index if not exists work_evidence_uploaded_by_idx on public.work_evidence(uploaded_by);

alter table public.work_evidence enable row level security;

-- Policies for work_evidence
drop policy if exists "work_evidence_select" on public.work_evidence;
create policy "work_evidence_select" on public.work_evidence
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'reviewer'
    )
    or uploaded_by = auth.uid()
    or exists (
      select 1 from public.project_members pm
      join public.projects p on p.id = pm.project_id
      join public.prompt_assignments pa on pa.project_id = p.id
      where pa.id = assignment_id
        and pm.member_id = auth.uid()
    )
  );

drop policy if exists "work_evidence_insert" on public.work_evidence;
create policy "work_evidence_insert" on public.work_evidence
  for insert to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "work_evidence_update" on public.work_evidence;
create policy "work_evidence_update" on public.work_evidence
  for update to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid());

drop policy if exists "work_evidence_delete" on public.work_evidence;
create policy "work_evidence_delete" on public.work_evidence
  for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_admin());

-- 4. Create report_snapshots table
create table if not exists public.report_snapshots (
  id uuid primary key default gen_random_uuid(),
  created_by uuid references public.profiles(id) on delete set null,
  report_type text not null check (report_type in ('daily', 'weekly', 'monthly', 'member', 'team', 'activity_logs')),
  filters jsonb not null default '{}'::jsonb,
  snapshot_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists report_snapshots_type_created_idx on public.report_snapshots(report_type, created_at desc);

alter table public.report_snapshots enable row level security;

-- Policies for report_snapshots
drop policy if exists "report_snapshots_select" on public.report_snapshots;
create policy "report_snapshots_select" on public.report_snapshots
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'reviewer'
    )
  );

drop policy if exists "report_snapshots_all_admin" on public.report_snapshots;
create policy "report_snapshots_all_admin" on public.report_snapshots
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 5. Create storage bucket for work evidence
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'work-evidence',
  'work-evidence',
  true,
  10485760, -- 10MB limit
  array[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'video/mp4', 'video/quicktime', 'video/webm'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage policies for the work-evidence bucket
drop policy if exists "work_evidence_storage_read" on storage.objects;
create policy "work_evidence_storage_read" on storage.objects
  for select using (bucket_id = 'work-evidence');

drop policy if exists "work_evidence_storage_insert" on storage.objects;
create policy "work_evidence_storage_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'work-evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "work_evidence_storage_delete" on storage.objects;
create policy "work_evidence_storage_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'work-evidence'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
