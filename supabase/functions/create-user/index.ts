// Supabase Edge Function: create-user
// Creates a new auth user + profile row. Requires service role key (auto-injected).
// Called by admin-only UI via supabase.functions.invoke('create-user', { body: {...} })

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

interface CreateUserBody {
  email:     string;
  password:  string;
  fullName:  string;
  role:      string;
  username?: string;
  position?: string;
  phone?:    string;
  notes?:    string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: 'Method not allowed' }, 405);
  }

  // Verify caller is an authenticated admin
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE);

  const { data: { user: caller }, error: callerErr } = await admin.auth.getUser(authHeader.slice(7));
  if (callerErr || !caller) {
    return json({ ok: false, error: 'Unauthorized' }, 401);
  }

  // Check caller is admin
  const { data: callerProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single();
  if (callerProfile?.role !== 'admin') {
    return json({ ok: false, error: 'Forbidden: admin only' }, 403);
  }

  let body: CreateUserBody;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: 'Invalid JSON body' }, 400);
  }

  const { email, password, fullName, role, username, position, phone, notes } = body;
  if (!email || !password || !fullName) {
    return json({ ok: false, error: 'email, password, and fullName are required' }, 400);
  }

  // Create auth user
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });

  if (createErr) {
    const msg = createErr.message ?? String(createErr);
    const isDuplicate = msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exists');
    return json({ ok: false, error: isDuplicate ? 'email_exists' : msg }, 200);
  }

  const newUserId = created.user?.id;
  if (!newUserId) {
    return json({ ok: false, error: 'User created but no ID returned' }, 500);
  }

  // Upsert profile
  const { error: profileErr } = await admin.from('profiles').upsert({
    id:         newUserId,
    full_name:  fullName,
    email,
    role:       role || 'member',
    status:     'active',
    username:   username || null,
    position:   position || null,
    phone:      phone    || null,
    notes:      notes    || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  if (profileErr) {
    console.error('[create-user] profile upsert failed:', profileErr.message);
  }

  return json({ ok: true, userId: newUserId });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
