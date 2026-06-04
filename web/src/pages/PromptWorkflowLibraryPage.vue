<template>
  <div>
    <PageHeader
      title="Prompt Library"
      subtitle="Manage master prompt templates. Create, edit, approve and organise prompts by page group."
    >
      <template #actions>
        <RouterLink to="/prompt" class="btn-secondary">← Dashboard</RouterLink>
        <button v-if="auth.isAdmin" class="btn-primary" type="button" @click="openCreate">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Prompt
        </button>
      </template>
    </PageHeader>

    <LoadingBlock :loading="pw.loadingTemplates" :error="pw.errorTemplates" :retry="() => pw.fetchTemplates(true)">

      <!-- Filters -->
      <div class="mb-5 flex flex-wrap gap-3">
        <input v-model="search" type="search" class="input flex-1 min-w-[200px]" placeholder="Search prompts…" />
        <select v-model="filterPageType" class="input w-52">
          <option value="">All page groups</option>
          <option v-for="g in pw.groups" :key="g.pageType" :value="g.pageType">{{ g.name }}</option>
        </select>
        <select v-model="filterStatus" class="input w-36">
          <option value="">All statuses</option>
          <option value="approved">Approved</option>
          <option value="draft">Draft</option>
        </select>
        <select v-model="filterPromptType" class="input w-40">
          <option value="">All types</option>
          <option v-for="opt in promptTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
        </select>
      </div>

      <!-- Stats row -->
      <div class="pwl-stats mb-5">
        <div class="pwl-stat">
          <span class="pwl-stat-val">{{ pw.templates.length }}</span>
          <span class="pwl-stat-label">Total prompts</span>
        </div>
        <div class="pwl-stat">
          <span class="pwl-stat-val">{{ approvedCount }}</span>
          <span class="pwl-stat-label">Approved</span>
        </div>
        <div class="pwl-stat">
          <span class="pwl-stat-val">{{ draftCount }}</span>
          <span class="pwl-stat-label">Draft</span>
        </div>
        <div class="pwl-stat">
          <span class="pwl-stat-val">{{ pw.groups.length }}</span>
          <span class="pwl-stat-label">Page groups</span>
        </div>
      </div>

      <!-- Prompt list -->
      <div v-if="filtered.length" class="pwl-list">
        <div v-for="t in filtered" :key="t.id" class="pwl-row card">
          <!-- Left: meta -->
          <div class="pwl-row-main">
            <div class="pwl-row-top">
              <span class="ppt-badge ppt-badge--type">{{ promptTypeLabel(t.promptType) }}</span>
              <span class="ppt-badge ppt-badge--output">{{ outputTypeLabel(t.outputType) }}</span>
              <span
                class="ppt-status-pill"
                :class="t.status === 'approved' ? 'ppt-status-pill--approved' : 'ppt-status-pill--draft'"
              >
                <span class="ppt-status-dot" />{{ t.status === 'approved' ? 'Approved' : 'Draft' }}
              </span>
              <span class="pwl-version">v{{ t.version }}</span>
            </div>
            <h3 class="pwl-title">{{ t.title }}</h3>
            <div class="pwl-subtitle">
              <span>{{ groupName(t.pageType) }}</span>
              <span v-if="t.sectionType"> · {{ t.sectionType }}</span>
            </div>
            <p v-if="t.shortDescription" class="pwl-desc">{{ t.shortDescription }}</p>
            <div class="pwl-chips mt-2">
              <span v-if="t.editableFields.length" class="pwl-chip">{{ t.editableFields.length }} editable fields</span>
              <span v-if="t.lockedRules" class="pwl-chip">Has locked rules</span>
              <span v-if="t.requiredProductDocs" class="pwl-chip pwl-chip--product">Requires product doc</span>
            </div>
          </div>

          <!-- Right: actions (admin only) -->
          <div v-if="auth.isAdmin" class="pwl-row-actions">
            <!-- Quick status toggle -->
            <button
              class="btn-secondary pwl-action-btn"
              type="button"
              :disabled="savingId === t.id"
              @click="toggleStatus(t)"
            >
              {{ t.status === 'approved' ? 'Set Draft' : 'Approve' }}
            </button>
            <button
              class="btn-secondary pwl-action-btn"
              type="button"
              :disabled="savingId === t.id"
              @click="openEdit(t)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              Edit
            </button>
            <button
              class="btn-secondary pwl-action-btn"
              type="button"
              :disabled="savingId === t.id"
              @click="duplicate(t.id)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
            </button>
            <button
              class="btn-danger pwl-action-btn"
              type="button"
              :disabled="savingId === t.id"
              @click="confirmDelete(t)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else-if="!pw.loadingTemplates"
        title="No prompts found"
        :description="search || filterPageType || filterStatus ? 'No prompts match your filters.' : 'Create your first prompt to get started.'"
      >
        <template v-if="auth.isAdmin" #action>
          <button class="btn-primary" type="button" @click="openCreate">New Prompt</button>
        </template>
      </EmptyState>
    </LoadingBlock>

    <!-- ── Create / Edit Modal ───────────────────────────────── -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
        <div class="modal-box pwl-modal">
          <div class="modal-header">
            <h2 class="modal-title">{{ editingId ? 'Edit Prompt' : 'New Prompt' }}</h2>
            <button class="btn-ghost modal-close" type="button" @click="closeModal">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="modal-body pwl-form space-y-4">
            <!-- Basic info -->
            <div class="pwl-form-grid">
              <div class="pwl-form-full">
                <label class="form-label">Title *</label>
                <input v-model="form.title" class="input mt-1" placeholder="Hero / Banner Section" />
              </div>
              <div>
                <label class="form-label">Page Group *</label>
                <select v-model="form.pageType" class="input mt-1">
                  <option value="">Select page group…</option>
                  <option v-for="g in pw.groups" :key="g.pageType" :value="g.pageType">{{ g.name }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Section Type</label>
                <input v-model="form.sectionType" class="input mt-1" placeholder="e.g. Hero / Banner Section" />
              </div>
              <div>
                <label class="form-label">Prompt Type</label>
                <select v-model="form.promptType" class="input mt-1">
                  <option v-for="opt in promptTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Output Type</label>
                <select v-model="form.outputType" class="input mt-1">
                  <option v-for="opt in outputTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Status</label>
                <select v-model="form.status" class="input mt-1">
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              <div>
                <label class="form-label">Version</label>
                <input v-model.number="form.version" class="input mt-1" type="number" min="1" />
              </div>
            </div>

            <div>
              <label class="form-label">Short Description</label>
              <input v-model="form.shortDescription" class="input mt-1" placeholder="One-line description of this prompt" />
            </div>

            <!-- Template body -->
            <div>
              <label class="form-label">
                Template Body
                <span v-pre class="text-xs font-normal text-text-muted ml-1">— use {{placeholder}} for dynamic values</span>
              </label>
              <textarea v-model="form.templateBody" class="input mt-1 pwl-textarea" rows="10" placeholder="Write the main prompt instruction here. Use {{website_name}}, {{primary_color}}, {{section_headline}}, etc." />
            </div>

            <!-- Locked rules -->
            <div>
              <label class="form-label">Locked Rules <span class="text-xs font-normal text-text-muted ml-1">— shown at bottom of final prompt</span></label>
              <textarea v-model="form.lockedRules" class="input mt-1" rows="4" placeholder="- Output must be mobile-responsive&#10;- No inline styles except colors&#10;- Use semantic HTML5 elements" />
            </div>

            <!-- Editable fields editor -->
            <div>
              <div class="flex items-center justify-between">
                <label class="form-label">Editable Fields <span class="text-xs font-normal text-text-muted ml-1">— filled by team members</span></label>
                <button class="btn-secondary pwl-add-field-btn" type="button" @click="addField">+ Add Field</button>
              </div>
              <div v-if="form.editableFields.length" class="mt-3 space-y-3">
                <div v-for="(field, i) in form.editableFields" :key="i" class="pwl-field-row">
                  <div class="pwl-field-row-inputs">
                    <input v-model="field.key" class="input pwl-field-key" placeholder="key (e.g. section_headline)" />
                    <input v-model="field.label" class="input pwl-field-label" placeholder="Label" />
                    <select v-model="field.type" class="input pwl-field-type">
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                    </select>
                    <button class="btn-ghost pwl-field-del" type="button" title="Remove field" @click="removeField(i)">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </button>
                  </div>
                  <div class="pwl-field-row-extra">
                    <input v-model="field.helper" class="input pwl-field-helper" placeholder="Helper text (optional)" />
                    <input v-model="field.defaultValue" class="input pwl-field-default" placeholder="Default value (optional)" />
                  </div>
                  <div v-if="field.type === 'select'" class="mt-1">
                    <input
                      :value="field.options?.join(', ') || ''"
                      class="input"
                      placeholder="Options comma-separated: Option A, Option B"
                      @input="(e) => { field.options = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }"
                    />
                  </div>
                </div>
              </div>
              <p v-else class="mt-2 text-xs text-text-muted">No editable fields yet. Add fields team members can fill in.</p>
            </div>

            <!-- Required website fields -->
            <div>
              <label class="form-label">Required Website Fields <span class="text-xs font-normal text-text-muted ml-1">— show warning if missing</span></label>
              <input
                :value="form.requiredWebsiteFields.join(', ')"
                class="input mt-1"
                placeholder="e.g. primary_color, font_family, max_width"
                @input="(e) => { form.requiredWebsiteFields = (e.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean) }"
              />
            </div>

            <!-- Requires product docs -->
            <div class="flex items-center gap-2">
              <input id="req-product" v-model="form.requiredProductDocs" type="checkbox" class="rounded" />
              <label for="req-product" class="form-label mb-0 cursor-pointer">Requires product details from Docs</label>
            </div>

            <!-- Available placeholders hint -->
            <details class="pwl-placeholders-hint">
              <summary class="cursor-pointer text-xs text-primary font-semibold">Available placeholders</summary>
              <div class="mt-2 pwl-ph-grid">
                <span v-for="p in knownPlaceholders" :key="p.key" class="pwl-ph-item" :title="p.description" v-text="wrapKey(p.key)" />
              </div>
            </details>

            <!-- Error -->
            <p v-if="saveError" class="text-sm text-status-needs-fix-fg">{{ saveError }}</p>
          </div>

          <div class="modal-footer">
            <button class="btn-secondary" type="button" @click="closeModal">Cancel</button>
            <button class="btn-primary" type="button" :disabled="pw.savingTemplate || !form.title || !form.pageType" @click="save">
              {{ pw.savingTemplate ? 'Saving…' : editingId ? 'Save Changes' : 'Create Prompt' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ── Delete confirm ────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="deleteTarget" class="modal-backdrop" @click.self="deleteTarget = null">
        <div class="modal-box" style="max-width:440px">
          <div class="modal-header">
            <h2 class="modal-title text-status-needs-fix-fg">Delete Prompt?</h2>
          </div>
          <div class="modal-body">
            <p class="text-sm text-text-muted">
              Are you sure you want to delete <strong class="text-text-main">{{ deleteTarget.title }}</strong>?
              This cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" type="button" @click="deleteTarget = null">Cancel</button>
            <button class="btn-danger" type="button" :disabled="deleting" @click="doDelete">
              {{ deleting ? 'Deleting…' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePromptWorkflowStore, type PromptWorkflowTemplate, type WorkflowEditableField } from '@/stores/promptWorkflow';
import { knownPlaceholders } from '@/lib/promptLibrary';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const route = useRoute();
const auth = useAuthStore();
const pw = usePromptWorkflowStore();

const search = ref('');
const filterPageType = ref('');
const filterStatus = ref('');
const filterPromptType = ref('');

const showModal = ref(false);
const editingId = ref<string | null>(null);
const saveError = ref('');
const savingId = ref<string | null>(null);

const deleteTarget = ref<PromptWorkflowTemplate | null>(null);
const deleting = ref(false);

const promptTypeOptions = [
  { value: 'section', label: 'Section' },
  { value: 'full_page', label: 'Full Page' },
  { value: 'seo', label: 'SEO' },
  { value: 'blog', label: 'Blog' },
  { value: 'image', label: 'Image Prompt' },
  { value: 'fixing', label: 'Fixing' },
  { value: 'content', label: 'Content' }
];

const outputTypeOptions = [
  { value: 'elementor_section', label: 'Elementor HTML/CSS Section' },
  { value: 'full_page_layout', label: 'Full Page Layout' },
  { value: 'seo_fields', label: 'SEO Fields' },
  { value: 'page_copy', label: 'Page Copy' },
  { value: 'html_css', label: 'HTML/CSS' },
  { value: 'image_prompt', label: 'Image Prompt' },
  { value: 'policy_text', label: 'Policy Text' },
  { value: 'faq_text', label: 'FAQ Text' }
];

const promptTypeLabel = (v: string) => promptTypeOptions.find((o) => o.value === v)?.label ?? v;
const outputTypeLabel  = (v: string) => outputTypeOptions.find((o) => o.value === v)?.label ?? v;
const groupName = (pageType: string) =>
  pw.groups.find((g) => g.pageType === pageType)?.name ?? pageType;

const wrapKey = (key: string) => '{{' + key + '}}';

// ── Form ─────────────────────────────────────────────────────────────────────

type PromptWorkflowForm = Pick<
  PromptWorkflowTemplate,
  | 'title'
  | 'pageType'
  | 'sectionType'
  | 'promptType'
  | 'outputType'
  | 'shortDescription'
  | 'templateBody'
  | 'lockedRules'
  | 'editableFields'
  | 'requiredWebsiteFields'
  | 'requiredProductDocs'
  | 'status'
  | 'version'
>;

const blankForm = (): PromptWorkflowForm => ({
  title: '',
  pageType: '',
  sectionType: '',
  promptType: 'section',
  outputType: 'elementor_section',
  shortDescription: '',
  templateBody: '',
  lockedRules: '',
  editableFields: [],
  requiredWebsiteFields: [],
  requiredProductDocs: false,
  status: 'draft',
  version: 1
});

const form = reactive(blankForm());

const openCreate = () => {
  Object.assign(form, blankForm());
  editingId.value = null;
  saveError.value = '';
  showModal.value = true;
};

const openEdit = (t: PromptWorkflowTemplate) => {
  Object.assign(form, {
    title: t.title,
    pageType: t.pageType,
    sectionType: t.sectionType,
    promptType: t.promptType,
    outputType: t.outputType,
    shortDescription: t.shortDescription,
    templateBody: t.templateBody,
    lockedRules: t.lockedRules,
    editableFields: t.editableFields.map((f) => ({ ...f, options: f.options ? [...f.options] : [] })),
    requiredWebsiteFields: [...t.requiredWebsiteFields],
    requiredProductDocs: t.requiredProductDocs,
    status: t.status,
    version: t.version
  });
  editingId.value = t.id;
  saveError.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingId.value = null;
};

const addField = () => {
  form.editableFields.push({ key: '', label: '', type: 'text', helper: '', defaultValue: '', options: [] });
};

const removeField = (i: number) => {
  form.editableFields.splice(i, 1);
};

const save = async () => {
  saveError.value = '';
  if (!form.title?.trim()) { saveError.value = 'Title is required.'; return; }
  if (!form.pageType) { saveError.value = 'Page group is required.'; return; }
  try {
    await pw.saveTemplate({ ...form, id: editingId.value ?? undefined });
    closeModal();
  } catch (e) {
    saveError.value = e instanceof Error ? e.message : 'Could not save prompt.';
  }
};

// ── Quick status toggle ───────────────────────────────────────────────────────

const toggleStatus = async (t: PromptWorkflowTemplate) => {
  savingId.value = t.id;
  try {
    await pw.saveTemplate({ ...t, status: t.status === 'approved' ? 'draft' : 'approved' });
  } finally {
    savingId.value = null;
  }
};

// ── Duplicate ─────────────────────────────────────────────────────────────────

const duplicate = async (id: string) => {
  savingId.value = id;
  try {
    await pw.duplicateTemplate(id);
  } finally {
    savingId.value = null;
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────

const confirmDelete = (t: PromptWorkflowTemplate) => { deleteTarget.value = t; };

const doDelete = async () => {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await pw.deleteTemplate(deleteTarget.value.id);
    deleteTarget.value = null;
  } finally {
    deleting.value = false;
  }
};

// ── Filtered list ─────────────────────────────────────────────────────────────

const approvedCount = computed(() => pw.templates.filter((t) => t.status === 'approved').length);
const draftCount    = computed(() => pw.templates.filter((t) => t.status === 'draft').length);

const filtered = computed(() => {
  let list = pw.templates;
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.sectionType.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q)
    );
  }
  if (filterPageType.value) list = list.filter((t) => t.pageType === filterPageType.value);
  if (filterStatus.value) list = list.filter((t) => t.status === filterStatus.value);
  if (filterPromptType.value) list = list.filter((t) => t.promptType === filterPromptType.value);
  return list;
});

// Pre-open edit from route query ?edit=<id>
watch(() => route.query.edit, (id) => {
  if (id && typeof id === 'string') {
    const t = pw.templates.find((x) => x.id === id);
    if (t) openEdit(t);
  }
}, { immediate: true });

onMounted(async () => {
  await Promise.all([pw.fetchGroups(), pw.fetchTemplates()]);
  // Handle ?edit= from URL after templates are loaded
  const editId = route.query.edit as string | undefined;
  if (editId) {
    const t = pw.templates.find((x) => x.id === editId);
    if (t) openEdit(t);
  }
});
</script>

<style scoped>
/* ── Stats row ─────────────────────────────────────────────── */
.pwl-stats {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}
.pwl-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.75rem 1.25rem;
  min-width: 90px;
  text-align: center;
}
.pwl-stat-val {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}
.pwl-stat-label {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}

/* ── List ──────────────────────────────────────────────────── */
.pwl-list { display: flex; flex-direction: column; gap: 0.75rem; }

.pwl-row {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.25rem;
  flex-wrap: wrap;
}
.pwl-row-main { flex: 1; min-width: 0; }
.pwl-row-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.4rem;
}
.pwl-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.3;
}
.pwl-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
}
.pwl-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
  line-height: 1.4;
}
.pwl-version {
  font-size: 0.65rem;
  background: var(--soft-bg);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
}
.pwl-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.pwl-chip {
  font-size: 0.65rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  color: var(--text-muted);
}
.pwl-chip--product { color: var(--primary); }

