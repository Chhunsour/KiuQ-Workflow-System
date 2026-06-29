export type ProductType = 'equipment' | 'attachment';
export type ProductTypeValue = ProductType | 'unknown' | null | undefined;

export interface ProductIdentitySpec {
  label: string;
  value: string;
}

export interface ProductIdentityMapping {
  productId: string;
  type: ProductType;
  productName: string;
  slug: string;
  category: string;
  compatibleWith: string[];
  folderPath: string;
  imageFolder: string;
  mainImage: string;
  galleryImages: string[];
  specs: ProductIdentitySpec[];
  description: string;
  metaTitle: string;
  metaDescription: string;
  aliases?: string[];
  needsManualMapping?: boolean;
}

export interface FolderIdentityInput {
  name: string;
  product_type?: ProductTypeValue;
  product_id?: string | null;
  product_slug?: string | null;
  product_folder_path?: string | null;
  image_folder_path?: string | null;
  matched_product_url?: string | null;
  machine_category?: string | null;
}

export interface ProductIdentityInput {
  title: string;
  url: string;
  category?: string | null;
  productType?: ProductTypeValue;
  product_type?: ProductTypeValue;
  sourceSlug?: string | null;
  productId?: string | null;
}

export interface ExactIdentityMatch<T> {
  product: T;
  confidence: number;
  reason: 'verified_url' | 'product_id' | 'product_slug' | 'mapping_file' | 'folder_path_slug';
  productId: string;
  slug: string;
  productType: ProductType;
}

const attachmentSpecs = (
  attachmentType: string,
  compatibleMachine: string,
  applications: string,
  bestFor: string,
): ProductIdentitySpec[] => [
  { label: 'Attachment Type', value: attachmentType },
  { label: 'Compatible Machine', value: compatibleMachine },
  { label: 'Common Applications', value: applications },
  { label: 'Best For', value: bestFor },
  { label: 'Mounting / Connection', value: 'Confirm mount style before ordering' },
  { label: 'Worksite Use', value: 'Jobsite add-on for compatible compact equipment' },
  { label: 'Key Benefits', value: 'Adds task-specific capability without changing machines' },
  { label: 'Maintenance Notes', value: 'Inspect pins, cutting edges, hoses, and connection points before use' },
];

