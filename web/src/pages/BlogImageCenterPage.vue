<template>
  <div>
    <PageHeader
      title="Prompt Templates"
      subtitle="Per-website featured image prompt templates. Select a website to manage brand colors, prompts, and workflow guides."
    />

    <!-- Filters -->
    <div class="bic-filters">
      <input v-model="search" class="input bic-search" type="search" placeholder="Search by name or domain…" />
      <select v-if="auth.isAdmin" v-model="filterMemberId" class="input bic-select">
        <option value="">All members</option>
        <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.fullName }}</option>
      </select>
    </div>

    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">
      <div v-if="filtered.length" class="bic-grid">
        <div v-for="w in filtered" :key="w.id" class="bic-card card">
          <!-- Color accent bar -->
          <div class="bic-card-accent" :style="{ background: `linear-gradient(135deg, ${w.primaryColor}, ${w.secondaryColor || w.primaryColor})` }" />

          <div class="bic-card-body">
            <!-- Identity -->
            <div class="bic-card-identity">
              <div class="bic-avatar" :style="{ borderColor: w.primaryColor + '30' }">
                <img
                  v-if="w.faviconUrl"
                  :src="w.faviconUrl"
                  alt=""
                  class="bic-favicon"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <span v-else class="bic-initials" :style="{ color: w.primaryColor }">{{ w.name.slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="bic-card-info">
                <h3 class="bic-card-name">{{ w.name }}</h3>
                <a
                  v-if="w.domain"
                  :href="w.domain.startsWith('http') ? w.domain : `https://${w.domain}`"
                  target="_blank"
                  rel="noopener"
                  class="bic-card-domain"
                >{{ displayDomain(w.domain) }}</a>
                <span v-else class="bic-card-domain bic-card-domain--empty">No domain</span>
              </div>
            </div>

            <!-- Meta -->
            <div class="bic-card-meta">
              <!-- Color preview -->
              <div class="bic-meta-colors">
                <span class="bic-meta-dot" :style="{ background: w.primaryColor }" :title="w.primaryColor" />
                <span v-if="w.secondaryColor" class="bic-meta-dot" :style="{ background: w.secondaryColor }" :title="w.secondaryColor" />
                <span v-if="w.accentColor" class="bic-meta-dot" :style="{ background: w.accentColor }" :title="w.accentColor" />
                <span class="bic-meta-color-label">{{ w.primaryColor }}</span>
              </div>

              <!-- Prompt count -->
              <div class="bic-meta-prompts">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {{ promptCount(w.id) }} Prompt{{ promptCount(w.id) !== 1 ? 's' : '' }}
              </div>

              <!-- Creator (admin only) -->
              <div v-if="auth.isAdmin && creatorName(w)" class="bic-meta-creator">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="8" r="4" />
                  <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                </svg>
                {{ creatorName(w) }}
              </div>
            </div>
          </div>

          <!-- Actions -->
          <RouterLink :to="`/blog-center/templates/${w.id}`" class="bic-card-open-btn">
            Open
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </RouterLink>
        </div>
      </div>

      <EmptyState
        v-else
        title="No websites found"
        :description="search || filterMemberId ? 'No websites match your current filters.' : 'No websites have been created yet.'"
      />
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import { useDataStore, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { useBlogImageCenterStore } from '@/stores/blogImageCenter';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites', 'blog_image_prompts']);

const data = useDataStore();
const auth = useAuthStore();
const blogStore = useBlogImageCenterStore();

const search = ref('');
const filterMemberId = ref('');

const currentUserId = computed(() => auth.user?.id ?? '');

const filtered = computed(() => {
  let list = data.websites;

  // Visibility scoping (same rule used by Blog Center):
  // Head / Supervisor / Admin / Owner / Assistant Head see every website.
  // Team Members only see websites assigned to them (createdBy = their uid).
  // Quality Checker is blocked at the router level.
  const canSeeAll = auth.isAdmin || auth.isAssistantHead;
  if (!canSeeAll) {
    list = list.filter((w) => w.createdBy === currentUserId.value);
  }

  if (filterMemberId.value) {
    list = list.filter((w) => w.createdBy === filterMemberId.value);
  }

  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q)
    );
  }

  return list;
});

const promptCount = (websiteId: string) =>
  blogStore.promptCountByWebsite[websiteId] || 0;

const displayDomain = (domain: string) => {
  try {
    const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    return url.hostname;
  } catch {
    return domain;
  }
};

const creatorName = (w: Website) => {
  if (!w.createdBy) return '';
  const member = data.memberById(w.createdBy);
  return member?.fullName ?? '';
};

onMounted(() => {
  data.fetchWebsites();
  blogStore.fetchAllPrompts();
  if (auth.isAdmin) data.fetchMembers();
});
</script>

<style scoped>
.bic-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}
.bic-search { flex: 1; min-width: 200px; max-width: 360px; }
.bic-select { min-width: 170px; }

.bic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(330px, 1fr));
  gap: 1rem;
}

/* Card */
.bic-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}
.bic-card:hover {
  box-shadow: 0 8px 24px rgba(63, 141, 254, 0.08), 0 2px 8px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.bic-card-accent {
  height: 4px;
  width: 100%;
  flex-shrink: 0;
}

.bic-card-body {
  padding: 1.1rem 1.1rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex: 1;
}

/* Identity */
.bic-card-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.bic-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 12px;
  background: #fff;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .bic-avatar {
  background: var(--card-bg);
}

.bic-favicon {
  width: 60%;
  height: 60%;
  object-fit: contain;
}

.bic-initials {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 1.1rem;
  font-weight: 900;
}

.bic-card-info {
  min-width: 0;
  flex: 1;
}

.bic-card-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bic-card-domain {
  display: block;
  font-size: 0.78rem;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}
.bic-card-domain:hover { text-decoration: underline; }
.bic-card-domain--empty { color: var(--text-muted); }

/* Meta */
.bic-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
}

.bic-meta-colors {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.bic-meta-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .bic-meta-dot {
  border-color: rgba(255, 255, 255, 0.1);
}

.bic-meta-color-label {
  font-family: 'Jost Numbers', 'Raleway', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-left: 0.2rem;
}

.bic-meta-prompts {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0.2rem 0.6rem 0.2rem 0.45rem;
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  border-radius: 999px;
}

.bic-meta-creator {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  color: var(--text-muted);
}

/* Open button */
.bic-card-open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem;
  border-top: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
.bic-card-open-btn:hover {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
}
.bic-card-open-btn svg {
  transition: transform 0.2s ease;
}
.bic-card-open-btn:hover svg {
  transform: translateX(3px);
}

@media (max-width: 640px) {
  .bic-grid { grid-template-columns: 1fr; }
  .bic-search { max-width: 100%; }
}
</style>
