-- Allow members to read ALL assignments for the Member Board transparency view.
-- Members can see other members' tasks but cannot edit, move, or delete them.
-- The frontend enforces readOnly for non-owners; RLS enforces read-only at DB level
-- by keeping the update policy unchanged (assigned_member_id = auth.uid() only).

drop policy if exists "prompt_assignments_member_read" on public.prompt_assignments;

create policy "prompt_assignments_member_read" on public.prompt_assignments
  for select to authenticated
  using (true);