export const PRODUCT_IDENTITY_MAPPINGS: ProductIdentityMapping[] = [
  {
    productId: 'typhon-terror-xviii-1-8-ton-kubota-d902',
    type: 'equipment',
    productName: 'TYPHON Terror XVIII (1.8 Ton)',
    slug: 'typhon-terror-xviii-1-8-ton-kubota-d902',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-terror-xviii-1-8-ton',
    imageFolder: 'typhon-terror-xviii-1-8-ton-kubota-d902',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON Terror XVIII 1.8 Ton Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON Terror XVIII 1.8 Ton mini excavator.'
  },
  {
    productId: 'typhon-terror-xviii-2-ton',
    type: 'equipment',
    productName: 'TYPHON Terror XVIII (2 Ton)',
    slug: 'typhon-terror-xviii-2-ton',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-terror-xviii-2-ton',
    imageFolder: 'typhon-terror-xviii-2-ton',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON Terror XVIII 2 Ton Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON Terror XVIII 2 Ton mini excavator.'
  },
  {
    productId: 'typhon-terror-xiii',
    type: 'equipment',
    productName: 'TYPHON Terror XIII',
    slug: 'typhon-terror-xiii',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-terror-xiii',
    imageFolder: 'typhon-terror-xiii',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON Terror XIII Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON Terror XIII mini excavator.'
  },
  {
    productId: 'typhon-terror-xv',
    type: 'equipment',
    productName: 'TYPHON Terror XV',
    slug: 'typhon-terror-xv',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-terror-xv',
    imageFolder: 'typhon-terror-xv',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON Terror XV Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON Terror XV mini excavator.'
  },
  {
    productId: 'typhon-terror-xvii',
    type: 'equipment',
    productName: 'TYPHON Terror XVII',
    slug: 'typhon-terror-xvii',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-terror-xvii',
    imageFolder: 'typhon-terror-xvii',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON Terror XVII Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON Terror XVII mini excavator.'
  },
  {
    productId: 'typhon-terror-xvii-pro',
    type: 'equipment',
    productName: 'TYPHON Terror XVII PRO',
    slug: 'typhon-terror-xvii-pro',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-terror-xvii-pro',
    imageFolder: 'typhon-terror-xvii-pro',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON Terror XVII PRO Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON Terror XVII PRO mini excavator.'
  },
  {
    productId: 'typhon-xxv',
    type: 'equipment',
    productName: 'TYPHON XXV',
    slug: 'typhon-xxv',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-xxv',
    imageFolder: 'typhon-xxv',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON XXV Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON XXV mini excavator.'
  },
  {
    productId: 'typhon-lxv',
    type: 'equipment',
    productName: 'TYPHON LXV',
    slug: 'typhon-lxv',
    category: 'Mini Excavators',
    compatibleWith: [],
    folderPath: 'typhon-lxv',
    imageFolder: 'typhon-lxv',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON LXV Mini Excavator',
    metaDescription: 'Product identity mapping for the TYPHON LXV mini excavator.'
  },
  {
    productId: 'typhon-kuvu-04',
    type: 'equipment',
    productName: 'TYPHON KUVU 04',
    slug: 'typhon-kuvu-04',
    category: 'Loaders',
    compatibleWith: [],
    folderPath: 'typhon-kuvu-04',
    imageFolder: 'typhon-kuvu-04',
    mainImage: '',
    galleryImages: [],
    specs: [],
    description: '',
    metaTitle: 'TYPHON KUVU 04 Compact Loader',
    metaDescription: 'Product identity mapping for the TYPHON KUVU 04 compact loader.'
  },
  {
    productId: 'mini-excavator-attachments',
    type: 'attachment',
    productName: 'Mini Excavator Attachments',
    slug: 'mini-excavator-attachments',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator'],
    folderPath: 'mini-excavator-attachments',
    imageFolder: 'mini-excavator-attachments',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Mini excavator attachment', 'Mini Excavator', 'Digging, trenching, grading, breaking, lifting, and clearing', 'Compact excavation jobs that need task-specific tools'),
    description: 'Mini excavator attachments add job-specific capability to compatible compact excavators. Match the mount, hydraulic flow, and working task before use.',
    metaTitle: 'Mini Excavator Attachments',
    metaDescription: 'Attachment-specific product mapping for mini excavator tools and compatible add-ons.'
  },
  {
    productId: 'mini-skid-steer-attachments',
    type: 'attachment',
    productName: 'Mini Skid Steer Attachments',
    slug: 'mini-skid-steer-attachments',
    category: 'Attachments',
    compatibleWith: ['Mini Skid Steer'],
    folderPath: 'mini-skid-steer-attachments',
    imageFolder: 'mini-skid-steer-attachments',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Mini skid steer attachment', 'Mini Skid Steer', 'Material handling, cleanup, light grading, drilling, and site preparation', 'Compact loader work in tight spaces'),
    description: 'Mini skid steer attachments are compatible add-ons for compact loaders. Use the correct connection, operating capacity, and hydraulic requirements for the job.',
    metaTitle: 'Mini Skid Steer Attachments',
    metaDescription: 'Attachment-specific product mapping for mini skid steer tools and compatible add-ons.'
  },
  {
    productId: 'buckets',
    type: 'attachment',
    productName: 'Buckets',
    slug: 'buckets',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator', 'Mini Skid Steer'],
    folderPath: 'buckets',
    imageFolder: 'buckets',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Bucket attachment', 'Mini Excavator or Mini Skid Steer', 'Digging, loading, cleanup, backfilling, and material handling', 'Soil, gravel, mulch, and loose material movement'),
    description: 'Bucket attachments handle digging, loading, backfilling, and cleanup work. Select the correct width, mount, and machine compatibility before installation.',
    metaTitle: 'Bucket Attachments',
    metaDescription: 'Attachment-specific mapping for buckets used with compatible compact equipment.'
  },
  {
    productId: 'augers',
    type: 'attachment',
    productName: 'Augers',
    slug: 'augers',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator', 'Mini Skid Steer'],
    folderPath: 'augers',
    imageFolder: 'augers',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Auger attachment', 'Mini Excavator or Mini Skid Steer', 'Post holes, planting holes, fence work, and foundation prep', 'Repeated drilling in soil or light aggregate'),
    description: 'Auger attachments drill clean holes for fencing, landscaping, planting, and light foundation work. Confirm bit size, mount, and hydraulic compatibility.',
    metaTitle: 'Auger Attachments',
    metaDescription: 'Attachment-specific mapping for augers used with compatible compact equipment.'
  },
  {
    productId: 'grapples',
    type: 'attachment',
    productName: 'Grapples',
    slug: 'grapples',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator', 'Mini Skid Steer'],
    folderPath: 'grapples',
    imageFolder: 'grapples',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Grapple attachment', 'Mini Excavator or Mini Skid Steer', 'Brush handling, debris pickup, logs, rocks, and demolition cleanup', 'Irregular material handling and site cleanup'),
    description: 'Grapple attachments clamp and move irregular material such as brush, logs, rocks, and debris. Match hydraulic connections and lift capacity to the carrier machine.',
    metaTitle: 'Grapple Attachments',
    metaDescription: 'Attachment-specific mapping for grapples used with compatible compact equipment.'
  },
  {
    productId: 'breakers',
    type: 'attachment',
    productName: 'Breakers',
    slug: 'breakers',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator', 'Mini Skid Steer'],
    folderPath: 'breakers',
    imageFolder: 'breakers',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Breaker attachment', 'Mini Excavator or Mini Skid Steer', 'Concrete removal, rock breaking, trench prep, and demolition', 'Breaking hard surfaces on compact jobsites'),
    description: 'Breaker attachments deliver impact force for concrete, rock, and demolition work. Verify hydraulic flow, pressure, tool size, and machine compatibility.',
    metaTitle: 'Breaker Attachments',
    metaDescription: 'Attachment-specific mapping for hydraulic breakers used with compatible compact equipment.'
  },
  {
    productId: 'rakes',
    type: 'attachment',
    productName: 'Rakes',
    slug: 'rakes',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator', 'Mini Skid Steer'],
    folderPath: 'rakes',
    imageFolder: 'rakes',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Rake attachment', 'Mini Excavator or Mini Skid Steer', 'Brush cleanup, root removal, grading cleanup, and debris sorting', 'Clearing and finish-prep work'),
    description: 'Rake attachments help clear brush, roots, and loose debris while leaving soil behind. Confirm width and mount compatibility with the carrier machine.',
    metaTitle: 'Rake Attachments',
    metaDescription: 'Attachment-specific mapping for rakes used with compatible compact equipment.'
  },
  {
    productId: 'blades',
    type: 'attachment',
    productName: 'Blades',
    slug: 'blades',
    category: 'Attachments',
    compatibleWith: ['Mini Skid Steer'],
    folderPath: 'blades',
    imageFolder: 'blades',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Blade attachment', 'Mini Skid Steer', 'Grading, leveling, backfilling, and light pushing', 'Surface prep and jobsite cleanup'),
    description: 'Blade attachments grade, level, backfill, and push loose material. Confirm machine capacity, mount, and blade width for the worksite.',
    metaTitle: 'Blade Attachments',
    metaDescription: 'Attachment-specific mapping for blades used with compatible compact equipment.'
  },
  {
    productId: 'trencher-attachment',
    type: 'attachment',
    productName: 'Trencher Attachment',
    slug: 'trencher-attachment',
    category: 'Attachments',
    compatibleWith: ['Mini Skid Steer'],
    folderPath: 'trencher-attachment',
    imageFolder: 'trencher-attachment',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Trencher attachment', 'Mini Skid Steer', 'Utility trenching, irrigation lines, drainage, and cable runs', 'Narrow trenching with a compatible carrier machine'),
    description: 'A trencher attachment cuts narrow trenches for utilities, drainage, irrigation, and cable runs. It is an attachment, not a standalone trencher machine.',
    metaTitle: 'Trencher Attachment',
    metaDescription: 'Attachment-specific mapping for trencher attachments used with compatible compact equipment.',
    aliases: ['trenchers-attachment', 'trencher-attachments']
  },
  {
    productId: 'forks',
    type: 'attachment',
    productName: 'Forks',
    slug: 'forks',
    category: 'Attachments',
    compatibleWith: ['Mini Skid Steer', 'Wheel Loader'],
    folderPath: 'forks',
    imageFolder: 'forks',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Fork attachment', 'Mini Skid Steer or Wheel Loader', 'Pallet handling, material staging, loading, and jobsite transport', 'Moving palletized or bundled material'),
    description: 'Fork attachments move palletized material, bundled supplies, and jobsite loads. Match fork capacity and connection style to the machine.',
    metaTitle: 'Fork Attachments',
    metaDescription: 'Attachment-specific mapping for forks used with compatible compact equipment.'
  },
  {
    productId: 'thumbs',
    type: 'attachment',
    productName: 'Thumbs',
    slug: 'thumbs',
    category: 'Attachments',
    compatibleWith: ['Mini Excavator'],
    folderPath: 'thumbs',
    imageFolder: 'thumbs',
    mainImage: '',
    galleryImages: [],
    specs: attachmentSpecs('Thumb attachment', 'Mini Excavator', 'Grabbing rocks, logs, brush, debris, and demolition material', 'Improving material control with an excavator bucket'),
    description: 'Thumb attachments pair with an excavator bucket to grip rocks, logs, brush, and demolition debris. Confirm pin size and machine compatibility.',
    metaTitle: 'Thumb Attachments',
    metaDescription: 'Attachment-specific mapping for thumbs used with compatible mini excavators.'
  }
];

