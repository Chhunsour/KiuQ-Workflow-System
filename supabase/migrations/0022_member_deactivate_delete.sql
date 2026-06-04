-- KiuQ Website System — Member deactivate / soft-delete
-- Extends profiles.status to support 'deactivated' and 'deleted'.
-- Safe: keeps all existing rows intact, no data is removed.

-- 1. Drop the old status check constraint
alter table public.profiles
  drop constraint if exists profiles_status_check;

-- 2. Add the updated check with the two new values
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'inactive', 'deactivated', 'deleted'));

-- 3. Index to make filtering by status fast
create index if not exists profiles_status_idx on public.profiles (status);
