-- Migration 0077: Fix user deletion by pre-cleaning references to quality_issues, websites, and website_products.

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

  -- Pre-clean references to avoid restrict/foreign key violations
  
  -- A. Nullify created_by on websites and website_products
  update public.websites
  set created_by = null
  where created_by = p_user_id;

  update public.website_products
  set created_by = null
  where created_by = p_user_id;

  -- B. Delete quality issues created by the user (which will cascade delete comments)
  delete from public.quality_issues
  where created_by = p_user_id;

  -- 4. Delete from auth.users — cascades to profiles, prompt_assignments, etc.
  delete from auth.users where id = p_user_id;
end;
$$;