export const slugifyProductIdentity = (raw: string): string =>
  (raw || '')
    .trim()
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/\b1\.8\b/g, '1-8')
    .replace(/\b2\.0\b/g, '2-0')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const productSlugFromUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const productIndex = parts.findIndex((part) => part === 'product');
    if (productIndex >= 0 && parts[productIndex + 1]) return slugifyProductIdentity(parts[productIndex + 1]);
    return slugifyProductIdentity(parts[parts.length - 1] || '');
  } catch {
    return '';
  }
};

export const normalizeProductType = (type: ProductTypeValue): ProductType | null => {
  if (type === 'equipment' || type === 'attachment') return type;
  return null;
};

const tokenized = (...parts: Array<string | null | undefined>) =>
  slugifyProductIdentity(parts.filter(Boolean).join(' '));

export const inferProductTypeFromText = (...parts: Array<string | null | undefined>): ProductType | null => {
  const text = tokenized(...parts);
  if (!text) return null;

  const hasAny = (tokens: string[]) => tokens.some((token) => {
    const normalized = slugifyProductIdentity(token);
    return text === normalized || text.startsWith(`${normalized}-`) || text.endsWith(`-${normalized}`) || text.includes(`-${normalized}-`);
  });

  if (
    hasAny([
      'attachment',
      'attachments',
      'bucket',
      'buckets',
      'auger',
      'augers',
      'grapple',
      'grapples',
      'breaker',
      'breakers',
      'rake',
      'rakes',
      'blade',
      'blades',
      'fork',
      'forks',
      'thumb',
      'thumbs',
    ]) ||
    text.includes('trencher-attachment') ||
    text.includes('trenchers-attachment')
  ) {
    return 'attachment';
  }

  if (
    hasAny([
      'mini-excavator',
      'mini-skid-steer',
      'wheel-loader',
      'dumper',
      'stone-crusher',
      'backhoe-loader',
      'towable-excavator',
      'excavator',
      'loader',
      'trencher',
      'typhon-terror',
      'typhon-kuvu',
    ])
  ) {
    return 'equipment';
  }

  return null;
};

