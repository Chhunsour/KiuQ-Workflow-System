-- Migration: CMS Blog Posts
--
-- Headless CMS table for blog post management. Mirrors the pattern from
-- cms_products (migration 0063) so the same role/RLS conventions apply:
--   - Anon key (public skidsteer website) → published rows only
--   - Admin/Owner/Head/Supervisor → full CRUD
--   - Assistant Head → read all + insert + update, no delete
--   - Team Member → see all, insert draft, edit own draft, no publish/delete
--   - Quality Checker → no access

-- ── Status enum ──────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cms_blog_post_status') then
    create type public.cms_blog_post_status as enum ('draft', 'published');
  end if;
end $$;

-- ── Table ─────────────────────────────────────────────────────────────
create table if not exists public.cms_blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slug                text not null,
  excerpt             text not null default '',
  category            text not null default '',
  content             text not null default '',
  featured_image      text not null default '',
  featured_image_alt  text not null default '',
  author              text not null default '',
  publish_date        date,
  seo_title           text not null default '',
  seo_description     text not null default '',
  status              public.cms_blog_post_status not null default 'draft',
  created_by          uuid references auth.users(id) on delete set null,
  updated_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz
);

create index if not exists cms_blog_posts_status_idx     on public.cms_blog_posts (status);
create index if not exists cms_blog_posts_category_idx   on public.cms_blog_posts (category);
create index if not exists cms_blog_posts_updated_at_idx on public.cms_blog_posts (updated_at desc);
create index if not exists cms_blog_posts_publish_date_idx on public.cms_blog_posts (publish_date desc);

-- Slug uniqueness enforced only among published rows (drafts can share a slug while iterating).
create unique index if not exists cms_blog_posts_published_slug_uidx
  on public.cms_blog_posts (slug) where status = 'published';

-- ── Timestamps + published_at trigger ─────────────────────────────────
create or replace function public.cms_blog_posts_set_timestamps()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  elsif new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists cms_blog_posts_set_timestamps_trigger on public.cms_blog_posts;
create trigger cms_blog_posts_set_timestamps_trigger
  before insert or update on public.cms_blog_posts
  for each row execute function public.cms_blog_posts_set_timestamps();

-- ── RLS ───────────────────────────────────────────────────────────────
alter table public.cms_blog_posts enable row level security;

drop policy if exists "cms_blog_posts_anon_published_read"   on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_admin_all"             on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_ah_select"             on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_ah_insert"             on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_ah_update"             on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_member_select"         on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_member_insert_draft"   on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_member_update_draft"   on public.cms_blog_posts;

-- 1. ANON (public skidsteer website) — published rows only.
create policy "cms_blog_posts_anon_published_read" on public.cms_blog_posts
  for select to anon
  using (status = 'published');

-- 2. ADMINS — full control.
create policy "cms_blog_posts_admin_all" on public.cms_blog_posts
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 3. ASSISTANT HEAD — read all, insert, update, no delete.
create policy "cms_blog_posts_ah_select" on public.cms_blog_posts
  for select to authenticated using (public.is_assistant_head());
create policy "cms_blog_posts_ah_insert" on public.cms_blog_posts
  for insert to authenticated with check (public.is_assistant_head());
create policy "cms_blog_posts_ah_update" on public.cms_blog_posts
  for update to authenticated
  using (public.is_assistant_head()) with check (public.is_assistant_head());

-- 4. TEAM MEMBERS — see all, insert draft, edit draft, cannot publish/delete.
create policy "cms_blog_posts_member_select" on public.cms_blog_posts
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  );

create policy "cms_blog_posts_member_insert_draft" on public.cms_blog_posts
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

create policy "cms_blog_posts_member_update_draft" on public.cms_blog_posts
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
  with check (status = 'draft');

-- ── Realtime ──────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.cms_blog_posts;
