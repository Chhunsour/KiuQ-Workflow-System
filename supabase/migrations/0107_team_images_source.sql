-- Migration: 0107_team_images_source.sql
-- Description: Add provenance/metadata columns to team_images so we can record
--   how an image entered the library (e.g. pasted from the clipboard) plus
--   basic file metadata. Used by the Image Dashboard paste-to-upload feature.
-- Idempotent: safe to re-run.

begin;

alter table public.team_images
  add column if not exists source     text not null default 'upload',
  add column if not exists file_type  text,
  add column if not exists file_size  bigint;

comment on column public.team_images.source is
  'How the image was added: upload | pasted_clipboard | drag_drop';

commit;

-- ✅ Verify:
--   select name, source, file_type, file_size from public.team_images order by created_at desc limit 5;
