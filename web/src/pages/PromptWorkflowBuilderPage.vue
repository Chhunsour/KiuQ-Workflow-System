<template>
  <div>
    <PageHeader
      :title="$t('Prompt Builder')"
      subtitle="Select website, fill fields, preview and copy the final prompt."
    >
      <template #actions>
        <RouterLink to="/prompt" class="btn-secondary">{{ $t('← Prompt Dashboard') }}</RouterLink>
      </template>
    </PageHeader>

    <LoadingBlock :loading="loading" :error="pageError" :retry="load">
      <div class="pwb-layout">
        <!-- ── LEFT COLUMN ─────────────────────────────────────────── -->
        <div class="pwb-left space-y-5">

          <!-- Step 1: Select Website -->
          <div class="card card-pad">
            <div class="pwb-step-label">{{ $t('Step 1 — Select Website') }}</div>
            <label class="form-label mt-3">{{ $t('Website') }}</label>
            <select v-model="selectedWebsiteId" class="input mt-1">
              <option value="">{{ $t('Choose a website…') }}</option>
              <option v-for="w in availableWebsites" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select>

            <!-- Website summary pill row -->
            <div v-if="selectedWebsite" class="pwb-website-pills mt-3">
              <span v-if="selectedWebsite.primaryColor" class="pwb-pill">
                <span class="pwb-swatch" :style="{ background: selectedWebsite.primaryColor }" />
                {{ selectedWebsite.primaryColor }}
              </span>
              <span v-if="selectedWebsite.fontFamily" class="pwb-pill">{{ selectedWebsite.fontFamily }}</span>
              <span v-if="selectedWebsite.maxWidth" class="pwb-pill">{{ selectedWebsite.maxWidth }}</span>
              <span v-if="selectedWebsite.borderRadius" class="pwb-pill">r={{ selectedWebsite.borderRadius }}</span>
              <span v-if="selectedWebsite.products?.length" class="pwb-pill pwb-pill--product">
                {{ selectedWebsite.products.length }} product{{ selectedWebsite.products.length !== 1 ? 's' : '' }}
              </span>
            </div>
          </div>

          <!-- Step 2: Select Page Group + Prompt -->
          <div class="card card-pad">
            <div class="pwb-step-label">{{ $t('Step 2 — Select Page Group &amp; Prompt') }}</div>

            <label class="form-label mt-3">{{ $t('Page Group') }}</label>
            <select v-model="selectedPageType" class="input mt-1">
              <option value="">{{ $t('Choose page group…') }}</option>
              <option v-for="g in pw.groups" :key="g.pageType" :value="g.pageType">{{ g.name }}</option>
            </select>

            <label class="form-label mt-3">{{ $t('Prompt') }}</label>
            <select v-model="selectedPromptId" class="input mt-1" :disabled="!selectedPageType">
              <option value="">{{ $t('Choose prompt…') }}</option>
              <option v-for="t in promptsForGroup" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>

            <!-- Prompt info card -->
            <div v-if="selectedTemplate" class="pwb-prompt-info mt-3">
              <div class="pwb-prompt-info-header">
                <span class="ppt-badge ppt-badge--type">{{ selectedTemplate.promptType }}</span>
                <span class="ppt-badge ppt-badge--output">{{ outputTypeLabel(selectedTemplate.outputType) }}</span>
                <span
                  class="ppt-status-pill"
                  :class="selectedTemplate.status === 'approved' ? 'ppt-status-pill--approved' : 'ppt-status-pill--draft'"
                >
                  <span class="ppt-status-dot" />
                  {{ selectedTemplate.status === 'approved' ? 'Approved' : 'Draft' }}
                </span>
              </div>
              <p v-if="selectedTemplate.shortDescription" class="mt-2 text-xs text-text-muted">
                {{ selectedTemplate.shortDescription }}
              </p>
              <p class="mt-1 text-xs text-text-muted">Version {{ selectedTemplate.version }}</p>
            </div>
          </div>

          <!-- Step 3: Product Doc (if website has products or template requires docs) -->
          <div v-if="selectedWebsite && (selectedWebsite.products?.length || selectedTemplate?.requiredProductDocs)" class="card card-pad">
            <div class="pwb-step-label">{{ $t('Step 3 — Select Product (Optional)') }}</div>
            <p class="mt-1 text-xs text-text-muted">{{ $t('Select a product to inject its details into the prompt.') }}</p>

            <label class="form-label mt-3">{{ $t('Product') }}</label>
            <select v-model="selectedProductIndex" class="input mt-1">
              <option value="-1">{{ $t('No product selected') }}</option>
              <option
                v-for="(p, i) in selectedWebsite.products"
                :key="p.id || i"
                :value="i"
              >{{ p.name || `Product ${i + 1}` }}</option>
            </select>

            <!-- Product summary -->
            <div v-if="selectedProduct" class="pwb-product-card mt-3">
              <div class="pwb-product-name">{{ selectedProduct.name }}</div>
              <div v-if="selectedProduct.category" class="pwb-product-meta">{{ selectedProduct.category }}</div>
              <div v-if="selectedProduct.shortDescription" class="pwb-product-desc">{{ selectedProduct.shortDescription }}</div>
              <div v-if="selectedProduct.price" class="pwb-product-meta">Price: {{ selectedProduct.price }}</div>
            </div>
          </div>

          <!-- Step 4: Editable Fields -->
          <div v-if="selectedTemplate && selectedTemplate.editableFields.length" class="card card-pad">
            <div class="pwb-step-label">{{ $t('Step 4 — Fill Editable Fields') }}</div>
            <p class="mt-1 text-xs text-text-muted">{{ $t('These fields customize your prompt. Admin locked rules cannot be changed.') }}</p>

            <div class="mt-4 space-y-4">
              <div v-for="field in selectedTemplate.editableFields" :key="field.key">
                <label class="form-label">
                  {{ field.label }}
                  <span v-if="field.helper" class="ml-1 text-xs font-normal text-text-muted">— {{ field.helper }}</span>
                </label>

                <select
                  v-if="field.type === 'select' && field.options?.length"
                  v-model="editableValues[field.key]"
                  class="input mt-1"
                >
                  <option value="">{{ field.helper || 'Choose…' }}</option>
                  <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>

                <textarea
                  v-else-if="field.type === 'textarea'"
                  v-model="editableValues[field.key]"
                  class="input mt-1"
                  rows="3"
                  :placeholder="field.defaultValue || field.label"
                />

                <input
                  v-else
                  v-model="editableValues[field.key]"
                  class="input mt-1"
                  type="text"
                  :placeholder="field.defaultValue || field.label"
                />
              </div>
            </div>
          </div>

          <!-- Missing fields warnings -->
          <div v-if="missingWarnings.length" class="card card-pad pwb-warnings">
            <div class="pwb-warnings-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
              {{ $t('Missing website data (placeholders will show "Not provided")') }}
            </div>
            <ul class="mt-2 space-y-1">
              <li v-for="w in missingWarnings" :key="w" class="text-xs text-status-needs-fix-fg">
                <span v-text="wrapKey(w)" /> {{ $t('— not set on this website') }}
              </li>
            </ul>
            <RouterLink
              v-if="selectedWebsite"
              :to="`/websites/${selectedWebsite.id}/edit`"
              class="mt-3 inline-block text-xs text-primary hover:underline"
            >{{ $t('Update website details →') }}</RouterLink>
          </div>
        </div>

        <!-- ── RIGHT COLUMN ────────────────────────────────────────── -->
        <div class="pwb-right">
          <div class="card card-pad pwb-preview-card">
            <!-- Preview header -->
            <div class="pwb-preview-header">
              <div>
                <div class="pwb-step-label">{{ $t('Final Prompt Preview') }}</div>
                <p class="mt-0.5 text-xs text-text-muted">{{ $t('Copy this and paste into ChatGPT, Claude, Gemini, or any AI tool.') }}</p>
              </div>
              <button
                class="btn-primary pwb-copy-btn"
                type="button"
                :disabled="!finalPrompt || copying"
                @click="copyPrompt"
              >
                <svg v-if="!copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                {{ copied ? 'Copied!' : copying ? 'Copying…' : 'Copy Final Prompt' }}
              </button>
            </div>

            <!-- Empty state -->
            <div v-if="!finalPrompt" class="pwb-preview-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-3 text-text-muted opacity-40">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <p class="text-sm text-text-muted">{{ $t('Select a website and prompt to preview the final output here.') }}</p>
            </div>

            <!-- Final prompt text -->
            <div v-else class="pwb-preview-body">
              <pre class="pwb-preview-pre">{{ finalPrompt }}</pre>
            </div>

            <!-- Copy feedback -->
            <div v-if="copied" class="pwb-copy-feedback">
              {{ $t('Prompt copied — paste it into your AI tool now.') }}
            </div>
          </div>

          <!-- Sticky info: what AI tools can use this -->
          <div v-if="finalPrompt" class="pwb-ai-tools card card-pad mt-4">
            <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">{{ $t('Paste into any AI tool') }}</div>
            <div class="pwb-ai-chips">
              <span class="pwb-ai-chip">{{ $t('ChatGPT') }}</span>
              <span class="pwb-ai-chip">{{ $t('Claude') }}</span>
              <span class="pwb-ai-chip">{{ $t('Gemini') }}</span>
              <span class="pwb-ai-chip">{{ $t('Codex') }}</span>
              <span class="pwb-ai-chip">{{ $t('Copilot') }}</span>
            </div>
          </div>
        </div>
      </div>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { usePromptWorkflowStore } from '@/stores/promptWorkflow';
