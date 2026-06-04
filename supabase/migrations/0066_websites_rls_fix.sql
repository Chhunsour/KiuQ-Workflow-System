-- Fix websites table RLS policies so normal users can insert and update their own websites
-- without getting RLS violations. Ensure all policies safely use public.profiles.

alter table public.websites enable row level security;

-- Drop all potentially conflicting existing policies on websites
drop policy if exists "websites_read_authenticated" on public.websites;
drop policy if exists "websites_admin_write" on public.websites;
drop policy if exists "websites_read_all_authenticated" on public.websites;
drop policy if exists "websites_authenticated_insert" on public.websites;
drop policy if exists "websites_authenticated_write" on public.websites;
drop policy if exists "websites_select_policy" on public.websites;
drop policy if exists "websites_insert_policy" on public.websites;
drop policy if exists "websites_update_policy" on public.websites;
drop policy if exists "websites_delete_policy" on public.websites;
drop policy if exists "websites_member_read_assigned" on public.websites;

-- 1. Select: Users can read websites they created. 
-- Head/Supervisor/Assistant Head/Team Member/Admin/Owner can read all websites (team transparency).
-- Quality Checkers should not see all websites unless assigned or allowed, so we explicitly list roles.
create policy "websites_select_policy"
on public.websites
for select
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles m
    where m.id = auth.uid()
    and m.role in ('admin', 'owner', 'head', 'supervisor', 'assistant_head', 'team_member', 'member')
  )
);

-- 2. Insert: Users can insert websites where created_by = auth.uid().
-- Head/Supervisor/Admin can insert any website.
create policy "websites_insert_policy"
on public.websites
for insert
to authenticated
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles m
    where m.id = auth.uid()
    and m.role in ('admin', 'owner', 'head', 'supervisor')
  )
);

-- 3. Update: Users can update their own websites.
-- Head/Supervisor/Assistant Head/Admin/Owner can update all websites.
create policy "websites_update_policy"
on public.websites
for update
to authenticated
using (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles m
    where m.id = auth.uid()
    and m.role in ('admin', 'owner', 'head', 'supervisor', 'assistant_head')
  )
)
with check (
  created_by = auth.uid()
  or exists (
    select 1
    from public.profiles m
    where m.id = auth.uid()
    and m.role in ('admin', 'owner', 'head', 'supervisor', 'assistant_head')
  )
);

-- 4. Delete: Head/Supervisor/Admin/Owner only.
create policy "websites_delete_policy"
on public.websites
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles m
    where m.id = auth.uid()
    and m.role in ('admin', 'owner', 'head', 'supervisor')
  )
);
