import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = env.match(/SUPABASE_SERVICE_KEY=(.*)/)?.[1]?.trim();

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const sql = fs.readFileSync('../supabase/migrations/0136_performance_team_member_profiles.sql', 'utf8');

async function main() {
  console.log('Running performance team member profiles SQL migration...');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('RPC Error executing migration:', error.message);
  } else {
    console.log('Migration execution result:', data);
  }
}

main().catch(console.error);
