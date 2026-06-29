import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const sitesToRegister = [
  {
    name: 'Konstructz Store',
    domain: 'konstructz.com',
    sync_endpoint: 'https://konstructz.com/api/receiver.php',
    platform: 'konstructz-framework',
    active: true
  },
  {
    name: 'Bobo Machinery',
    domain: 'bobo.machinery.org',
    sync_endpoint: 'https://bobo.machinery.org/api/receiver.php',
    platform: 'konstructz-framework',
    active: true
  }
];

async function main() {
  console.log('Fetching existing connected websites...');
  const { data: existing, error: fetchError } = await supabase
    .from('connected_websites')
    .select('id, name, domain, secret_token, sync_endpoint');

  if (fetchError) {
    throw fetchError;
  }

  for (const site of sitesToRegister) {
    const found = existing.find(e => e.domain === site.domain);
    if (found) {
      console.log(`\nWebsite already registered: "${site.name}"`);
      console.log(`- Domain: ${found.domain}`);
      console.log(`- Endpoint: ${found.sync_endpoint}`);
      console.log(`- Secret Token: ${found.secret_token}`);
    } else {
      console.log(`\nRegistering new website: "${site.name}"...`);
      const { data: inserted, error: insertError } = await supabase
        .from('connected_websites')
        .insert(site)
        .select('id, name, domain, secret_token, sync_endpoint')
        .single();

      if (insertError) {
        console.error(`Error inserting ${site.name}:`, insertError);
      } else {
        console.log(`✓ Successfully registered!`);
        console.log(`- Domain: ${inserted.domain}`);
        console.log(`- Endpoint: ${inserted.sync_endpoint}`);
        console.log(`- Secret Token: ${inserted.secret_token}`);
      }
    }
  }
}

main().catch(console.error);
