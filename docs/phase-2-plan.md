# Phase 2 Plan — Supabase + Auth

## Goal
Replace the in-memory Pinia data with Supabase (Postgres + Auth + RLS).
Keep the existing UI exactly as-is — no redesign.

## What changes for the user
- A login/register page is now the entry point.
- Once logged in, the dashboard works the same as Phase 1 — but data is persisted.
- Admins see and edit everything. Team members only see what's assigned to them.

## Tech additions
- `@supabase/supabase-js` for client.
- `src/lib/supabase.ts` — singleton client created from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/stores/auth.ts` — Pinia store for the auth session + current profile.
- `src/pages/LoginPage.vue` and `src/pages/RegisterPage.vue`.
- `src/layouts/AuthLayout.vue` — centered card layout, no sidebar.
- Router guard (`router.beforeEach`) — anything outside `/login` and `/register` requires a session.
- Logout button in `Topbar.vue`.

## Data layer
- `src/stores/data.ts` keeps roughly the same shape, but every entity now has:
  - `xs: Ref<X[]>` — local cache.
  - `loading.x: boolean` — fetch in flight.
  - `errors.x: string | null` — last error.
  - `fetchXs()` — load from Supabase.
  - `upsertX(x)` — insert or update via Supabase, refreshes cache on success.
  - `removeX(id)` — delete via Supabase, refreshes cache on success.
- Pages call `fetchXs()` on mount. They show a loading message while fetching and an error message if the call fails.
- No more `id = newId('x')` — Postgres `gen_random_uuid()` provides ids; new rows let Supabase return the inserted row.

## Database
SQL migrations live in `supabase/migrations/`. Apply in order:
1. `0001_initial_schema.sql` — tables.
2. `0002_rls_policies.sql` — Row Level Security + `is_admin()` helper.
3. `0003_profile_trigger.sql` — auto-create a `profiles` row when an `auth.users` row is created.
4. `0004_seed.sql` — optional sample folders + a sample website. Skip in production.

### Tables
- `profiles` — extends `auth.users`. id, full_name, email, role (`admin|member`), status, notes.
- `websites`, `website_products` — website profiles + multi-product child rows.
- `folders` — prompt folders.
- `prompt_templates` — master prompt (locked rules, editable fields as jsonb, template body).
- `projects`, `project_members` — projects + many-to-many member assignment.
- `project_pages`, `section_tasks` — scaffolded for a future team-side flow (no UI yet in Phase 2).
- `prompt_assignments` — admin sends prompt to a member.
- `generated_prompts`, `submissions`, `review_comments` — scaffolded for the team-side workflow.
- `notes` — admin notes attached to project/website/prompt/team or none.

### RLS rules (summary)
- `is_admin()` helper checks `profiles.role = 'admin' AND status = 'active'`.
- Admin can do everything (`for all using (is_admin()) with check (is_admin())`).
- Members get scoped read access:
  - `prompt_templates`: read approved prompts only; no write.
  - `prompt_assignments`: read + update their own (`assigned_member_id = auth.uid()`).
  - `submissions`: read + write where `submitted_by = auth.uid()`.
  - `projects`: read where they're in `project_members`.
  - Catalog tables (`websites`, `website_products`, `folders`, `notes`): read for any authenticated user; write admin only.
  - `profiles`: read self + admin reads all; self can update own profile fields except role/status (enforced via app logic, not RLS).

## Auth flow
- **Sign up** (`/register`): collect `email`, `password`, `full_name`. Calls `supabase.auth.signUp`. The DB trigger `handle_new_user` inserts a matching `profiles` row with role `member`, status `active`.
- **First admin**: after the first sign-up, the workspace owner runs `update profiles set role='admin' where email='you@team.io';` once in the Supabase SQL editor.
- **Sign in** (`/login`): `signInWithPassword`, then `auth.init()` loads the profile.
- **Sign out**: `signOut`, redirect to `/login`.
- **Member onboarding**: admin asks the teammate to sign up at `/register`. Admin then sees the profile in `/members` and edits role/status/notes.

## Implementation order
1. Plan + setup doc (this file + `supabase-setup.md`).
2. SQL migrations.
3. Install client, env vars, `lib/supabase.ts`.
4. Auth store + login/register pages + auth layout + guards.
5. Refactor `data.ts` to async + Supabase.
6. Wire pages one at a time: Members → Websites → Folders → Notes → Projects → Prompt Library.
7. Verify build + login render.

## Out of scope for Phase 2
- AI API calls (explicitly excluded).
- Team-member-side fill UI for `prompt_assignments` (tables exist; UI is a future phase).
- File uploads / Supabase Storage.
- Real-time subscriptions (could be a 1-line add later).
- Server-side admin invite endpoints (admin uses the SQL editor or asks teammate to sign up).
