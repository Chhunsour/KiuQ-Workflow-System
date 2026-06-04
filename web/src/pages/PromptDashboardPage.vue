<template>
  <div>
    <PageHeader
      title="Prompt Dashboard"
      subtitle="Select a website to start building prompts — website-first workflow."
    >
      <template #actions>
        <RouterLink v-if="auth.isAdmin" to="/prompt/library" class="btn-secondary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          </svg>
          Prompt Library
        </RouterLink>
        <RouterLink to="/websites/new" class="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          New Website
        </RouterLink>
      </template>
    </PageHeader>

    <!-- How it works strip -->
    <div class="pd-steps card card-pad mb-6">
      <div class="pd-steps-inner">
        <div v-for="(step, i) in steps" :key="i" class="pd-step">
          <span class="pd-step-num">{{ i + 1 }}</span>
          <span class="pd-step-label">{{ step }}</span>
          <svg v-if="i < steps.length - 1" class="pd-step-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-5 flex flex-wrap gap-3">
      <input
        v-model="search"
        type="search"
        class="input flex-1 min-w-[200px]"
        placeholder="Search websites by name or domain…"
      />
      <select v-if="auth.isAdmin" v-model="filterMember" class="input w-48">
        <option value="">All members</option>
        <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.fullName }}</option>
      </select>
      <select v-model="filterType" class="input w-48">
        <option value="">All types</option>
        <option v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
    </div>

    <LoadingBlock :loading="data.loading.websites || pw.loadingTemplates" :error="data.errors.websites || pw.errorTemplates" :retry="reload">

      <!-- Website cards -->
      <div v-if="filteredWebsites.length" class="pd-grid">
        <div v-for="w in filteredWebsites" :key="w.id" class="pd-card card">
          <!-- Header -->
          <div class="pd-card-header">
            <div class="pd-favicon-wrap">
              <img
                v-if="w.faviconUrl"
                :src="w.faviconUrl"
                alt=""
                class="pd-favicon"
                @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
              />
              <span v-else class="pd-favicon-fallback">{{ w.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="pd-card-info">
              <h3 class="pd-card-name">{{ w.name }}</h3>
              <a
                v-if="w.domain"
                :href="w.domain.startsWith('http') ? w.domain : `https://${w.domain}`"
                target="_blank"
                rel="noopener"
                class="pd-card-domain"
              >{{ displayDomain(w.domain) }}</a>
              <span v-else class="pd-card-domain pd-card-domain--empty">No domain set</span>
            </div>
          </div>

          <!-- Meta badges -->
          <div class="pd-card-badges">
            <span class="pd-type-badge">{{ websiteTypeLabel(w.websiteType) }}</span>
            <span v-if="creatorName(w)" class="pd-creator">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {{ creatorName(w) }}
            </span>
          </div>

          <!-- Prompt count -->
          <div class="pd-card-prompt-count">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>{{ promptCountForWebsite(w) }} available prompt{{ promptCountForWebsite(w) !== 1 ? 's' : '' }}</span>
          </div>

          <!-- Color swatch row -->
          <div v-if="w.primaryColor || w.secondaryColor || w.backgroundColor" class="pd-color-row">
            <span
              v-if="w.primaryColor"
              class="pd-swatch"
              :style="{ background: w.primaryColor }"
              :title="`Primary: ${w.primaryColor}`"
            />
            <span
              v-if="w.secondaryColor"
              class="pd-swatch"
              :style="{ background: w.secondaryColor }"
              :title="`Secondary: ${w.secondaryColor}`"
            />
            <span
              v-if="w.backgroundColor"
              class="pd-swatch pd-swatch--border"
              :style="{ background: w.backgroundColor }"
              :title="`Background: ${w.backgroundColor}`"
            />
            <span v-if="w.fontFamily" class="pd-font-label">{{ w.fontFamily }}</span>
          </div>

          <!-- Products indicator -->
          <div v-if="w.products?.length" class="pd-products-badge">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-4 0v2"/><path d="M12 12v5"/><path d="M10 14h4"/></svg>
            {{ w.products.length }} product{{ w.products.length !== 1 ? 's' : '' }}
          </div>

          <!-- Action -->
          <RouterLink :to="`/prompt/website/${w.id}`" class="btn-primary pd-open-btn">
            Open Prompts
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </RouterLink>
        </div>
      </div>

      <!-- Empty state -->
      <EmptyState
        v-else
        title="No websites yet"
        description="Create a website first, fill in the details, then come back to build prompts."
      >
        <template #action>
          <RouterLink to="/websites/new" class="btn-primary">Create Website</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { usePromptWorkflowStore } from '@/stores/promptWorkflow';
import { websiteTypeLabel } from '@/lib/promptLibrary';
import PageHeader from '@/components/ui/PageHeader.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

const auth = useAuthStore();
const data = useDataStore();
const pw = usePromptWorkflowStore();

const search = ref('');
const filterMember = ref('');
const filterType = ref('');

const steps = ['Select Website', 'Choose Page Group', 'Pick Prompt', 'Fill Fields', 'Copy Prompt'];

const typeOptions = [
  { value: 'normal_ecommerce', label: 'Normal E-commerce' },
  { value: 'product_landing', label: 'Product Landing' },
  { value: 'catalog', label: 'Catalog' },
  { value: 'blog_guide', label: 'Blog / Guide' },
  { value: 'service', label: 'Service' },
  { value: 'brand', label: 'Brand' }
];

const displayDomain = (domain: string) =>
  domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

const creatorName = (w: typeof data.websites[0]) => {
  if (!auth.isAdmin) return '';
  const member = data.members.find((m) => m.id === w.createdBy);
  return member?.fullName || '';
};

const visibleWebsites = computed(() => {
  if (auth.isAdmin) return data.websites;
  return data.websites.filter((w) => w.createdBy === auth.user?.id);
});

const filteredWebsites = computed(() => {
  let list = visibleWebsites.value;
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.domain && w.domain.toLowerCase().includes(q))
    );
  }
  if (filterMember.value) {
    list = list.filter((w) => w.createdBy === filterMember.value);
  }
  if (filterType.value) {
    list = list.filter((w) => w.websiteType === filterType.value);
  }
  return list;
});

