import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('--- Checking Active RLS Policies on GSC stats and connections tables ---');
  
  const sql = `
    truncate table public.temp_debug_rls;
    do $$
    declare
      v_json text;
    begin
      select json_agg(t)::text into v_json
      from (
        select schemaname, tablename, policyname, roles, cmd, qual
        from pg_policies
        where schemaname = 'public' and tablename in (
          'website_gsc_connections', 
          'website_gsc_daily_stats', 
          'website_gsc_hourly_stats', 
          'website_gsc_query_stats', 
          'website_gsc_page_stats', 
          'website_gsc_sync_logs',
          'website_indexing_urls',
          'website_indexing_status'
        )
      ) t;
      insert into public.temp_debug_rls (user_name) values (v_json);
    end;
    $$;
  `;
  
  const { data: setupRes, error: setupError } = await supabase.rpc('exec_sql', { sql });
  if (setupError) {
    console.error('Setup error:', setupError);
    return;
  }
  
  const { data: rows } = await supabase.from('temp_debug_rls').select('user_name');
  const rawJson = rows && rows[0] ? rows[0].user_name : null;
  if (rawJson) {
    console.table(JSON.parse(rawJson));
  } else {
    console.log('No policies found.');
  }
}

main().catch(console.error);
