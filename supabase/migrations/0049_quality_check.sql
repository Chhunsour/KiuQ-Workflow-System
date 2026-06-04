-- 0049 — Quality Check: Trello-style website-fix issue tracker
--
-- Two new tables, fully isolated from the normal Work Board / prompt_assignments:
--   • quality_issues          — one row per issue
--   • quality_issue_comments  — comments / status notes on an issue
--
-- RLS rules enforce the spec:
--   • Admins: full CRUD on issues, can set any status (including approved).
--   • Members: can read all issues, can ONLY update the status field of
--     issues assigned to them, and CANNOT set status='approved' (no
--     approving your own fix). Members can insert comments on issues
--     they're assigned to.
--
-- Tables are added to the supabase_realtime publication so the board
-- updates live for every viewer.

-- ──────────────────────────────────────────────────────────────────────────
-- 1. Enums
-- ──────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_type where typname = 'quality_issue_status') then
    create type public.quality_issue_status as enum (
      'new_issue', 'in_progress', 'fixed', 'needs_review', 'approved'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'quality_issue_type') then
    create type public.quality_issue_type as enum (
      'button_fix', 'broken_link', 'mobile_responsive', 'ux_ui_problem',
      'spacing_issue', 'text_content_issue', 'image_issue',
      'header_footer_issue', 'product_page_issue', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'quality_issue_priority') then
    create type public.quality_issue_priority as enum ('low', 'normal', 'high', 'urgent');
  end if;
end $$;

-- ──────────────────────────────────────────────────────────────────────────
-- 2. quality_issues
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.quality_issues (
  id              uuid primary key default gen_random_uuid(),
  website_id      uuid not null references public.websites(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  page_url        text not null default '',
  issue_type      public.quality_issue_type not null default 'other',
  priority        public.quality_issue_priority not null default 'normal',
  status          public.quality_issue_status not null default 'new_issue',
  assigned_to     uuid references public.profiles(id) on delete set null,
  screenshot_url  text,
  due_date        date,
  created_by      uuid not null references public.profiles(id) on delete restrict,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  approved_by     uuid references public.profiles(id) on delete set null,
  approved_at     timestamptz
);

create index if not exists quality_issues_website_idx     on public.quality_issues (website_id, status);
create index if not exists quality_issues_assigned_idx    on public.quality_issues (assigned_to);
create index if not exists quality_issues_status_idx      on public.quality_issues (status);
create index if not exists quality_issues_created_at_idx  on public.quality_issues (created_at desc);

create or replace function public.qi_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  -- Stamp approval metadata only when status flips to approved.
  if new.status = 'approved' and (old is null or old.status is distinct from 'approved') then
    new.approved_at = now();
    new.approved_by = coalesce(new.approved_by, auth.uid());
  end if;
  -- Clear approval metadata if it's moved back out of approved.
  if new.status <> 'approved' and old is not null and old.status = 'approved' then
    new.approved_at = null;
    new.approved_by = null;
  end if;
  return new;
end $$;

drop trigger if exists qi_updated_at on public.quality_issues;
create trigger qi_updated_at
  before insert or update on public.quality_issues
  for each row execute function public.qi_set_updated_at();

alter table public.quality_issues enable row level security;

drop policy if exists "qi_read_authenticated"    on public.quality_issues;
drop policy if exists "qi_admin_all"             on public.quality_issues;
drop policy if exists "qi_member_status_update"  on public.quality_issues;

-- Everyone authenticated can read all issues.
create policy "qi_read_authenticated"
  on public.quality_issues for select to authenticated using (true);

-- Admins: full control.
create policy "qi_admin_all"
  on public.quality_issues for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members: can UPDATE only issues assigned to them, and CANNOT set
-- status='approved' (no approving your own fix). The WITH CHECK clause
-- catches both the "assigned to me" requirement and the no-self-approve
-- rule on the new row.
create policy "qi_member_status_update"
  on public.quality_issues for update to authenticated
  using (
    assigned_to = auth.uid()
    and not public.is_admin()
  )
  with check (
    assigned_to = auth.uid()
    and status <> 'approved'
  );

-- ──────────────────────────────────────────────────────────────────────────
-- 3. quality_issue_comments
-- ──────────────────────────────────────────────────────────────────────────

create table if not exists public.quality_issue_comments (
  id              uuid primary key default gen_random_uuid(),
  issue_id        uuid not null references public.quality_issues(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  message         text not null,
  screenshot_url  text,
  created_at      timestamptz not null default now()
);

create index if not exists qic_issue_idx on public.quality_issue_comments (issue_id, created_at desc);

alter table public.quality_issue_comments enable row level security;

drop policy if exists "qic_read_authenticated" on public.quality_issue_comments;
drop policy if exists "qic_admin_all"          on public.quality_issue_comments;
drop policy if exists "qic_member_insert_own"  on public.quality_issue_comments;
drop policy if exists "qic_member_delete_own"  on public.quality_issue_comments;

create policy "qic_read_authenticated"
  on public.quality_issue_comments for select to authenticated using (true);

create policy "qic_admin_all"
  on public.quality_issue_comments for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Members can insert comments only as themselves, only on issues they're
-- assigned to (matches the spec: "comment/upload screenshot" is for the
-- assigned member).
create policy "qic_member_insert_own"
  on public.quality_issue_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.quality_issues qi
      where qi.id = issue_id and qi.assigned_to = auth.uid()
    )
  );

create policy "qic_member_delete_own"
  on public.quality_issue_comments for delete to authenticated
  using (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────────────────
-- 4. Realtime
-- ──────────────────────────────────────────────────────────────────────────

do $$
declare
  target_table text;
  realtime_tables text[] := array['quality_issues', 'quality_issue_comments'];
begin
  foreach target_table in array realtime_tables
  loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = target_table
    ) then
      execute format('alter table public.%I replica identity full', target_table);
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = target_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', target_table);
      end if;
    end if;
  end loop;
end $$;
