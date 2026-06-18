-- Migration: 0098_winner_center.sql
-- Description: Winner Center — an OWNER/ADMIN/HEAD monthly team reward system.
--   The system NEVER auto-selects a winner. The boss (Owner/Admin/Head)
--   manually chooses the monthly winner (using the live leaderboard as
--   supporting reference only), then lets the winner spin a prize wheel.
--   All results are saved permanently.
--
--   Tables:
--     winner_center_prizes          — the prize library (CRUD by Owner/Admin/Head)
--     winner_center_monthly_winners — the chosen winner per month + prize state
--     winner_center_wheel_spins     — immutable permanent log of every wheel spin
--
--   Access: Owner, Admin and Head only, enforced via the
--   public.can_manage_winner_center() helper defined below. Supervisor,
--   Assistant Head, Team Member and Quality Checker have NO access.
--   (Note: this is deliberately NARROWER than the shared public.is_admin(),
--   which also includes Supervisor — so we use a dedicated helper here.)
--
--   Idempotent — safe to re-run.

begin;

-- ── Role helper: Owner / Admin / Head (excludes Supervisor and below) ─────────
create or replace function public.can_manage_winner_center()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('owner', 'admin', 'head')
      and status = 'active'
  );
$$;

revoke all on function public.can_manage_winner_center() from public;
grant execute on function public.can_manage_winner_center() to authenticated;

-- ── 1. Prize library ──────────────────────────────────────────────────────────
-- Intentionally minimal: a prize is just an IMAGE + TITLE, plus an optional
-- chance percentage (for weighting the wheel). No description / type /
-- quantity / active flag — the image is the focus.
create table if not exists public.winner_center_prizes (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,                         -- the prize title
  image_url         text,                                  -- the prize image (the focus)
  chance_percentage numeric check (chance_percentage >= 0 and chance_percentage <= 100),
  created_by        uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Self-healing: if an earlier build created the richer schema, converge to the
-- simplified one (safe no-ops on a fresh install).
alter table public.winner_center_prizes drop column if exists description;
alter table public.winner_center_prizes drop column if exists prize_type;
alter table public.winner_center_prizes drop column if exists quantity;
alter table public.winner_center_prizes drop column if exists is_active;
alter table public.winner_center_prizes add column if not exists image_url text;
alter table public.winner_center_prizes add column if not exists chance_percentage numeric;

-- ── 2. Monthly winners (one winner per month — change = update in place) ───────
create table if not exists public.winner_center_monthly_winners (
  id                  uuid primary key default gen_random_uuid(),
  month_key           text not null unique,                 -- 'YYYY-MM'
  winner_user_id      uuid not null references public.profiles(id) on delete cascade,
  selected_by         uuid references public.profiles(id) on delete set null default auth.uid(),
  score_snapshot      integer not null default 0,           -- leaderboard points at selection time
  achievement_summary text not null default '',
  selected_at         timestamptz not null default now(),
  prize_id            uuid references public.winner_center_prizes(id) on delete set null,
  prize_spun_at       timestamptz,
  prize_given_at      timestamptz,
  status              text not null default 'selected'
                        check (status in ('selected', 'prize_spun', 'prize_given')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists winner_center_monthly_winners_month_idx
  on public.winner_center_monthly_winners (month_key);

-- ── 3. Wheel spins (permanent, immutable audit log of every spin) ──────────────
create table if not exists public.winner_center_wheel_spins (
  id             uuid primary key default gen_random_uuid(),
  month_key      text not null,
  winner_user_id uuid not null references public.profiles(id) on delete cascade,
  prize_id       uuid references public.winner_center_prizes(id) on delete set null,
  prize_name     text not null default '',                  -- snapshot so history survives prize deletion
  spun_by        uuid references public.profiles(id) on delete set null default auth.uid(),
  spun_at        timestamptz not null default now()
);

create index if not exists winner_center_wheel_spins_month_idx
  on public.winner_center_wheel_spins (month_key, spun_at desc);

-- ── 4. Row Level Security — Owner / Admin / Head ────────────────────────────────
alter table public.winner_center_prizes          enable row level security;
alter table public.winner_center_monthly_winners enable row level security;
alter table public.winner_center_wheel_spins     enable row level security;

-- Drop any prior policy variants (in case an earlier build was applied).
drop policy if exists "winner_center_prizes_head_supervisor"          on public.winner_center_prizes;
drop policy if exists "winner_center_monthly_winners_head_supervisor" on public.winner_center_monthly_winners;
drop policy if exists "winner_center_wheel_spins_head_supervisor"     on public.winner_center_wheel_spins;
drop policy if exists "winner_center_prizes_head"          on public.winner_center_prizes;
drop policy if exists "winner_center_monthly_winners_head" on public.winner_center_monthly_winners;
drop policy if exists "winner_center_wheel_spins_head"     on public.winner_center_wheel_spins;

drop policy if exists "winner_center_prizes_access" on public.winner_center_prizes;
create policy "winner_center_prizes_access" on public.winner_center_prizes
  for all to authenticated
  using (public.can_manage_winner_center())
  with check (public.can_manage_winner_center());

drop policy if exists "winner_center_monthly_winners_access" on public.winner_center_monthly_winners;
create policy "winner_center_monthly_winners_access" on public.winner_center_monthly_winners
  for all to authenticated
  using (public.can_manage_winner_center())
  with check (public.can_manage_winner_center());

drop policy if exists "winner_center_wheel_spins_access" on public.winner_center_wheel_spins;
create policy "winner_center_wheel_spins_access" on public.winner_center_wheel_spins
  for all to authenticated
  using (public.can_manage_winner_center())
  with check (public.can_manage_winner_center());

-- ── 5. updated_at triggers ─────────────────────────────────────────────────────
drop trigger if exists touch_updated_at on public.winner_center_prizes;
create trigger touch_updated_at before update on public.winner_center_prizes
  for each row execute function public.touch_updated_at();

drop trigger if exists touch_updated_at on public.winner_center_monthly_winners;
create trigger touch_updated_at before update on public.winner_center_monthly_winners
  for each row execute function public.touch_updated_at();

-- ── 6. Realtime publication (idempotent) ───────────────────────────────────────
do $$
declare
  target_table text;
  realtime_tables text[] := array[
    'winner_center_prizes',
    'winner_center_monthly_winners',
    'winner_center_wheel_spins'
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

-- ── 7. Seed example prizes (title-only; Head adds images later) ─────────────────
insert into public.winner_center_prizes (name)
select * from (values
  ('$10 Bonus'),
  ('$20 Bonus'),
  ('Coffee Voucher'),
  ('Lunch Voucher'),
  ('1 Day Leave'),
  ('Mystery Reward')
) as seed(name)
where not exists (select 1 from public.winner_center_prizes);

commit;

-- ============================================================================
-- ✅ Verify (run after the migration):
--   select * from public.winner_center_prizes order by created_at;
--   select public.can_manage_winner_center();   -- true for Owner/Admin/Head
-- ============================================================================
