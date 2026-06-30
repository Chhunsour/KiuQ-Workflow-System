-- Add a reversible "archived" flag to blog posts.
-- Archived posts are hidden from the default blog admin views and are NOT
-- pushed to connected sites by blog-sync. Nothing is deleted.
alter table public.cms_blog_posts
  add column if not exists archived boolean not null default false;

create index if not exists cms_blog_posts_archived_idx
  on public.cms_blog_posts (archived);
