-- 0060 — Quality Checker assignments and scoped reads
--
-- Quality Checkers have a focused role: they can review assigned quality
-- websites/classes and their own quality issues without seeing the normal
-- team workflow. Admins manage assignments through this table.

create table if not exists public.quality_checker_assignments (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  scope_kind  text not null check (scope_kind in ('class', 'website')),
  scope_id    uuid not null,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create unique index if not exists quality_checker_assignments_unique_scope
  on public.quality_checker_assignments (user_id, scope_kind, scope_id);
create index if not exists quality_checker_assignments_user_idx
  on public.quality_checker_assignments (user_id);
create index if not exists quality_checker_assignments_scope_idx
  on public.quality_checker_assignments (scope_kind, scope_id);

alter table public.quality_checker_assignments enable row level security;

drop policy if exists "qca_admin_all" on public.quality_checker_assignments;
drop policy if exists "qca_read_own" on public.quality_checker_assignments;

create policy "qca_admin_all"
  on public.quality_checker_assignments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "qca_read_own"
  on public.quality_checker_assignments for select to authenticated
  using (user_id = auth.uid());

create or replace function public.qc_has_website_access(p_website_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quality_checker_assignments qca
    where qca.user_id = auth.uid()
      and (
        (qca.scope_kind = 'website' and qca.scope_id = p_website_id)
        or (
          qca.scope_kind = 'class'
          and exists (
            select 1
            from public.websites w
            where w.id = p_website_id
              and w.quality_class_id = qca.scope_id
          )
        )
      )
  );
$$;

revoke all on function public.qc_has_website_access(uuid) from public;
grant execute on function public.qc_has_website_access(uuid) to authenticated;

create or replace function public.qc_has_class_access(p_class_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.quality_checker_assignments qca
    where qca.user_id = auth.uid()
      and (
        (qca.scope_kind = 'class' and qca.scope_id = p_class_id)
        or (
          qca.scope_kind = 'website'
          and exists (
            select 1
            from public.websites w
            where w.id = qca.scope_id
              and w.quality_class_id = p_class_id
          )
        )
      )
  );
$$;

revoke all on function public.qc_has_class_access(uuid) from public;
grant execute on function public.qc_has_class_access(uuid) to authenticated;

drop policy if exists "websites_read_authenticated" on public.websites;
drop policy if exists "websites_read_scoped" on public.websites;

create policy "websites_read_scoped"
  on public.websites for select to authenticated
  using (
    public.is_admin()
    or not public.is_quality_checker()
    or public.qc_has_website_access(id)
  );

drop policy if exists "qcl_read_authenticated" on public.quality_classes;
drop policy if exists "qcl_read_scoped" on public.quality_classes;

create policy "qcl_read_scoped"
  on public.quality_classes for select to authenticated
  using (
    public.is_admin()
    or not public.is_quality_checker()
    or public.qc_has_class_access(id)
  );

drop policy if exists "qi_read_authenticated" on public.quality_issues;
drop policy if exists "qi_read_scoped" on public.quality_issues;

create policy "qi_read_scoped"
  on public.quality_issues for select to authenticated
  using (
    public.is_admin()
    or not public.is_quality_checker()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
    or public.qc_has_website_access(website_id)
  );

drop policy if exists "qic_read_authenticated" on public.quality_issue_comments;
drop policy if exists "qic_read_scoped" on public.quality_issue_comments;

create policy "qic_read_scoped"
  on public.quality_issue_comments for select to authenticated
  using (
    public.is_admin()
    or not public.is_quality_checker()
    or user_id = auth.uid()
    or exists (
      select 1
      from public.quality_issues qi
      where qi.id = issue_id
        and (
          qi.assigned_to = auth.uid()
          or qi.created_by = auth.uid()
          or public.qc_has_website_access(qi.website_id)
        )
    )
  );

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'quality_checker_assignments'
  ) then
    alter table public.quality_checker_assignments replica identity full;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'quality_checker_assignments'
    ) then
      alter publication supabase_realtime add table public.quality_checker_assignments;
    end if;
  end if;
end $$;
