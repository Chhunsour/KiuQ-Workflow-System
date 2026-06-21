-- Migration: 0123_team_survey.sql
-- Description: Team System Survey — collect feedback from team members about the
--   KiuQ Website System (UI/UX, workflow, bugs, complaints, feature ideas).
--
--   Tables:
--     survey_campaigns   — survey setup (title/description/audience/on-off).
--     survey_recipients  — per-user tracking: received / opened / skipped /
--                          draft / submitted (so management can see who did what).
--     survey_responses   — the submitted answers (one per user per campaign).
--
--   Access model:
--     * Any signed-in team member can READ the active campaign (to show the
--       banner), and can create/update ONLY their own recipient row and
--       response. They can read ONLY their own response.
--     * Management (Owner / Admin / Head / Supervisor — via the shared
--       public.is_admin() helper) can manage campaigns and read ALL recipient
--       rows and ALL responses.
--
--   Screenshots reuse the existing public 'team-images' storage bucket (no new
--   bucket needed), so this migration only touches the 3 survey tables.
--
--   Safe & isolated: only adds new objects, enables RLS per-table (never global),
--   never drops or disables anything existing. Idempotent — safe to re-run.

begin;

-- ── 1. Campaigns ────────────────────────────────────────────────────────────
create table if not exists public.survey_campaigns (
  id             uuid primary key default gen_random_uuid(),
  title          text not null default 'Help us improve KiuQ',
  description    text not null default 'Tell us what is hard, what is good, and what you want us to fix.',
  is_active      boolean not null default false,
  audience_roles text[] not null default array['team_member','member','assistant_head','quality_checker']::text[],
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ── 2. Recipients (who received / opened / skipped / submitted) ──────────────
create table if not exists public.survey_recipients (
  id           uuid primary key default gen_random_uuid(),
  campaign_id  uuid not null references public.survey_campaigns(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'received'
                 check (status in ('received','opened','skipped','draft','submitted')),
  received_at  timestamptz not null default now(),
  opened_at    timestamptz,
  skipped_at   timestamptz,
  submitted_at timestamptz,
  last_seen_at timestamptz not null default now(),
  unique (campaign_id, user_id)
);

create index if not exists survey_recipients_campaign_idx on public.survey_recipients (campaign_id);
create index if not exists survey_recipients_user_idx     on public.survey_recipients (user_id);

-- ── 3. Responses (submitted answers) ─────────────────────────────────────────
create table if not exists public.survey_responses (
  id                   uuid primary key default gen_random_uuid(),
  campaign_id          uuid not null references public.survey_campaigns(id) on delete cascade,
  user_id              uuid not null references public.profiles(id) on delete cascade,
  language             text not null default 'en',
  dashboard_key        text,
  feedback_type        text,
  ease_rating          text,
  speed_rating         text,
  usefulness_rating    text,
  problem_text         text,
  fix_request_text     text,
  feature_request_text text,
  extra_text           text,
  screenshot_url       text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists survey_responses_campaign_idx on public.survey_responses (campaign_id, created_at desc);
create index if not exists survey_responses_user_idx     on public.survey_responses (user_id);

-- ── 4. Row Level Security ────────────────────────────────────────────────────
alter table public.survey_campaigns  enable row level security;
alter table public.survey_recipients enable row level security;
alter table public.survey_responses  enable row level security;

-- Campaigns: everyone signed in can READ (needed to show the banner);
-- only management can create / edit / delete.
drop policy if exists "survey_campaigns_read"   on public.survey_campaigns;
create policy "survey_campaigns_read" on public.survey_campaigns
  for select to authenticated using (true);

drop policy if exists "survey_campaigns_manage" on public.survey_campaigns;
create policy "survey_campaigns_manage" on public.survey_campaigns
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Recipients: a user manages only their own row; management reads all.
drop policy if exists "survey_recipients_select" on public.survey_recipients;
create policy "survey_recipients_select" on public.survey_recipients
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "survey_recipients_insert" on public.survey_recipients;
create policy "survey_recipients_insert" on public.survey_recipients
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "survey_recipients_update" on public.survey_recipients;
create policy "survey_recipients_update" on public.survey_recipients
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Responses: a user can submit/read ONLY their own; management reads all.
-- (No one but the author can read another member's answers.)
drop policy if exists "survey_responses_select" on public.survey_responses;
create policy "survey_responses_select" on public.survey_responses
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "survey_responses_insert" on public.survey_responses;
create policy "survey_responses_insert" on public.survey_responses
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "survey_responses_update" on public.survey_responses;
create policy "survey_responses_update" on public.survey_responses
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ── 5. updated_at triggers (reuse shared public.touch_updated_at) ─────────────
drop trigger if exists touch_updated_at on public.survey_campaigns;
create trigger touch_updated_at before update on public.survey_campaigns
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.survey_responses;
create trigger touch_updated_at before update on public.survey_responses
  for each row execute function public.touch_updated_at();

-- ── 6. Realtime publication (idempotent) ─────────────────────────────────────
do $$
declare
  target_table text;
  realtime_tables text[] := array[
    'survey_campaigns',
    'survey_recipients',
    'survey_responses'
  ];
begin
  foreach target_table in array realtime_tables
  loop
    execute format('alter table public.%I replica identity full', target_table);
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = target_table
    ) then
      execute format('alter publication supabase_realtime add table public.%I', target_table);
    end if;
  end loop;
end $$;

-- ── 7. Seed one default (inactive) campaign so management can just turn it on ──
insert into public.survey_campaigns (title, description, is_active)
select
  'Help us improve KiuQ',
  'Tell us what is hard, what is good, and what you want us to fix.',
  false
where not exists (select 1 from public.survey_campaigns);

commit;

-- ============================================================================
-- ✅ Verify (run after the migration):
--   select id, title, is_active, audience_roles from public.survey_campaigns;
--   select public.is_admin();   -- true for Owner/Admin/Head/Supervisor
-- ============================================================================
