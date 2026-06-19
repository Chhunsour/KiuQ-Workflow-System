-- Migration: 0114_team_images_storage_size_stats.sql
-- Description: Adds file_size_bytes, storage_path, width, and height columns to public.team_images.
--   Implements a URL decoding helper, a backfilling function matching metadata from storage.objects,
--   and a restricted statistics aggregation RPC function for dashboard usage.

begin;

-- 1. Alter table public.team_images to add storage tracking columns safely
alter table public.team_images
  add column if not exists file_size_bytes bigint default 0,
  add column if not exists file_type text,
  add column if not exists width integer,
  add column if not exists height integer,
  add column if not exists storage_path text;

-- 2. URL decoding helper in PostgreSQL
create or replace function public.urldecode(input text)
returns text
language plpgsql immutable strict as $$
declare
  pos integer := 1;
  hex text;
  res text := '';
  char text;
begin
  while pos <= length(input) loop
    char := substr(input, pos, 1);
    if char = '%' and pos + 2 <= length(input) then
      hex := substr(input, pos + 1, 2);
      res := res || chr(get_byte(decode(hex, 'hex'), 0));
      pos := pos + 3;
    else
      if char = '+' then
        res := res || ' ';
      else
        res := res || char;
      end if;
      pos := pos + 1;
    end if;
  end loop;
  return res;
end;
$$;

-- 3. Procedure to backfill storage_path and metadata sizes
create or replace function public.backfill_media_file_sizes()
returns void
language plpgsql
security definer
as $$
declare
  img_rec record;
  extracted_path text;
begin
  -- 3.1 Extract and update storage_path from URL where possible
  for img_rec in
    select id, url, storage_path from public.team_images
  loop
    -- Extract everything after /team-images/
    extracted_path := substring(img_rec.url from '/team-images/(.+)$');
    if extracted_path is not null then
      -- URL decode it
      extracted_path := public.urldecode(extracted_path);
      update public.team_images
      set storage_path = extracted_path
      where id = img_rec.id and (storage_path is null or storage_path = '');
    end if;
  end loop;

  -- 3.2 Sync sizes from existing file_size column to file_size_bytes if file_size_bytes is 0
  update public.team_images
  set file_size_bytes = file_size
  where file_size is not null and (file_size_bytes is null or file_size_bytes = 0);

  -- 3.3 Match images to storage.objects by storage_path or URL contents
  -- and update size, type, dimensions if they are missing
  update public.team_images ti
  set
    file_size_bytes = coalesce(nullif(ti.file_size_bytes, 0), nullif((o.metadata->>'size')::bigint, 0), 0),
    file_type = coalesce(ti.file_type, o.metadata->>'mimetype'),
    width = coalesce(ti.width, (o.metadata->>'width')::integer),
    height = coalesce(ti.height, (o.metadata->>'height')::integer),
    storage_path = coalesce(ti.storage_path, o.name)
  from storage.objects o
  where o.bucket_id = 'team-images'
    and (
      ti.storage_path = o.name
      or (ti.storage_path is null and ti.url like '%' || o.name)
    );
end;
$$;

-- 4. Execute the backfill logic immediately
select public.backfill_media_file_sizes();

-- 5. Expose get_media_library_stats() RPC function
create or replace function public.get_media_library_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  total_imgs bigint;
  total_flds bigint;
  total_bytes bigint;
  uncat_count bigint;
  unknown_size bigint;
begin
  -- Security checks
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_quality_checker() then
    raise exception 'Access denied';
  end if;

  select count(*), coalesce(sum(file_size_bytes), 0), count(*) filter (where file_size_bytes = 0)
  into total_imgs, total_bytes, unknown_size
  from public.team_images;

  select count(*)
  into total_flds
  from public.team_folders;

  select count(*)
  into uncat_count
  from public.team_images
  where folder_id is null;

  return jsonb_build_object(
    'total_images', total_imgs,
    'total_folders', total_flds,
    'total_storage_bytes', total_bytes,
    'uncategorized_count', uncat_count,
    'unknown_size_count', unknown_size
  );
end;
$$;

-- Revoke all permissions and grant execute to authenticated role
revoke all on function public.get_media_library_stats() from public;
grant execute on function public.get_media_library_stats() to authenticated;

commit;
