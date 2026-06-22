-- Migration: 0135_ui_translations_cache.sql
-- Description: Create ui_translations_cache table for caching translated UI text

begin;

create table if not exists public.ui_translations_cache (
  id uuid primary key default gen_random_uuid(),
  source_locale text not null default 'en',
  target_locale text not null default 'km',
  source_text text not null,
  translated_text text not null,
  translation_key text null,
  context text null,
  provider text null,
  is_auto_generated boolean not null default true,
  is_reviewed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ui_translations_cache_target_locale_source_text_key unique (target_locale, source_text)
);

-- Enable RLS
alter table public.ui_translations_cache enable row level security;

-- Policies
drop policy if exists "ui_translations_cache_select_public" on public.ui_translations_cache;
create policy "ui_translations_cache_select_public" on public.ui_translations_cache
  for select using (true);

drop policy if exists "ui_translations_cache_admin_all" on public.ui_translations_cache;
create policy "ui_translations_cache_admin_all" on public.ui_translations_cache
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

commit;
