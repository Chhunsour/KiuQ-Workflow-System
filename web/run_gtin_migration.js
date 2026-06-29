import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const migrationSql = `
alter table public.team_folders
  add column if not exists gtin text null;

create index if not exists team_folders_gtin_idx
  on public.team_folders (gtin)
  where gtin is not null;
`;

async function main() {
  console.log('Running gtin table SQL migration (no transactions)...');
  const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSql });
  if (error) {
    console.error('RPC Error executing migration:', error.message);
  } else {
    console.log('Migration execution result:', data);
  }
}

main().catch(console.error);