.pwl-row-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}
.pwl-action-btn {
  font-size: 0.75rem;
  padding: 0.3rem 0.65rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ── Modal ─────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 200;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 2rem 1rem;
  overflow-y: auto;
}
.modal-box {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%;
  max-width: 860px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.25rem 1.5rem 0;
}
.modal-title { font-size: 1.1rem; font-weight: 700; color: var(--text-main); }
.modal-close { padding: 0.25rem; }
.modal-body { padding: 1.25rem 1.5rem; overflow-y: auto; max-height: 70vh; }
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--border);
}

/* ── Form grid ─────────────────────────────────────────────── */
.pwl-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}
.pwl-form-full { grid-column: 1 / -1; }
.form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
}
.pwl-textarea { min-height: 180px; font-family: 'Courier New', Courier, monospace; font-size: 0.78rem; }

/* ── Editable fields editor ────────────────────────────────── */
.pwl-add-field-btn { font-size: 0.75rem; padding: 0.3rem 0.65rem; }
.pwl-field-row {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
}
.pwl-field-row-inputs, .pwl-field-row-extra {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
}
.pwl-field-row-extra { margin-top: 0.5rem; }
.pwl-field-key { flex: 2; min-width: 120px; }
.pwl-field-label { flex: 2; min-width: 120px; }
.pwl-field-type { width: 100px; flex-shrink: 0; }
.pwl-field-helper { flex: 2; min-width: 120px; }
.pwl-field-default { flex: 1; min-width: 100px; }
.pwl-field-del { padding: 0.3rem; flex-shrink: 0; }