import { placeholderMap } from '@/lib/promptLibrary';
import type { Product, Website } from '@/stores/data';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();
const pw = usePromptWorkflowStore();

const loading = ref(true);
const pageError = ref<string | null>(null);
const copying = ref(false);
const copied = ref(false);

// ── Selections ────────────────────────────────────────────────────────────────

const selectedWebsiteId = ref('');
const selectedPageType = ref('');
const selectedPromptId = ref('');
const selectedProductIndex = ref(-1);
const editableValues = reactive<Record<string, string>>({});

// Pre-fill from route
const routePromptId = computed(() => route.params.promptId as string | undefined);
const routeWebsiteId = computed(() => route.query.websiteId as string | undefined);

// ── Derived ───────────────────────────────────────────────────────────────────

const availableWebsites = computed<Website[]>(() => {
  if (auth.isAdmin) return data.websites;
  return data.websites.filter((w) => w.createdBy === auth.user?.id);
});

const selectedWebsite = computed<Website | undefined>(() =>
  data.websites.find((w) => w.id === selectedWebsiteId.value)
);

const selectedProduct = computed<Product | undefined>(() => {
  if (selectedProductIndex.value < 0) return undefined;
  return selectedWebsite.value?.products[selectedProductIndex.value];
});

const promptsForGroup = computed(() =>
  pw.templates.filter(
    (t) =>
      t.pageType === selectedPageType.value &&
      (auth.isAdmin || t.status === 'approved')
  )
);

