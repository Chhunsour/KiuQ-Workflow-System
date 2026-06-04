-- ─── Followup: Blog Upload Slots ─────────────────────────────────────────────
-- blog_upload_slots  — one row per website per scheduled upload date (Tue/Sat)
-- plugin_update_slots — one row per website per ISO week start (Monday)

-- blog status enum
create type public.blog_slot_status as enum ('pending', 'done', 'missed', 'late');

-- plugin status enum
create type public.plugin_slot_status as enum ('pending', 'done', 'missed', 'needs_attention');

-- plugin check result enum
create type public.plugin_check_result as enum (
  'no_updates_needed',
  'updated_successfully',
  'updates_available_incomplete',
  'issue_found',
  'needs_admin_help'
);

-- ─── blog_upload_slots ────────────────────────────────────────────────────────
create table public.blog_upload_slots (
  id                uuid primary key default gen_random_uuid(),
  website_id        uuid not null references public.websites(id) on delete cascade,
  scheduled_date    date not null,                    -- the Tue or Sat date
  day_of_week       smallint not null,                -- 2=Tue, 6=Sat
  status            public.blog_slot_status not null default 'pending',
  assigned_to       uuid references auth.users(id) on delete set null,
  -- completion fields
  blog_title        text,
  blog_url          text,
  upload_date       date,
  screenshot_url    text,
  notes             text,
  completed_by      uuid references auth.users(id) on delete set null,
  completed_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique(website_id, scheduled_date)
);

create index blog_upload_slots_website_idx on public.blog_upload_slots(website_id, scheduled_date desc);
create index blog_upload_slots_status_idx  on public.blog_upload_slots(status);

-- ─── plugin_update_slots ─────────────────────────────────────────────────────
create table public.plugin_update_slots (
  id                    uuid primary key default gen_random_uuid(),
  website_id            uuid not null references public.websites(id) on delete cascade,
  week_start            date not null,                -- Monday of the ISO week
  status                public.plugin_slot_status not null default 'pending',
  assigned_to           uuid references auth.users(id) on delete set null,
  -- completion fields
  check_result          public.plugin_check_result,
  update_date           date,
  plugins_updated_count smallint,
  plugin_names          text,
  screenshot_url        text,
  notes                 text,
  completed_by          uuid references auth.users(id) on delete set null,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique(website_id, week_start)
);

create index plugin_update_slots_website_idx on public.plugin_update_slots(website_id, week_start desc);
create index plugin_update_slots_status_idx  on public.plugin_update_slots(status);

-- ─── auto updated_at triggers ────────────────────────────────────────────────
create or replace function public.set_blog_slot_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger blog_slot_updated_at
  before update on public.blog_upload_slots
  for each row execute function public.set_blog_slot_updated_at();

create or replace function public.set_plugin_slot_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger plugin_slot_updated_at
  before update on public.plugin_update_slots
  for each row execute function public.set_plugin_slot_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.blog_upload_slots   enable row level security;
alter table public.plugin_update_slots enable row level security;

-- Blog slots: all authenticated users can read (filtered in app by assigned_to)
create policy "blog_slots_select" on public.blog_upload_slots
  for select to authenticated using (true);

create policy "blog_slots_insert" on public.blog_upload_slots
  for insert to authenticated with check (true);

create policy "blog_slots_update" on public.blog_upload_slots
  for update to authenticated
  using (true) with check (true);

create policy "blog_slots_delete" on public.blog_upload_slots
  for delete to authenticated using (true);

-- Plugin slots: same open policy (app enforces member visibility)
create policy "plugin_slots_select" on public.plugin_update_slots
  for select to authenticated using (true);

create policy "plugin_slots_insert" on public.plugin_update_slots
  for insert to authenticated with check (true);

create policy "plugin_slots_update" on public.plugin_update_slots
  for update to authenticated
  using (true) with check (true);

create policy "plugin_slots_delete" on public.plugin_update_slots
  for delete to authenticated using (true);

-- ─── Realtime ─────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.blog_upload_slots;
alter publication supabase_realtime add table public.plugin_update_slots;