/* ── Placeholders hint ─────────────────────────────────────── */
.pwl-placeholders-hint {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.75rem;
}
.pwl-ph-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.pwl-ph-item {
  font-size: 0.65rem;
  background: rgba(63, 141, 254, 0.1);
  color: var(--primary);
  border-radius: 4px;
  padding: 0.15rem 0.4rem;
  font-family: monospace;
  cursor: help;
}

/* ── Status badge shared ───────────────────────────────────── */
.ppt-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
}
.ppt-badge--type {
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
}
.ppt-badge--output {
  background: rgba(63, 141, 254, 0.1);
  color: var(--primary);
}
.ppt-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
}
.ppt-status-pill--approved {
  background: var(--status-approved-bg, #dcfce7);
  color: var(--status-approved-fg, #15803d);
}
.ppt-status-pill--draft {
  background: var(--soft-bg);
  color: var(--text-muted);
}
.ppt-status-dot {
  width: 0.4rem;
  height: 0.4rem;
  border-radius: 50%;
  background: currentColor;
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 768px) {
  .pwl-row { flex-direction: column; }
  .pwl-row-actions { align-self: flex-start; }
  .pwl-form-grid { grid-template-columns: 1fr; }
  .modal-box { max-width: 100%; }
  .modal-body { max-height: 60vh; }
}
</style>
