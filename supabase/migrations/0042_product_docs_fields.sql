-- Migration: add product-doc fields to docs_files and link to prompt templates
-- Adds category classification, product detail fields, and a linked prompt

-- ── Category enum ────────────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_type where typname = 'docs_file_category') then
    create type public.docs_file_category as enum (
      'product_details',
      'website_instructions',
      'landing_page_prompts',
      'seo_notes',
      'design_references',
      'company_rules',
      'other'
    );
  end if;
end $$;

-- ── New columns on docs_files ─────────────────────────────────────────────────
alter table public.docs_files
  add column if not exists category       public.docs_file_category not null default 'other',
  add column if not exists product_name   text not null default '',
  add column if not exists product_url    text not null default '',
  add column if not exists product_image_url text not null default '',
  add column if not exists product_short_desc text not null default '',
  add column if not exists product_long_desc  text not null default '',
  add column if not exists product_features   text not null default '',   -- newline-separated list
  add column if not exists product_specs      text not null default '',   -- newline-separated key:value pairs
  add column if not exists product_price      text not null default '',
  add column if not exists product_sku        text not null default '',
  add column if not exists product_notes      text not null default '',
  add column if not exists drive_link         text not null default '',
  add column if not exists linked_prompt_id   uuid references public.prompt_workflow_templates(id) on delete set null;

-- Index for quick filtering by category
create index if not exists docs_files_category_idx on public.docs_files (category);

-- Index for linked prompt lookups
create index if not exists docs_files_linked_prompt_idx on public.docs_files (linked_prompt_id)
  where linked_prompt_id is not null;
