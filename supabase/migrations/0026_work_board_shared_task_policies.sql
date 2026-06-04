-- Work Board shared tasks store collaborator member ids in prompt_assignments.filled_values.
-- This lets a selected collaborator read and update the shared card row on their own board.

create or replace function public.prompt_assignment_has_collaborator(
  p_filled_values jsonb,
  p_user_id uuid
)
returns boolean
language plpgsql
stable
as $$
declare
  raw_collaborators text;
begin
  if p_user_id is null then
    return false;
  end if;

  raw_collaborators := coalesce(p_filled_values ->> '__board_collaborators', '[]');
  return raw_collaborators::jsonb ? p_user_id::text;
exception
  when others then
    return false;
end;
$$;

drop policy if exists "prompt_assignments_member_read" on public.prompt_assignments;
drop policy if exists "prompt_assignments_member_update" on public.prompt_assignments;

create policy "prompt_assignments_member_read" on public.prompt_assignments
  for select to authenticated
  using (
    assigned_member_id = auth.uid()
    or public.prompt_assignment_has_collaborator(filled_values, auth.uid())
  );

create policy "prompt_assignments_member_update" on public.prompt_assignments
  for update to authenticated
  using (
    assigned_member_id = auth.uid()
    or public.prompt_assignment_has_collaborator(filled_values, auth.uid())
  )
  with check (
    assigned_member_id = auth.uid()
    or public.prompt_assignment_has_collaborator(filled_values, auth.uid())
  );
