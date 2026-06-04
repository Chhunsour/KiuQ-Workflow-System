-- KiuQ Website System — Admin hard-delete user
-- Server-side function so the service role key is never exposed to the frontend.
-- Deleting from auth.users cascades to profiles (on delete cascade),
-- which in turn cascades or nullifies every FK that references profiles.

create or replace function public.admin_delete_user(p_user_id uuid)
returns void
language plpgsql
security definer          -- runs with DB-owner privileges
set search_path = public  -- avoid search-path injection
as $$
begin
  -- 1. Verify caller is an admin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) then
    raise exception 'Only admins can delete users.';
  end if;

  -- 2. Prevent self-deletion
  if p_user_id = auth.uid() then
    raise exception 'You cannot delete your own account.';
  end if;

  -- 3. Verify target user exists
  if not exists (
    select 1 from public.profiles where id = p_user_id
  ) then
    raise exception 'User not found.';
  end if;

  -- 4. Delete from auth.users — cascades to:
  --    profiles            (cascade)
  --    project_members     (cascade)
  --    prompt_assignments  (cascade → submissions → review_comments)
  --    prompt_replacements (cascade)
  --    docs_assignments    (cascade)
  --    monthly_reports     (cascade)
  --    blockers            (cascade)
  --    activity_logs       (cascade)
  --    leaderboard_scores  (cascade)
  --    leaderboard_events  (cascade)
  --    leaderboard_streaks (cascade)
  --    section_tasks.assigned_member_id  → set null
  --    submissions.submitted_by          → set null
  --    review_comments.reviewer_id       → set null
  --    resources.created_by              → set null
  --    docs_folders.created_by           → set null
  --    docs_files.created_by             → set null
  --    team_docs.created_by              → set null
  --    prompt_templates.created_by       → set null
  --    prompt_replacements.replaced_by   → set null
  delete from auth.users where id = p_user_id;
end;
$$;
