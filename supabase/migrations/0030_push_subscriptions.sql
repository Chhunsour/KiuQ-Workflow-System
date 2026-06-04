-- Create push_subscriptions table for FCM tokens
create table if not exists public.push_subscriptions (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid references auth.users(id) on delete cascade not null,
    fcm_token   text not null,
    device_name text default '',
    browser     text default '',
    platform    text default '',
    is_active   boolean default true,
    created_at  timestamp with time zone default now(),
    updated_at  timestamp with time zone default now(),
    last_used_at timestamp with time zone default now(),
    
    unique(user_id, fcm_token)
);

-- Enable RLS
alter table public.push_subscriptions enable row level security;

-- Policies
create policy "Users can manage their own subscriptions"
    on public.push_subscriptions
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- Admin can see all (optional, but good for management)
create policy "Admins can view all subscriptions"
    on public.push_subscriptions
    for select
    using (public.is_admin());

-- Function to update updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_updated_at
    before update on public.push_subscriptions
    for each row
    execute function public.handle_updated_at();

-- Index for performance
create index if not exists idx_push_subs_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subs_token on public.push_subscriptions(fcm_token);
