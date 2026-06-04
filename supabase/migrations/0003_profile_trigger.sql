-- WordPress Prompt System — Auto-create profile on signup
-- Run after 0002_rls_policies.sql.

-- When a row is added to auth.users, mirror it into public.profiles.
-- The user's full_name is taken from raw_user_meta_data.full_name
-- (passed via supabase.auth.signUp({ options: { data: { full_name }}})).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'member',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
