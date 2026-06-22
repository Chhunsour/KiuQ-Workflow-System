import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kaaekveaaoriacwzzrnf.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthYWVrdmVhYW9yaWFjd3p6cm5mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODIyMjkwMywiZXhwIjoyMDkzNzk4OTAzfQ.pohjpUr-R-EjrmEoWoqJXS8a7p1U839pc8Z0IolmS8s';

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function main() {
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error('Error listing users:', uErr);
    return;
  }
  const user = users.find(u => u.email === 'sreylin@kiuq.com');
  if (!user) {
    console.error('sreylin@kiuq.com not found in auth users!');
    return;
  }
  const { error } = await supabase.auth.admin.updateUserById(user.id, {
    password: 'password123',
    email_confirm: true
  });
  if (error) {
    console.error('Error updating password:', error);
  } else {
    console.log('Password for sreylin@kiuq.com reset to password123 successfully.');
  }
}

main().catch(console.error);
