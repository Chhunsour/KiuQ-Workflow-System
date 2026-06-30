create extension if not exists "pgcrypto";

create table if not exists public.website_messages (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  website            text not null default 'unknown',
  source             text not null default 'contact-form',
  source_page        text,
  name               text,
  company            text,
  email              text,
  phone              text,
  location           text,
  language           text,
  interest_type      text,
  product_interest   text,
  product_url        text,
  message            text,
  transcript_summary text,
  status             text not null default 'new' check (status in ('new','read','archived')),
  handled_by         text
);

create index if not exists website_messages_created_at_idx on public.website_messages (created_at desc);
create index if not exists website_messages_status_idx     on public.website_messages (status);
create index if not exists website_messages_website_idx    on public.website_messages (website);

alter table public.website_messages enable row level security;

drop policy if exists website_messages_insert_public on public.website_messages;
create policy "website_messages_insert_public" on public.website_messages
  for insert to anon, authenticated with check (true);

drop policy if exists website_messages_admin_select on public.website_messages;
create policy "website_messages_admin_select" on public.website_messages
  for select to authenticated using (public.is_admin());

drop policy if exists website_messages_admin_update on public.website_messages;
create policy "website_messages_admin_update" on public.website_messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists website_messages_admin_delete on public.website_messages;
create policy "website_messages_admin_delete" on public.website_messages
  for delete to authenticated using (public.is_admin());
