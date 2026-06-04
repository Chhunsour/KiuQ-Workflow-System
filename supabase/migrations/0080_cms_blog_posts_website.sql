-- Migration: Per-website organization + per-author visibility for blog posts
--
-- Two changes the team asked for:
--   1. Each blog post now belongs to a specific website ("folder") via
--      website_id, so authors always know which site they're posting to.
--   2. Team Members now see and edit ONLY their own posts. Head /
--      Supervisor / Admin and Assistant Head keep full visibility of every
--      post (their existing policies are untouched, and RLS policies OR
--      together, so the admin/AH read policies still grant the wide view).

-- ── Column ────────────────────────────────────────────────────────────
alter table public.cms_blog_posts
  add column if not exists website_id uuid references public.websites(id) on delete set null;

create index if not exists cms_blog_posts_website_idx on public.cms_blog_posts (website_id);

-- ── Member visibility: OWN posts only ────────────────────────────────
-- Replaces the previous "members see every post" policy. Admins and
-- Assistant Head are unaffected — they read through their own policies.
drop policy if exists "cms_blog_posts_member_select" on public.cms_blog_posts;
create policy "cms_blog_posts_member_select" on public.cms_blog_posts
  for select to authenticated
  using (
    created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  );

-- ── Member edit: own drafts only ─────────────────────────────────────
drop policy if exists "cms_blog_posts_member_update_draft" on public.cms_blog_posts;
create policy "cms_blog_posts_member_update_draft" on public.cms_blog_posts
  for update to authenticated
  using (
    status = 'draft'
    and created_by = auth.uid()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'active'
        and p.role in ('member', 'team_member', 'reviewer')
    )
  )
  with check (status = 'draft' and created_by = auth.uid());

-- Note for the PUBLIC websites: each site should now fetch only ITS OWN
-- posts by adding a website_id filter to its published-posts query, e.g.
--   .eq('status','published').eq('website_id', '<that-site-id>')
-- The anon read policy still returns published rows of any site; the
-- per-site filter lives in each website's own query.