export const mappingIdentityPaths = (mapping: ProductIdentityMapping): string[] =>
  [
    mapping.productId,
    mapping.slug,
    mapping.folderPath,
    mapping.imageFolder,
    ...(mapping.aliases || [])
  ]
    .map(slugifyProductIdentity)
    .filter(Boolean);

export const getProductIdentitySlug = (product: ProductIdentityInput): string =>
  slugifyProductIdentity(product.sourceSlug || productSlugFromUrl(product.url) || product.productId || '');

export const mappingForProductSlug = (slug: string | null | undefined): ProductIdentityMapping | null => {
  const normalized = slugifyProductIdentity(slug || '');
  if (!normalized) return null;
  return PRODUCT_IDENTITY_MAPPINGS.find((mapping) => mappingIdentityPaths(mapping).includes(normalized)) || null;
};

export const folderIdentityPaths = (folder: FolderIdentityInput): string[] => {
  const paths = [
    folder.product_id || '',
    folder.product_slug || '',
    folder.product_folder_path || '',
    folder.image_folder_path || '',
    productSlugFromUrl(folder.matched_product_url),
    folder.name
  ]
    .map(slugifyProductIdentity)
    .filter(Boolean);
  return [...new Set(paths)];
};

export const mappingForFolder = (
  folder: FolderIdentityInput,
  requiredType?: ProductType | null,
): ProductIdentityMapping | null => {
  const candidates = new Set(folderIdentityPaths(folder));
  return PRODUCT_IDENTITY_MAPPINGS.find((mapping) => {
    if (requiredType && mapping.type !== requiredType) return false;
    return mappingIdentityPaths(mapping).some((path) => candidates.has(path));
  }) || null;
};

