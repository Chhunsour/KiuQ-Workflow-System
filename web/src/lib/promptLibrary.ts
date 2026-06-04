import type {
  EditableField,
  OutputType,
  Product,
  Prompt,
  PromptMode,
  PromptType,
  Website
} from '@/stores/data';

function getContrastColor(hex: string): string {
  if (!hex || hex.length < 6) return '#000000';
  const cleanHex = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#ffffff';
}

export interface PageGroupMeta {
  slug: string;
  routeSlug: string;
  label: string;
  shortLabel: string;
  description: string;
}

export interface TopicTypeMeta {
  slug: string;
  label: string;
}

// Standard website types the admin picks when creating a website profile,
// and prompt templates can target any subset via compatibleWebsiteTypes.
export const websiteTypeOptions: { value: string; label: string }[] = [
  { value: 'normal_ecommerce', label: 'Normal E-commerce Website' },
  { value: 'product_landing', label: 'Product Landing Website' },
  { value: 'catalog', label: 'Catalog Website' },
  { value: 'blog_guide', label: 'Blog / Guide Website' },
  { value: 'service', label: 'Service Website' },
  { value: 'brand', label: 'Brand Website' }
];

export const websiteTypeLabel = (value: string): string =>
  websiteTypeOptions.find((opt) => opt.value === value)?.label || value || '—';

export const promptModeOptions: { value: PromptMode; label: string }[] = [
  { value: 'section', label: 'Section Prompt' },
  { value: 'full_page', label: 'Full Page Prompt' }
];

export const promptModeLabel = (mode: PromptMode): string =>
  promptModeOptions.find((opt) => opt.value === mode)?.label || mode;

export const pageGroups: PageGroupMeta[] = [
  {
    slug: 'front-page',
    routeSlug: 'homepage',
    label: 'Front Page / Homepage',
    shortLabel: 'Front Page',
    description: 'Homepage prompts for hero, trust, categories, FAQs, and complete layouts.'
  },
  {
    slug: 'topic-pages',
    routeSlug: 'topic-pages',
    label: 'Topic Pages',
    shortLabel: 'Topic Pages',
    description: 'Reusable topic page prompts for categories, guides, comparisons, and resources.'
  },
  {
    slug: 'contact-page',
    routeSlug: 'contact',
    label: 'Contact Page',
    shortLabel: 'Contact Page',
    description: 'Contact layout, form, map, and business information prompts.'
  },
  {
    slug: 'about-us-page',
    routeSlug: 'about-us',
    label: 'About Us Page',
    shortLabel: 'About Us',
    description: 'Company story, trust, team, and why-choose-us page prompts.'
  },
  {
    slug: 'privacy-policy-page',
    routeSlug: 'privacy-policy',
    label: 'Privacy Policy Page',
    shortLabel: 'Privacy Policy',
    description: 'Privacy policy copy prompts for WordPress websites.'
  },
  {
    slug: 'terms-and-conditions-page',
    routeSlug: 'terms-and-conditions',
    label: 'Terms and Conditions Page',
    shortLabel: 'Terms and Conditions',
    description: 'Terms page prompts for common website rules and disclaimers.'
  },
  {
    slug: 'warranty-policy-page',
    routeSlug: 'warranty-policy',
    label: 'Warranty Policy Page',
    shortLabel: 'Warranty Policy',
    description: 'Warranty policy prompts for product or equipment websites.'
  },
  {
    slug: 'shipping-and-delivery-page',
    routeSlug: 'shipping-and-delivery',
    label: 'Shipping and Delivery Page',
    shortLabel: 'Shipping and Delivery',
    description: 'Shipping, delivery, processing, and location coverage prompts.'
  },
  {
    slug: 'return-and-refund-policy-page',
    routeSlug: 'return-and-refund',
    label: 'Return and Refund Policy Page',
    shortLabel: 'Return and Refund',
    description: 'Return, refund, exchange, and cancellation policy prompts.'
  },
  {
    slug: 'faq-page',
    routeSlug: 'faq',
    label: 'FAQ Page',
    shortLabel: 'FAQ',
    description: 'Full FAQ pages and focused FAQ sections for products, shipping, and warranty.'
  }
];

