<template>
  <div>
    <LoadingBlock :loading="loading" :error="error" :retry="load">
      <div v-if="!website" class="card card-pad text-center">
        <h2 class="section-title">{{ $t('Website not found') }}</h2>
        <RouterLink to="/prompt" class="btn-primary mt-4">{{ $t('Back to Prompt Dashboard') }}</RouterLink>
      </div>

      <template v-else>
        <!-- Breadcrumb -->
        <nav class="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-muted" aria-:label="$t('Breadcrumb')">
          <RouterLink to="/prompt" class="hover:text-text-main">{{ $t('Prompt Dashboard') }}</RouterLink>
          <span>›</span>
          <RouterLink :to="`/prompt/website/${website.id}`" class="hover:text-text-main">{{ website.name }}</RouterLink>
          <span>›</span>
          <span class="ui-font font-medium text-text-main">{{ currentGroup?.name || pageType }}</span>
        </nav>

        <!-- Page group header -->
        <div class="ppg-header card card-pad mb-6">
          <div class="ppg-header-left">
            <div class="ppg-header-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <div class="ui-font text-xs font-semibold uppercase tracking-wide text-primary">{{ website.name }}</div>
              <h1 class="ppg-group-name">{{ currentGroup?.name || pageType }}</h1>
              <p class="ppg-group-desc">{{ currentGroup?.description || 'Section prompts for this page type.' }}</p>
            </div>
          </div>
          <div class="ppg-header-actions">
            <RouterLink :to="`/prompt/website/${website.id}`" class="btn-secondary ppg-btn">
              {{ $t('← Page Groups') }}
            </RouterLink>
            <RouterLink v-if="auth.isAdmin" to="/prompt/library" class="btn-ghost ppg-btn">
              {{ $t('Manage Prompts') }}
            </RouterLink>
          </div>
        </div>

        <!-- Filters -->
        <div class="mb-5 flex flex-wrap gap-3">
          <input
            v-model="search"
            type="search"
            class="input flex-1 min-w-[200px]"
            :placeholder="$t('Search prompts…')"
          />
          <select v-model="filterPromptType" class="input w-44">
            <option value="">{{ $t('All types') }}</option>
            <option v-for="opt in promptTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <select v-model="filterOutputType" class="input w-44">
            <option value="">{{ $t('All outputs') }}</option>
            <option v-for="opt in outputTypeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <!-- Prompt cards -->
        <div v-if="filteredTemplates.length" class="ppt-grid">
          <div v-for="t in filteredTemplates" :key="t.id" class="ppt-card card">
            <!-- Status badge (draft only shown to admin) -->
            <div class="ppt-card-top">
              <div class="ppt-type-badges">
                <span class="ppt-badge ppt-badge--type">{{ promptTypeLabel(t.promptType) }}</span>
                <span class="ppt-badge ppt-badge--output">{{ outputTypeLabel(t.outputType) }}</span>
              </div>
              <span
                class="ppt-status-pill"
                :class="t.status === 'approved' ? 'ppt-status-pill--approved' : 'ppt-status-pill--draft'"
              >
                <span class="ppt-status-dot" />
                {{ t.status === 'approved' ? 'Approved' : 'Draft' }}
              </span>
            </div>

            <h3 class="ppt-title">{{ t.title }}</h3>
            <p v-if="t.shortDescription" class="ppt-desc">{{ t.shortDescription }}</p>
            <p v-if="t.sectionType" class="ppt-section-type">Section: {{ t.sectionType }}</p>

            <div class="ppt-meta">
              <span class="ppt-meta-item">v{{ t.version }}</span>
              <span v-if="t.editableFields.length" class="ppt-meta-item">
                {{ t.editableFields.length }} editable field{{ t.editableFields.length !== 1 ? 's' : '' }}
              </span>
              <span v-if="t.requiredProductDocs" class="ppt-meta-item ppt-meta-item--product">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/></svg>
                {{ $t('Needs product doc') }}
              </span>
            </div>

            <!-- Action -->
            <div class="ppt-actions">
              <RouterLink
                :to="`/prompt/builder/${t.id}?websiteId=${website.id}`"
                class="btn-primary ppt-use-btn"
              >
                {{ $t('Use Prompt') }}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </RouterLink>
              <RouterLink
                v-if="auth.isAdmin"
                :to="`/prompt/library?edit=${t.id}`"
                class="btn-ghost ppt-edit-btn"
                :title="$t('Edit prompt')"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              </RouterLink>
            </div>
          </div>
        </div>

        <EmptyState
          v-else-if="!loading"
          :title="$t('No prompts in this group')"
          :description="auth.isAdmin ? 'Create prompts in the Prompt Library and assign them to this page group.' : 'No approved prompts are available for this page group yet.'"
        >
          <template v-if="auth.isAdmin" #action>
            <RouterLink to="/prompt/library" class="btn-primary">{{ $t('Open Prompt Library') }}</RouterLink>
          </template>
        </EmptyState>
      </template>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { usePromptWorkflowStore } from '@/stores/promptWorkflow';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();
