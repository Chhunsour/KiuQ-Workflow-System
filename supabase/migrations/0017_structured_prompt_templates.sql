-- WordPress Prompt System - structured Prompt Library templates
-- Adds metadata needed for long Elementor section/full-page prompts.
-- Run after 0016_member_presence_activity.sql.

alter table public.prompt_templates
  add column if not exists section_type text not null default '',
  add column if not exists required_website_fields text[] not null default '{}',
  add column if not exists required_product_fields text[] not null default '{}';

create index if not exists prompt_templates_section_type_idx on public.prompt_templates (section_type);

insert into public.prompt_templates (
  title,
  category,
  page_group,
  section_type,
  topic_type,
  prompt_type,
  prompt_mode,
  compatible_website_types,
  required_website_fields,
  required_product_fields,
  requires_products,
  output_type,
  short_description,
  locked_rules,
  editable_fields,
  template_content,
  default_values,
  status,
  version,
  quality_status,
  notes
)
select
  'Homepage Hero Structured Elementor Prompt',
  'front-page',
  'front-page',
  'Hero Section',
  null,
  'section',
  'section',
  array['normal_ecommerce','product_landing','catalog','brand'],
  array[
    'website_name',
    'domain',
    'website_type',
    'primary_color',
    'secondary_color',
    'font_family',
    'button_font_family',
    'max_width',
    'border_radius',
    'design_notes',
    'seo_notes',
    'extra_instructions'
  ],
  array[
    'product_name',
    'product_category',
    'product_url',
    'product_image_url',
    'product_short_description',
    'product_features',
    'product_specs'
  ],
  1,
  'elementor_section',
  'Create a detailed WordPress Elementor homepage hero section using website profile and product detail data.',
  $$Do not invent brand facts, specs, prices, warranty details, awards, or product claims.
Use the selected Website Profile and selected Product Detail as the source of truth.
Return only paste-ready Elementor section HTML/CSS. Do not add AI explanation before or after the code.
Use simple class names scoped to this section so the output does not break other WordPress content.$$,
  '[
    {"id":"hero_eyebrow","key":"hero_eyebrow","label":"Eyebrow text","type":"text","defaultValue":"Featured Equipment"},
    {"id":"hero_headline_line_1","key":"hero_headline_line_1","label":"Headline line 1","type":"text","defaultValue":"Powerful"},
    {"id":"hero_headline_line_2","key":"hero_headline_line_2","label":"Headline line 2","type":"text"},
    {"id":"hero_headline_line_3","key":"hero_headline_line_3","label":"Headline line 3","type":"text","defaultValue":"For Every Job"},
    {"id":"hero_description","key":"hero_description","label":"Description","type":"textarea"},
    {"id":"button_text","key":"button_text","label":"Button text","type":"text","defaultValue":"View Product"},
    {"id":"button_url","key":"button_url","label":"Button URL","type":"text","helper":"Leave empty if the product URL should be used."},
    {"id":"spec_1_value","key":"spec_1_value","label":"Spec 1 value","type":"text"},
    {"id":"spec_1_label","key":"spec_1_label","label":"Spec 1 label","type":"text"},
    {"id":"spec_2_value","key":"spec_2_value","label":"Spec 2 value","type":"text"},
    {"id":"spec_2_label","key":"spec_2_label","label":"Spec 2 label","type":"text"},
    {"id":"spec_3_value","key":"spec_3_value","label":"Spec 3 value","type":"text"},
    {"id":"spec_3_label","key":"spec_3_label","label":"Spec 3 label","type":"text"},
    {"id":"floating_card_title","key":"floating_card_title","label":"Floating card title","type":"text","defaultValue":"Ready for Work"},
    {"id":"floating_card_subtitle","key":"floating_card_subtitle","label":"Floating card subtitle","type":"text"},
    {"id":"extra_design_instructions","key":"extra_design_instructions","label":"Extra design instructions","type":"textarea"}
  ]'::jsonb,
  $$# Website Information
Website name: {{website_name}}
Domain: {{domain}}
Website type: {{website_type}}
Primary color: {{primary_color}}
Secondary color: {{secondary_color}}
Font family: {{font_family}}
Button font family: {{button_font_family}}
Max width: {{max_width}}
Border radius: {{border_radius}}
Phone: {{phone_number}}
Email: {{email}}
Social links: {{social_links}}

# Product Information
Product name: {{product_name}}
Product category: {{product_category}}
Product URL: {{product_url}}
Product image URL: {{product_image_url}}
Short description: {{product_short_description}}
Features: {{product_features}}
Specs: {{product_specs}}
Price: {{product_price}}
SKU: {{product_sku}}
Notes: {{product_notes}}

# Hero Content
Eyebrow: {{hero_eyebrow}}
Headline line 1: {{hero_headline_line_1}}
Headline line 2: {{hero_headline_line_2}}
Headline line 3: {{hero_headline_line_3}}
Description: {{hero_description}}

# Design Style
Use the website profile colors, fonts, max width, border radius, and design notes.
Design notes: {{design_notes}}
SEO notes: {{seo_notes}}
Extra website instructions: {{extra_instructions}}
Extra design instructions from team member: {{extra_design_instructions}}

# Layout Requirements
Create a modern homepage hero section for a WordPress Elementor website.
Use a two-column desktop layout:
- Left side: eyebrow, large headline, description, CTA button, and spec row.
- Right side: product image with a soft visual frame and floating product card.
Keep the section clean, premium, readable, and easy to rebuild in Elementor.

# Background Requirements
Use a soft background based on the website colors.
Do not use random gradients or heavy glow effects.
Make the card, image area, and CTA stand out clearly in Light Mode and Dark Gray Mode.

# Typography Requirements
Use {{font_family}} for normal text.
Use {{button_font_family}} for the CTA button and clickable UI.
Headline should be strong, clear, and responsive.
Do not make text overlap on mobile.

# CTA Button
Button text: {{button_text}}
Button URL: {{button_url}}
If Button URL is empty, use the selected product URL: {{product_url}}
Use primary color {{primary_color}} for main elements and backgrounds.
Make the button clear, visible, and easy to click.

# Spec Row
Spec 1: {{spec_1_value}} - {{spec_1_label}}
Spec 2: {{spec_2_value}} - {{spec_2_label}}
Spec 3: {{spec_3_value}} - {{spec_3_label}}
If a spec is empty, create a layout that can hide or remove that spec cleanly.

# Product Image
Use this product image if available: {{product_image_url}}
Image should be large enough to inspect the product.
Do not crop important product parts.
Add alt text based on {{product_name}}.

# Floating Product Card
Card title: {{floating_card_title}}
Card subtitle: {{floating_card_subtitle}}
The card should support one small icon or label, product category, and a short trust/support note.

# Responsive Requirements
Desktop: two-column hero with strong visual hierarchy.
Tablet: keep content and image balanced.
Mobile: stack content first, image second, full-width CTA, and readable spec rows.
No horizontal scrolling.

# Output Requirements
Return only Elementor-ready HTML and CSS for this one hero section.
Use scoped class names.
Include responsive CSS.
Do not include JavaScript unless absolutely required.
Do not include placeholder image boxes if a product image URL exists.
Do not add explanation outside the final code.$$,
  '{
    "hero_eyebrow": "Featured Equipment",
    "button_text": "View Product",
    "floating_card_title": "Ready for Work"
  }'::jsonb,
  'approved',
  1,
  'good',
  'Seeded structured Elementor hero prompt with website and product placeholders.'
where not exists (
  select 1 from public.prompt_templates
  where title = 'Homepage Hero Structured Elementor Prompt'
);