export const topicTypes: TopicTypeMeta[] = [
  { slug: 'equipment-category', label: 'Equipment Category Topic Page' },
  { slug: 'product-category', label: 'Product Category Topic Page' },
  { slug: 'buying-guide', label: 'Buying Guide Topic Page' },
  { slug: 'machine-guide', label: 'Machine Guide Topic Page' },
  { slug: 'comparison', label: 'Comparison Topic Page' },
  { slug: 'blog-resource', label: 'Blog/Resource Topic Page' }
];

export const promptTypeOptions: { value: PromptType; label: string }[] = [
  { value: 'full_page', label: 'Full Page Prompt' },
  { value: 'section', label: 'Section Prompt' },
  { value: 'seo', label: 'SEO Prompt' },
  { value: 'content', label: 'Content Prompt' },
  { value: 'design', label: 'Design Prompt' },
  { value: 'image', label: 'Image Prompt' },
  { value: 'fixing', label: 'Fixing Prompt' }
];

export const outputTypeOptions: { value: OutputType; label: string }[] = [
  { value: 'html_css', label: 'HTML/CSS' },
  { value: 'elementor_section', label: 'Elementor HTML/CSS Section' },
  { value: 'full_page_layout', label: 'Full Page Layout' },
  { value: 'seo_fields', label: 'SEO Fields' },
  { value: 'page_copy', label: 'Page Copy' },
  { value: 'image_prompt', label: 'Image Prompt' },
  { value: 'policy_text', label: 'Policy Text' },
  { value: 'faq_text', label: 'FAQ Text' }
];

export const pageGroupBySlug = (slug: string | null | undefined) =>
  pageGroups.find((group) => group.slug === slug);

export const pageGroupByRouteSlug = (slug: string | null | undefined) =>
  pageGroups.find((group) => group.routeSlug === slug || group.slug === slug);

export const pageGroupByValue = (value: string | null | undefined) =>
  pageGroups.find((group) => group.slug === value || group.label === value || group.shortLabel === value);

export const pageGroupRouteSlug = (value: string | null | undefined) =>
  pageGroupByValue(value)?.routeSlug ?? pageGroupByRouteSlug(value)?.routeSlug ?? value ?? 'homepage';

export const promptPageGroupRouteSlug = (prompt: Prompt) =>
  pageGroupRouteSlug(prompt.pageGroup || prompt.category || 'front-page');

export const topicTypeBySlug = (slug: string | null | undefined) =>
  topicTypes.find((topic) => topic.slug === slug);

export const promptPageGroupSlug = (prompt: Prompt) =>
  pageGroupByValue(prompt.pageGroup || prompt.category)?.slug ??
  (prompt.pageGroup || prompt.category || 'front-page');

export const promptPageGroupLabel = (prompt: Prompt) =>
  pageGroupByValue(prompt.pageGroup || prompt.category)?.label ??
  (prompt.pageGroup || prompt.category || 'Front Page / Homepage');

export const promptTypeLabel = (type: PromptType) =>
  promptTypeOptions.find((option) => option.value === type)?.label ?? type.replace(/_/g, ' ');

export const outputTypeLabel = (type: OutputType) =>
  outputTypeOptions.find((option) => option.value === type)?.label ?? type.replace(/_/g, ' ');

export const topicTypeLabel = (slug: string | null) =>
  topicTypeBySlug(slug)?.label ?? slug?.replace(/-/g, ' ') ?? '';

export const fieldDefaults = (fields: EditableField[], defaults: Record<string, string> = {}) =>
  fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = defaults[field.key] ?? field.defaultValue ?? '';
    return acc;
  }, {});

export const renderTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) => values[key] ?? `{{${key}}}`);

// Render a single product as a multi-line markdown block. Used for
// {{products}} when multiple products are selected.
export const productBlock = (product: Product): string => {
  const lines = [
    `- Product: ${product.name || '—'}${product.category ? ` (${product.category})` : ''}`,
    product.shortDescription ? `  Short description: ${product.shortDescription}` : '',
    product.longDescription ? `  Long description: ${product.longDescription}` : '',
    product.keyFeatures ? `  Key features: ${product.keyFeatures}` : '',
    product.keySpecs ? `  Key specs: ${product.keySpecs}` : '',
    product.price ? `  Price: ${product.price}` : '',
    product.sku ? `  SKU: ${product.sku}` : '',
    product.url ? `  URL: ${product.url}` : '',
    product.imageUrl ? `  Image: ${product.imageUrl}` : '',
    product.manualUrl ? `  Manual: ${product.manualUrl}` : '',
    product.notes ? `  Notes: ${product.notes}` : ''
  ].filter(Boolean);
  return lines.join('\n');
};

