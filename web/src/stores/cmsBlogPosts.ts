import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { optimizeImage } from '@/utils/imageOptimizer';

// ── Types ─────────────────────────────────────────────────────────────

export type CmsBlogPostStatus = 'draft' | 'published';

export interface CmsBlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: string;
  websiteId: string | null;
  content: string;
  featuredImage: string;
  featuredImageAlt: string;
  author: string;
  publishDate: string | null;
  seoTitle: string;
  seoDescription: string;
  status: CmsBlogPostStatus;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archived: boolean;
}

export type CmsBlogPostInput = Partial<
  Omit<CmsBlogPost, 'id' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt' | 'publishedAt'>
>;

// ── Row mapper ────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const rowToPost = (r: any): CmsBlogPost => ({
  id:               r.id,
  title:            r.title ?? '',
  slug:             r.slug ?? '',
  excerpt:          r.excerpt ?? '',
  category:         r.category ?? '',
  websiteId:        r.website_id ?? null,
  content:          r.content ?? '',
  featuredImage:    r.featured_image ?? '',
  featuredImageAlt: r.featured_image_alt ?? '',
  author:           r.author ?? '',
  publishDate:      r.publish_date ?? null,
  seoTitle:         r.seo_title ?? '',
  seoDescription:   r.seo_description ?? '',
  status:           (r.status ?? 'draft') as CmsBlogPostStatus,
  createdBy:        r.created_by ?? null,
  updatedBy:        r.updated_by ?? null,
  createdAt:        r.created_at,
  updatedAt:        r.updated_at,
  publishedAt:      r.published_at ?? null,
  archived:         r.archived ?? false,
});

const inputToRow = (input: CmsBlogPostInput): Record<string, unknown> => {
  const row: Record<string, unknown> = {};
  if (input.title            !== undefined) row['title']             = input.title;
  if (input.slug             !== undefined) row['slug']              = input.slug;
  if (input.excerpt          !== undefined) row['excerpt']           = input.excerpt;
  if (input.category         !== undefined) row['category']          = input.category;
  if (input.websiteId        !== undefined) row['website_id']        = input.websiteId;
  if (input.content          !== undefined) row['content']           = input.content;
  if (input.featuredImage    !== undefined) row['featured_image']    = input.featuredImage;
  if (input.featuredImageAlt !== undefined) row['featured_image_alt']= input.featuredImageAlt;
  if (input.author           !== undefined) row['author']            = input.author;
  if (input.publishDate      !== undefined) row['publish_date']      = input.publishDate;
  if (input.seoTitle         !== undefined) row['seo_title']         = input.seoTitle;
  if (input.seoDescription   !== undefined) row['seo_description']   = input.seoDescription;
  if (input.status           !== undefined) row['status']            = input.status;
  return row;
};

// ── Slug helper ───────────────────────────────────────────────────────

export const slugify = (raw: string): string => {
  const s = (raw || '').trim().toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'untitled';
};

// ── Store ─────────────────────────────────────────────────────────────

const CMS_BUCKET = 'cms-media';

const SELECT_COLS = 'id,title,slug,excerpt,category,website_id,content,featured_image,featured_image_alt,author,publish_date,seo_title,seo_description,status,created_by,updated_by,created_at,updated_at,published_at,archived';

