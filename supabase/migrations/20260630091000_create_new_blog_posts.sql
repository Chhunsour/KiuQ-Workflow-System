create table if not exists public.blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  target_website_id   uuid not null references public.connected_websites(id) on delete cascade,
  title               text not null,
  slug                text not null,
  excerpt             text not null default '',
  content             text not null default '',
  featured_image_url  text,
  category            text not null default '',
  tags                text[] not null default '{}',
  seo_title           text,
  seo_description     text,
  status              text not null default 'Draft' check (status in ('Draft', 'Ready', 'Published', 'Failed')),
  remote_post_id      text,
  pushed_to_website   boolean not null default false,
  publish_error       text,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  published_at        timestamptz
);

create index if not exists blog_posts_status_idx on public.blog_posts(status);
create index if not exists blog_posts_target_website_idx on public.blog_posts(target_website_id);

alter table public.blog_posts enable row level security;

-- 1. Anon Select (for public sites to read published posts)
drop policy if exists "blog_posts_anon_select" on public.blog_posts;
create policy "blog_posts_anon_select" on public.blog_posts
  for select to anon using (status = 'Published');

-- 2. Authenticated Select
drop policy if exists "blog_posts_auth_select" on public.blog_posts;
create policy "blog_posts_auth_select" on public.blog_posts
  for select to authenticated using (true);

-- 3. Authenticated Insert
drop policy if exists "blog_posts_auth_insert" on public.blog_posts;
create policy "blog_posts_auth_insert" on public.blog_posts
  for insert to authenticated with check (true);

-- 4. Authenticated Update
drop policy if exists "blog_posts_auth_update" on public.blog_posts;
create policy "blog_posts_auth_update" on public.blog_posts
  for update to authenticated using (true) with check (true);

-- 5. Authenticated Delete
drop policy if exists "blog_posts_auth_delete" on public.blog_posts;
create policy "blog_posts_auth_delete" on public.blog_posts
  for delete to authenticated using (public.is_admin());

-- Add to publication for real-time
alter publication supabase_realtime add table public.blog_posts;
