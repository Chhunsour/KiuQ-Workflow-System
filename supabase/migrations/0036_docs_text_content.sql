-- KiuQ Website System — Add text content to docs_files
-- Enables Docs Drive to store real editable text documents, not just links.

-- Add content column (nullable so existing link-type files are unaffected)
alter table public.docs_files
  add column if not exists content text not null default '';

-- Add updated_by to track who last edited
alter table public.docs_files
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

-- Allow 'text_doc' as a valid file type
alter table public.docs_files
  drop constraint if exists docs_files_type_check;

alter table public.docs_files
  add constraint docs_files_type_check check (
    type in ('google_doc','google_sheet','google_drive','pdf','image_folder','website_link','text_doc','other')
  );
