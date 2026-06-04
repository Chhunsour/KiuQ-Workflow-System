-- Migration: Website access tracking and connection status
--
-- Adds a last_accessed_at timestamp to public.websites to track active
-- API traffic and connection status.
-- Creates a security definer RPC function that can be called anonymously by
-- framework websites to register their active connection/heartbeat.

alter table public.websites
  add column if not exists last_accessed_at timestamptz;

create or replace function public.ping_website(p_website_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.websites
  set last_accessed_at = now()
  where id = p_website_id;
end;
$$;

-- Allow anonymous and authenticated access to the RPC function
grant execute on function public.ping_website(uuid) to anon;
grant execute on function public.ping_website(uuid) to authenticated;
grant execute on function public.ping_website(uuid) to service_role;
