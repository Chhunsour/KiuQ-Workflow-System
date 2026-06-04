-- 0050 — Quality Check: Class Folders
--
-- Adds a `quality_classes` table (admin-managed folders) and a
-- `quality_class_id` foreign key on websites so each website belongs to
-- one class. Issues inherit their class via the website. The UI uses
-- this to show class-folder tabs on the Quality Check landing.
--
-- RLS:
--   • Anyone authenticated can read classes.
--   • Only admins can insert / update / delete classes.

create table if not exists public.quality_classes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  color       text not null default '#3f8dfe',
  sort_order  integer not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists quality_classes_name_uniq
  on public.quality_classes (lower(name));
create index if not exists quality_classes_sort_idx
  on public.quality_classes (sort_order, name);

-- updated_at trigger
create or replace function public.qcl_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists qcl_updated_at on public.quality_classes;
create trigger qcl_updated_at
  before update on public.quality_classes
  for each row execute function public.qcl_set_updated_at();

alter table public.quality_classes enable row level security;

drop policy if exists "qcl_read_authenticated" on public.quality_classes;
drop policy if exists "qcl_admin_all"          on public.quality_classes;

create policy "qcl_read_authenticated"
  on public.quality_classes for select to authenticated using (true);

create policy "qcl_admin_all"
  on public.quality_classes for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ──────────────────────────────────────────────────────────────────────────
-- websites.quality_class_id  (nullable — old websites simply have no class)
-- ──────────────────────────────────────────────────────────────────────────

alter table public.websites
  add column if not exists quality_class_id
    uuid references public.quality_classes(id) on delete set null;

create index if not exists websites_quality_class_idx
  on public.websites (quality_class_id);

-- ──────────────────────────────────────────────────────────────────────────
-- Realtime publication so class tabs and counts update live.
-- ──────────────────────────────────────────────────────────────────────────

do $$
declare
  target_table text;
  realtime_tables text[] := array['quality_classes'];
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
