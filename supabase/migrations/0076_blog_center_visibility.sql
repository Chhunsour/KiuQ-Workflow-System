-- =========================================================
-- 0076 — Blog Center visibility scoping
--
-- Previously, `blog_image_prompts` and `blog_image_workflows`
-- used `select using (true)` — every authenticated user could
-- read every website's templates and workflow notes, including
-- Quality Checkers who are not supposed to see Blog Center at
-- all, and Team Members reading sites assigned to other people.
--
-- This migration tightens SELECT so:
--   * Head / Supervisor / Admin / Owner / Assistant Head
--     can read every template + workflow (full visibility).
--   * Team Members can only read templates + workflows that
--     belong to a website assigned to them (websites.created_by
--     = auth.uid()) — matching the project's existing
--     "assignment" model used everywhere else.
--   * Quality Checkers see nothing.
--
-- Write paths (insert/update/delete) keep their existing
-- admin-only gate via `public.is_admin_user()`.
-- =========================================================

-- ─── Helper: is this user a Team Member (not admin-class, not QC)? ───────
-- Mirrors the frontend isMemberRole() helper. Used as a SELECT predicate.
create or replace function public.is_team_member_user()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('member','team_member','assistant_head')
  );
$$;

-- ─── Helper: is this website visible to the current user? ─────────────────
-- Head/Supervisor/Admin/Owner/Assistant Head → all websites.
-- Team Member → only websites they created (the project's assignment model).
-- Quality Checker / anonymous → no websites.
create or replace function public.user_can_see_website(p_website_id uuid)
returns boolean language sql stable security definer as $$
  select
    -- Admin-class roles see every website
    public.is_admin_user()
    -- Team members see only websites assigned to them
    or exists (
      select 1
      from public.websites w
      join public.profiles p on p.id = auth.uid()
      where w.id = p_website_id
        and w.created_by = auth.uid()
        and p.role in ('member','team_member')
    );
$$;

-- ─── blog_image_prompts: replace SELECT policy ────────────────────────────
drop policy if exists "bip_select"           on public.blog_image_prompts;
drop policy if exists "bip_select_scoped"    on public.blog_image_prompts;

create policy "bip_select_scoped"
on public.blog_image_prompts
for select
to authenticated
using (
  public.user_can_see_website(website_id)
);

-- ─── blog_image_workflows: replace SELECT policy ──────────────────────────
drop policy if exists "biw_select"           on public.blog_image_workflows;
drop policy if exists "biw_select_scoped"    on public.blog_image_workflows;

create policy "biw_select_scoped"
on public.blog_image_workflows
for select
to authenticated
using (
  public.user_can_see_website(website_id)
);

-- ─── Note on websites table itself ────────────────────────────────────────
-- We intentionally leave the existing `websites_select_policy` (migration
-- 0066) in place. That policy lets team members read every website row
-- because the rest of the app (TeamWebsitesPage, Leaderboard, etc.) relies
-- on team-wide visibility. Blog Center enforces its narrower "assigned to
-- me" rule on the frontend; deep-link access to the per-website template
-- editor is gated by the canView check in BlogImageCenterDetailPage.vue,
-- and the prompt/workflow rows themselves are now RLS-scoped above so a
-- team member who somehow bypasses the UI guard still cannot read another
-- site's templates.
