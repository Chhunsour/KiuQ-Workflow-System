-- WordPress Prompt System — Optional sample data
-- Run only when bootstrapping a new workspace. Skip in production.
-- This seed does NOT insert profiles — sign up via the app instead.

insert into public.folders (name, description) values
  ('Homepage Sections', 'Heros, features, testimonials.'),
  ('Product Sections',  'PDP-related blocks.'),
  ('Category Pages',    'Listing/category templates.'),
  ('Full Page Prompts', 'Whole-page generators.'),
  ('SEO Prompts',       'Title tags, meta, schema.'),
  ('Blog Prompts',      'Articles and outlines.'),
  ('Fixing Prompts',    'Patches and refactors.'),
  ('Image Prompts',     'Image generation briefs.')
on conflict do nothing;

insert into public.websites (name, domain, website_type, primary_color, secondary_color, accent_color)
values
  ('Sample Website', 'example.com', 'Marketing Site', '#3f8dfe', '#0f172a', '#22c55e')
on conflict do nothing;
