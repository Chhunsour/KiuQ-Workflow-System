-- Migration: Product CMS — the first headless-CMS module
--
-- KiuQ becomes a private admin/editor surface for the team. The future
-- public framework website reads ONLY rows where status='published' via
-- Supabase JS using the anon key + RLS (the policies below enforce that
-- restriction on the server, so the framework website cannot leak drafts
-- even if the client-side code is wrong).
--
-- Roles (resolved by helpers from migrations 0001 + 0057):
--   - Head/Supervisor/Admin/Owner → public.is_admin() returns true → full
--     read/write/publish/delete on every row.
--   - Assistant Head → public.is_assistant_head() returns true → may
--     edit and publish, but cannot delete.
--   - Team Member → may create + edit DRAFT rows only; never publish,
--     never edit a published row, never delete.
--   - Quality Checker → no access. Their role doesn't match any policy.
--   - Anonymous (anon key, no JWT) → may SELECT rows where status =
--     'published'. The framework website's read path.

-- ── Status enum ─────────────────────────────────────────────────────
-- Kept narrow for now ('draft' | 'published'). A 'pending_review' state
-- can be added later if you ever switch to the 2-step workflow; the
-- check constraint here is the only thing that would need to change.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cms_product_status') then
    create type public.cms_product_status as enum ('draft', 'published');
  end if;
end $$;

-- ── Table ───────────────────────────────────────────────────────────
create table if not exists public.cms_products (
  id                 uuid primary key default gen_random_uuid(),
  product_name       text not null,
  -- Slug is unique only among PUBLISHED rows so multiple drafts can
  -- share the same slug while you iterate. Enforced via partial unique
  -- index below rather than a column constraint.
  slug               text not null,
  category           text not null default '',
  short_description  text not null default '',
  full_description   text not null default '',
  -- Repeating/structured payloads live in jsonb so we don't need a wall
  -- of side-tables for the first cut. The frontend reads them as plain
  -- arrays of objects.
  product_images     jsonb not null default '[]'::jsonb,
  price              numeric(12, 2),
  specs              jsonb not null default '[]'::jsonb,
  features           jsonb not null default '[]'::jsonb,
  attachments        jsonb not null default '[]'::jsonb,
  faq                jsonb not null default '[]'::jsonb,
  seo_title          text not null default '',
  seo_description    text not null default '',
  status             public.cms_product_status not null default 'draft',
  created_by         uuid references auth.users(id) on delete set null,
  updated_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Stamped automatically by the trigger when status flips to published.
  published_at       timestamptz
);

create index if not exists cms_products_status_idx     on public.cms_products (status);
create index if not exists cms_products_category_idx   on public.cms_products (category);
create index if not exists cms_products_updated_at_idx on public.cms_products (updated_at desc);
-- Public frontend lookup-by-slug needs to be fast and unique among
-- published rows. Drafts are free to collide with anything.
create unique index if not exists cms_products_published_slug_uidx
  on public.cms_products (slug) where status = 'published';

-- ── Updated_at + published_at trigger ───────────────────────────────
create or replace function public.cms_products_set_timestamps()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  -- Stamp published_at the first time we move into 'published'.
  -- Leave it untouched on subsequent publishes; clear it on unpublish.
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists cms_products_set_timestamps_trigger on public.cms_products;
create trigger cms_products_set_timestamps_trigger
  before insert or update on public.cms_products
  for each row execute function public.cms_products_set_timestamps();

-- ── RLS ─────────────────────────────────────────────────────────────
alter table public.cms_products enable row level security;

drop policy if exists "cms_products_anon_published_read" on public.cms_products;
drop policy if exists "cms_products_admin_all"           on public.cms_products;
drop policy if exists "cms_products_ah_no_delete"        on public.cms_products;
drop policy if exists "cms_products_member_select_all"   on public.cms_products;
drop policy if exists "cms_products_member_insert_draft" on public.cms_products;
drop policy if exists "cms_products_member_update_draft" on public.cms_products;

-- 1. ANON (public framework website) — published-only.
--    `to anon` is the magic that scopes the policy to unauthenticated
--    reads using the anon key. Authenticated users go through the
--    role-based policies below.
create policy "cms_products_anon_published_read" on public.cms_products
  for select to anon
  using (status = 'published');

-- 2. AUTHENTICATED ADMINS (Head, Supervisor, legacy admin, owner) —
--    full control. is_admin() is the existing helper from 0057.
create policy "cms_products_admin_all" on public.cms_products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. AUTHENTICATED ASSISTANT HEAD — read all, insert anything, update
--    anything, but NO delete (delete is admin-only).
create policy "cms_products_ah_select" on public.cms_products
  for select to authenticated
  using (public.is_assistant_head());
create policy "cms_products_ah_insert" on public.cms_products
  for insert to authenticated
  with check (public.is_assistant_head());
create policy "cms_products_ah_update" on public.cms_products
  for update to authenticated
  using (public.is_assistant_head())
  with check (public.is_assistant_head());

-- 4. AUTHENTICATED TEAM MEMBERS — see everything (so they can pick up
--    drafts they didn't create), insert drafts only, edit drafts only.
--    They cannot delete and cannot ever set status='published'. We
--    detect "team member" by the profile row matching one of the
--    team-member-shaped roles AND not being admin/AH.
create policy "cms_products_member_select" on public.cms_products
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  );

create policy "cms_products_member_insert_draft" on public.cms_products
  for insert to authenticated
  with check (
    status = 'draft'
    and created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  );

create policy "cms_products_member_update_draft" on public.cms_products
  for update to authenticated
  using (
    status = 'draft'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  )
  with check (
    -- Cannot flip to published as a Team Member, even by mistake.
    status = 'draft'
  );

-- Quality Checker role is intentionally not granted by any policy
-- above — they fail every membership check and therefore see no rows.

-- ── Realtime ────────────────────────────────────────────────────────
-- Optional but useful: the list page can react to other editors'
-- changes without a manual refresh.
alter publication supabase_realtime add table public.cms_products;
