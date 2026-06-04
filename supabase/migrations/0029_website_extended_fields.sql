-- Add new fields to websites table for the extended Website Profile form

alter table public.websites
  add column if not exists industry              text not null default 'Machinery',
  add column if not exists website_goal          text not null default '',
  add column if not exists background_color      text not null default '#ffffff',
  add column if not exists text_color            text not null default '#0f172a',
  add column if not exists whatsapp_link         text not null default '',
  add column if not exists facebook_link         text not null default '',
  add column if not exists instagram_link        text not null default '',
  add column if not exists youtube_link          text not null default '',
  add column if not exists other_social_links    text not null default '',
  add column if not exists main_keyword          text not null default '',
  add column if not exists target_country        text not null default '',
  add column if not exists created_by            uuid references auth.users(id) default auth.uid();

-- Transparency: All authenticated users can read all websites
drop policy if exists "websites_member_read_assigned" on public.websites;
drop policy if exists "websites_read_authenticated" on public.websites;
drop policy if exists "websites_read_all_authenticated" on public.websites;

create policy "websites_read_all_authenticated" on public.websites
  for select to authenticated using (true);

-- Allow authenticated users to create websites
drop policy if exists "websites_admin_write" on public.websites;
drop policy if exists "websites_authenticated_insert" on public.websites;

create policy "websites_authenticated_insert" on public.websites
  for insert to authenticated with check (true);

-- Allow authenticated users to update/delete websites they created (or all if admin)
drop policy if exists "websites_authenticated_write" on public.websites;

create policy "websites_authenticated_write" on public.websites
  for all to authenticated
  using (public.is_admin() or auth.uid() = created_by)
  with check (public.is_admin() or auth.uid() = created_by);

-- Also handle website_products RLS
alter table public.website_products
  add column if not exists created_by uuid references auth.users(id) default auth.uid();

drop policy if exists "website_products_read_authenticated" on public.website_products;
drop policy if exists "website_products_admin_write" on public.website_products;

create policy "website_products_read_all_authenticated" on public.website_products
  for select to authenticated using (true);

create policy "website_products_authenticated_write" on public.website_products
  for all to authenticated
  using (public.is_admin() or auth.uid() = created_by)
  with check (public.is_admin() or auth.uid() = created_by);