export const getFolderProductType = (folder: FolderIdentityInput): ProductType | null =>
  normalizeProductType(folder.product_type) || mappingForFolder(folder)?.type || null;

export const getProductType = (product: ProductIdentityInput): ProductType | null =>
  mappingForProductSlug(getProductIdentitySlug(product))?.type ||
  normalizeProductType(product.productType) ||
  normalizeProductType(product.product_type) ||
  inferProductTypeFromText(product.category, product.title, product.url);

export const productTypesMatch = (
  folder: FolderIdentityInput,
  product: ProductIdentityInput,
): boolean => {
  const folderType = getFolderProductType(folder);
  const productType = getProductType(product);
  return !!folderType && !!productType && folderType === productType;
};

export function resolveExactProductMatch<T extends ProductIdentityInput>(
  folder: FolderIdentityInput,
  products: T[],
): ExactIdentityMatch<T> | null {
  const folderType = getFolderProductType(folder);
  if (!folderType) return null;

  const productsBySlug = new Map<string, T>();
  const productsByUrl = new Map<string, T>();
  for (const product of products) {
    if (getProductType(product) !== folderType) continue;

    // Check machine category compatibility
    const folderMC = folder.machine_category;
    const productMC = inferMachineCategory(product.title, getProductType(product));
    if (folderMC && productMC && folderMC.toLowerCase() !== productMC.toLowerCase()) continue;

    const slug = getProductIdentitySlug(product);
    if (slug && !productsBySlug.has(slug)) productsBySlug.set(slug, product);
    if (product.url) productsByUrl.set(product.url.split('#')[0].split('?')[0], product);
  }

  const verifiedUrl = (folder.matched_product_url || '').split('#')[0].split('?')[0];
  if (verifiedUrl && productsByUrl.has(verifiedUrl)) {
    const product = productsByUrl.get(verifiedUrl)!;
    const slug = getProductIdentitySlug(product);
    return { product, confidence: 100, reason: 'verified_url', productId: slug, slug, productType: folderType };
  }

  const explicitProductId = slugifyProductIdentity(folder.product_id || '');
  if (explicitProductId && productsBySlug.has(explicitProductId)) {
    return {
      product: productsBySlug.get(explicitProductId)!,
      confidence: 100,
      reason: 'product_id',
      productId: explicitProductId,
      slug: explicitProductId,
      productType: folderType
    };
  }

  const explicitSlug = slugifyProductIdentity(folder.product_slug || '');
  if (explicitSlug && productsBySlug.has(explicitSlug)) {
    return {
      product: productsBySlug.get(explicitSlug)!,
      confidence: 100,
      reason: 'product_slug',
      productId: explicitSlug,
      slug: explicitSlug,
      productType: folderType
    };
  }

  const mapping = mappingForFolder(folder, folderType);
  if (mapping) {
    const slug = slugifyProductIdentity(mapping.slug);
    const product = productsBySlug.get(slug);
    if (product) {
      return {
        product,
        confidence: 100,
        reason: 'mapping_file',
        productId: mapping.productId,
        slug,
        productType: folderType
      };
    }
  }

  for (const folderPath of folderIdentityPaths(folder)) {
    const product = productsBySlug.get(folderPath);
    if (product) {
      return {
        product,
        confidence: 100,
        reason: 'folder_path_slug',
        productId: folderPath,
        slug: folderPath,
        productType: folderType
      };
    }
  }

  return null;
}