const selectedTemplate = computed(() =>
  pw.templates.find((t) => t.id === selectedPromptId.value)
);

const outputTypeLabel = (type: string) => {
  const map: Record<string, string> = {
    elementor_section: 'Elementor HTML/CSS Section',
    full_page_layout: 'Full Page Layout',
    seo_fields: 'SEO Fields',
    page_copy: 'Page Copy',
    html_css: 'HTML/CSS',
    image_prompt: 'Image Prompt',
    policy_text: 'Policy Text',
    faq_text: 'FAQ Text'
  };
  return map[type] ?? type;
};

// Reset editable values when prompt changes
watch(selectedPromptId, () => {
  const template = selectedTemplate.value;
  if (!template) return;
  const newVals: Record<string, string> = {};
  for (const field of template.editableFields) {
    newVals[field.key] = editableValues[field.key] ?? field.defaultValue ?? '';
  }
  Object.assign(editableValues, newVals);
});

// Reset page type when prompt changes from route
watch(selectedTemplate, (t) => {
  if (t && !selectedPageType.value) {
    selectedPageType.value = t.pageType;
  }
}, { immediate: true });

const wrapKey = (key: string) => '{{' + key + '}}';

// Missing website field warnings
const missingWarnings = computed(() => {
  const t = selectedTemplate.value;
  const w = selectedWebsite.value;
  if (!t || !w) return [];
  const pmap = placeholderMap(w, [], {});
  return t.requiredWebsiteFields.filter((key) => !pmap[key]?.trim());
});

// ── Final prompt builder ──────────────────────────────────────────────────────

const renderTemplate = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key) =>
    values[key] !== undefined ? (values[key] || 'Not provided') : `{{${key}}}`
  );

