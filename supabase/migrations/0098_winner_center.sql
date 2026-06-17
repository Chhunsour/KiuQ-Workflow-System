-- Migration: 0098_winner_center.sql
-- Description: Winner Center — a HEAD-ONLY monthly team reward system.
--   The system NEVER auto-selects a winner. The Head manually chooses the
--   monthly winner (using the live leaderboard as supporting reference only),
--   then lets the winner spin a prize wheel. All results are saved permanently.
--
--   Tables:
--     winner_center_prizes          — the prize library (CRUD by Head)
--     winner_center_monthly_winners — the chosen winner per month + prize state
--     winner_center_wheel_spins     — immutable permanent log of every wheel spin
--
--   Access: strictly the HEAD role, enforced via the public.is_head() helper
--   defined below. Supervisor, Assistant Head, Team Member and Quality Checker
--   have NO access. (Note: this is stricter than Command Center, which allows
--   Head + Supervisor — so we deliberately use a separate helper here rather
--   than the shared public.is_head_or_supervisor().)
--
--   Idempotent — safe to re-run.

begin;

-- ── Role helper: HEAD only (excludes Supervisor and everyone else) ────────────
create or replace function public.is_head()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'head'
      and status = 'active'
  );
$$;

revoke all on function public.is_head() from public;
grant execute on function public.is_head() to authenticated;

-- ── 1. Prize library ──────────────────────────────────────────────────────────
create table if not exists public.winner_center_prizes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  -- Free-text type so Heads aren't boxed in. UI offers presets
  -- (bonus / voucher / leave / mystery / reward / team / custom).
  prize_type  text not null default 'custom',
  quantity    integer not null default 1 check (quantity >= 0),
  image_url   text,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

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

-- ── 4. Row Level Security — HEAD only ───────────────────────────────────────────
alter table public.winner_center_prizes          enable row level security;
alter table public.winner_center_monthly_winners enable row level security;
alter table public.winner_center_wheel_spins     enable row level security;

-- Drop any prior Head+Supervisor policies (in case an earlier build was applied).
drop policy if exists "winner_center_prizes_head_supervisor"          on public.winner_center_prizes;
drop policy if exists "winner_center_monthly_winners_head_supervisor" on public.winner_center_monthly_winners;
drop policy if exists "winner_center_wheel_spins_head_supervisor"     on public.winner_center_wheel_spins;

drop policy if exists "winner_center_prizes_head" on public.winner_center_prizes;
create policy "winner_center_prizes_head" on public.winner_center_prizes
  for all to authenticated
  using (public.is_head())
  with check (public.is_head());

drop policy if exists "winner_center_monthly_winners_head" on public.winner_center_monthly_winners;
create policy "winner_center_monthly_winners_head" on public.winner_center_monthly_winners
  for all to authenticated
  using (public.is_head())
  with check (public.is_head());

drop policy if exists "winner_center_wheel_spins_head" on public.winner_center_wheel_spins;
create policy "winner_center_wheel_spins_head" on public.winner_center_wheel_spins
  for all to authenticated
  using (public.is_head())
  with check (public.is_head());

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

-- ── 7. Seed example prizes (only when the library is empty) ─────────────────────
insert into public.winner_center_prizes (name, description, prize_type, quantity, is_active)
select * from (values
  ('$10 Bonus',       'A $10 performance bonus.',            'bonus',   10, true),
  ('$20 Bonus',       'A $20 performance bonus.',            'bonus',    5, true),
  ('Coffee Voucher',  'A voucher for a coffee on the team.', 'voucher', 20, true),
  ('Lunch Voucher',   'A free team lunch voucher.',          'voucher', 10, true),
  ('1 Day Leave',     'One extra paid day off.',             'leave',    3, true),
  ('Mystery Prize',   'A surprise reward chosen by the Head.', 'mystery', 5, true),
  ('Team Reward',     'A reward shared with the whole team.',  'team',    2, true),
  ('Custom Reward',   'A custom reward defined by the Head.',  'custom', 99, true)
) as seed(name, description, prize_type, quantity, is_active)
where not exists (select 1 from public.winner_center_prizes);

commit;

-- ============================================================================
-- ✅ Verify (run after the migration):
--   select * from public.winner_center_prizes order by created_at;
--   select public.is_head();   -- true only when logged in as the Head
-- ============================================================================
