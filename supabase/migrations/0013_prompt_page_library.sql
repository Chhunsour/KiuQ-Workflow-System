-- WordPress Prompt System — page-based Prompt Library
-- Run after 0012_assigned_docs_folder_member_actions.sql.

alter table public.prompt_templates
  add column if not exists page_group text,
  add column if not exists topic_type text,
  add column if not exists short_description text not null default '',
  add column if not exists default_values jsonb not null default '{}'::jsonb,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

alter table public.prompt_templates
  drop constraint if exists prompt_templates_prompt_type_check,
  drop constraint if exists prompt_templates_output_type_check;

alter table public.prompt_templates
  add constraint prompt_templates_prompt_type_check
  check (prompt_type in ('full_page','section','seo','content','design','image','fixing','blog'));

alter table public.prompt_templates
  add constraint prompt_templates_output_type_check
  check (output_type in ('html_css','elementor_section','full_page_layout','seo_fields','page_copy','image_prompt','policy_text','faq_text','text','full_page'));

create index if not exists prompt_templates_page_group_idx on public.prompt_templates (page_group);
create index if not exists prompt_templates_topic_type_idx on public.prompt_templates (topic_type);

update public.prompt_templates
set
  page_group = coalesce(nullif(page_group, ''), nullif(category, ''), 'front-page'),
  short_description = coalesce(nullif(short_description, ''), nullif(notes, ''), 'Reusable website-building prompt.')
where page_group is null or page_group = '' or short_description = '';

drop policy if exists "prompt_templates_member_read_assigned" on public.prompt_templates;
create policy "prompt_templates_member_read_assigned" on public.prompt_templates
  for select to authenticated
  using (
    status = 'approved'
    or exists (
      select 1 from public.prompt_assignments pa
      where pa.prompt_id = prompt_templates.id
        and pa.assigned_member_id = auth.uid()
    )
  );

