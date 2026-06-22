import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

const correctMappings = [
  { website_id: 'ca6ee8a2-6550-462a-a054-4c830c5a7af8', gsc_property_url: 'sc-domain:darilaofficial.com' },
  { website_id: 'b8dd49a3-df14-4c10-9a26-4b76590c3b5a', gsc_property_url: 'https://machinery.org/' },
  { website_id: '50a5cff7-dc53-432c-8e96-aaeecfc01c6b', gsc_property_url: 'https://machineryusa.online/' },
  { website_id: '4dd8b807-1157-4f1e-9f1e-375e3837b633', gsc_property_url: 'https://newdiggerforsale.com/' },
  { website_id: '097e4b13-3165-42b7-ac78-e3e584bdaf58', gsc_property_url: 'https://typhonnow.com/' },
  { website_id: 'a39919a0-c7d9-41b6-ac77-66ccee26d83e', gsc_property_url: 'https://unitedstatesofexcavators.com/' }
];

async function main() {
  console.log('--- Applying correct GSC property mappings ---');
  for (const m of correctMappings) {
    const { data, error } = await supabase
      .from('website_gsc_connections')
      .upsert({
        website_id: m.website_id,
        gsc_property_url: m.gsc_property_url,
        connected_by: 'b3835dd4-1380-4643-a890-360388f20bea', // user ID
        sync_status: 'idle',
        sync_error: null
      }, { onConflict: 'website_id' });
      
    if (error) {
      console.error(`Failed to map website ${m.website_id} to ${m.gsc_property_url}:`, error.message);
    } else {
      console.log(`Successfully mapped website ${m.website_id} to ${m.gsc_property_url}`);
    }
  }
}

main().catch(console.error);
