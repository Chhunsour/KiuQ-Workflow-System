import { defineStore } from 'pinia';
import { ref } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

// ── Types ────────────────────────────────────────────────────────────────────

export interface WorkflowEditableField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  helper?: string;
  options?: string[];
  defaultValue?: string;
}

export interface PromptWorkflowGroup {
  id: string;
  name: string;
  description: string;
  pageType: string;
  sortOrder: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptWorkflowTemplate {
  id: string;
  title: string;
  pageType: string;
  sectionType: string;
  promptType: string;
  outputType: string;
  shortDescription: string;
  templateBody: string;
  lockedRules: string;
  editableFields: WorkflowEditableField[];
  requiredWebsiteFields: string[];
  requiredProductDocs: boolean;
  status: 'draft' | 'approved';
  version: number;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromptUsageLog {
  id: string;
  userId: string;
  websiteId: string | null;
  promptId: string;
  productDocId: string | null;
  pageType: string;
  sectionType: string;
  copiedAt: string;
}

// ── Row converters ───────────────────────────────────────────────────────────

function rowToGroup(r: Record<string, unknown>): PromptWorkflowGroup {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string) ?? '',
    pageType: r.page_type as string,
    sortOrder: (r.sort_order as number) ?? 0,
    createdBy: (r.created_by as string | null) ?? null,
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? ''
  };
}

function rowToTemplate(r: Record<string, unknown>): PromptWorkflowTemplate {
  let editableFields: WorkflowEditableField[] = [];
  try {
    const raw = r.editable_fields;
    if (Array.isArray(raw)) editableFields = raw as WorkflowEditableField[];
  } catch {
    editableFields = [];
  }
  return {
    id: r.id as string,
    title: r.title as string,
    pageType: r.page_type as string,
    sectionType: (r.section_type as string) ?? '',
    promptType: (r.prompt_type as string) ?? 'section',
    outputType: (r.output_type as string) ?? 'elementor_section',
    shortDescription: (r.short_description as string) ?? '',
    templateBody: (r.template_body as string) ?? '',
    lockedRules: (r.locked_rules as string) ?? '',
    editableFields,
    requiredWebsiteFields: (r.required_website_fields as string[]) ?? [],
    requiredProductDocs: (r.required_product_docs as boolean) ?? false,
    status: (r.status as 'draft' | 'approved') ?? 'draft',
    version: (r.version as number) ?? 1,
    createdBy: (r.created_by as string | null) ?? null,
    updatedBy: (r.updated_by as string | null) ?? null,
    createdAt: (r.created_at as string) ?? '',
    updatedAt: (r.updated_at as string) ?? ''
  };
}

function templateToRow(t: Partial<PromptWorkflowTemplate>, userId: string) {
  return {
    title: t.title,
    page_type: t.pageType,
    section_type: t.sectionType ?? '',
    prompt_type: t.promptType ?? 'section',
    output_type: t.outputType ?? 'elementor_section',
    short_description: t.shortDescription ?? '',
    template_body: t.templateBody ?? '',
    locked_rules: t.lockedRules ?? '',
    editable_fields: t.editableFields ?? [],
    required_website_fields: t.requiredWebsiteFields ?? [],
    required_product_docs: t.requiredProductDocs ?? false,
    status: t.status ?? 'draft',
    version: t.version ?? 1,
    updated_by: userId
  };
}

// ── Store ────────────────────────────────────────────────────────────────────

