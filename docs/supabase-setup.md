# Supabase Setup

This is a one-time setup for the workspace owner. It takes ~10 minutes.

## 1. Create the Supabase project
1. Go to [supabase.com](https://supabase.com) and sign in.
2. **New project** → pick a name (e.g. `wordpress-prompt-system`), pick a region close to your team, set a database password (save it in your password manager).
3. Wait for the project to provision.

## 2. Run the SQL migrations
The migrations live in `supabase/migrations/` at the project root.

In the Supabase dashboard:
1. **SQL Editor** → **New query**.
2. Open `supabase/migrations/0001_initial_schema.sql`, paste the contents, click **Run**.
3. Repeat for `0002_rls_policies.sql`.
4. Repeat for `0003_profile_trigger.sql`.
5. (Optional) Repeat for `0004_seed.sql` to insert a few sample folders + a sample website.

You should now have these tables under **Table Editor**:
`profiles`, `websites`, `website_products`, `folders`, `prompt_templates`, `projects`, `project_members`, `project_pages`, `section_tasks`, `prompt_assignments`, `generated_prompts`, `submissions`, `review_comments`, `notes`.

## 3. Set environment variables in the web app
Copy `web/.env.example` to `web/.env`:

```bash
cd "Documents/Wordpress prompt System/web"
cp .env.example .env
```

Open `web/.env` and fill in:
```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY
```

You can find both values in **Project Settings → API**:
- **Project URL** → `VITE_SUPABASE_URL`
- **anon / public key** → `VITE_SUPABASE_ANON_KEY` (do **not** use the service_role key)

Restart the dev server after editing `.env`.

## 4. Create the first admin user
The first user has to bootstrap themselves into the admin role.

1. Run the dev server: `npm run dev`
2. Open http://localhost:5174 — you'll be redirected to `/login`.
3. Click **Create an account**, fill in your full name, email, password.
4. After you sign up, the `handle_new_user` trigger creates a matching `profiles` row with role `member`.
5. In the Supabase dashboard → **SQL Editor** → run:

```sql
update public.profiles
set role = 'admin', status = 'active'
where email = 'you@team.io';
```

Replace `you@team.io` with the email you signed up with.

6. Back in the app, sign out and sign in again — you now have full admin access.

## 5. Add team members
Two options:

**Option A — they self-register:**
1. Share `/register` with your teammate.
2. They fill in name + email + password.
3. They show up in your `Members` page automatically (role `member`, status `active`).
4. You can edit their role / status / notes from `Members`.

**Option B — admin creates auth user via SQL editor:**
Use Supabase Dashboard → **Authentication → Users → Add user**, then send them a password reset link. The trigger creates their profile.

## 6. Test login
1. Sign in with your admin account → you should land on `/` (Dashboard).
2. Try navigating Members, Projects, Folders, Websites, Notes, Prompt Library, New Website, Settings — all should load real data.
3. Sign out via the user menu in the top bar → you should be returned to `/login`.
4. Try opening any URL like `/projects` while signed out → you should be redirected to `/login`.

## Troubleshooting

**"Missing Supabase env vars" message in the console**
Your `.env` isn't being read. Make sure the file is at `web/.env` (not the project root) and that variable names start with `VITE_`. Restart the dev server.

**Login succeeds but pages show "Permission denied for table …"**
The RLS policies didn't run, or the user's profile is missing/inactive. Re-run `0002_rls_policies.sql` and verify your row in `profiles` has `status = 'active'`.

**New sign-ups don't show up in `Members`**
The trigger from `0003_profile_trigger.sql` didn't run. Re-run it. Existing auth users you created before the trigger ran can be backfilled with:

```sql
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;
```

**I locked myself out of admin**
Run the SQL from step 4 again with your email — it's idempotent.
