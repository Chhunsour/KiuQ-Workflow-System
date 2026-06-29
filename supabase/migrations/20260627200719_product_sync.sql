-- ────────────────────────────────────────────────────────────────────────────
--  Product Sync — push cms_products out to connected e-commerce framework sites
--
--  KiuQ is the master controller. The CMS Products dashboard (public.cms_products)
--  is the master product source. This migration adds the distribution layer:
--
--    connected_websites        receiver sites that accept product pushes
--    product_website_overrides per-site field overrides (custom price, etc.)
--    product_sync_state        current sync state per (website, product)
--    product_sync_logs         append-only history of every push attempt
--    product_sync_settings     single-row global tuning (batch size, etc.)
--
--  Security: admin-class only (public.is_admin() from 0057). Secret tokens live
--  in connected_websites.secret_token and are readable only by admins + the
--  Edge Function (service role). No anon access to any of these tables.
-- ────────────────────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- ── connected websites (receiver sites) ─────────────────────────────────────
create table if not exists public.connected_websites (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  domain        text not null,
  -- full URL of the receiver endpoint, e.g. https://siteb.com/api/receiver.php
  sync_endpoint text not null,
  secret_token  text not null default encode(gen_random_bytes(24), 'hex'),
  platform      text not null default 'konstructz-framework',
  active        boolean not null default true,
  last_sync_at  timestamptz,
  last_status   text,                 -- 'success' | 'partial' | 'failed' | null
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── per-website product overrides ───────────────────────────────────────────
create table if not exists public.product_website_overrides (
  id                uuid primary key default gen_random_uuid(),
  website_id        uuid not null references public.connected_websites(id) on delete cascade,
  product_id        uuid not null references public.cms_products(id) on delete cascade,
  enabled           boolean not null default true,
  title             text,
  price             numeric,
  sale_price        numeric,
  short_description text,
  full_description  text,
  featured_image    text,
  status            text,
  button_url        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (website_id, product_id)
);
create index if not exists pwo_website_idx on public.product_website_overrides (website_id);
create index if not exists pwo_product_idx on public.product_website_overrides (product_id);

-- ── current sync state per (website, product) ───────────────────────────────
create table if not exists public.product_sync_state (
  id               uuid primary key default gen_random_uuid(),
  website_id       uuid not null references public.connected_websites(id) on delete cascade,
  product_id       uuid not null references public.cms_products(id) on delete cascade,
  status           text not null default 'pending',   -- pending | success | failed
  last_synced_at   timestamptz,
  last_synced_hash text,
  last_error       text,
  retry_count      int not null default 0,
  unique (website_id, product_id)
);
create index if not exists pss_website_idx on public.product_sync_state (website_id);
create index if not exists pss_product_idx on public.product_sync_state (product_id);
create index if not exists pss_status_idx  on public.product_sync_state (status);

-- ── append-only sync log ────────────────────────────────────────────────────
create table if not exists public.product_sync_logs (
  id           uuid primary key default gen_random_uuid(),
  website_id   uuid references public.connected_websites(id) on delete set null,
  product_id   uuid references public.cms_products(id) on delete set null,
  website_name text,
  product_name text,
  product_slug text,
  sync_type    text not null,        -- full | price | images | descriptions
  status       text not null,        -- pending | success | failed
  error        text,
  retry_count  int not null default 0,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);
create index if not exists psl_created_idx on public.product_sync_logs (created_at desc);
create index if not exists psl_status_idx  on public.product_sync_logs (status, created_at desc);
create index if not exists psl_website_idx on public.product_sync_logs (website_id);

-- ── global settings (single row, id = 1) ────────────────────────────────────
create table if not exists public.product_sync_settings (
  id                int primary key default 1 check (id = 1),
  batch_size        int not null default 5,
  concurrency       int not null default 3,
  request_timeout_s int not null default 60,
  compress_images   boolean not null default true,
  updated_at        timestamptz not null default now()
);
insert into public.product_sync_settings (id) values (1) on conflict (id) do nothing;

-- ── updated_at touch trigger (reuse if present, else define) ────────────────
create or replace function public.product_sync_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists connected_websites_touch on public.connected_websites;
create trigger connected_websites_touch before update on public.connected_websites
  for each row execute function public.product_sync_touch_updated_at();

drop trigger if exists product_website_overrides_touch on public.product_website_overrides;
create trigger product_website_overrides_touch before update on public.product_website_overrides
  for each row execute function public.product_sync_touch_updated_at();

drop trigger if exists product_sync_settings_touch on public.product_sync_settings;
create trigger product_sync_settings_touch before update on public.product_sync_settings
  for each row execute function public.product_sync_touch_updated_at();

-- ── row-level security: admin-class only (matches cms_products) ─────────────
alter table public.connected_websites        enable row level security;
alter table public.product_website_overrides enable row level security;
alter table public.product_sync_state         enable row level security;
alter table public.product_sync_logs          enable row level security;
alter table public.product_sync_settings      enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'connected_websites','product_website_overrides',
    'product_sync_state','product_sync_logs','product_sync_settings'
  ]
  loop
    execute format('drop policy if exists "%1$s_admin_all" on public.%1$s', t);
    execute format(
      'create policy "%1$s_admin_all" on public.%1$s
         for all to authenticated
         using ( public.is_admin() ) with check ( public.is_admin() )', t);
  end loop;
end $$;

-- The Edge Function uses the service role key and bypasses RLS, so it can read
-- secret_token and write logs without a user session. No anon policy exists.