export const websiteContext = (website: Website | undefined, selectedProducts: Product[] = []) => {
  if (!website) return '';
  const products = selectedProducts.length ? selectedProducts : website.products;
  const productLines = products.length
    ? products
        .map((product) =>
          `- ${product.name}${product.category ? ` (${product.category})` : ''}: ${product.shortDescription || product.keySpecs || product.notes || product.url || 'No details'}`
        )
        .join('\n')
    : '- No product details saved yet.';

  return `Website name: ${website.name}
Domain: ${website.domain || '-'}
Website type: ${website.websiteType || '-'}
Industry: ${website.industry || '-'}
Website goal: ${website.websiteGoal || '-'}
Main keyword: ${website.mainKeyword || '-'}
Target country: ${website.targetCountry || '-'}
Target audience: ${website.targetAudience || '-'}
Primary color: ${website.primaryColor || '-'}
Secondary color: ${website.secondaryColor || '-'}
Background color: ${website.backgroundColor || '-'}
Text color: ${getContrastColor(website.backgroundColor || '#ffffff')} (Automated)
Font family: ${website.fontFamily || '-'}
Button font family: ${website.buttonFontFamily || website.fontFamily || '-'}
Max width: ${website.maxWidth || '-'}
Border radius: ${website.borderRadius || '-'}
Phone: ${website.phoneNumber || '-'}
Email: ${website.email || '-'}
Business address: ${website.businessAddress || '-'}
WhatsApp: ${website.whatsappLink || '-'}
Facebook: ${website.facebookLink || '-'}
Instagram: ${website.instagramLink || '-'}
YouTube: ${website.youtubeLink || '-'}
Other social links: ${website.otherSocialLinks || '-'}
Social links: ${website.socialLinks || '-'}
Design style notes: ${website.designStyleNotes || '-'}
Product categories: ${website.productCategories || '-'}
Product details:
${productLines}
Brand notes: ${website.brandNotes || '-'}
SEO notes: ${website.seoNotes || '-'}
Internal linking notes: ${website.internalLinkingNotes || '-'}
Extra instructions: ${website.extraInstructions || '-'}`;
};

// Build the placeholder map that {{key}} substitution uses. Includes:
//   - all editable field values
//   - website context placeholders  ({{website_name}}, {{primary_color}}, ...)
//   - product placeholders          ({{product_name}}, {{product_features}}, ...)
//                                   resolved against the FIRST selected product
//   - {{products}}                  bulleted block of every selected product
export const placeholderMap = (
  website: Website | undefined,
  products: Product[],
  filledValues: Record<string, string>
): Record<string, string> => {
  const map: Record<string, string> = { ...filledValues };

  if (website) {
    map.website_name = website.name ?? '';
    map.domain = website.domain ?? '';
    map.website_type = website.websiteType ?? '';
    map.industry = website.industry ?? '';
    map.website_goal = website.websiteGoal ?? '';
    map.main_keyword = website.mainKeyword ?? '';
    map.target_country = website.targetCountry ?? '';
    map.primary_color = website.primaryColor ?? '';
    map.secondary_color = website.secondaryColor ?? '';
    map.accent_color = website.primaryColor ?? ''; // Simplified: use primary
    map.background_color = website.backgroundColor ?? '';
    map.text_color = getContrastColor(website.backgroundColor ?? '#ffffff'); // Automated
    map.font_family = website.fontFamily ?? '';
    map.button_font_family = website.buttonFontFamily ?? '';
    map.max_width = website.maxWidth ?? '';
    map.border_radius = website.borderRadius ?? '';
    map.phone_number = website.phoneNumber ?? '';
    map.email = website.email ?? '';
    map.whatsapp_link = website.whatsappLink ?? '';
    map.facebook_link = website.facebookLink ?? '';
    map.instagram_link = website.instagramLink ?? '';
    map.youtube_link = website.youtubeLink ?? '';
    map.other_social_links = website.otherSocialLinks ?? '';
    map.social_links = website.socialLinks ?? '';
    map.business_address = website.businessAddress ?? '';
    map.brand_notes = website.brandNotes ?? '';
    map.design_notes = website.designStyleNotes ?? '';
    map.seo_notes = website.seoNotes ?? '';
    map.target_audience = website.targetAudience ?? '';
    map.product_categories = website.productCategories ?? '';
    map.extra_instructions = website.extraInstructions ?? '';
    map.internal_linking_notes = website.internalLinkingNotes ?? '';
  }

  // Single-product placeholders point at the FIRST selected product (the
  // most common case — if the prompt needs many products, use {{products}}).
  const first = products[0];
  if (first) {
    map.product_name = first.name ?? '';
    map.product_category = first.category ?? '';
    map.product_url = first.url ?? '';
    map.product_image_url = first.imageUrl ?? '';
    map.product_short_description = first.shortDescription ?? '';
    map.product_description = first.shortDescription || first.longDescription || '';
    map.product_long_description = first.longDescription ?? '';
    map.product_features = first.keyFeatures ?? '';
    map.product_specs = first.keySpecs ?? '';
    map.product_price = first.price ?? '';
    map.product_sku = first.sku ?? '';
    map.product_manual_url = first.manualUrl ?? '';
    map.product_notes = first.notes ?? '';
  }

  // {{products}} = full bulleted block of every selected product.
  map.products = products.length ? products.map(productBlock).join('\n\n') : '';

  return map;
};

