import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('--- Checking Website Assignments by Method ---');
  
  const setupSql = `
    truncate table public.temp_debug_rls;
    
    do $$
    declare
      v_json text;
    begin
      select json_agg(t)::text into v_json
      from (
        select 
          p.id,
          p.full_name,
          p.role,
          (select count(distinct w.id) from public.websites w where w.created_by = p.id) as by_created_by,
          (
            select count(distinct w.id) 
            from public.websites w
            join public.projects pr on pr.website_id = w.id
            join public.project_members pm on pm.project_id = pr.id
            where pm.member_id = p.id
          ) as by_project_members,
          (
            select count(distinct w.id)
            from public.websites w
            join public.prompt_assignments pa on pa.website_id = w.id
            where pa.assigned_member_id = p.id
          ) as by_prompt_assignments
        from public.profiles p
        where p.status = 'active'
        order by p.full_name
      ) t;
      
      insert into public.temp_debug_rls (user_name) values (v_json);
    end;
    $$;
  `;
  
  const { data: setupRes, error: setupError } = await supabase.rpc('exec_sql', { sql: setupSql });
  if (setupError) {
    console.error('Setup error:', setupError);
    return;
  }
  
  const { data: rows } = await supabase.from('temp_debug_rls').select('user_name');
  const rawJson = rows && rows[0] ? rows[0].user_name : null;
  if (rawJson) {
    console.table(JSON.parse(rawJson));
  } else {
    console.log('No results.');
  }
}

main().catch(console.error);
