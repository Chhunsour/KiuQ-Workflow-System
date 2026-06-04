import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { optimizeImage } from '@/utils/imageOptimizer';

// ── Types ────────────────────────────────────────────────────────────

export type CmsProductStatus = 'draft' | 'published';

export interface CmsProductImage {
  url: string;
  alt?: string;
}
export interface CmsProductSpec {
  label: string;
  value: string;
}
export interface CmsProductFeature {
  title: string;
  detail?: string;
}
export interface CmsProductAttachment {
  url: string;
  label: string;
}
export interface CmsProductFaq {
  question: string;
  answer: string;
}

export interface CmsProduct {
  id: string;
  productName: string;
  slug: string;
  category: string;
  shortDescription: string;
  fullDescription: string;
  productImages: CmsProductImage[];
  price: number | null;
  specs: CmsProductSpec[];
  features: CmsProductFeature[];
  attachments: CmsProductAttachment[];
  faq: CmsProductFaq[];
  seoTitle: string;
  seoDescription: string;
  status: CmsProductStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Patch shape used by createProduct + updateProduct. Every field is
 *  optional so callers can submit incremental edits. */
export type CmsProductInput = Partial<Omit<CmsProduct, 'id' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt' | 'publishedAt'>>;

// ── Row mapper ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToProduct = (r: any): CmsProduct => ({
  id:               r.id,
  productName:      r.product_name ?? '',
  slug:             r.slug ?? '',
  category:         r.category ?? '',
  shortDescription: r.short_description ?? '',
  fullDescription:  r.full_description ?? '',
  productImages:    Array.isArray(r.product_images) ? r.product_images : [],
  price:            r.price !== null && r.price !== undefined ? Number(r.price) : null,
  specs:            Array.isArray(r.specs) ? r.specs : [],
  features:         Array.isArray(r.features) ? r.features : [],
  attachments:      Array.isArray(r.attachments) ? r.attachments : [],
  faq:              Array.isArray(r.faq) ? r.faq : [],
  seoTitle:         r.seo_title ?? '',
  seoDescription:   r.seo_description ?? '',
  status:           (r.status ?? 'draft') as CmsProductStatus,
  createdBy:        r.created_by ?? null,
  updatedBy:        r.updated_by ?? null,
  createdAt:        r.created_at,
  updatedAt:        r.updated_at,
  publishedAt:      r.published_at ?? null,
});

/** Translate the camelCase patch back to the snake_case columns we
 *  send to Supabase. Only includes keys the caller actually provided
 *  so we never accidentally null out a column. */
const inputToRow = (input: CmsProductInput): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (input.productName      !== undefined) row['product_name']      = input.productName;
  if (input.slug             !== undefined) row['slug']              = input.slug;
  if (input.category         !== undefined) row['category']          = input.category;
  if (input.shortDescription !== undefined) row['short_description'] = input.shortDescription;
  if (input.fullDescription  !== undefined) row['full_description']  = input.fullDescription;
  if (input.productImages    !== undefined) row['product_images']    = input.productImages;
  if (input.price            !== undefined) row['price']             = input.price;
  if (input.specs            !== undefined) row['specs']             = input.specs;
  if (input.features         !== undefined) row['features']          = input.features;
  if (input.attachments      !== undefined) row['attachments']       = input.attachments;
  if (input.faq              !== undefined) row['faq']               = input.faq;
  if (input.seoTitle         !== undefined) row['seo_title']         = input.seoTitle;
  if (input.seoDescription   !== undefined) row['seo_description']   = input.seoDescription;
  if (input.status           !== undefined) row['status']            = input.status;
  return row;
};

// ── Slug helper ──────────────────────────────────────────────────────

/** Lowercase URL-safe slug. Empty input → "untitled". */
export const slugify = (raw: string): string => {
  const s = (raw || '').trim().toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'untitled';
};

// ── Store ────────────────────────────────────────────────────────────

const CMS_BUCKET = 'cms-media';