export const outputInstruction = (type: OutputType) => {
  switch (type) {
    case 'html_css':
      return 'Output: Clean production-ready HTML/CSS. Keep class names clear and avoid extra commentary.';
    case 'elementor_section':
      return 'Output: Return a WordPress Elementor-ready HTML/CSS section. Keep it paste-ready, responsive, and scoped so it will not break the rest of the page.';
    case 'full_page_layout':
    case 'full_page':
      return 'Output: A complete page layout with sections in the right order and clear implementation notes.';
    case 'seo_fields':
      return 'Output: Return SEO title, meta description, URL slug, H1, and suggested internal links as labeled fields.';
    case 'page_copy':
    case 'text':
      return 'Output: Page copy only, written clearly for the target audience.';
    case 'image_prompt':
      return 'Output: A single image-generation prompt with subject, style, composition, and quality details.';
    case 'policy_text':
      return 'Output: Clear policy page text with headings and plain-language sections.';
    case 'faq_text':
      return 'Output: FAQ questions and concise answers grouped by topic.';
    default:
      return '';
  }
};

export const buildFinalPrompt = (
  prompt: Prompt | undefined,
  website: Website | undefined,
  values: Record<string, string>,
  selectedProducts: Product[] = []
) => {
  if (!prompt) return '';
  const group = promptPageGroupLabel(prompt);
  const topic = prompt.topicType ? topicTypeLabel(prompt.topicType) : '';
  const sectionType = prompt.sectionType?.trim();
  const inputBlock = prompt.editableFields.length
    ? '# Editable fields filled by team member\n' +
      prompt.editableFields
        .map((field) => `- ${field.label || field.key}: ${values[field.key] || '(empty)'}`)
        .join('\n')
    : '';

  // Resolve every {{placeholder}} from one combined map.
  const allPlaceholders = placeholderMap(website, selectedProducts, values);

  const productSection = selectedProducts.length
    ? `# Product details\n${selectedProducts.map(productBlock).join('\n\n')}`
    : '';

  const modeNote =
    prompt.promptMode === 'full_page'
      ? 'Build mode: Full Page Prompt — generate the whole page.'
      : 'Build mode: Section Prompt — generate only this one section.';

  return [
    website ? `# Website profile data\n${websiteContext(website, selectedProducts)}` : '',
    productSection,
    `# Page group context\nPage group: ${group}${sectionType ? `\nSection type: ${sectionType}` : ''}${topic ? `\nTopic type: ${topic}` : ''}\n${modeNote}`,
    prompt.lockedRules ? `# Locked admin rules\n${prompt.lockedRules}` : '',
    inputBlock,
    `# Prompt template body\n${renderTemplate(prompt.templateContent, allPlaceholders)}`,
    outputInstruction(prompt.outputType)
  ]
    .filter(Boolean)
    .join('\n\n');
};

