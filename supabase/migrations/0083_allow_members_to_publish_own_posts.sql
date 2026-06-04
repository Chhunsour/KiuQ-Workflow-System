-- Migration: Allow members to publish their own blog posts directly
--
-- This migration updates the Row Level Security (RLS) policies for public.cms_blog_posts
-- to allow users with the 'member' / 'team_member' / 'reviewer' roles to publish
-- and unpublish their own posts directly, while still preventing them from seeing or
-- modifying other users' posts.

-- 1. Drop old draft-only restrictions
drop policy if exists "cms_blog_posts_member_insert_draft" on public.cms_blog_posts;
drop policy if exists "cms_blog_posts_member_update_draft" on public.cms_blog_posts;

-- 2. Create new insert policy allowing members to create posts with any status (including 'published')
create policy "cms_blog_posts_member_insert" on public.cms_blog_posts
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  );

-- 3. Create new update policy allowing members to edit/publish/unpublish their own posts
create policy "cms_blog_posts_member_update" on public.cms_blog_posts
  for update to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  )
  with check (created_by = auth.uid());
