-- Allow reviewer and future custom profile roles.
-- RLS still treats only role = 'admin' as admin-level access.

alter table public.profiles
  drop constraint if exists profiles_role_check;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_not_blank'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_not_blank
      check (length(trim(role)) > 0);
  end if;
end $$;
