<template>
  <div>
    <!-- Back link + Page Header -->
    <div class="bicd-top">
      <RouterLink to="/blog-center/templates" class="bicd-back">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Templates
      </RouterLink>
    </div>

    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">
      <!-- Access denied: team member opened a websiteId they aren't assigned to. -->
      <EmptyState
        v-if="website && !canView"
        title="Access Denied"
        description="You don't have permission to view this website's prompt templates. Only websites assigned to you are visible."
      >
        <template #action>
          <RouterLink to="/blog-center" class="btn-primary">Back to Blog Center</RouterLink>
        </template>
      </EmptyState>

      <template v-else-if="website">
        <!-- Page title with accent -->
        <div class="bicd-hero" :style="{ '--hero-color': website.primaryColor }">
          <div class="bicd-hero-inner">
            <div class="bicd-hero-avatar">
              <img
                v-if="website.faviconUrl"
                :src="website.faviconUrl"
                alt=""
                class="bicd-hero-favicon"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else class="bicd-hero-initials">{{ website.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div>
              <h2 class="bicd-hero-title">{{ website.name }}</h2>
              <p class="bicd-hero-subtitle">Blog Image Toolkit</p>
            </div>
          </div>
        </div>

        <!-- Sections -->
        <div class="bicd-sections">
          <!-- 1. Quick Copy Panel -->
          <QuickCopyPanel
            :website="website"
            :prompts="websitePrompts"
            :products="website.products"
            @copied="showToast"
          />

          <!-- 2. Website Branding -->
          <BrandingSection
            :website="website"
            :can-edit="canEdit"
            @copied="showToast"
          />

          <!-- 3. Featured Image Prompt Templates -->
          <div class="bicd-section card card-pad">
            <div class="bicd-section-header">
              <div class="bicd-section-header-left">
                <span class="bicd-section-icon bicd-section-icon--blue" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </span>
                <h3 class="bicd-section-title">Featured Image Prompts</h3>
                <span class="bicd-section-count">{{ websitePrompts.length }}</span>
              </div>
              <button v-if="canEdit" type="button" class="btn-primary bicd-add-btn" @click="openAddPrompt">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add Template
              </button>
            </div>

            <div v-if="websitePrompts.length" class="bicd-prompts-grid">
              <PromptTemplateCard
                v-for="p in websitePrompts"
                :key="p.id"
                :prompt="p"
                :can-edit="canEdit"
                @copied="() => showToast('Prompt copied ✓')"
                @edit="editPrompt"
                @delete="deletePrompt"
              />
            </div>
            <div v-else class="bicd-empty-inline">
              <p>No prompt templates yet.</p>
              <button v-if="canEdit" type="button" class="btn-secondary" @click="openAddPrompt">Create First Template</button>
            </div>
          </div>

          <!-- 4. Product Image Library -->
          <div class="bicd-section card card-pad">
            <div class="bicd-section-header">
              <div class="bicd-section-header-left">
                <span class="bicd-section-icon bicd-section-icon--purple" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                </span>
                <h3 class="bicd-section-title">Product Image Library</h3>
                <span class="bicd-section-count">{{ website.products.length }}</span>
              </div>
              <RouterLink v-if="canEdit" :to="`/websites/${website.id}/edit`" class="btn-secondary bicd-add-btn">
                Manage Products
              </RouterLink>
            </div>

            <div v-if="website.products.length" class="bicd-products-grid">
              <ProductImageCard
                v-for="p in website.products"
                :key="p.id"
                :product="p"
                @copied="() => showToast('Image URL copied ✓')"
              />
            </div>
            <div v-else class="bicd-empty-inline">
              <p>No products added to this website yet.</p>
              <RouterLink v-if="canEdit" :to="`/websites/${website.id}/edit`" class="btn-secondary">Add Products</RouterLink>
            </div>
          </div>

          <!-- 5. Blog Workflow Guide -->
          <WorkflowGuide
            :instructions="workflowText"
            :can-edit="canEdit"
            :saving="savingWorkflow"
            @save="saveWorkflow"
          />
        </div>
      </template>

      <!-- Website not found -->
      <EmptyState
        v-else
        title="Website not found"
        description="The website you're looking for doesn't exist or you don't have access."
      >
        <template #action>
          <RouterLink to="/blog-center/templates" class="btn-primary">Back to Templates</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>

    <!-- Prompt Template Modal -->
    <PromptTemplateModal
      :open="promptModalOpen"
      :website-id="websiteId"
      :prompt="editingPrompt"
      :saving="savingPrompt"
      @close="promptModalOpen = false"
      @save="savePrompt"
    />

    <!-- Copy Toast -->
    <CopyToast :message="toastMsg" :show="toastVisible" @done="toastVisible = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import BrandingSection from '@/components/blog-image-center/BrandingSection.vue';
import PromptTemplateCard from '@/components/blog-image-center/PromptTemplateCard.vue';
import ProductImageCard from '@/components/blog-image-center/ProductImageCard.vue';
import QuickCopyPanel from '@/components/blog-image-center/QuickCopyPanel.vue';
import WorkflowGuide from '@/components/blog-image-center/WorkflowGuide.vue';
import PromptTemplateModal from '@/components/blog-image-center/PromptTemplateModal.vue';
import CopyToast from '@/components/blog-image-center/CopyToast.vue';
import { useDataStore } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { useBlogImageCenterStore, type BlogImagePrompt } from '@/stores/blogImageCenter';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites', 'blog_image_prompts', 'blog_image_workflows']);

const route = useRoute();
const data = useDataStore();
const auth = useAuthStore();
const blogStore = useBlogImageCenterStore();

const websiteId = computed(() => route.params.websiteId as string);

const website = computed(() =>
  data.websites.find((w) => w.id === websiteId.value) ?? null
);

const websitePrompts = computed(() =>
  blogStore.promptsByWebsite(websiteId.value)
);

const workflowText = computed(() =>
  blogStore.workflows[websiteId.value]?.instructions ?? ''
);

// canView: Head/Supervisor/Admin/Owner/Assistant Head see every website.
// Team Members can only view a website they're assigned to (createdBy = uid).
// Quality Checker is blocked at the router level and never lands here.
const canView = computed(() => {
  if (!website.value) return false;
  if (auth.isAdmin || auth.isAssistantHead) return true;
  return website.value.createdBy === (auth.user?.id ?? '');
});

// Head/Supervisor (isAdmin) can manage all templates.
// Assistant Head can manage templates per the spec.
// Team Members can view but not create/edit/delete templates.
const canEdit = computed(() => auth.isAdmin || auth.isAssistantHead);

// ── Toast ──
const toastVisible = ref(false);
const toastMsg = ref('');

const showToast = (msg: string) => {
  toastMsg.value = msg;
  toastVisible.value = true;
};

// ── Prompt CRUD ──
const promptModalOpen = ref(false);
const editingPrompt = ref<BlogImagePrompt | null>(null);
const savingPrompt = ref(false);

const openAddPrompt = () => {
  editingPrompt.value = null;
  promptModalOpen.value = true;
};

const editPrompt = (p: BlogImagePrompt) => {
  editingPrompt.value = p;
  promptModalOpen.value = true;
};

const deletePrompt = async (p: BlogImagePrompt) => {
  if (!confirm(`Delete prompt template "${p.templateName}"?`)) return;
  await blogStore.removePrompt(p.id, websiteId.value);
};

const savePrompt = async (formData: {
  id?: string;
  websiteId: string;
  templateName: string;
  promptContent: string;
  position: number;
}) => {
  savingPrompt.value = true;
  const ok = await blogStore.upsertPrompt(
    {
      id: formData.id,
      websiteId: formData.websiteId,
      templateName: formData.templateName,
      promptContent: formData.promptContent,
      position: formData.position
    },
    auth.user?.id
  );
  savingPrompt.value = false;
  if (ok) {
    promptModalOpen.value = false;
    showToast(formData.id ? 'Template updated ✓' : 'Template created ✓');
  }
};

// ── Workflow ──
const savingWorkflow = ref(false);

const saveWorkflow = async (instructions: string) => {
  savingWorkflow.value = true;
  const ok = await blogStore.upsertWorkflow(websiteId.value, instructions, auth.user?.id);
  savingWorkflow.value = false;
  if (ok) showToast('Workflow saved ✓');
};

// ── Mount ──
onMounted(() => {
  data.fetchWebsites();
  blogStore.fetchPromptsForWebsite(websiteId.value);
  blogStore.fetchWorkflow(websiteId.value);
});
</script>

<style scoped>
.bicd-top {
  margin-bottom: 0.75rem;
}

.bicd-back {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  transition: all 0.15s ease;
}
.bicd-back:hover {
  color: var(--primary);
  background: var(--soft-bg);
}

/* Hero */
.bicd-hero {
  margin-bottom: 1.5rem;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--hero-color, var(--primary)) 10%, var(--card-bg)), color-mix(in srgb, var(--hero-color, var(--primary)) 4%, var(--card-bg)));
  border: 1px solid color-mix(in srgb, var(--hero-color, var(--primary)) 15%, var(--border));
}

