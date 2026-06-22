import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
// Safe to use here as we're in a local workspace runner script that does not ship to client.
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const migrationSql = `
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

alter table public.ui_translations_cache enable row level security;

drop policy if exists ui_translations_cache_select_public on public.ui_translations_cache;
create policy "ui_translations_cache_select_public" on public.ui_translations_cache
  for select using (true);

drop policy if exists ui_translations_cache_admin_all on public.ui_translations_cache;
create policy "ui_translations_cache_admin_all" on public.ui_translations_cache
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());
`;

async function main() {
  console.log('Running translation cache table SQL migration...');
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
  if (error) {
    console.error('RPC Error executing migration:', error.message);
  } else {
    console.log('Migration execution result:', data);
  }
}

main().catch(console.error);