const finalPrompt = computed(() => {
  const t = selectedTemplate.value;
  const w = selectedWebsite.value;
  if (!t) return '';

  const products = selectedProduct.value ? [selectedProduct.value] : [];
  const allValues = placeholderMap(w, products, { ...editableValues });

  const sections: string[] = [];

  // 1. Website Context
  if (w) {
    const lines = [
      `WEBSITE CONTEXT:`,
      `Website Name: ${w.name || 'Not provided'}`,
      `Domain: ${w.domain || 'Not provided'}`,
      `Website Type: ${w.websiteType || 'Not provided'}`,
      `Industry: ${w.industry || 'Not provided'}`,
      `Target Audience: ${w.targetAudience || 'Not provided'}`,
      `Website Goal: ${w.websiteGoal || 'Not provided'}`,
      `Primary Color: ${w.primaryColor || 'Not provided'}`,
      `Secondary Color: ${w.secondaryColor || 'Not provided'}`,
      `Background Color: ${w.backgroundColor || 'Not provided'}`,
      `Font Family: ${w.fontFamily || 'Not provided'}`,
      `Button Font: ${w.buttonFontFamily || w.fontFamily || 'Not provided'}`,
      `Max Width: ${w.maxWidth || 'Not provided'}`,
      `Border Radius: ${w.borderRadius || 'Not provided'}`,
    ];
    if (w.phoneNumber) lines.push(`Phone: ${w.phoneNumber}`);
    if (w.email) lines.push(`Email: ${w.email}`);
    if (w.designStyleNotes) lines.push(`Design Notes: ${w.designStyleNotes}`);
    if (w.seoNotes) lines.push(`SEO Notes: ${w.seoNotes}`);
    if (w.extraInstructions) lines.push(`Extra Instructions: ${w.extraInstructions}`);
    sections.push(lines.join('\n'));
  }

  // 2. Product Context
  if (selectedProduct.value) {
    const p = selectedProduct.value;
    const lines = [
      `PRODUCT DETAILS:`,
      `Product Name: ${p.name || 'Not provided'}`,
      `Category: ${p.category || 'Not provided'}`,
    ];
    if (p.shortDescription) lines.push(`Short Description: ${p.shortDescription}`);
    if (p.longDescription) lines.push(`Long Description: ${p.longDescription}`);
    if (p.keyFeatures) lines.push(`Key Features: ${p.keyFeatures}`);
    if (p.keySpecs) lines.push(`Key Specs: ${p.keySpecs}`);
    if (p.price) lines.push(`Price: ${p.price}`);
    if (p.url) lines.push(`Product URL: ${p.url}`);
    if (p.imageUrl) lines.push(`Product Image: ${p.imageUrl}`);
    if (p.notes) lines.push(`Notes: ${p.notes}`);
    sections.push(lines.join('\n'));
  }

  // 3. Task / Template Body
  if (t.templateBody) {
    sections.push(`TASK:\n${renderTemplate(t.templateBody, allValues)}`);
  }

  // 4. Extra Inputs from editable fields
  if (t.editableFields.length) {
    const lines = [`EXTRA INPUTS:`];
    for (const field of t.editableFields) {
      const val = editableValues[field.key] || field.defaultValue || '';
      lines.push(`${field.label}: ${val || '(not filled)'}`);
    }
    sections.push(lines.join('\n'));
  }

  // 5. Locked Rules
  if (t.lockedRules) {
    sections.push(`OUTPUT RULES:\n${t.lockedRules}`);
  }

  // 6. Output type instruction
  const outputInstruction = getOutputInstruction(t.outputType);
  if (outputInstruction) {
    sections.push(outputInstruction);
  }

  return sections.join('\n\n---\n\n');
});

const getOutputInstruction = (type: string): string => {
  const map: Record<string, string> = {
    elementor_section:
      'OUTPUT FORMAT:\nReturn a WordPress Elementor-ready HTML/CSS section. Keep it paste-ready, responsive, and scoped so it will not break the rest of the page.',
    full_page_layout:
      'OUTPUT FORMAT:\nReturn a complete page layout with sections in the correct order and clear implementation notes.',
    seo_fields:
      'OUTPUT FORMAT:\nReturn SEO title, meta description, URL slug, H1, and suggested internal links as labeled fields.',
    page_copy:
      'OUTPUT FORMAT:\nReturn page copy only, written clearly for the target audience.',
    html_css:
      'OUTPUT FORMAT:\nReturn clean production-ready HTML/CSS. Keep class names clear and avoid extra commentary.',
    image_prompt:
      'OUTPUT FORMAT:\nReturn a single image-generation prompt with subject, style, composition, and quality details.',
    policy_text:
      'OUTPUT FORMAT:\nReturn clear policy page text with headings and plain-language sections.',
    faq_text:
      'OUTPUT FORMAT:\nReturn FAQ questions and concise answers grouped by topic.'
  };
  return map[type] ?? '';
};

