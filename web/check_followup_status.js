import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('=== COUNTING TABLES ===');
  
  const { data: blog, error: bErr } = await supabase.from('blog_upload_slots').select('*');
  const { data: plugin, error: pErr } = await supabase.from('plugin_update_slots').select('*');
  const { data: speed, error: sErr } = await supabase.from('speed_optimization_slots').select('*');
  const { data: ebay, error: eErr } = await supabase.from('ebay_click_followup').select('*');

  if (bErr) console.error('Blog slots error:', bErr);
  else console.log(`blog_upload_slots count: ${blog?.length}`);

  if (pErr) console.error('Plugin slots error:', pErr);
  else console.log(`plugin_update_slots count: ${plugin?.length}`);

  if (sErr) console.error('Speed slots error:', sErr);
  else console.log(`speed_optimization_slots count: ${speed?.length}`);

  if (eErr) console.error('eBay entries error:', eErr);
  else console.log(`ebay_click_followup count: ${ebay?.length}`);

  // Print slots with website_id that might not exist in the websites table
  if (blog && blog.length > 0) {
    const { data: websites } = await supabase.from('websites').select('id');
    const websiteIds = new Set(websites.map(w => w.id));
    const missing = blog.filter(b => !websiteIds.has(b.website_id));
    console.log(`Blog slots with missing website relation: ${missing.length}`);
    if (missing.length > 0) {
      console.log('Sample missing relation blog slots (first 5):', missing.slice(0, 5));
    }
  }
}

main().catch(console.error);
