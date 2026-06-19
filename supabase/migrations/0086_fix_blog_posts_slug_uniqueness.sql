  -- Migration: Scoped slug uniqueness for CMS blog posts
  --
  -- Fixes duplicate key constraint violations on cms_blog_posts by changing
  -- the published slug unique index to be scoped by website_id instead of
  -- being globally unique across all websites.

  -- 1. Drop the old global unique index
  drop index if exists public.cms_blog_posts_published_slug_uidx;

  -- 2. Re-create the unique index scoped per-website for published rows
  create unique index if not exists cms_blog_posts_published_slug_uidx
    on public.cms_blog_posts (website_id, slug) where status = 'published';
