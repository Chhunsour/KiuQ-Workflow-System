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
  { name: 'Sour (admin)', id: 'b3835dd4-1380-4643-a890-360388f20bea' }
];

async function testUserRLS(user) {
  console.log(`\n================ Testing as ${user.name} (ID: ${user.id}) ================`);
  
  // We will run a query using an RPC that executes dynamic SQL under set local claims.
  // Wait, we can create a temporary function or use an existing one to execute raw sql with set local claims.
  // Let's define a query function using a temporary SQL block or RPC if we define one.
  // Let's define a SQL function to execute our tests for a given user ID.
  const sql = `
    do $$
    declare
      v_user_id uuid := '${user.id}'::uuid;
      v_websites_count integer;
      v_gsc_conn_count integer;
      v_gsc_daily_count integer;
      v_profiles_count integer;
      v_member_rpc_count integer;
    begin
      -- Set transaction-local claims
      perform set_config('request.jwt.claim.sub', v_user_id::text, true);
      perform set_config('role', 'authenticated', true);

      -- Query websites
      select count(*) into v_websites_count from public.websites;
      
      -- Query website_gsc_connections
      select count(*) into v_gsc_conn_count from public.website_gsc_connections;

      -- Query website_gsc_daily_stats
      select count(*) into v_gsc_daily_count from public.website_gsc_daily_stats;

      -- Query profiles directly (should be restricted by profiles_read_self_or_admin)
      select count(*) into v_profiles_count from public.profiles;

      -- Query get_team_member_filter_profiles rpc
      select count(*) into v_member_rpc_count from public.get_team_member_filter_profiles();

      raise notice 'Websites count: %, GSC connections count: %, GSC daily stats: %, Direct profiles count: %, RPC member profiles count: %',
        v_websites_count, v_gsc_conn_count, v_gsc_daily_count, v_profiles_count, v_member_rpc_count;
    exception when others then
      raise notice 'Error: %', sqlerrm;
    end;
    $$;
  `;

  // We can execute this raw SQL by calling a simple function or creating one first.
  // Since we have service role, let's create a helper function that executes SQL if not exists,
  // or we can run a query directly if we create a temporary function.
  // Let's create a temporary function or run it.
}

async function run() {
  // Let's create the helper function to run arbitrary anonymous blocks and capture their notices.
  // Wait, we can just execute raw sql via standard postgres query. Let's see if we can do that.
  // Since supabase client doesn't have a raw sql query method exposed, we can write a function
  // "exec_sql(query text)" that we define in the database.
  
  console.log('Creating exec_sql helper function...');
  const { error: helperError } = await supabase.rpc('exec_sql', { sql: 'select 1;' }).catch(async () => {
    // If it doesn't exist, we create it.
    // Wait, let's execute SQL using a PostgreSQL migration or script.
    // Actually, we can run pg sql via an edge function or we can just define a function in db.
    return { error: { message: 'not found' } };
  });

  // Let's check if we can define exec_sql helper via a quick migration or command.
  // We can use supabase CLI or a local script! Let's check if we can write a script that runs sql via supabase command line.
  // Wait, we can run "supabase db execute" or "psql" if we have it? Let's check.
}

run().catch(console.error);
