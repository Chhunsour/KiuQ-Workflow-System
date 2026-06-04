<template>
  <div>
    <LoadingBlock :loading="loading" :error="error" :retry="load">

      <!-- Website not found -->
      <div v-if="!website" class="card card-pad text-center">
        <h2 class="section-title">Website not found</h2>
        <p class="mt-2 text-sm text-text-muted">This website does not exist or is not available to your account.</p>
        <RouterLink to="/prompt" class="btn-primary mt-5">Back to Prompt Dashboard</RouterLink>
      </div>

      <template v-else>
        <!-- Breadcrumb -->
        <nav class="mb-4 flex flex-wrap items-center gap-2 text-sm text-text-muted" aria-label="Breadcrumb">
          <RouterLink to="/prompt" class="hover:text-text-main">Prompt Dashboard</RouterLink>
          <span aria-hidden="true">›</span>
          <span class="ui-font font-medium text-text-main">{{ website.name }}</span>
        </nav>

        <!-- Website header card -->
        <div class="pw-header card card-pad mb-6">
          <div class="pw-header-identity">
            <div class="pw-favicon-wrap">
              <img
                v-if="website.faviconUrl"
                :src="website.faviconUrl"
                alt=""
                class="pw-favicon"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else class="pw-favicon-fallback">{{ website.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div>
              <h1 class="pw-website-name">{{ website.name }}</h1>
              <a
                v-if="website.domain"
                :href="website.domain.startsWith('http') ? website.domain : `https://${website.domain}`"
                target="_blank"
                rel="noopener"
                class="pw-domain"
              >{{ displayDomain(website.domain) }}</a>
            </div>
          </div>
          <div class="pw-header-meta">
            <div class="pw-meta-grid">
              <div v-if="website.websiteType" class="pw-meta-item">
                <span class="pw-meta-label">Type</span>
                <span class="pw-meta-val">{{ websiteTypeLabel(website.websiteType) }}</span>
              </div>
              <div v-if="website.industry" class="pw-meta-item">
                <span class="pw-meta-label">Industry</span>
                <span class="pw-meta-val">{{ website.industry }}</span>
              </div>
              <div v-if="website.primaryColor" class="pw-meta-item">
                <span class="pw-meta-label">Primary</span>
                <span class="pw-color-chip" :style="{ background: website.primaryColor }" />
                <span class="pw-meta-val">{{ website.primaryColor }}</span>
              </div>
              <div v-if="website.fontFamily" class="pw-meta-item">
                <span class="pw-meta-label">Font</span>
                <span class="pw-meta-val">{{ website.fontFamily }}</span>
              </div>
              <div v-if="website.products?.length" class="pw-meta-item">
                <span class="pw-meta-label">Products</span>
                <span class="pw-meta-val">{{ website.products.length }}</span>
              </div>
            </div>

            <div class="pw-header-actions">
              <RouterLink :to="`/websites/${website.id}/edit`" class="btn-secondary pw-edit-btn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                Edit Website
              </RouterLink>
              <RouterLink to="/prompt" class="btn-ghost pw-edit-btn">
                ← All Websites
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Page groups heading -->
        <div class="mb-4 flex items-center justify-between">
          <div>
            <h2 class="section-title">Choose a Page Group</h2>
            <p class="mt-0.5 text-sm text-text-muted">Select the page type you want to build prompts for.</p>
          </div>
          <div class="text-sm text-text-muted">
            {{ groupsWithPrompts.length }} group{{ groupsWithPrompts.length !== 1 ? 's' : '' }} available
          </div>
        </div>

        <!-- Page group cards -->
        <div class="pg-grid">
          <RouterLink
            v-for="g in groupsWithPrompts"
            :key="g.group.pageType"
            :to="`/prompt/website/${website.id}/page/${g.group.pageType}`"
            class="pg-card card"
          >
            <div class="pg-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div class="pg-card-body">
              <div class="pg-card-name">{{ g.group.name }}</div>
              <div class="pg-card-desc">{{ g.group.description }}</div>
              <div class="pg-card-count">
                {{ g.count }} prompt{{ g.count !== 1 ? 's' : '' }}
              </div>
            </div>
            <div class="pg-card-arrow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          </RouterLink>
        </div>

        <EmptyState
          v-if="!groupsWithPrompts.length && !loading"
          title="No prompts available yet"
          description="No approved prompts have been created yet. Ask your admin to add prompts in the Prompt Library."
        >
          <template v-if="auth.isAdmin" #action>
            <RouterLink to="/prompt/library" class="btn-primary">Open Prompt Library</RouterLink>
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
import { websiteTypeLabel } from '@/lib/promptLibrary';
import type { Website } from '@/stores/data';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const route = useRoute();
const auth = useAuthStore();
const data = useDataStore();
const pw = usePromptWorkflowStore();

const loading = ref(true);
const error = ref<string | null>(null);

const websiteId = computed(() => route.params.websiteId as string);

const website = computed<Website | undefined>(() =>
  data.websites.find((w) => w.id === websiteId.value)
);

const displayDomain = (domain: string) =>
  domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

const visibleTemplates = computed(() =>
  pw.templates.filter((t) => auth.isAdmin || t.status === 'approved')
);

const groupsWithPrompts = computed(() => {
  // Collect all groups that have at least 1 visible template
  return pw.groups
    .map((g) => ({
      group: g,
      count: visibleTemplates.value.filter((t) => t.pageType === g.pageType).length
    }))
    .filter((g) => g.count > 0 || auth.isAdmin);
});

const load = async () => {
  loading.value = true;
  error.value = null;
  try {
    await Promise.all([
      data.fetchWebsites(),
      pw.fetchGroups(),
      pw.fetchTemplates()
    ]);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Could not load data.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
/* ── Website header ────────────────────────────────────────── */
.pw-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1.25rem;
}
.pw-header-identity {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex: 1;
  min-width: 0;
}
.pw-favicon-wrap {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.pw-favicon { width: 100%; height: 100%; object-fit: cover; }
.pw-favicon-fallback {
  font-size: 1rem;
  font-weight: 700;
  color: var(--primary);
}
.pw-website-name {
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--text-main);
}
.pw-domain {
  font-size: 0.75rem;
  color: var(--primary);
  text-decoration: none;
}

.pw-header-meta {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 2;
  min-width: 200px;
}
.pw-meta-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.25rem;
}
.pw-meta-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
}
.pw-meta-label {
  color: var(--text-muted);
}
.pw-meta-val {
  color: var(--text-main);
  font-weight: 600;
}
.pw-color-chip {
  display: inline-block;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 3px;
  flex-shrink: 0;
}
.pw-header-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.pw-edit-btn {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

/* ── Page group grid ───────────────────────────────────────── */
.pg-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.pg-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  text-decoration: none;
  color: inherit;
  transition: box-shadow 0.15s, border-color 0.15s;
  cursor: pointer;
}
.pg-card:hover {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.pg-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  flex-shrink: 0;
  opacity: 0.85;
}
.pg-card-body {
  flex: 1;
  min-width: 0;
}
.pg-card-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-main);
}
.pg-card-desc {
  font-size: 0.73rem;
  color: var(--text-muted);
  margin-top: 0.15rem;
  line-height: 1.35;
}
.pg-card-count {
  margin-top: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--primary);
}
.pg-card-arrow {
  color: var(--text-muted);
  flex-shrink: 0;
}

@media (max-width: 640px) {
  .pg-grid { grid-template-columns: 1fr; }
  .pw-header { flex-direction: column; }
}
</style>