export const useCmsBlogPostsStore = defineStore('cmsBlogPosts', () => {
  const posts   = ref<CmsBlogPost[]>([]);
  const loading = ref(false);
  const error   = ref<string | null>(null);

  // ── Permission helpers ─────────────────────────────────────────────
  const canPublish = (): boolean => {
    const auth = useAuthStore();
    return auth.isAdmin || auth.isAssistantHead || auth.isMember;
  };
  const canDelete = (): boolean => {
    const auth = useAuthStore();
    return auth.isAdmin;
  };
  const canEdit = (): boolean => {
    const auth = useAuthStore();
    if (auth.isQualityChecker) return false;
    return auth.isAdmin || auth.isAssistantHead || auth.isMember;
  };

  // ── Fetch ──────────────────────────────────────────────────────────
  const fetchPosts = async () => {
    if (!supabaseConfigured) return;
    loading.value = true;
    error.value   = null;
    try {
      const { data, error: err } = await supabase
        .from('cms_blog_posts')
        .select(SELECT_COLS)
        .order('updated_at', { ascending: false });
      if (err) { error.value = err.message; return; }
      posts.value = (data ?? []).map(rowToPost);
    } catch (err: unknown) {
      error.value = err instanceof Error ? err.message : 'Failed to load posts.';
    } finally {
      loading.value = false;
    }
  };

  const fetchPostById = async (id: string): Promise<CmsBlogPost | null> => {
    if (!supabaseConfigured) return null;
    const { data, error: err } = await supabase
      .from('cms_blog_posts')
      .select(SELECT_COLS)
      .eq('id', id)
      .maybeSingle();
    if (err || !data) return null;
    const post = rowToPost(data);
    const idx = posts.value.findIndex((p) => p.id === post.id);
    if (idx !== -1) posts.value[idx] = post;
    return post;
  };

  // ── Create / update / delete ───────────────────────────────────────
  const createPost = async (input: CmsBlogPostInput): Promise<CmsBlogPost | null> => {
    if (!supabaseConfigured) return null;
    if (!canEdit()) { error.value = 'You do not have permission to create posts.'; return null; }
    const auth = useAuthStore();
    const uid = auth.user?.id ?? null;
    const status: CmsBlogPostStatus = canPublish() ? (input.status ?? 'draft') : 'draft';
    const row: Record<string, unknown> = {
      ...inputToRow({ ...input, status }),
      title:      input.title ?? 'Untitled post',
      slug:       input.slug ? slugify(input.slug) : slugify(input.title ?? ''),
      created_by: uid,
      updated_by: uid,
    };
    const { data, error: err } = await supabase
      .from('cms_blog_posts')
      .insert(row)
      .select()
      .single();
    if (err || !data) { error.value = err?.message ?? 'Could not create post.'; return null; }
    const post = rowToPost(data);
    posts.value = [post, ...posts.value];
    return post;
  };

  const updatePost = async (id: string, input: CmsBlogPostInput): Promise<CmsBlogPost | null> => {
    if (!supabaseConfigured) return null;
    if (!canEdit()) { error.value = 'You do not have permission to edit posts.'; return null; }
    if (input.status === 'published' && !canPublish()) {
      error.value = 'You do not have permission to publish a post.';
      return null;
    }
    const auth = useAuthStore();
    const uid = auth.user?.id ?? null;
    const row: Record<string, unknown> = { ...inputToRow(input), updated_by: uid };
    if (input.slug !== undefined) row['slug'] = slugify(input.slug);
    const { data, error: err } = await supabase
      .from('cms_blog_posts')
      .update(row)
      .eq('id', id)
      .select()
      .single();
    if (err || !data) { error.value = err?.message ?? 'Could not update post.'; return null; }
    const post = rowToPost(data);
    const idx = posts.value.findIndex((p) => p.id === post.id);
    if (idx !== -1) posts.value[idx] = post;
    else posts.value = [post, ...posts.value];
    return post;
  };

  const deletePost = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    if (!canDelete()) { error.value = 'Only Head/Supervisor can delete posts.'; return false; }
    const { error: err } = await supabase.from('cms_blog_posts').delete().eq('id', id);
    if (err) { error.value = err.message; return false; }
    posts.value = posts.value.filter((p) => p.id !== id);
    return true;
  };

  // ── Publish / unpublish ────────────────────────────────────────────
  const publishPost = async (id: string): Promise<CmsBlogPost | null> => {
    if (!canPublish()) { error.value = 'You do not have permission to publish.'; return null; }
    return updatePost(id, { status: 'published' });
  };

  // ── Archive / restore (hide from views + sync, reversible) ───────────
  const setArchived = async (id: string, archived: boolean): Promise<boolean> => {
    if (!canEdit()) { error.value = 'You do not have permission to archive posts.'; return false; }
    if (!supabaseConfigured) return false;
    const { data, error: err } = await supabase
      .from('cms_blog_posts').update({ archived }).eq('id', id).select(SELECT_COLS).single();
    if (err || !data) { error.value = err?.message ?? 'Could not update post.'; return false; }
    const post = rowToPost(data);
    const idx = posts.value.findIndex((p) => p.id === id);
    if (idx !== -1) posts.value[idx] = post;
    return true;
  };
  const archivePost = (id: string) => setArchived(id, true);
  const unarchivePost = (id: string) => setArchived(id, false);

  const unpublishPost = async (id: string): Promise<CmsBlogPost | null> => {
    if (!canPublish()) { error.value = 'You do not have permission to unpublish.'; return null; }
    return updatePost(id, { status: 'draft' });
  };

  // ── Image upload ───────────────────────────────────────────────────
  const uploadPostImage = async (file: File): Promise<string | null> => {
    if (!supabaseConfigured) return null;
    if (!canEdit()) { error.value = 'You do not have permission to upload media.'; return null; }
    const auth = useAuthStore();
    const uid = auth.user?.id;
    if (!uid) { error.value = 'Not signed in.'; return null; }
    if (!file.type.startsWith('image/')) { error.value = 'Please upload an image file.'; return null; }

    let toUpload = file;
    const skipConversion =
      file.type === 'image/webp'
      || file.type === 'image/gif'
      || file.type === 'image/svg+xml';

    if (!skipConversion) {
      try {
        const result = await optimizeImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          targetSizeKB: 300,
          maxSizeKB: 500,
          initialQuality: 0.88,
          minQuality: 0.65,
          outputType: 'image/webp',
        });
        toUpload = result.file;
      } catch (err) {
        console.warn('[cmsBlogPosts] WebP conversion failed, uploading original', err);
      }
    }

    const safeName = toUpload.name.replace(/[^a-zA-Z0-9._-]+/g, '_');
    const random   = Math.random().toString(36).slice(2, 9);
    const uploadPath = `${uid}/blog/${Date.now()}-${random}-${safeName}`;

    const { error: uploadErr } = await supabase.storage
      .from(CMS_BUCKET)
      .upload(uploadPath, toUpload, { cacheControl: '3600', upsert: false, contentType: toUpload.type });
    if (uploadErr) { error.value = uploadErr.message; return null; }

    const { data } = supabase.storage.from(CMS_BUCKET).getPublicUrl(uploadPath);
    return data.publicUrl;
  };

  // ── Realtime ───────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleRealtimePayload = (payload: { eventType: string; table: string; new: any; old: any }) => {
    if (payload.table !== 'cms_blog_posts') return;
    const { eventType, new: newRow, old: oldRow } = payload;
    if (eventType === 'INSERT' || eventType === 'UPDATE') {
      const post = rowToPost(newRow);
      const idx = posts.value.findIndex((p) => p.id === post.id);
      if (idx !== -1) posts.value[idx] = post;
      else posts.value = [post, ...posts.value];
    } else if (eventType === 'DELETE') {
      const id = oldRow?.id || newRow?.id;
      if (id) posts.value = posts.value.filter((p) => p.id !== id);
    }
  };

  // ── Distribution: push published posts to connected sites (blog-sync) ──
  const syncBlogs = async (
    websiteIds?: string[]
  ): Promise<{ ok: boolean; success: number; failed: number; posts: number; results: Array<{ website: string; ok: boolean; count?: number; error?: string }> }> => {
    if (!supabaseConfigured) throw new Error('Supabase is not configured.');
    const { data, error: err } = await supabase.functions.invoke('blog-sync', {
      body: { action: 'sync', postIds: 'all', websiteIds: websiteIds ?? 'all' },
    });
    if (err) {
      const ctx = (err as { context?: { error?: string } })?.context;
      throw new Error(ctx?.error || err.message || 'Blog sync failed.');
    }
    return data as { ok: boolean; success: number; failed: number; posts: number; results: Array<{ website: string; ok: boolean; count?: number; error?: string }> };
  };

  return {
    posts,
    loading,
    error,
    canPublish,
    canDelete,
    canEdit,
    fetchPosts,
    fetchPostById,
    createPost,
    updatePost,
    deletePost,
    publishPost,
    unpublishPost,
    archivePost,
    unarchivePost,
    uploadPostImage,
    syncBlogs,
    handleRealtimePayload,
  };
});