const promptCountForWebsite = (_w: typeof data.websites[0]) => {
  // Count approved templates (visible to this user)
  return pw.templates.filter((t) =>
    auth.isAdmin ? true : t.status === 'approved'
  ).length;
};

const reload = () => {
  data.fetchWebsites(true);
  pw.fetchTemplates(true);
};

onMounted(async () => {
  await Promise.all([
    data.fetchWebsites(),
    data.fetchMembers(),
    pw.fetchTemplates()
  ]);
});
</script>

<style scoped>
/* ── Steps strip ───────────────────────────────────────────── */
.pd-steps { padding: 0.75rem 1rem; }
.pd-steps-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}
.pd-step {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.pd-step-num {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
}
.pd-step-label { font-weight: 500; color: var(--text-main); }
.pd-step-arrow { color: var(--text-muted); flex-shrink: 0; }

/* ── Grid ──────────────────────────────────────────────────── */
.pd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

/* ── Card ──────────────────────────────────────────────────── */
.pd-card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
}

.pd-card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.pd-favicon-wrap {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--soft-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.pd-favicon { width: 100%; height: 100%; object-fit: cover; }
.pd-favicon-fallback {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--primary);
}

.pd-card-info { min-width: 0; flex: 1; }
.pd-card-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pd-card-domain {
  font-size: 0.72rem;
  color: var(--primary);
  text-decoration: none;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pd-card-domain--empty { color: var(--text-muted); }

.pd-card-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.pd-type-badge {
  font-size: 0.7rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  opacity: 0.85;
}
.pd-creator {
  font-size: 0.7rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.pd-card-prompt-count {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.pd-color-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}
.pd-swatch {
  display: inline-block;
  width: 1rem;
  height: 1rem;
  border-radius: 3px;
  flex-shrink: 0;
}
.pd-swatch--border { border: 1px solid var(--border); }
.pd-font-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-left: 0.25rem;
}

.pd-products-badge {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  color: var(--text-muted);
  background: var(--soft-bg);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  align-self: flex-start;
}

.pd-open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: auto;
}

@media (max-width: 640px) {
  .pd-grid { grid-template-columns: 1fr; }
  .pd-steps-inner { gap: 0.3rem; }
  .pd-step-arrow { display: none; }
}
</style>