export const useCmsProductsStore = defineStore('cmsProducts', () => {
  const products = ref<CmsProduct[]>([]);
  const loading  = ref(false);
  const error    = ref<string | null>(null);

  // ── Permission helpers (mirror SQL RLS; UI checks them before
  //    surfacing buttons to avoid pointless 403s). ──────────────────
  const canPublish = (): boolean => {
    const auth = useAuthStore();
    return auth.isAdmin || auth.isAssistantHead;
  };
  const canDelete = (): boolean => {
    const auth = useAuthStore();
    return auth.isAdmin;
  };
  /** Anyone signed in who isn't a Quality Checker can at least create
   *  drafts. RLS still has the final word on the server. */
  const canEdit = (): boolean => {
    const auth = useAuthStore();
    if (auth.isQualityChecker) return false;
    return auth.isAdmin || auth.isAssistantHead || auth.isMember;
  };

  // ── Fetch ──────────────────────────────────────────────────────────

  const fetchProducts = async () => {
    if (!supabaseConfigured) return;
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await supabase
        .from('cms_products')
        .select('id,product_name,slug,category,short_description,full_description,product_images,price,specs,features,attachments,faq,seo_title,seo_description,status,created_by,updated_by,created_at,updated_at,published_at')
        .order('updated_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      products.value = (data ?? []).map(rowToProduct);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load products.';
    } finally {
      loading.value = false;
    }
  };

  const fetchProductById = async (id: string): Promise<CmsProduct | null> => {
    if (!supabaseConfigured) return null;
    const { data, error: err } = await supabase
      .from('cms_products')
      .select('id,product_name,slug,category,short_description,full_description,product_images,price,specs,features,attachments,faq,seo_title,seo_description,status,created_by,updated_by,created_at,updated_at,published_at')
      .eq('id', id)
      .maybeSingle();
    if (err) {
      if (import.meta.env.DEV) console.warn('[cmsProducts] fetchProductById', err.message);
      return null;
    }
    if (!data) return null;
    const product = rowToProduct(data);
    // Keep the local cache fresh too so list + edit views stay aligned.
    const idx = products.value.findIndex((p) => p.id === product.id);
    if (idx !== -1) products.value[idx] = product;
    return product;
  };

  // ── Create / update / delete ───────────────────────────────────────

  const createProduct = async (input: CmsProductInput): Promise<CmsProduct | null> => {
    if (!supabaseConfigured) return null;
    if (!canEdit()) { error.value = 'You do not have permission to create products.'; return null; }
    const auth = useAuthStore();
    const uid = auth.user?.id ?? null;

    // Team Members can only create drafts. Force the status here so an
    // accidental UI state can't try to insert 'published' and 403.
    const status: CmsProductStatus = canPublish() ? (input.status ?? 'draft') : 'draft';

    const row: Record<string, unknown> = {
      ...inputToRow({ ...input, status }),
      // Required column with no default
      product_name: input.productName ?? 'Untitled product',
      slug:         input.slug ? slugify(input.slug) : slugify(input.productName ?? ''),
      created_by:   uid,
      updated_by:   uid,
    };

    const { data, error: err } = await supabase
      .from('cms_products')
      .insert(row)
      .select()
      .single();

    if (err || !data) {
      error.value = err?.message ?? 'Could not create product.';
      return null;
    }
    const product = rowToProduct(data);
    products.value = [product, ...products.value];
    return product;
  };

  const updateProduct = async (id: string, input: CmsProductInput): Promise<CmsProduct | null> => {
    if (!supabaseConfigured) return null;
    if (!canEdit()) { error.value = 'You do not have permission to edit products.'; return null; }
    const auth = useAuthStore();
    const uid = auth.user?.id ?? null;

    // Team Members can never set status='published' on update. Block
    // here even though RLS would; gives a clearer error than a 403.
    if (input.status === 'published' && !canPublish()) {
      error.value = 'Only Head, Supervisor, or Assistant Head can publish a product.';
      return null;
    }

    const row: Record<string, unknown> = {
      ...inputToRow(input),
      updated_by: uid,
    };
    // If a slug was supplied, normalize it.
    if (input.slug !== undefined) row['slug'] = slugify(input.slug);

    const { data, error: err } = await supabase
      .from('cms_products')
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (err || !data) {
      error.value = err?.message ?? 'Could not update product.';
      return null;
    }
    const product = rowToProduct(data);
    const idx = products.value.findIndex((p) => p.id === product.id);
    if (idx !== -1) products.value[idx] = product;
    else products.value = [product, ...products.value];
    return product;
  };

  const deleteProduct = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    if (!canDelete()) { error.value = 'Only Head/Supervisor can delete products.'; return false; }
    const { error: err } = await supabase
      .from('cms_products')
      .delete()
      .eq('id', id);
    if (err) { error.value = err.message; return false; }
    products.value = products.value.filter((p) => p.id !== id);
    return true;
  };

  // ── Publish / unpublish (one-step toggle for permitted roles) ─────

  const publishProduct = async (id: string): Promise<CmsProduct | null> => {
    if (!canPublish()) { error.value = 'You do not have permission to publish.'; return null; }
    return updateProduct(id, { status: 'published' });
  };

  const unpublishProduct = async (id: string): Promise<CmsProduct | null> => {
    if (!canPublish()) { error.value = 'You do not have permission to unpublish.'; return null; }
    return updateProduct(id, { status: 'draft' });
  };

  // ── Image upload ───────────────────────────────────────────────────

  /**
   * Upload a single image to the cms-media public bucket. Returns the
   * public URL the editor can append to product_images, or null on
   * error (with the message written to `error`). Path convention is
   * "<uid>/<timestamp>-<rand>-<safe-name>" to match the storage RLS.
   *
   * Any PNG / JPG / GIF (static) is automatically re-encoded to WebP in
   * the browser before upload so the file an external AI image API
   * fetches is small, fast, and already in a modern format. Animated
   * GIFs and SVGs skip conversion to avoid losing motion / vector data.
   */
  const uploadProductImage = async (file: File): Promise<string | null> => {
    if (!supabaseConfigured) return null;
    if (!canEdit()) { error.value = 'You do not have permission to upload media.'; return null; }
    const auth = useAuthStore();
    const uid = auth.user?.id;
    if (!uid) { error.value = 'Not signed in.'; return null; }
    if (!file.type.startsWith('image/')) {
      error.value = 'Please upload an image file.';
      return null;
    }

    // ─── Auto-convert to WebP ────────────────────────────────────────
    // Skip formats where conversion would harm the asset:
    //   - image/gif → animated GIFs would lose animation
    //   - image/svg+xml → SVG is already vector / tiny
    //   - image/webp → already in target format
    let toUpload = file;
    const skipConversion =
      file.type === 'image/webp'
      || file.type === 'image/gif'
      || file.type === 'image/svg+xml';

    if (!skipConversion) {
      try {
        const result = await optimizeImage(file, {
          // Larger limits than the default task-thumbnail preset so AI
          // image generators still get plenty of detail to work with.
          maxWidth: 2048,
          maxHeight: 2048,
          targetSizeKB: 350,
          maxSizeKB: 600,
          initialQuality: 0.9,
          minQuality: 0.7,
          outputType: 'image/webp'
        });
        toUpload = result.file;
      } catch (err) {
        // If conversion fails for any reason (CORS-tainted canvas,
        // weird format), fall back to the original file so the user
        // is never blocked from uploading.
        console.warn('[cmsProducts] WebP conversion failed, uploading original', err);
      }
    }

    const safeName = toUpload.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const random   = Math.random().toString(36).slice(2, 9);
    const path     = `${uid}/${Date.now()}-${random}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(CMS_BUCKET)
      .upload(path, toUpload, {
        cacheControl: '3600',
        upsert: false,
        contentType: toUpload.type,
      });
    if (uploadErr) {
      error.value = uploadErr.message;
      return null;
    }

    const { data } = supabase.storage.from(CMS_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  };

  // ── Realtime handler (registered by usePageRealtime on CMS pages) ─

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRealtimePayload = (payload: { eventType: string; table: string; new: any; old: any }) => {
    if (payload.table !== 'cms_products') return;
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const product = rowToProduct(newRow);
      const idx = products.value.findIndex((p) => p.id === product.id);
      if (idx !== -1) products.value[idx] = product;
      else products.value = [product, ...products.value];
    } else if (eventType === 'DELETE') {
      const id = oldRow?.id || newRow?.id;
      if (id) products.value = products.value.filter((p) => p.id !== id);
    }
  };

  return {
    products,
    loading,
    error,
    canPublish,
    canDelete,
    canEdit,
    fetchProducts,
    fetchProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    publishProduct,
    unpublishProduct,
    uploadProductImage,
    handleRealtimePayload,
  };
});
