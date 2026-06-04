-- ============================================================
-- 0041 — Prompt Workflow System
--
-- New tables:
--   prompt_workflow_templates  — admin-managed master prompts
--   prompt_workflow_groups     — page group metadata (optional override)
--   prompt_usage_logs          — tracks every copy event per user/website/prompt
--
-- Notes:
--   • prompt_workflow_templates is separate from the existing `prompts`
--     table so the old assignment/builder workflow is untouched.
--   • page_type mirrors the slug values in promptLibrary.ts pageGroups.
--   • editable_fields stored as JSONB array of {key,label,type,helper,options,defaultValue}.
--   • Anti-farming: unique index on (user_id, prompt_id, date(copied_at)).
-- ============================================================

-- ── prompt_workflow_groups ───────────────────────────────────

create table if not exists public.prompt_workflow_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null default '',
  page_type   text not null unique,  -- e.g. 'front-page', 'topic-pages'
  sort_order  int  not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── prompt_workflow_templates ────────────────────────────────

create table if not exists public.prompt_workflow_templates (
  id                     uuid primary key default gen_random_uuid(),
  title                  text not null,
  page_type              text not null,           -- page group slug
  section_type           text not null default '', -- e.g. 'Hero / Banner Section'
  prompt_type            text not null default 'section',
  output_type            text not null default 'elementor_section',
  short_description      text not null default '',
  template_body          text not null default '',
  locked_rules           text not null default '',
  editable_fields        jsonb not null default '[]',
  required_website_fields text[] not null default '{}',
  required_product_docs  boolean not null default false,
  status                 text not null default 'draft' check (status in ('draft','approved')),
  version                int  not null default 1,
  created_by             uuid references auth.users(id) on delete set null,
  updated_by             uuid references auth.users(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create index if not exists pwt_page_type_idx on public.prompt_workflow_templates(page_type);
create index if not exists pwt_status_idx    on public.prompt_workflow_templates(status);

-- ── prompt_usage_logs ────────────────────────────────────────

create table if not exists public.prompt_usage_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  website_id      uuid references public.websites(id) on delete set null,
  prompt_id       uuid not null references public.prompt_workflow_templates(id) on delete cascade,
  product_doc_id  uuid references public.docs_files(id) on delete set null,
  page_type       text not null default '',
  section_type    text not null default '',
  copied_at       timestamptz not null default now()
);

-- Anti-farming: one leaderboard point per user+prompt per calendar day
create unique index if not exists pul_dedup_day
  on public.prompt_usage_logs (user_id, prompt_id, date(copied_at at time zone 'UTC'));

-- ── RLS ──────────────────────────────────────────────────────

alter table public.prompt_workflow_groups    enable row level security;
alter table public.prompt_workflow_templates enable row level security;
alter table public.prompt_usage_logs         enable row level security;

-- Groups: everyone authenticated can read; only admins write
drop policy if exists "pwg_read"  on public.prompt_workflow_groups;
drop policy if exists "pwg_write" on public.prompt_workflow_groups;

create policy "pwg_read"
  on public.prompt_workflow_groups for select
  to authenticated using (true);

create policy "pwg_write"
  on public.prompt_workflow_groups for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Templates: read based on status (members see approved only; admins see all)
drop policy if exists "pwt_read_approved" on public.prompt_workflow_templates;
drop policy if exists "pwt_admin_all"     on public.prompt_workflow_templates;

create policy "pwt_read_approved"
  on public.prompt_workflow_templates for select
  to authenticated
  using (
    status = 'approved'
    or public.is_admin()
  );

create policy "pwt_admin_all"
  on public.prompt_workflow_templates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Usage logs: users read/insert own; admins read all
drop policy if exists "pul_read_own"    on public.prompt_usage_logs;
drop policy if exists "pul_read_admin"  on public.prompt_usage_logs;
drop policy if exists "pul_insert_own"  on public.prompt_usage_logs;

create policy "pul_read_own"
  on public.prompt_usage_logs for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "pul_insert_own"
  on public.prompt_usage_logs for insert
  to authenticated
  with check (user_id = auth.uid());

-- ── Seed default page groups ─────────────────────────────────
-- Insert only if empty so re-running is safe.

insert into public.prompt_workflow_groups (name, description, page_type, sort_order)
select name, description, page_type, sort_order
from (values
  ('Home Page',                  'Build the main sections of a homepage.',                             'front-page',                   1),
  ('Topic Pages',                'Reusable topic page prompts for categories and guides.',              'topic-pages',                  2),
  ('Product Landing Page',       'Full product landing page sections and layouts.',                     'product-landing',              3),
  ('Product Category Page',      'Category listing and filter page prompts.',                           'product-category',             4),
  ('About Us Page',              'Company story, trust, team and why-choose-us prompts.',               'about-us-page',                5),
  ('Contact Page',               'Contact layout, form, map and business info prompts.',                'contact-page',                 6),
  ('FAQ Page',                   'Full FAQ pages and focused FAQ sections.',                            'faq-page',                     7),
  ('Privacy Policy Page',        'Privacy policy copy prompts for WordPress websites.',                 'privacy-policy-page',          8),
  ('Terms and Conditions Page',  'Terms page prompts for common website rules and disclaimers.',        'terms-and-conditions-page',    9),
  ('Warranty Policy Page',       'Warranty policy prompts for product or equipment websites.',          'warranty-policy-page',         10),
  ('Shipping and Delivery Page', 'Shipping, delivery, processing and coverage prompts.',                'shipping-and-delivery-page',   11),
  ('Return and Refund Page',     'Return, refund, exchange and cancellation policy prompts.',           'return-and-refund-policy-page',12),
  ('Blog Page',                  'Blog article, category and archive page prompts.',                    'blog-page',                    13),
  ('Custom Section',             'Custom one-off sections not tied to a specific page type.',           'custom-section',               14)
) as v(name, description, page_type, sort_order)
where not exists (select 1 from public.prompt_workflow_groups limit 1);
