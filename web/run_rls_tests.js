import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const testUsers = [
  { name: 'Samnang (assistant_head)', id: '1d463b79-438f-4f2b-9e88-acd42a324c27' },
  { name: 'Somalika (supervisor)', id: 'bdf36094-514a-461b-8c4e-118fc6ef352a' },
  { name: 'Sor (member)', id: 'de556b47-6ca2-4153-8215-f47795f6015e' },
  { name: 'Lin (member)', id: '54573488-96b8-4e00-9100-ed841ec46a43' },
  { name: 'Sokheang (member)', id: '27730350-2fb3-4214-8b9a-b2e864ee244d' },
  { name: 'BIG CHUNGUS (team_member)', id: '944ca229-744a-43a6-8b27-7f7bfef3c618' },
  { name: 'Dara (team_member)', id: '453571dd-318a-46a5-886f-51c610a48ddf' },
  { name: 'Sour (admin)', id: 'b3835dd4-1380-4643-a890-360388f20bea' }
];

async function testUser(user) {
  const sql = `
    truncate table public.temp_debug_rls;
    do $$
    declare
      v_user_id uuid := '${user.id}'::uuid;
      v_websites_count integer;
      v_gsc_conn_count integer;
      v_gsc_daily_count integer;
      v_profiles_count integer;
      v_member_rpc_count integer;
      v_res_json text;
    begin
      -- Set transaction-local claims
      perform set_config('request.jwt.claim.sub', v_user_id::text, true);

      -- Query websites
      select count(*) into v_websites_count from public.websites;
      
      -- Query website_gsc_connections
      select count(*) into v_gsc_conn_count from public.website_gsc_connections;

      -- Query website_gsc_daily_stats
      select count(*) into v_gsc_daily_count from public.website_gsc_daily_stats;

      -- Query profiles directly
      select count(*) into v_profiles_count from public.profiles;

      -- Query get_team_member_filter_profiles rpc
      select count(*) into v_member_rpc_count from public.get_team_member_filter_profiles();

      v_res_json := json_build_object(
        'user', '${user.name}',
        'websites', v_websites_count,
        'gsc_connections', v_gsc_conn_count,
        'gsc_daily_stats', v_gsc_daily_count,
        'profiles_direct', v_profiles_count,
        'rpc_profiles', v_member_rpc_count
      )::text;

      insert into public.temp_debug_rls (user_name) values (v_res_json);
    exception when others then
      v_res_json := json_build_object(
        'user', '${user.name}',
        'error', sqlerrm
      )::text;
      insert into public.temp_debug_rls (user_name) values (v_res_json);
    end;
    $$;
  `;

  const { error: runError } = await supabase.rpc('exec_sql', { sql });
  if (runError) {
    console.error(`SQL Run Error for ${user.name}:`, runError);
    return null;
  }

  const { data } = await supabase.from('temp_debug_rls').select('user_name');
  return data && data[0] ? JSON.parse(data[0].user_name) : null;
}

async function main() {
  const results = [];
  for (const user of testUsers) {
    const res = await testUser(user);
    if (res) results.push(res);
  }
  console.table(results);
}

main().catch(console.error);