export const exactIdentityConfidence = (
  folder: FolderIdentityInput,
  product: ProductIdentityInput,
): number => {
  if (!productTypesMatch(folder, product)) return 0;

  // Check machine category compatibility
  const folderMC = folder.machine_category;
  const productMC = inferMachineCategory(product.title, getProductType(product));
  if (folderMC && productMC && folderMC.toLowerCase() !== productMC.toLowerCase()) {
    return 0;
  }

  const productSlug = getProductIdentitySlug(product);
  if (!productSlug) return 0;
  if (slugifyProductIdentity(folder.product_id || '') === productSlug) return 100;
  if (slugifyProductIdentity(folder.product_slug || '') === productSlug) return 100;
  if (productSlugFromUrl(folder.matched_product_url) === productSlug) return 100;
  const mapping = mappingForFolder(folder, getFolderProductType(folder));
  if (mapping && slugifyProductIdentity(mapping.slug) === productSlug) return 100;
  return folderIdentityPaths(folder).includes(productSlug) ? 100 : 0;
};

export const productTypeLabel = (type: ProductTypeValue): string => {
  const normalized = normalizeProductType(type);
  if (normalized === 'equipment') return 'Equipment';
  if (normalized === 'attachment') return 'Attachment';
  return 'Needs Type';
};

export const inferMachineCategory = (title: string, productType?: string | null): string | null => {
  const normType = productType ? productType.toLowerCase() : '';
  const t = title.toLowerCase();

  if (normType === 'equipment') {
    if (t.includes('towable excavator')) return 'Towable Excavator';
    if (t.includes('mini excavator') || t.includes('excavator')) return 'Mini Excavator';
    if (t.includes('skid steer') || t.includes('stomp')) return 'Skid Steer';
    if (t.includes('forklift') || t.includes('vigor')) return 'Forklift';
    if (t.includes('road roller') || t.includes('roller')) return 'Road Roller';
    if (t.includes('backhoe')) return 'Backhoe Loader';
    if (t.includes('wheel loader') || t.includes('skoop')) return 'Wheel Loader';
    if (t.includes('scissor lift')) return 'Scissor Lift';
    if (t.includes('stone crusher') || t.includes('crusher')) return 'Stone Crusher';
    if (t.includes('dumper')) return 'Dumper';
    if (t.includes('trencher')) return 'Trencher';
  } else if (normType === 'attachment') {
    if (t.includes('mini excavator') || t.includes('excavator')) return 'Mini Excavator';
    if (t.includes('skid steer') || t.includes('stomp')) return 'Skid Steer';
    if (t.includes('wheel loader') || t.includes('skoop')) return 'Wheel Loader';
  } else {
    if (t.includes('towable excavator')) return 'Towable Excavator';
    if (t.includes('mini excavator') || t.includes('excavator')) return 'Mini Excavator';
    if (t.includes('skid steer') || t.includes('stomp')) return 'Skid Steer';
    if (t.includes('forklift') || t.includes('vigor')) return 'Forklift';
    if (t.includes('road roller') || t.includes('roller')) return 'Road Roller';
    if (t.includes('backhoe')) return 'Backhoe Loader';
    if (t.includes('wheel loader') || t.includes('skoop')) return 'Wheel Loader';
    if (t.includes('scissor lift')) return 'Scissor Lift';
    if (t.includes('stone crusher') || t.includes('crusher')) return 'Stone Crusher';
    if (t.includes('dumper')) return 'Dumper';
    if (t.includes('trencher')) return 'Trencher';
  }
  return null;
};
