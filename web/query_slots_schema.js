import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const tables = ['blog_upload_slots', 'plugin_update_slots', 'speed_optimization_slots', 'ebay_click_followup'];
  
  for (const table of tables) {
    console.log(`=== SCHEMA FOR ${table} ===`);
    const sql = `
      truncate table public.temp_debug_rls;
      do $$
      declare
        v_json text;
      begin
        select json_agg(t)::text into v_json
        from (
          select column_name, data_type 
          from information_schema.columns 
          where table_schema = 'public' and table_name = '${table}'
        ) t;
        insert into public.temp_debug_rls (user_name) values (v_json);
      end;
      $$;
    `;
    const { error } = await supabase.rpc('exec_sql', { sql });
    if (error) {
      console.error(`Error schema of ${table}:`, error);
      continue;
    }
    const { data } = await supabase.from('temp_debug_rls').select('user_name');
    if (data && data[0]) {
      console.table(JSON.parse(data[0].user_name));
    }
  }
}

main().catch(console.error);
