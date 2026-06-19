-- Migration: 0119_image_ordering.sql
-- Description: Adds is_feature_image, sort_order, and updated_at to public.team_images.
--              Implements a unique index to restrict to at most one feature image per folder.
--              Exposes a security definer function to save folder image arrangements securely.

begin;

-- 1. Alter public.team_images to add ordering and feature image fields safely
alter table public.team_images
  add column if not exists is_feature_image boolean default false not null,
  add column if not exists sort_order integer default 9999 not null,
  add column if not exists updated_at timestamptz default now() not null;

-- 2. Create unique index to guarantee at most one feature image is active per folder
create unique index if not exists team_images_one_feature_per_folder_uidx 
  on public.team_images (folder_id) 
  where (is_feature_image = true);

-- 3. Create index for folder image query sorting optimization
create index if not exists team_images_folder_id_sort_order_idx
  on public.team_images (folder_id, sort_order);

-- 4. Expose security definer RPC save_folder_image_order()
create or replace function public.save_folder_image_order(
  p_folder_id uuid,
  p_feature_image_id uuid,
  p_ordered_image_ids uuid[]
)
returns table (
  id uuid,
  url text,
  name text,
  folder_id uuid,
  uploaded_by uuid,
  created_at timestamptz,
  is_feature_image boolean,
  sort_order integer,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_actor uuid := auth.uid();
  v_img_id uuid;
  v_idx integer;
begin
  -- 4.1 Authentication Check
  if v_actor is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  -- 4.2 Access Control: Quality Checkers are blocked
  if public.is_quality_checker() then
    raise exception 'Access denied for Quality Checkers.' using errcode = '42501';
  end if;

  -- 4.3 Access Control: Check if user is a manager or folder creator
  if not (
    public.is_admin() or
    public.is_assistant_head() or
    exists (
      select 1 from public.team_folders 
      where team_folders.id = p_folder_id and created_by = v_actor
    )
  ) then
    raise exception 'Permission denied to organize images in this folder.' using errcode = '42501';
  end if;

  -- 4.4 Validation: Verify all ordered images belong to this folder
  if exists (
    select 1 
    from unnest(p_ordered_image_ids) as oid
    left join public.team_images ti on ti.id = oid
    where ti.id is null or ti.folder_id <> p_folder_id
  ) then
    raise exception 'One or more images do not belong to this folder.' using errcode = '22000';
  end if;

  -- 4.5 Validation: Verify selected feature image belongs to this folder
  if p_feature_image_id is not null then
    if not exists (
      select 1 from public.team_images
      where team_images.id = p_feature_image_id and team_images.folder_id = p_folder_id
    ) then
      raise exception 'Selected feature image does not belong to this folder.' using errcode = '22000';
    end if;
  end if;

  -- 4.6 Reset feature flags for this folder
  update public.team_images
  set is_feature_image = false,
      updated_at = now()
  where team_images.folder_id = p_folder_id;

  -- 4.7 Set selected feature image
  if p_feature_image_id is not null then
    update public.team_images
    set is_feature_image = true,
        updated_at = now()
    where team_images.id = p_feature_image_id;
  end if;

  -- 4.8 Reset sort order for all folder images to default high value
  update public.team_images
  set sort_order = 9999,
      updated_at = now()
  where team_images.folder_id = p_folder_id;

  -- 4.9 Apply new sort order sequence
  if p_ordered_image_ids is not null then
    for v_idx in 1 .. array_length(p_ordered_image_ids, 1) loop
      v_img_id := p_ordered_image_ids[v_idx];
      update public.team_images
      set sort_order = v_idx,
          updated_at = now()
      where team_images.id = v_img_id;
    end loop;
  end if;

  -- 4.10 Return updated folder images list
  return query
  select 
    ti.id,
    ti.url,
    ti.name,
    ti.folder_id,
    ti.uploaded_by,
    ti.created_at,
    ti.is_feature_image,
    ti.sort_order,
    ti.updated_at
  from public.team_images ti
  where ti.folder_id = p_folder_id
  order by 
    ti.is_feature_image desc,
    (case when ti.is_feature_image then 0 when ti.sort_order = 9999 or ti.sort_order is null then 999999 else ti.sort_order end) asc,
    ti.created_at desc;
end;
$$;

-- 5. Set executing role permissions
revoke all on function public.save_folder_image_order(uuid, uuid, uuid[]) from public;
grant execute on function public.save_folder_image_order(uuid, uuid, uuid[]) to authenticated;

commit;
