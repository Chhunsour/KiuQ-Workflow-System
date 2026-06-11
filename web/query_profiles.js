import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)?.[1]?.trim();

console.log('Supabase URL:', url);

const supabase = createClient(url, key);

async function run() {
  const { data: profiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) {
    console.error(pErr);
    return;
  }
  console.log('Profiles found:');
  profiles.forEach(p => console.log(`- ID: ${p.id}, FullName: ${p.full_name}, Email: ${p.email}, Status: ${p.status}, Role: ${p.role}`));
}

run();
