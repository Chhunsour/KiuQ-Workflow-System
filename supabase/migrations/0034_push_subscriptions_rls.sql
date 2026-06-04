-- Enable RLS and set safe per-user policies for push_subscriptions.
-- Run this AFTER confirming tokens are inserting correctly.

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users can view their own push subscriptions"   on public.push_subscriptions;
drop policy if exists "Users can insert their own push subscriptions"  on public.push_subscriptions;
drop policy if exists "Users can update their own push subscriptions"  on public.push_subscriptions;
drop policy if exists "push_subscriptions_own"                         on public.push_subscriptions;
drop policy if exists "push_subscriptions_admin_read"                  on public.push_subscriptions;

create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() is not null and auth.uid() = user_id);

create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using  (auth.uid() is not null and auth.uid() = user_id)
  with check (auth.uid() is not null and auth.uid() = user_id);

-- Admins can read all tokens (needed to send push to other users)
create policy "Admins can read all push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
