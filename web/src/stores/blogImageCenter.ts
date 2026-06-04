import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

// ── Types ───────────────────────────────────────────────────────────────
export interface BlogImagePrompt {
  id: string;
  websiteId: string;
  templateName: string;
  promptContent: string;
  position: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogImageWorkflow {
  id: string;
  websiteId: string;
  instructions: string;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BlogImage {
  id: string;
  websiteId: string;
  imageUrl: string;
  title: string;
  machineType: string;
  tags: string[];
  approved: boolean;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Row types (snake_case from Supabase) ────────────────────────────────
interface BlogImagePromptRow {
  id: string;
  website_id: string;
  template_name: string;
  prompt_content: string;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogImageWorkflowRow {
  id: string;
  website_id: string;
  instructions: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface BlogImageRow {
  id: string;
  website_id: string;
  image_url: string;
  title: string;
  machine_type: string;
  tags: string[];
  approved: boolean;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Row mappers ─────────────────────────────────────────────────────────
const rowToPrompt = (r: BlogImagePromptRow): BlogImagePrompt => ({
  id: r.id,
  websiteId: r.website_id,
  templateName: r.template_name ?? '',
  promptContent: r.prompt_content ?? '',
  position: r.position ?? 0,
  createdBy: r.created_by,
  createdAt: r.created_at ?? '',
  updatedAt: r.updated_at ?? ''
});

const rowToWorkflow = (r: BlogImageWorkflowRow): BlogImageWorkflow => ({
  id: r.id,
  websiteId: r.website_id,
  instructions: r.instructions ?? '',
  createdBy: r.created_by,
  createdAt: r.created_at ?? '',
  updatedAt: r.updated_at ?? ''
});

const rowToImage = (r: BlogImageRow): BlogImage => ({
  id: r.id,
  websiteId: r.website_id,
  imageUrl: r.image_url ?? '',
  title: r.title ?? '',
  machineType: r.machine_type ?? '',
  tags: Array.isArray(r.tags) ? r.tags : [],
  approved: !!r.approved,
  uploadedBy: r.uploaded_by,
  createdAt: r.created_at ?? '',
  updatedAt: r.updated_at ?? ''
});

// ── Store ───────────────────────────────────────────────────────────────
export const useBlogImageCenterStore = defineStore('blogImageCenter', () => {
  const prompts = ref<BlogImagePrompt[]>([]);
  const workflows = ref<Record<string, BlogImageWorkflow>>({});
  const images = ref<BlogImage[]>([]);

  const loading = reactive({ prompts: false, workflows: false, images: false });
  const errors = reactive<{ prompts: string | null; workflows: string | null; images: string | null }>({
    prompts: null,
    workflows: null,
    images: null
  });

  // ── Derived ──
  const promptsByWebsite = (websiteId: string) =>
    prompts.value
      .filter((p) => p.websiteId === websiteId)
      .sort((a, b) => a.position - b.position);

  const promptCountByWebsite = computed(() => {
    const counts: Record<string, number> = {};
    for (const p of prompts.value) {
      counts[p.websiteId] = (counts[p.websiteId] || 0) + 1;
    }
    return counts;
  });

  // ── Fetch prompts ──
  const fetchAllPrompts = async () => {
    if (!supabaseConfigured) return;
    if (loading.prompts) return;
    loading.prompts = true;
    errors.prompts = null;
    try {
      const { data, error } = await supabase
        .from('blog_image_prompts')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;
      prompts.value = (data as BlogImagePromptRow[]).map(rowToPrompt);
    } catch (err) {
      console.error('[blogImageCenter] fetchAllPrompts', err);
      errors.prompts = 'Could not load prompt templates.';
    } finally {
      loading.prompts = false;
    }
  };

  const fetchPromptsForWebsite = async (websiteId: string) => {
    if (!supabaseConfigured) return;
    loading.prompts = true;
    errors.prompts = null;
    try {
      const { data, error } = await supabase
        .from('blog_image_prompts')
        .select('*')
        .eq('website_id', websiteId)
        .order('position', { ascending: true });
      if (error) throw error;
      const fetched = (data as BlogImagePromptRow[]).map(rowToPrompt);
      prompts.value = [
        ...prompts.value.filter((p) => p.websiteId !== websiteId),
        ...fetched
      ];
    } catch (err) {
      console.error('[blogImageCenter] fetchPromptsForWebsite', err);
      errors.prompts = 'Could not load prompt templates.';
    } finally {
      loading.prompts = false;
    }
  };

  // ── Fetch workflow ──
  const fetchWorkflow = async (websiteId: string) => {
    if (!supabaseConfigured) return;
    loading.workflows = true;
    errors.workflows = null;
    try {
      const { data, error } = await supabase
        .from('blog_image_workflows')
        .select('*')
        .eq('website_id', websiteId)
        .maybeSingle();
      if (error) throw error;
      if (data) {
        workflows.value = {
          ...workflows.value,
          [websiteId]: rowToWorkflow(data as BlogImageWorkflowRow)
        };
      }
    } catch (err) {
      console.error('[blogImageCenter] fetchWorkflow', err);
      errors.workflows = 'Could not load workflow instructions.';
    } finally {
      loading.workflows = false;
    }
  };

  // ── Upsert prompt ──
  const upsertPrompt = async (
    p: Partial<BlogImagePrompt> & { websiteId: string; templateName: string; promptContent: string },
    userId?: string | null
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    errors.prompts = null;
    const row: Record<string, unknown> = {
      website_id: p.websiteId,
      template_name: p.templateName,
      prompt_content: p.promptContent,
      position: p.position ?? 0
    };
    if (userId) row.created_by = userId;

    try {
      if (p.id) {
        const { error } = await supabase.from('blog_image_prompts').update(row).eq('id', p.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('blog_image_prompts').insert(row);
        if (error) throw error;
      }
      await fetchPromptsForWebsite(p.websiteId);
      return true;
    } catch (err) {
      console.error('[blogImageCenter] upsertPrompt', err);
      errors.prompts = 'Could not save prompt template.';
      return false;
    }
  };

  // ── Remove prompt ──
  const removePrompt = async (id: string, websiteId: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    errors.prompts = null;
    try {
      const { error } = await supabase.from('blog_image_prompts').delete().eq('id', id);
      if (error) throw error;
      prompts.value = prompts.value.filter((p) => p.id !== id);
      return true;
    } catch (err) {
      console.error('[blogImageCenter] removePrompt', err);
      errors.prompts = 'Could not delete prompt template.';
      return false;
    }
  };

  // ── Upsert workflow ──
  const upsertWorkflow = async (
    websiteId: string,
    instructions: string,
    userId?: string | null
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    errors.workflows = null;
    const existing = workflows.value[websiteId];

    try {
      if (existing?.id) {
        const { error } = await supabase
          .from('blog_image_workflows')
          .update({ instructions })
          .eq('id', existing.id);
         if (error) throw error;
      } else {
        const row: Record<string, unknown> = {
          website_id: websiteId,
          instructions
        };
        if (userId) row.created_by = userId;
        const { error } = await supabase.from('blog_image_workflows').insert(row);
        if (error) throw error;
      }
      await fetchWorkflow(websiteId);
      return true;
    } catch (err) {
      console.error('[blogImageCenter] upsertWorkflow', err);
      errors.workflows = 'Could not save workflow.';
      return false;
    }
  };

  // ── Fetch images ──
  const fetchImages = async () => {
    if (!supabaseConfigured) return;
    loading.images = true;
    errors.images = null;
    try {
      const { data, error } = await supabase
        .from('blog_images')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      images.value = (data as BlogImageRow[]).map(rowToImage);
    } catch (err) {
      console.error('[blogImageCenter] fetchImages', err);
      errors.images = 'Could not load image library.';
    } finally {
      loading.images = false;
    }
  };

  // ── Upload image ──
  const uploadImage = async (
    file: File,
    title: string,
    machineType: string,
    websiteId: string,
    tags: string[]
  ): Promise<BlogImage | null> => {
    if (!supabaseConfigured) return null;
    loading.images = true;
    errors.images = null;
    const auth = useAuthStore();
    const uid = auth.user?.id;
    if (!uid) {
      errors.images = 'Not signed in.';
      loading.images = false;
      return null;
    }
    if (!file.type.startsWith('image/')) {
      errors.images = 'Please upload an image file.';
      loading.images = false;
      return null;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const random = Math.random().toString(36).slice(2, 9);
    const path = `${uid}/${Date.now()}-${random}.${ext}`;

    try {
      // Upload to storage
      const { error: uploadErr } = await supabase.storage
        .from('blog-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(path);
      const imageUrl = urlData.publicUrl;

      // Insert into database
      const { data, error: dbErr } = await supabase
        .from('blog_images')
        .insert({
          website_id: websiteId,
          image_url: imageUrl,
          title,
          machine_type: machineType,
          tags,
          uploaded_by: uid,
          approved: false
        })
        .select()
        .single();

      if (dbErr) throw dbErr;
      const img = rowToImage(data as BlogImageRow);
      images.value = [img, ...images.value];
      return img;
    } catch (err: any) {
      console.error('[blogImageCenter] uploadImage', err);
      errors.images = err.message || 'Could not upload image.';
      return null;
    } finally {
      loading.images = false;
    }
  };

  // ── Update image ──
  const updateImage = async (
    id: string,
    updates: { title?: string; machineType?: string; websiteId?: string; tags?: string[]; approved?: boolean }
  ): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    errors.images = null;

    const row: Record<string, any> = {};
    if (updates.title !== undefined) row.title = updates.title;
    if (updates.machineType !== undefined) row.machine_type = updates.machineType;
    if (updates.websiteId !== undefined) row.website_id = updates.websiteId;
    if (updates.tags !== undefined) row.tags = updates.tags;
    if (updates.approved !== undefined) row.approved = updates.approved;

    try {
      const { error } = await supabase
        .from('blog_images')
        .update(row)
        .eq('id', id);
      if (error) throw error;

      const idx = images.value.findIndex(img => img.id === id);
      if (idx !== -1) {
        images.value[idx] = {
          ...images.value[idx],
          ...updates
        };
      }
      return true;
    } catch (err: any) {
      console.error('[blogImageCenter] updateImage', err);
      errors.images = err.message || 'Could not update image.';
      return false;
    }
  };

  // ── Delete image ──
  const deleteImage = async (id: string, imageUrl: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    errors.images = null;
    try {
      const { error: dbErr } = await supabase
        .from('blog_images')
        .delete()
        .eq('id', id);
      if (dbErr) throw dbErr;

      // Clean up storage file if it matches expected bucket path pattern
      const prefix = '/storage/v1/object/public/blog-images/';
      const idx = imageUrl.indexOf(prefix);
      if (idx !== -1) {
        const path = imageUrl.slice(idx + prefix.length);
        const { error: storageErr } = await supabase.storage
          .from('blog-images')
          .remove([path]);
        if (storageErr) {
          console.warn('[blogImageCenter] storage cleanup failed but DB record deleted', storageErr);
        }
      }

      images.value = images.value.filter(img => img.id !== id);
      return true;
    } catch (err: any) {
      console.error('[blogImageCenter] deleteImage', err);
      errors.images = err.message || 'Could not delete image.';
      return false;
    }
  };

  // ── Realtime handler ──
  const handleRealtimePayload = (payload: { eventType: string; table: string; new: any; old: any }) => {
    if (payload.table === 'blog_images') {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const img = rowToImage(newRow as BlogImageRow);
        const idx = images.value.findIndex((i) => i.id === img.id);
        if (idx !== -1) images.value[idx] = img;
        else images.value = [img, ...images.value];
      } else if (eventType === 'DELETE') {
        const id = oldRow?.id || newRow?.id;
        if (id) images.value = images.value.filter((i) => i.id !== id);
      }
    } else if (payload.table === 'blog_image_prompts') {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const p = rowToPrompt(newRow as BlogImagePromptRow);
        const idx = prompts.value.findIndex((item) => item.id === p.id);
        if (idx !== -1) prompts.value[idx] = p;
        else prompts.value.push(p);
      } else if (eventType === 'DELETE') {
        const id = oldRow?.id || newRow?.id;
        if (id) prompts.value = prompts.value.filter((item) => item.id !== id);
      }
    } else if (payload.table === 'blog_image_workflows') {
      const { eventType, new: newRow, old: oldRow } = payload;
      if (eventType === 'INSERT' || eventType === 'UPDATE') {
        const w = rowToWorkflow(newRow as BlogImageWorkflowRow);
        workflows.value = {
          ...workflows.value,
          [w.websiteId]: w
        };
      } else if (eventType === 'DELETE') {
        // Find which website this workflow belonged to
        const wId = Object.keys(workflows.value).find(key => workflows.value[key].id === (oldRow?.id || newRow?.id));
        if (wId) {
          const next = { ...workflows.value };
          delete next[wId];
          workflows.value = next;
        }
      }
    }
  };

  // ── Reset ──
  const reset = () => {
    prompts.value = [];
    workflows.value = {};
    images.value = [];
    loading.prompts = false;
    loading.workflows = false;
    loading.images = false;
    errors.prompts = null;
    errors.workflows = null;
    errors.images = null;
  };

  return {
    prompts,
    workflows,
    images,
    loading,
    errors,
    promptsByWebsite,
    promptCountByWebsite,
    fetchAllPrompts,
    fetchPromptsForWebsite,
    fetchWorkflow,
    upsertPrompt,
    removePrompt,
    upsertWorkflow,
    fetchImages,
    uploadImage,
    updateImage,
    deleteImage,
    handleRealtimePayload,
    reset
  };
});