with seed (
  title,
  page_group,
  topic_type,
  prompt_type,
  output_type,
  short_description,
  locked_rules,
  editable_fields,
  template_content
) as (
  values
  ('Full Homepage Layout Prompt','front-page',null,'full_page','full_page_layout','Create a complete homepage layout using the saved website profile.', 'Use the website profile data. Keep the layout professional, conversion-focused, and easy to build in WordPress. Do not invent brand facts.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Home"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"section_count","key":"section_count","label":"Section count","type":"text","defaultValue":"7"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Extra design notes","type":"textarea"}]'::jsonb, $$Create a full homepage plan for {{page_title}} targeting {{main_keyword}}. Include {{section_count}} sections, suggested section order, short copy direction, CTA ideas, and WordPress/Elementor build notes. Extra notes: {{extra_design_notes}}.$$),
  ('Homepage Hero Section Prompt','front-page',null,'section','elementor_section','Create a strong homepage hero section.', 'Use simple English, one clear main CTA, and match the website colors and fonts.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Home"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"button_text","key":"button_text","label":"Button text","type":"text","defaultValue":"Get a Quote"},{"id":"button_url","key":"button_url","label":"Button URL","type":"text","defaultValue":"/contact"}]'::jsonb, $$Create a homepage hero section for {{page_title}}. Main keyword: {{main_keyword}}. Include H1, short supporting copy, CTA button text "{{button_text}}" linking to {{button_url}}, trust points, and layout guidance.$$),
  ('Featured Product Categories Prompt','front-page',null,'section','elementor_section','Create a featured category section for the homepage.', 'Use saved product categories when available. Keep cards concise and scannable.', '[{"id":"product_category","key":"product_category","label":"Product categories","type":"textarea"},{"id":"section_count","key":"section_count","label":"Number of categories","type":"text","defaultValue":"6"}]'::jsonb, $$Create a featured product categories section with {{section_count}} category cards. Categories/details: {{product_category}}. Include headings, short descriptions, CTA labels, and layout notes.$$),
  ('Trust Section Prompt','front-page',null,'section','elementor_section','Create a trust-building section for the homepage.', 'Do not use fake reviews or fake certifications. Use generic trust points when exact proof is not provided.', '[{"id":"target_audience","key":"target_audience","label":"Target audience","type":"text"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Trust proof or notes","type":"textarea"}]'::jsonb, $$Create a trust section for {{target_audience}}. Use these proof points or notes: {{extra_design_notes}}. Include heading, 3-4 trust cards, and simple design guidance.$$),
  ('Homepage FAQ Prompt','front-page',null,'section','faq_text','Create homepage FAQ content.', 'Answers must be concise and useful. Avoid legal guarantees.', '[{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"product_category","key":"product_category","label":"Product/category focus","type":"text"}]'::jsonb, $$Create 6 homepage FAQs for {{product_category}} targeting {{main_keyword}}. Use clear questions and short helpful answers.$$),

  ('Equipment Category Topic Page Prompt','topic-pages','equipment-category','full_page','full_page_layout','Create an equipment category topic page.', 'Use category-focused SEO structure. Keep the page helpful and buyer-focused.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"product_category","key":"product_category","label":"Equipment category","type":"text"},{"id":"seo_notes","key":"seo_notes","label":"SEO notes","type":"textarea"}]'::jsonb, $$Create an equipment category topic page for {{product_category}}. Page title: {{page_title}}. Main keyword: {{main_keyword}}. Include intro, category benefits, product examples, buying factors, internal links, FAQ, and SEO notes: {{seo_notes}}.$$),
  ('Product Category Topic Page Prompt','topic-pages','product-category','full_page','full_page_layout','Create a product category topic page.', 'Use product category details from the website profile when possible.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"product_category","key":"product_category","label":"Product category","type":"text"},{"id":"product_names","key":"product_names","label":"Product names","type":"textarea"}]'::jsonb, $$Create a product category page for {{product_category}}. Products: {{product_names}}. Target {{main_keyword}} with useful buyer copy, category cards, CTA sections, and FAQ.$$),
  ('Buying Guide Topic Page Prompt','topic-pages','buying-guide','content','page_copy','Create a buying guide topic page.', 'Write practical buying advice. Do not overpromise.', '[{"id":"page_title","key":"page_title","label":"Guide title","type":"text"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"target_audience","key":"target_audience","label":"Target audience","type":"text"},{"id":"product_category","key":"product_category","label":"Product category","type":"text"}]'::jsonb, $$Write a buying guide page for {{product_category}} aimed at {{target_audience}}. Target keyword: {{main_keyword}}. Include sections for what to check, mistakes to avoid, comparison points, and next-step CTA.$$),
  ('Machine Guide Topic Page Prompt','topic-pages','machine-guide','content','page_copy','Create a machine guide page.', 'Keep the explanation beginner-friendly and practical.', '[{"id":"page_title","key":"page_title","label":"Machine guide title","type":"text"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"product_names","key":"product_names","label":"Machines/products","type":"textarea"}]'::jsonb, $$Create a machine guide for {{page_title}} targeting {{main_keyword}}. Cover what it is, uses, benefits, common specs, choosing tips, and FAQs. Machines/products: {{product_names}}.$$),
  ('Comparison Topic Page Prompt','topic-pages','comparison','content','page_copy','Create a comparison topic page.', 'Compare fairly. Explain when each option makes sense.', '[{"id":"page_title","key":"page_title","label":"Comparison title","type":"text"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"product_names","key":"product_names","label":"Items to compare","type":"textarea"}]'::jsonb, $$Create a comparison page for {{product_names}} targeting {{main_keyword}}. Include comparison summary, table, pros/cons, best-use cases, recommendation guidance, and FAQ.$$),
  ('Blog/Resource Topic Page Prompt','topic-pages','blog-resource','content','page_copy','Create a blog or resource topic page.', 'Make it helpful, not generic. Use simple language.', '[{"id":"page_title","key":"page_title","label":"Blog/resource title","type":"text"},{"id":"main_keyword","key":"main_keyword","label":"Main keyword","type":"text"},{"id":"target_audience","key":"target_audience","label":"Target audience","type":"text"}]'::jsonb, $$Create a helpful blog/resource page titled {{page_title}} for {{target_audience}}. Target keyword: {{main_keyword}}. Include outline, page copy, internal link ideas, and FAQ.$$),

  ('Contact Page Layout Prompt','contact-page',null,'full_page','full_page_layout','Create a complete contact page layout.', 'Make the page easy for visitors to contact the business.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Contact Us"},{"id":"button_text","key":"button_text","label":"Button text","type":"text","defaultValue":"Send Message"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Extra notes","type":"textarea"}]'::jsonb, $$Create a contact page layout for {{page_title}}. Include intro, form section, contact details, service area, map placeholder, CTA, and notes: {{extra_design_notes}}.$$),
  ('Contact Form Section Prompt','contact-page',null,'section','elementor_section','Create contact form section copy and structure.', 'Keep the form simple and conversion-focused.', '[{"id":"button_text","key":"button_text","label":"Submit button text","type":"text","defaultValue":"Submit Request"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Form fields or notes","type":"textarea"}]'::jsonb, $$Create a contact form section with recommended fields, helper text, privacy note, and button text "{{button_text}}". Notes: {{extra_design_notes}}.$$),
  ('Business Info Section Prompt','contact-page',null,'section','page_copy','Create business information section content.', 'Use placeholders if exact details are missing.', '[{"id":"target_audience","key":"target_audience","label":"Target audience","type":"text"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Business info notes","type":"textarea"}]'::jsonb, $$Create a business information section for {{target_audience}}. Include phone, email, hours, service area, response-time copy, and notes: {{extra_design_notes}}.$$),

  ('About Us Full Page Prompt','about-us-page',null,'full_page','full_page_layout','Create a complete About Us page.', 'Keep it credible and specific to the saved website profile.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"About Us"},{"id":"target_audience","key":"target_audience","label":"Target audience","type":"text"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Company notes","type":"textarea"}]'::jsonb, $$Create a full About Us page for {{page_title}}. Audience: {{target_audience}}. Include story, mission, values, trust section, why choose us, CTA, and company notes: {{extra_design_notes}}.$$),
  ('Company Story Section Prompt','about-us-page',null,'section','page_copy','Create a company story section.', 'Do not invent years, awards, or founder names unless provided.', '[{"id":"target_audience","key":"target_audience","label":"Target audience","type":"text"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Story notes","type":"textarea"}]'::jsonb, $$Write a company story section for {{target_audience}} using these notes: {{extra_design_notes}}. Make it human, concise, and trustworthy.$$),
  ('Why Choose Us Section Prompt','about-us-page',null,'section','elementor_section','Create a why-choose-us section.', 'Use practical benefits and avoid empty claims.', '[{"id":"product_category","key":"product_category","label":"Product/service focus","type":"text"},{"id":"section_count","key":"section_count","label":"Number of points","type":"text","defaultValue":"4"}]'::jsonb, $$Create a why-choose-us section for {{product_category}} with {{section_count}} benefit cards, short descriptions, and layout notes.$$),

  ('Privacy Policy Page Prompt','privacy-policy-page',null,'content','policy_text','Create a privacy policy page draft.', 'This is a practical draft, not legal advice. Use plain language.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Privacy Policy"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Special privacy notes","type":"textarea"}]'::jsonb, $$Draft a {{page_title}} page using the website profile. Include data collection, cookies, contact forms, analytics, third-party links, user rights, and notes: {{extra_design_notes}}.$$),
  ('Terms and Conditions Page Prompt','terms-and-conditions-page',null,'content','policy_text','Create terms and conditions page text.', 'This is a practical draft, not legal advice.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Terms and Conditions"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Special terms notes","type":"textarea"}]'::jsonb, $$Draft a {{page_title}} page for the website. Include website use, quotes/orders, intellectual property, limitations, third-party links, and notes: {{extra_design_notes}}.$$),
  ('Warranty Policy Page Prompt','warranty-policy-page',null,'content','policy_text','Create warranty policy page text.', 'Avoid specific warranty promises unless provided by admin.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Warranty Policy"},{"id":"product_category","key":"product_category","label":"Product category","type":"text"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Warranty notes","type":"textarea"}]'::jsonb, $$Draft a {{page_title}} page for {{product_category}}. Include warranty coverage placeholders, exclusions, claim steps, support contact, and notes: {{extra_design_notes}}.$$),
  ('Shipping and Delivery Page Prompt','shipping-and-delivery-page',null,'content','policy_text','Create shipping and delivery policy text.', 'Use placeholders for exact timelines or locations if missing.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Shipping and Delivery"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Shipping notes","type":"textarea"}]'::jsonb, $$Draft a {{page_title}} page. Include processing, delivery options, large item handling, service areas, delays, tracking, and notes: {{extra_design_notes}}.$$),
  ('Return and Refund Policy Page Prompt','return-and-refund-policy-page',null,'content','policy_text','Create return and refund policy text.', 'Avoid exact refund windows unless admin provides them.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"Return and Refund Policy"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Return/refund notes","type":"textarea"}]'::jsonb, $$Draft a {{page_title}} page. Include eligibility, condition requirements, return steps, refund processing, non-returnable items, and notes: {{extra_design_notes}}.$$),

  ('FAQ Full Page Prompt','faq-page',null,'full_page','faq_text','Create a full FAQ page.', 'Group questions by useful customer topics.', '[{"id":"page_title","key":"page_title","label":"Page title","type":"text","defaultValue":"FAQ"},{"id":"product_category","key":"product_category","label":"Product/service focus","type":"text"},{"id":"section_count","key":"section_count","label":"Number of questions","type":"text","defaultValue":"12"}]'::jsonb, $$Create a full FAQ page for {{product_category}} with {{section_count}} questions. Group by topic, keep answers concise, and include CTA copy.$$),
  ('Product FAQ Section Prompt','faq-page',null,'section','faq_text','Create product FAQ section text.', 'Focus on buyer concerns.', '[{"id":"product_category","key":"product_category","label":"Product category","type":"text"},{"id":"section_count","key":"section_count","label":"Question count","type":"text","defaultValue":"6"}]'::jsonb, $$Create {{section_count}} product FAQs for {{product_category}} with concise answers.$$),
  ('Shipping FAQ Section Prompt','faq-page',null,'section','faq_text','Create shipping FAQ section text.', 'Keep details flexible when exact policy is unknown.', '[{"id":"section_count","key":"section_count","label":"Question count","type":"text","defaultValue":"5"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Shipping notes","type":"textarea"}]'::jsonb, $$Create {{section_count}} shipping FAQs using these notes: {{extra_design_notes}}.$$),
  ('Warranty FAQ Section Prompt','faq-page',null,'section','faq_text','Create warranty FAQ section text.', 'Avoid exact warranty promises unless provided.', '[{"id":"section_count","key":"section_count","label":"Question count","type":"text","defaultValue":"5"},{"id":"extra_design_notes","key":"extra_design_notes","label":"Warranty notes","type":"textarea"}]'::jsonb, $$Create {{section_count}} warranty FAQs using these notes: {{extra_design_notes}}.$$
  )
)
insert into public.prompt_templates (
  title,
  category,
  page_group,
  topic_type,
  prompt_type,
  output_type,
  short_description,
  locked_rules,
  editable_fields,
  template_content,
  default_values,
  status,
  version,
  notes
)
select
  seed.title,
  seed.page_group,
  seed.page_group,
  seed.topic_type,
  seed.prompt_type,
  seed.output_type,
  seed.short_description,
  seed.locked_rules,
  seed.editable_fields,
  seed.template_content,
  '{}'::jsonb,
  'approved',
  1,
  'Seeded page-group prompt.'
from seed
where not exists (
  select 1 from public.prompt_templates existing
  where existing.title = seed.title
);
