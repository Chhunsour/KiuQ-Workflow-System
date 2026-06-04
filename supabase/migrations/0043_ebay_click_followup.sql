-- Migration: eBay Click Followup daily checkbox tracker
-- Team members check-in Mon–Sat each day to confirm they completed eBay click followup.
-- Sunday is always skipped (no work day).

create table if not exists public.ebay_click_followup (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  day_name      text not null,           -- 'Monday', 'Tuesday', etc.
  status        text not null default 'done' check (status in ('done', 'missed')),
  completed_at  timestamptz not null default now(),
  completed_by  uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  -- One record per user per day
  unique (user_id, date)
);

-- Index for admin overview queries
create index if not exists ecf_user_date_idx on public.ebay_click_followup (user_id, date desc);
create index if not exists ecf_date_idx       on public.ebay_click_followup (date desc);

-- Updated_at trigger
create or replace function public.ecf_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ecf_updated_at_trigger on public.ebay_click_followup;
create trigger ecf_updated_at_trigger
  before update on public.ebay_click_followup
  for each row execute function public.ecf_set_updated_at();

-- RLS
alter table public.ebay_click_followup enable row level security;

-- Members can read their own rows; admins can read all
create policy "ecf_select"
  on public.ebay_click_followup for select
  using (
    auth.uid() = user_id
    or public.is_admin()
  );

-- Members insert their own; admins can insert for anyone
create policy "ecf_insert"
  on public.ebay_click_followup for insert
  with check (
    auth.uid() = user_id
    or public.is_admin()
  );

-- Members update their own; admins can update any
create policy "ecf_update"
  on public.ebay_click_followup for update
  using (
    auth.uid() = user_id
    or public.is_admin()
  )
  with check (
    auth.uid() = user_id
    or public.is_admin()
  );

-- Admins can delete (for corrections)
create policy "ecf_delete"
  on public.ebay_click_followup for delete
  using (public.is_admin());
