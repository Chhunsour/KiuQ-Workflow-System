-- WordPress Prompt System — folder detail item wiring
-- Run after 0009_resources.sql.

alter table public.notes
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

alter table public.docs
  add column if not exists folder_id uuid references public.folders(id) on delete set null;

create index if not exists notes_folder_idx on public.notes (folder_id);
create index if not exists docs_folder_idx on public.docs (folder_id);

-- Optional sample folder contents so a fresh workspace has something visible
-- after opening a folder detail page.
with target_folder as (
  select id from public.folders where name = 'Homepage Sections' order by created_at limit 1
)
insert into public.prompt_templates (
  title,
  category,
  folder_id,
  prompt_type,
  locked_rules,
  editable_fields,
  template_content,
  output_type,
  status,
  notes
)
select
  'Homepage hero section prompt',
  'Homepage',
  target_folder.id,
  'section',
  'Keep the layout clean, responsive, and aligned with the website brand.',
  '[{"id":"field_headline","key":"headline","label":"Headline","type":"text"},{"id":"field_offer","key":"offer","label":"Main offer","type":"textarea"}]'::jsonb,
  'Create a WordPress homepage hero section for {{headline}}. Include the offer: {{offer}}.',
  'html_css',
  'approved',
  'Sample prompt stored in a folder.'
from target_folder
where not exists (
  select 1 from public.prompt_templates where title = 'Homepage hero section prompt'
);

with target_folder as (
  select id from public.folders where name = 'SEO Prompts' order by created_at limit 1
)
insert into public.prompt_templates (
  title,
  category,
  folder_id,
  prompt_type,
  locked_rules,
  editable_fields,
  template_content,
  output_type,
  status,
  notes
)
select
  'SEO title and meta prompt',
  'SEO',
  target_folder.id,
  'seo',
  'Keep SEO fields clear, specific, and natural.',
  '[{"id":"field_page","key":"page_name","label":"Page name","type":"text"},{"id":"field_keyword","key":"primary_keyword","label":"Primary keyword","type":"text"}]'::jsonb,
  'Write an SEO title, meta description, and slug for {{page_name}} targeting {{primary_keyword}}.',
  'seo_fields',
  'approved',
  'Sample SEO prompt stored in a folder.'
from target_folder
where not exists (
  select 1 from public.prompt_templates where title = 'SEO title and meta prompt'
);

with target_folder as (
  select id from public.folders where name = 'Homepage Sections' order by created_at limit 1
)
insert into public.resources (
  title,
  type,
  description,
  folder_id,
  external_url,
  visibility,
  status
)
select
  'Homepage design reference link',
  'link',
  'A sample external reference link for homepage layout work.',
  target_folder.id,
  'https://wordpress.org/patterns/',
  'team',
  'published'
from target_folder
where not exists (
  select 1 from public.resources where title = 'Homepage design reference link'
);

with target_folder as (
  select id from public.folders where name = 'Homepage Sections' order by created_at limit 1
)
insert into public.resources (
  title,
  type,
  description,
  folder_id,
  text_content,
  visibility,
  status
)
select
  'Homepage section checklist',
  'document',
  'Simple checklist for section work before submission.',
  target_folder.id,
  'Check spacing, responsive layout, button styling, image quality, and final copy before submitting for review.',
  'team',
  'published'
from target_folder
where not exists (
  select 1 from public.resources where title = 'Homepage section checklist'
);

with target_folder as (
  select id from public.folders where name = 'Homepage Sections' order by created_at limit 1
)
insert into public.notes (
  title,
  related_type,
  related_id,
  folder_id,
  content
)
select
  'Homepage folder admin note',
  'team',
  null,
  target_folder.id,
  'Use this folder for homepage section prompts, references, and review notes.'
from target_folder
where not exists (
  select 1 from public.notes where title = 'Homepage folder admin note'
);

with target_folder as (
  select id from public.folders where name = 'Homepage Sections' order by created_at limit 1
)
insert into public.docs (
  title,
  category,
  content,
  folder_id,
  status
)
select
  'WordPress section workflow',
  'wordpress',
  'Open the assigned task, use the prompt, build the section in WordPress or Elementor, paste the output, then submit for admin review.',
  target_folder.id,
  'published'
from target_folder
where not exists (
  select 1 from public.docs where title = 'WordPress section workflow'
);
