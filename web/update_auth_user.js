import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env', 'utf8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)?.[1]?.trim();
const serviceKey = env.match(/SUPABASE_SERVICE_KEY=(.*)/)?.[1]?.trim();

console.log('Supabase URL:', url);
if (!serviceKey) {
  console.error('Service role key not found in env!');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function run() {
  // 1. List users from auth.users (requires service key)
  console.log('Fetching users from auth...');
  const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
  if (uErr) {
    console.error('Error fetching users:', uErr);
    return;
  }
  
  console.log('Auth Users:');
  users.forEach(u => console.log(`- Email: ${u.email}, ID: ${u.id}`));

  const targetEmail = 'sour@kiuq.com';
  const user = users.find(u => u.email === targetEmail);
  if (!user) {
    console.log(`User ${targetEmail} not found! Creating...`);
    const { data: newUser, error: cErr } = await supabase.auth.admin.createUser({
      email: targetEmail,
      password: 'password123',
      email_confirm: true,
      user_metadata: { full_name: 'Sour Admin' }
    });
    if (cErr) {
      console.error('Error creating user:', cErr);
      return;
    }
    console.log('Created user:', newUser.user.email, newUser.user.id);
  } else {
    console.log(`Resetting password for ${targetEmail}...`);
    const { error: resetErr } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'password123',
      email_confirm: true
    });
    if (resetErr) {
      console.error('Error updating user:', resetErr);
      return;
    }
    console.log('Password reset successfully to password123!');
  }

  // 2. Set profile role to admin
  console.log('Setting public.profiles role...');
  const { data: targetUser } = await supabase.auth.admin.listUsers();
  const foundUser = targetUser.users.find(u => u.email === targetEmail);
  if (foundUser) {
    const { data: profile, error: pErr } = await supabase
      .from('profiles')
      .update({ role: 'admin', status: 'active' })
      .eq('id', foundUser.id)
      .select();
    
    if (pErr) {
      console.error('Error updating profile:', pErr);
    } else {
      console.log('Profile updated:', profile);
    }
  }
}

run();
