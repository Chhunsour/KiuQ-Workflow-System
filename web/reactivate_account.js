import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  console.log('Searching for profile with email "sour@kiuq.com"...');
  
  // 1. Find the user profile
  const { data: profiles, error: findError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, status')
    .eq('email', 'sour@kiuq.com');

  if (findError) {
    throw findError;
  }

  if (!profiles || profiles.length === 0) {
    console.log('Profile "sour@kiuq.com" not found. Fetching all deactivated/inactive profiles to search manually...');
    const { data: allProfiles, error: fetchAllError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status')
      .neq('status', 'active');
      
    if (fetchAllError) {
      throw fetchAllError;
    }
    
    console.log('Deactivated/Inactive profiles:', allProfiles);
    return;
  }

  const profile = profiles[0];
  console.log(`Found profile:`, profile);

  if (profile.status === 'active') {
    console.log('Profile is already active!');
    return;
  }

  console.log('Reactivating profile...');
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('id', profile.id)
    .select();

  if (updateError) {
    console.error('Error reactivating profile:', updateError);
  } else {
    console.log('✓ Profile successfully reactivated!', updated);
  }
}

main().catch(console.error);