const pw = usePromptWorkflowStore();

const loading = ref(true);
const error = ref<string | null>(null);

const websiteId = computed(() => route.params.websiteId as string);
const pageType = computed(() => route.params.pageType as string);

const website = computed(() => data.websites.find((w) => w.id === websiteId.value));
const currentGroup = computed(() => pw.groups.find((g) => g.pageType === pageType.value));

const search = ref('');
const filterPromptType = ref('');
const filterOutputType = ref('');

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
  { value: 'elementor_section', label: 'Elementor HTML/CSS' },
  { value: 'full_page_layout', label: 'Full Page Layout' },
  { value: 'seo_fields', label: 'SEO Fields' },
  { value: 'page_copy', label: 'Page Copy' },
  { value: 'html_css', label: 'HTML/CSS' },
  { value: 'image_prompt', label: 'Image Prompt' },
  { value: 'policy_text', label: 'Policy Text' },
  { value: 'faq_text', label: 'FAQ Text' }
];

const promptTypeLabel = (type: string) =>
  promptTypeOptions.find((o) => o.value === type)?.label ?? type;

const outputTypeLabel = (type: string) =>
  outputTypeOptions.find((o) => o.value === type)?.label ?? type;

const visibleTemplates = computed(() =>
  pw.templates.filter(
    (t) =>
      t.pageType === pageType.value &&
      (auth.isAdmin || t.status === 'approved')
  )
);

const filteredTemplates = computed(() => {
  let list = visibleTemplates.value;
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.sectionType.toLowerCase().includes(q) ||
        t.shortDescription.toLowerCase().includes(q)
    );
  }
  if (filterPromptType.value) list = list.filter((t) => t.promptType === filterPromptType.value);
  if (filterOutputType.value) list = list.filter((t) => t.outputType === filterOutputType.value);
  return list;
});

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([data.fetchWebsites(), pw.fetchGroups(), pw.fetchTemplates()]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load data.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
/* ── Group header ──────────────────────────────────────────── */
.ppg-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1rem;
}
.ppg-header-left {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  flex: 1;
  min-width: 0;
}
.ppg-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--primary);
  color: #f8fbff;
  flex-shrink: 0;
}
.ppg-group-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  margin-top: 0.15rem;
}
.ppg-group-desc {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}
.ppg-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.ppg-btn {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
}

/* ── Prompt cards grid ─────────────────────────────────────── */
.ppt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.ppt-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 1.1rem 1.25rem;
}

.ppt-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.ppt-type-badges {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.ppt-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  white-space: nowrap;
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
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.68rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  flex-shrink: 0;
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

.ppt-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  line-height: 1.3;
}
.ppt-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.4;
}
.ppt-section-type {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-style: italic;
}

.ppt-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.1rem;
}
.ppt-meta-item {
  font-size: 0.68rem;
  color: var(--text-muted);
  background: var(--soft-bg);
  border-radius: 999px;
  padding: 0.15rem 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.ppt-meta-item--product {
  color: var(--primary);
}

.ppt-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
}
.ppt-use-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.85rem;
}
.ppt-edit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.4rem;
}

@media (max-width: 640px) {
  .ppt-grid { grid-template-columns: 1fr; }
  .ppg-header { flex-direction: column; }
}
</style>