.bicd-hero-inner {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.bicd-hero-avatar {
  width: 3.5rem;
  height: 3.5rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 2px solid color-mix(in srgb, var(--hero-color, var(--primary)) 20%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .bicd-hero-avatar {
  background: var(--card-bg);
}

.bicd-hero-favicon {
  width: 60%;
  height: 60%;
  object-fit: contain;
}

.bicd-hero-initials {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1.25rem;
  font-weight: 900;
  color: var(--hero-color, var(--primary));
}

.bicd-hero-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.bicd-hero-subtitle {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  margin: 0.15rem 0 0;
}

/* Sections */
.bicd-sections {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.bicd-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.bicd-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.bicd-section-header-left {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}

.bicd-section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.bicd-section-icon--blue {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 12%, transparent), color-mix(in srgb, var(--primary) 5%, transparent));
  color: var(--primary);
}

.bicd-section-icon--purple {
  background: linear-gradient(135deg, rgba(109, 40, 217, 0.12), rgba(109, 40, 217, 0.05));
  color: #7c3aed;
}
:root[data-theme='dark-gray'] .bicd-section-icon--purple {
  color: #a78bfa;
}

.bicd-section-title {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
  color: var(--text-main);
}

.bicd-section-count {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.bicd-add-btn {
  font-size: 0.78rem;
  padding: 0.4rem 0.85rem;
  height: auto;
  min-height: auto;
}

/* Prompt grid */
.bicd-prompts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.85rem;
}

/* Products grid */
.bicd-products-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.85rem;
}

/* Empty inline */
.bicd-empty-inline {
  text-align: center;
  padding: 1.5rem 0;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.bicd-empty-inline p {
  margin: 0 0 0.75rem;
}

@media (max-width: 640px) {
  .bicd-hero {
    padding: 1rem;
  }
  .bicd-hero-title {
    font-size: 1.15rem;
  }
  .bicd-prompts-grid {
    grid-template-columns: 1fr;
  }
  .bicd-products-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .bicd-products-grid {
    grid-template-columns: 1fr;
  }
}
</style>
