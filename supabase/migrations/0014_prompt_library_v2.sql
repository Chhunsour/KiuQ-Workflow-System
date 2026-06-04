-- WordPress Prompt System — Prompt Library v2
-- Adds:
--   * Website contact + social + address fields (used by {{phone_number}}, {{email}}, {{social_links}})
--   * Product detail extras (long description, key features, SKU, manual URL)
--   * Prompt template: prompt_mode (section / full_page), compatible_website_types[], requires_products
-- Run after 0013_prompt_page_library.sql.

-- =========================================================
-- websites — contact + social + address
-- =========================================================
alter table public.websites
  add column if not exists phone_number text not null default '',
  add column if not exists email text not null default '',
  add column if not exists social_links text not null default '',
  add column if not exists business_address text not null default '';

-- =========================================================
-- website_products — extra detail fields
-- =========================================================
alter table public.website_products
  add column if not exists long_description text not null default '',
  add column if not exists key_features text not null default '',
  add column if not exists sku text not null default '',
  add column if not exists manual_url text not null default '';

-- =========================================================
-- prompt_templates — explicit Prompt Mode + website type compatibility + product requirements
-- =========================================================
alter table public.prompt_templates
  add column if not exists prompt_mode text not null default 'section'
    check (prompt_mode in ('section', 'full_page')),
  add column if not exists compatible_website_types text[] not null default '{}',
  add column if not exists requires_products integer not null default 0;

-- Backfill prompt_mode from prompt_type for existing rows where it's still the default.
update public.prompt_templates
set prompt_mode = case
  when prompt_type in ('full_page') then 'full_page'
  else 'section'
end
where prompt_mode = 'section' and prompt_type = 'full_page';
