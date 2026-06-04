-- =========================================================
-- Blog Image Center
-- Two new tables for per-website image prompt templates and
-- blog workflow instructions.
-- =========================================================

-- ─── blog_image_prompts ──────────────────────────────────
-- Per-website featured-image prompt templates that team
-- members copy when generating blog thumbnails.
create table if not exists public.blog_image_prompts (
  id            uuid primary key default gen_random_uuid(),
  website_id    uuid not null references public.websites(id) on delete cascade,
  template_name text not null default '',
  prompt_content text not null default '',
  position      integer not null default 0,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists blog_image_prompts_website_idx
  on public.blog_image_prompts (website_id);

-- ─── blog_image_workflows ────────────────────────────────
-- One workflow guide per website (plain text / markdown).
create table if not exists public.blog_image_workflows (
  id            uuid primary key default gen_random_uuid(),
  website_id    uuid not null references public.websites(id) on delete cascade,
  instructions  text not null default '',
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (website_id)
);

create index if not exists blog_image_workflows_website_idx
  on public.blog_image_workflows (website_id);

-- ─── updated_at triggers ─────────────────────────────────
do $$
declare
  t text;
begin
  for t in
    select unnest(array['blog_image_prompts','blog_image_workflows'])
  loop
    execute format(
      'drop trigger if exists touch_updated_at on public.%I;
       create trigger touch_updated_at before update on public.%I
       for each row execute function public.touch_updated_at();',
      t, t
    );
  end loop;
end $$;

-- ─── RLS ─────────────────────────────────────────────────
alter table public.blog_image_prompts  enable row level security;
alter table public.blog_image_workflows enable row level security;

-- Helper: reuse the existing is_admin() function if available,
-- otherwise fall back to a role check on profiles.
create or replace function public.is_admin_user()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('admin','owner','head','supervisor','assistant_head')
  );
$$;

-- blog_image_prompts
create policy "bip_select" on public.blog_image_prompts
  for select to authenticated using (true);

create policy "bip_insert" on public.blog_image_prompts
  for insert to authenticated
  with check (public.is_admin_user());

create policy "bip_update" on public.blog_image_prompts
  for update to authenticated
  using (public.is_admin_user());

create policy "bip_delete" on public.blog_image_prompts
  for delete to authenticated
  using (public.is_admin_user());

-- blog_image_workflows
create policy "biw_select" on public.blog_image_workflows
  for select to authenticated using (true);

create policy "biw_insert" on public.blog_image_workflows
  for insert to authenticated
  with check (public.is_admin_user());

create policy "biw_update" on public.blog_image_workflows
  for update to authenticated
  using (public.is_admin_user());

create policy "biw_delete" on public.blog_image_workflows
  for delete to authenticated
  using (public.is_admin_user());

-- ─── Realtime ────────────────────────────────────────────
-- Publish changes so the UI can subscribe.
alter publication supabase_realtime add table public.blog_image_prompts;
alter publication supabase_realtime add table public.blog_image_workflows;