// Convenience list of every placeholder the assembler knows about.
// Useful for the editor's "Available placeholders" hint.
export const knownPlaceholders: { key: string; description: string }[] = [
  { key: 'website_name', description: 'Website name' },
  { key: 'domain', description: 'Domain' },
  { key: 'website_type', description: 'Website type' },
  { key: 'industry', description: 'Industry / niche' },
  { key: 'website_goal', description: 'Website goal' },
  { key: 'main_keyword', description: 'Main SEO keyword' },
  { key: 'target_country', description: 'Target country' },
  { key: 'primary_color', description: 'Primary brand color' },
  { key: 'secondary_color', description: 'Secondary brand color' },
  { key: 'accent_color', description: 'Accent color (defaults to primary)' },
  { key: 'background_color', description: 'Website background color' },
  { key: 'text_color', description: 'Readable text color (automated based on background)' },
  { key: 'font_family', description: 'Body font family' },
  { key: 'button_font_family', description: 'Button font family' },
  { key: 'max_width', description: 'Max content width' },
  { key: 'border_radius', description: 'Border radius' },
  { key: 'phone_number', description: 'Phone number' },
  { key: 'email', description: 'Email address' },
  { key: 'whatsapp_link', description: 'WhatsApp link' },
  { key: 'facebook_link', description: 'Facebook link' },
  { key: 'instagram_link', description: 'Instagram link' },
  { key: 'youtube_link', description: 'YouTube link' },
  { key: 'other_social_links', description: 'Other social links' },
  { key: 'social_links', description: 'Social media links (raw text)' },
  { key: 'business_address', description: 'Business address' },
  { key: 'brand_notes', description: 'Brand notes' },
  { key: 'design_notes', description: 'Design style notes' },
  { key: 'seo_notes', description: 'SEO notes' },
  { key: 'target_audience', description: 'Target audience' },
  { key: 'product_categories', description: 'Product categories' },
  { key: 'extra_instructions', description: 'Extra instructions' },
  { key: 'internal_linking_notes', description: 'Internal linking notes' },
  { key: 'product_name', description: 'First selected product — name' },
  { key: 'product_category', description: 'First selected product — category' },
  { key: 'product_url', description: 'First selected product — URL' },
  { key: 'product_image_url', description: 'First selected product — image URL' },
  { key: 'product_description', description: 'First selected product — short or long description' },
  { key: 'product_short_description', description: 'First selected product — short description' },
  { key: 'product_long_description', description: 'First selected product — long description' },
  { key: 'product_features', description: 'First selected product — key features' },
  { key: 'product_specs', description: 'First selected product — key specs' },
  { key: 'product_price', description: 'First selected product — price' },
  { key: 'product_sku', description: 'First selected product — SKU' },
  { key: 'product_manual_url', description: 'First selected product — manual URL' },
  { key: 'product_notes', description: 'First selected product — notes' },
  { key: 'hero_eyebrow', description: 'Hero section eyebrow text' },
  { key: 'hero_headline_line_1', description: 'Hero headline line 1' },
  { key: 'hero_headline_line_2', description: 'Hero headline line 2' },
  { key: 'hero_headline_line_3', description: 'Hero headline line 3' },
  { key: 'hero_description', description: 'Hero description text' },
  { key: 'button_text', description: 'CTA button text' },
  { key: 'button_url', description: 'CTA button URL' },
  { key: 'spec_1_value', description: 'Spec row value 1' },
  { key: 'spec_1_label', description: 'Spec row label 1' },
  { key: 'spec_2_value', description: 'Spec row value 2' },
  { key: 'spec_2_label', description: 'Spec row label 2' },
  { key: 'spec_3_value', description: 'Spec row value 3' },
  { key: 'spec_3_label', description: 'Spec row label 3' },
  { key: 'floating_card_title', description: 'Floating product card title' },
  { key: 'floating_card_subtitle', description: 'Floating product card subtitle' },
  { key: 'extra_design_instructions', description: 'Extra design instructions from team member' },
  { key: 'products', description: 'Bulleted block of ALL selected products' }
];

export const placeholderValue = (
  key: string,
  website: Website | undefined,
  products: Product[],
  values: Record<string, string> = {}
) => placeholderMap(website, products, values)[key] ?? '';

export const missingRequiredWebsiteFields = (prompt: Prompt, website: Website | undefined) =>
  prompt.requiredWebsiteFields.filter((key) => !placeholderValue(key, website, [], {}).trim());

export const missingRequiredProductFields = (prompt: Prompt, products: Product[]) =>
  prompt.requiredProductFields.filter((key) => !placeholderValue(key, undefined, products, {}).trim());