export const usePromptWorkflowStore = defineStore('promptWorkflow', () => {
  const auth = useAuthStore();

  const groups = ref<PromptWorkflowGroup[]>([]);
  const templates = ref<PromptWorkflowTemplate[]>([]);
  const usageLogs = ref<PromptUsageLog[]>([]);

  const loadingGroups    = ref(false);
  const loadingTemplates = ref(false);
  const loadingUsage     = ref(false);
  const savingTemplate   = ref(false);

  const errorGroups    = ref<string | null>(null);
  const errorTemplates = ref<string | null>(null);
  const errorUsage     = ref<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchGroups = async (force = false) => {
    if (!supabaseConfigured) { errorGroups.value = 'Supabase not configured.'; return; }
    if (loadingGroups.value) return;
    if (!force && groups.value.length > 0) return;
    loadingGroups.value = true;
    errorGroups.value = null;
    try {
      const { data, error } = await supabase
        .from('prompt_workflow_groups')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      groups.value = ((data ?? []) as Record<string, unknown>[]).map(rowToGroup);
    } catch (e) {
      errorGroups.value = e instanceof Error ? e.message : 'Could not load page groups.';
    } finally {
      loadingGroups.value = false;
    }
  };

  const fetchTemplates = async (force = false) => {
    if (!supabaseConfigured) { errorTemplates.value = 'Supabase not configured.'; return; }
    if (loadingTemplates.value) return;
    if (!force && templates.value.length > 0) return;
    loadingTemplates.value = true;
    errorTemplates.value = null;
    try {
      const { data, error } = await supabase
        .from('prompt_workflow_templates')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      templates.value = ((data ?? []) as Record<string, unknown>[]).map(rowToTemplate);
    } catch (e) {
      errorTemplates.value = e instanceof Error ? e.message : 'Could not load prompt templates.';
    } finally {
      loadingTemplates.value = false;
    }
  };

  const fetchUsageLogs = async () => {
    if (!supabaseConfigured || !auth.user?.id) return;
    if (loadingUsage.value) return;
    loadingUsage.value = true;
    errorUsage.value = null;
    try {
      const { data, error } = await supabase
        .from('prompt_usage_logs')
        .select('*')
        .order('copied_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      usageLogs.value = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        userId: r.user_id as string,
        websiteId: (r.website_id as string | null) ?? null,
        promptId: r.prompt_id as string,
        productDocId: (r.product_doc_id as string | null) ?? null,
        pageType: (r.page_type as string) ?? '',
        sectionType: (r.section_type as string) ?? '',
        copiedAt: r.copied_at as string
      }));
    } catch (e) {
      errorUsage.value = e instanceof Error ? e.message : 'Could not load usage logs.';
    } finally {
      loadingUsage.value = false;
    }
  };

  // ── Log copy (anti-farming: unique index on user+prompt+day) ────────────

  const logPromptCopy = async (
    promptId: string,
    websiteId: string | null,
    productDocId: string | null,
    pageType: string,
    sectionType: string
  ): Promise<void> => {
    if (!supabaseConfigured || !auth.user?.id) return;
    try {
      await supabase.from('prompt_usage_logs').upsert(
        {
          user_id:        auth.user.id,
          website_id:     websiteId,
          prompt_id:      promptId,
          product_doc_id: productDocId,
          page_type:      pageType,
          section_type:   sectionType,
          copied_at:      new Date().toISOString()
        },
        { onConflict: 'user_id,prompt_id,copied_at::date' }
      );
    } catch {
      // non-fatal — don't block the copy UX
    }
  };

  // ── Admin CRUD ───────────────────────────────────────────────────────────

  const saveTemplate = async (
    t: Partial<PromptWorkflowTemplate> & { id?: string }
  ): Promise<PromptWorkflowTemplate | null> => {
    if (!supabaseConfigured || !auth.user?.id) return null;
    savingTemplate.value = true;
    try {
      const row = templateToRow(t, auth.user.id);
      if (t.id) {
        const { data, error } = await supabase
          .from('prompt_workflow_templates')
          .update(row)
          .eq('id', t.id)
          .select()
          .single();
        if (error) throw error;
        const updated = rowToTemplate(data as Record<string, unknown>);
        const idx = templates.value.findIndex((x) => x.id === t.id);
        if (idx !== -1) templates.value[idx] = updated;
        return updated;
      } else {
        const insertRow = { ...row, created_by: auth.user.id };
        const { data, error } = await supabase
          .from('prompt_workflow_templates')
          .insert(insertRow)
          .select()
          .single();
        if (error) throw error;
        const created = rowToTemplate(data as Record<string, unknown>);
        templates.value.unshift(created);
        return created;
      }
    } catch (e) {
      throw e;
    } finally {
      savingTemplate.value = false;
    }
  };

  const deleteTemplate = async (id: string): Promise<boolean> => {
    if (!supabaseConfigured) return false;
    try {
      const { error } = await supabase.from('prompt_workflow_templates').delete().eq('id', id);
      if (error) throw error;
      templates.value = templates.value.filter((t) => t.id !== id);
      return true;
    } catch {
      return false;
    }
  };

  const duplicateTemplate = async (id: string): Promise<PromptWorkflowTemplate | null> => {
    const original = templates.value.find((t) => t.id === id);
    if (!original) return null;
    return saveTemplate({
      ...original,
      id: undefined,
      title: `${original.title} (Copy)`,
      status: 'draft'
    });
  };

  return {
    groups,
    templates,
    usageLogs,
    loadingGroups,
    loadingTemplates,
    loadingUsage,
    savingTemplate,
    errorGroups,
    errorTemplates,
    errorUsage,
    fetchGroups,
    fetchTemplates,
    fetchUsageLogs,
    logPromptCopy,
    saveTemplate,
    deleteTemplate,
    duplicateTemplate
  };
});