// ── Copy ──────────────────────────────────────────────────────────────────────

const copyPrompt = async () => {
  if (!finalPrompt.value || copying.value) return;
  copying.value = true;
  try {
    await navigator.clipboard.writeText(finalPrompt.value);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 3000);

    // Log usage
    if (selectedTemplate.value) {
      await pw.logPromptCopy(
        selectedTemplate.value.id,
        selectedWebsiteId.value || null,
        null, // product_doc_id — future: link to docs_files
        selectedTemplate.value.pageType,
        selectedTemplate.value.sectionType
      );
    }
  } catch {
    // Clipboard API unavailable — select fallback
    const el = document.querySelector('.pwb-preview-pre') as HTMLElement | null;
    if (el) {
      const range = document.createRange();
      range.selectNodeContents(el);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  } finally {
    copying.value = false;
  }
};

// ── Load ──────────────────────────────────────────────────────────────────────

const load = async () => {
  loading.value = true;
  pageError.value = null;
  try {
    await Promise.all([data.fetchWebsites(), pw.fetchGroups(), pw.fetchTemplates()]);

    // Pre-select from route
    if (routeWebsiteId.value) selectedWebsiteId.value = routeWebsiteId.value;
    if (routePromptId.value) {
      selectedPromptId.value = routePromptId.value;
      const t = pw.templates.find((x) => x.id === routePromptId.value);
      if (t) selectedPageType.value = t.pageType;
    }
  } catch (e) {
    pageError.value = e instanceof Error ? e.message : 'Could not load data.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────────── */
.pwb-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

/* ── Step label ────────────────────────────────────────────── */
.pwb-step-label {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
}

/* ── Website pills ─────────────────────────────────────────── */
.pwb-website-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.pwb-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  color: var(--text-muted);
}
.pwb-pill--product { color: var(--primary); }
.pwb-swatch {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 3px;
  display: inline-block;
  flex-shrink: 0;
}

/* ── Prompt info card ──────────────────────────────────────── */
.pwb-prompt-info {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card, 10px);
  padding: 0.75rem;
}
.pwb-prompt-info-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

/* ── Product card ──────────────────────────────────────────── */
.pwb-product-card {
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-card, 10px);
  padding: 0.75rem;
}
.pwb-product-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-main);
}
.pwb-product-meta {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
}
.pwb-product-desc {
  font-size: 0.75rem;
  color: var(--text-main);
  margin-top: 0.25rem;
  line-height: 1.4;
}

/* ── Warnings ──────────────────────────────────────────────── */
.pwb-warnings {
  background: var(--status-needs-fix-bg, #fef2f2);
  border: 1px solid var(--status-needs-fix-fg, #dc2626);
}
.pwb-warnings-title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--status-needs-fix-fg, #dc2626);
}

/* ── Preview card ──────────────────────────────────────────── */
.pwb-preview-card {
  position: sticky;
  top: 1.5rem;
  max-height: calc(100vh - 6rem);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.pwb-preview-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-shrink: 0;
}
.pwb-copy-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-shrink: 0;
  font-size: 0.8rem;
}
.pwb-preview-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 3rem 1rem;
  min-height: 200px;
}
.pwb-preview-body {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}
.pwb-preview-pre {
  font-size: 0.75rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text-main);
  font-family: 'Courier New', Courier, monospace;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
}
.pwb-copy-feedback {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: var(--status-approved-bg, #dcfce7);
  color: var(--status-approved-fg, #15803d);
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 600;
  text-align: center;
  flex-shrink: 0;
}

/* ── AI tools chips ────────────────────────────────────────── */
.pwb-ai-tools { padding: 0.85rem 1rem; }
.pwb-ai-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.pwb-ai-chip {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: var(--primary);
  color: #f8fbff;
  opacity: 0.8;
}

/* ── Shared badge styles ───────────────────────────────────── */
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

/* form-label fallback */
.form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
}

/* ── Responsive ────────────────────────────────────────────── */
@media (max-width: 1024px) {
  .pwb-layout { grid-template-columns: 1fr; }
  .pwb-preview-card {
    position: static;
    max-height: none;
  }
}

@media (max-width: 640px) {
  .pwb-preview-header { flex-direction: column; }
  .pwb-copy-btn { width: 100%; justify-content: center; }
}
</style>
