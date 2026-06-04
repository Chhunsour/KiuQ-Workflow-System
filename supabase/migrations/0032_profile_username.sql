-- Add username handle to profiles table
alter table public.profiles
  add column if not exists username text unique;

-- Optional: generate a default username from existing full_name for existing rows
update public.profiles
set username = lower(regexp_replace(trim(full_name), '\s+', '_', 'g'))
where username is null and full_name is not null and trim(full_name) != '';
