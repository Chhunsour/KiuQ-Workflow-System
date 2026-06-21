<template>
  <div class="mw-page">
    <!-- ════════ HEADER ════════ -->
    <header class="mw-header">
      <div class="mw-header-left">
        <span class="mw-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </span>
        <div>
          <h1 class="mw-title">My Websites</h1>
          <p class="mw-subtitle">Manage saved websites, assignments, and website profiles.</p>
        </div>
      </div>
      <div class="mw-header-right">
        <RouterLink v-if="!auth.isViewer" to="/websites/new" class="mw-btn-new">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Website
        </RouterLink>
      </div>
    </header>

    <!-- ════════ STAT PILLS ════════ -->
    <div class="mw-stats">
      <div class="mw-stat">
        <span class="mw-stat-num">{{ stats.total }}</span>
        <span class="mw-stat-label">Total</span>
      </div>
      <div class="mw-stat">
        <span class="mw-stat-num mw-stat-num--green">{{ stats.active }}</span>
        <span class="mw-stat-label">Active</span>
      </div>
      <div class="mw-stat">
        <span class="mw-stat-num">{{ stats.existing }}</span>
        <span class="mw-stat-label">Existing</span>
      </div>
      <div class="mw-stat">
        <span class="mw-stat-num mw-stat-num--accent">{{ stats.ecommerce }}</span>
        <span class="mw-stat-label">E-commerce</span>
      </div>
      <div class="mw-stat">
        <span class="mw-stat-num mw-stat-num--wp">{{ stats.wordpress }}</span>
        <span class="mw-stat-label">WordPress</span>
      </div>
      <div class="mw-stat">
        <span class="mw-stat-num mw-stat-num--fw">{{ stats.framework }}</span>
        <span class="mw-stat-label">Framework</span>
      </div>
    </div>

    <!-- ════════ FILTER TOOLBAR ════════ -->
    <div class="mw-toolbar">
      <div class="mw-toolbar-left">
        <div class="mw-search-wrap">
          <svg class="mw-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="search" type="search" class="mw-search" placeholder="Search by name or domain…" />
        </div>
        <select v-if="auth.isAdmin" v-model="filterMemberId" class="mw-select">
          <option value="">All members</option>
          <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.fullName }}</option>
        </select>
        <select v-model="filterType" class="mw-select">
          <option value="">All types</option>
          <option value="existing">Existing Website</option>
          <option value="ecommerce">E-commerce</option>
          <option value="landing">Landing Page</option>
          <option value="catalog">Catalog</option>
          <option value="blog">Blog / Guide</option>
          <option value="service">Service</option>
          <option value="brand">Brand</option>
        </select>
        <select v-model="filterPlatform" class="mw-select">
          <option value="">All Platforms</option>
          <option value="wordpress">WordPress</option>
          <option value="framework">Framework</option>
          <option value="unknown">Unknown</option>
        </select>
        <select v-model="sortBy" class="mw-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </select>
      </div>
      <div class="mw-toolbar-right">
        <div class="mw-view-toggle">
          <button
            type="button"
            class="mw-view-btn"
            :class="{ 'mw-view-btn--active': viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
          <button
            type="button"
            class="mw-view-btn"
            :class="{ 'mw-view-btn--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="List View"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ CONTENT ════════ -->
    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">

      <!-- ── Grid View ── -->
      <div v-if="sorted.length && viewMode === 'grid'" class="mw-grid">
        <article v-for="w in sorted" :key="w.id" class="mw-card">
          <!-- Top Row: Identity & Status -->
          <div class="mw-card-header">
            <div class="mw-avatar-wrap">
              <div class="mw-avatar">
                <img v-if="w.faviconUrl && !failedFavicons[w.id]" :src="w.faviconUrl" alt="" class="mw-favicon" @error="failedFavicons[w.id] = true" />
                <span v-else class="mw-initials">{{ w.name.slice(0, 2).toUpperCase() }}</span>
              </div>
              <span v-if="w.isFramework" class="mw-conn-dot-indicator" :class="getConnectionStatus(w).dotClass" :title="`Connection: ${getConnectionStatus(w).text}`" />
            </div>
            <div class="mw-card-info">
              <h3 class="mw-card-name">{{ w.name }}</h3>
              <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="mw-card-domain">{{ displayDomain(w.domain) }}</a>
              <span v-else class="mw-card-domain mw-card-domain--empty">No domain</span>
            </div>
            <div class="mw-card-status">
              <StatusBadge :status="w.status" />
            </div>
          </div>

          <!-- Middle Row: Meta & Badges -->
          <div class="mw-card-body">
            <!-- Meta row -->
            <div class="mw-card-meta">
              <div v-if="creatorName(w)" class="mw-meta-item" title="Assigned Member">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                <span>{{ creatorName(w) }}</span>
              </div>
              <div v-if="w.createdAt" class="mw-meta-item" title="Created Date">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                <span>{{ formatDate(w.createdAt) }}</span>
              </div>
            </div>
            <!-- Platform & Type Badges -->
            <div class="mw-card-badges">
              <span class="mw-type-badge" :class="`mw-type-badge--${w.websiteType || 'default'}`">{{ typeLabel(w.websiteType) }}</span>
              <span class="mw-platform-badge" :class="`mw-platform-badge--${w.platformType || 'unknown'}`">{{ platformLabel(w.platformType) }}</span>
            </div>
          </div>

          <!-- Bottom Row: Compact actions -->
          <div class="mw-card-actions">
            <RouterLink :to="`/websites/${w.id}/edit`" class="mw-action mw-action--secondary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              <span>{{ auth.isViewer ? 'View' : 'Edit' }}</span>
            </RouterLink>
            <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="mw-action mw-action--primary">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              <span>Open</span>
            </a>
            <button v-if="canDelete(w) && !auth.isViewer" class="mw-action mw-action--danger" title="Delete Website" @click="confirmDelete(w)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </article>
      </div>

      <!-- ── List View ── -->
      <div v-else-if="sorted.length && viewMode === 'list'" class="mw-list">
        <div class="mw-list-header">
          <span class="mw-lh-name">Website</span>
          <span class="mw-lh-type">Type</span>
          <span class="mw-lh-status">Status</span>
          <span class="mw-lh-creator">Creator</span>
          <span class="mw-lh-date">Created</span>
          <span class="mw-lh-actions">Actions</span>
        </div>
        <div v-for="w in sorted" :key="w.id" class="mw-list-row">
          <div class="mw-lr-name">
            <div class="mw-avatar mw-avatar--sm">
              <img v-if="w.faviconUrl && !failedFavicons[w.id]" :src="w.faviconUrl" alt="" class="mw-favicon" @error="failedFavicons[w.id] = true" />
              <span v-else class="mw-initials">{{ w.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="mw-lr-nameblock">
              <span class="mw-lr-title">{{ w.name }}</span>
              <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="mw-lr-domain">{{ displayDomain(w.domain) }}</a>
              <span v-else class="mw-lr-domain mw-lr-domain--empty">No domain</span>
            </div>
          </div>
          <span class="mw-lr-type">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="mw-type-badge mw-type-badge--sm" :class="`mw-type-badge--${w.websiteType || 'default'}`">{{ typeLabel(w.websiteType) }}</span>
              <span class="mw-platform-badge mw-platform-badge--sm" :class="`mw-platform-badge--${w.platformType || 'unknown'}`">{{ platformLabel(w.platformType) }}</span>
            </div>
          </span>
          <span class="mw-lr-status"><StatusBadge :status="w.status" /></span>
          <span class="mw-lr-creator">{{ creatorName(w) || '—' }}</span>
          <span class="mw-lr-date">{{ formatDate(w.createdAt) }}</span>
          <div class="mw-lr-actions">
            <RouterLink :to="`/websites/${w.id}/edit`" class="mw-action-icon" title="Edit">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </RouterLink>
            <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="mw-action-icon mw-action-icon--primary" title="Open">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <button v-if="canDelete(w) && !auth.isViewer" class="mw-action-icon mw-action-icon--danger" title="Delete" @click="confirmDelete(w)">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        </div>
      </div>

      <!-- ── Empty State ── -->
      <div v-else class="mw-empty">
        <div class="mw-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <h3 class="mw-empty-title">{{ hasActiveFilters ? 'No websites match your filters' : 'No websites found' }}</h3>
        <p class="mw-empty-desc">{{ hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create a website profile to track domains, assignments, and followups.' }}</p>
        <div class="mw-empty-actions">
          <button v-if="hasActiveFilters" class="mw-action mw-action--secondary" @click="clearFilters">Clear Filters</button>
          <RouterLink v-if="!auth.isViewer" to="/websites/new" class="mw-action mw-action--primary">New Website</RouterLink>
        </div>
      </div>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { RouterLink } from 'vue-router';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import { useDataStore, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites']);

const data = useDataStore();
const auth = useAuthStore();

const search = ref('');
const filterMemberId = ref('');
const filterType = ref('');
const filterPlatform = ref('');
const sortBy = ref<'newest' | 'oldest' | 'az' | 'za'>('newest');
const viewMode = ref<'grid' | 'list'>('grid');
const failedFavicons = reactive<Record<string, boolean>>({});

const currentUserId = computed(() => auth.user?.id ?? '');

const hasActiveFilters = computed(() => !!(search.value || filterMemberId.value || filterType.value || filterPlatform.value));

const clearFilters = () => {
  search.value = '';
  filterMemberId.value = '';
  filterType.value = '';
  filterPlatform.value = '';
};

// ── Filtered list (permissions + filters) ──
const filtered = computed(() => {
  let list = data.websites;

  // Members only see websites they created
  if (!auth.isAdmin) {
    list = list.filter((w) => w.createdBy === currentUserId.value);
  }

  if (filterMemberId.value) {
    list = list.filter((w) => w.createdBy === filterMemberId.value);
  }
  if (filterType.value) {
    list = list.filter((w) => w.websiteType === filterType.value);
  }
  if (filterPlatform.value) {
    list = list.filter((w) => (w.platformType || 'unknown') === filterPlatform.value);
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q)
    );
  }
  return list;
});

// ── Sorted list ──
const sorted = computed(() => {
  const list = [...filtered.value];
  switch (sortBy.value) {
    case 'oldest':
      return list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'az':
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case 'za':
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case 'newest':
    default:
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
});

// ── Stats ──
const stats = computed(() => {
  const list = filtered.value;
  return {
    total: list.length,
    active: list.filter((w) => w.status === 'active').length,
    existing: list.filter((w) => w.websiteType === 'existing').length,
    ecommerce: list.filter((w) => w.websiteType === 'ecommerce' || w.websiteType === 'normal_ecommerce').length,
    wordpress: list.filter((w) => w.platformType === 'wordpress').length,
    framework: list.filter((w) => w.platformType === 'framework').length,
  };
});

// ── Helpers ──
const typeLabel = (t: string) => {
  const map: Record<string, string> = {
    existing: 'Existing',
    ecommerce: 'E-commerce',
    landing: 'Landing Page',
    catalog: 'Catalog',
    blog: 'Blog / Guide',
    service: 'Service',
    brand: 'Brand',
    normal_ecommerce: 'E-commerce',
    product_landing: 'Landing Page',
    blog_guide: 'Blog / Guide',
  };
  return map[t] || t || 'Website';
};

const platformLabel = (p: string) => {
  if (p === 'wordpress') return 'WordPress';
  if (p === 'framework') return 'Framework';
  return 'Unknown';
};

const displayDomain = (domain: string) => {
  try {
    const url = new URL(domain.startsWith('http') ? domain : `https://${domain}`);
    return url.hostname;
  } catch {
    return domain;
  }
};

const liveUrl = (domain: string) =>
  domain.startsWith('http') ? domain : `https://${domain}`;

const formatDate = (d: string) => {
  if (!d) return '';
  try {
    return new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return d;
  }
};

const creatorName = (w: Website) => {
  if (!w.createdBy) return '';
  const member = data.memberById(w.createdBy);
  return member?.fullName ?? '';
};

const canDelete = (w: Website) => {
  if (auth.isAdmin) return true;
  return w.createdBy === currentUserId.value;
};

const confirmDelete = async (w: Website) => {
  if (!confirm(`Delete website "${w.name}"? This cannot be undone.`)) return;
  await data.removeWebsite(w.id);
};

const getConnectionStatus = (w: Website) => {
  if (!w.lastAccessedAt) return { text: 'Not Connected', dotClass: 'dot--gray' };
  const lastActive = new Date(w.lastAccessedAt).getTime();
  const diffMinutes = (Date.now() - lastActive) / 1000 / 60;
  if (diffMinutes <= 15) return { text: 'Active', dotClass: 'dot--green' };
  if (diffMinutes <= 1440) return { text: 'Idle', dotClass: 'dot--orange' };
  return { text: 'Disconnected', dotClass: 'dot--red' };
};

onMounted(() => {
  data.fetchWebsites();
  if (auth.isAdmin) data.fetchMembers();
});
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   MyWebsitesPage — Premium SaaS Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Page ── */
.mw-page { display: flex; flex-direction: column; gap: 16px; }

/* ── Header ── */
.mw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.mw-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.mw-header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  flex-shrink: 0;
}
.mw-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
  line-height: 1.2;
}
.mw-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 2px 0 0;
}
.mw-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.mw-btn-new {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-size: 0.78rem;
  font-weight: 700;
  color: #fff;
  background: var(--primary);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  text-decoration: none;
  transition: filter 0.15s, transform 0.1s;
  font-family: inherit;
}
.mw-btn-new:hover { filter: brightness(1.1); transform: translateY(-1px); }
.mw-btn-new:active { transform: translateY(0); }

/* ── Stat Pills ── */
.mw-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.mw-stat {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  min-width: 0;
  box-shadow: var(--shadow-sm);
}
.mw-stat-num {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.mw-stat-num--green { color: #22c55e; }
.mw-stat-num--accent { color: var(--primary); }
.mw-stat-num--wp { color: #21759b; }
.mw-stat-num--fw { color: var(--primary); }
.mw-stat-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

/* ── Filter Toolbar ── */
.mw-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 12px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  flex-wrap: wrap;
  box-shadow: var(--shadow-sm);
}
.mw-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}
.mw-toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.mw-search-wrap {
  position: relative;
  flex: 1;
  min-width: 180px;
  max-width: 280px;
}
.mw-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
  opacity: 0.6;
}
.mw-search {
  width: 100%;
  height: 34px;
  padding: 0 10px 0 32px;
  font-size: 0.78rem;
  color: var(--text-main);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.mw-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
}
.mw-search::-webkit-search-cancel-button { -webkit-appearance: none; }

.mw-select {
  height: 34px;
  padding: 0 28px 0 10px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-main);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  outline: none;
  font-family: inherit;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 10px center;
  transition: border-color 0.2s, box-shadow 0.2s;
  min-width: 0;
}
.mw-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
}

/* View Toggle */
.mw-view-toggle {
  display: flex;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
.mw-view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 32px;
  border: none;
  background: var(--soft-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.mw-view-btn:first-child { border-right: 1px solid var(--border); }
.mw-view-btn:hover { color: var(--text-main); }
.mw-view-btn--active {
  background: var(--primary);
  color: #fff;
}

/* ── Grid ── */
.mw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* ── Card ── */
.mw-card {
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1), transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 16px;
  gap: 14px;
  box-shadow: var(--shadow-sm);
  position: relative;
}
.mw-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  box-shadow: var(--shadow-md);
}

.mw-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.mw-avatar-wrap {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}
.mw-avatar {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  transition: border-color 0.15s;
}
.mw-card:hover .mw-avatar {
  border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
}
.mw-avatar--sm { width: 28px; height: 28px; border-radius: 6px; }
.mw-favicon { width: 65%; height: 65%; object-fit: contain; }
.mw-initials {
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: -0.02em;
}
.mw-avatar--sm .mw-initials { font-size: 0.6rem; }
.mw-conn-dot-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
  background-color: currentColor;
}
.mw-conn-dot-indicator.dot--green { color: #22c55e; }
.mw-conn-dot-indicator.dot--orange { color: #f59e0b; }
.mw-conn-dot-indicator.dot--red { color: #ef4444; }
.mw-conn-dot-indicator.dot--gray { color: #6b7280; }

.mw-card-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.mw-card-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}
.mw-card-domain {
  display: inline-block;
  font-size: 0.72rem;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
}
.mw-card-domain:hover { text-decoration: underline; }
.mw-card-domain--empty { color: var(--text-soft); }
.mw-card-status { flex-shrink: 0; }

/* Middle Row */
.mw-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.mw-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.mw-meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  color: var(--text-muted);
}
.mw-meta-item svg { opacity: 0.6; flex-shrink: 0; }

/* Badges */
.mw-card-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.mw-type-badge, .mw-platform-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.mw-type-badge {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 12%, transparent);
}
.mw-type-badge--sm { font-size: 0.6rem; padding: 1px 5px; }
.mw-type-badge--existing {
  background: rgba(34, 197, 94, 0.08);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.15);
}
:root[data-theme='dark-gray'] .mw-type-badge--existing { color: #4ade80; }
.mw-type-badge--ecommerce,
.mw-type-badge--normal_ecommerce {
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 20%, transparent);
}

/* Platform Badges */
.mw-platform-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.mw-platform-badge--sm { font-size: 0.6rem; padding: 1px 5px; }
.mw-platform-badge--wordpress {
  background: rgba(33, 117, 155, 0.08);
  color: #21759b;
  border-color: rgba(33, 117, 155, 0.15);
}
:root[data-theme='dark-gray'] .mw-platform-badge--wordpress {
  color: #55c1e6;
  background: rgba(85, 193, 230, 0.08);
  border-color: rgba(85, 193, 230, 0.15);
}
.mw-platform-badge--framework {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 15%, transparent);
}
.mw-platform-badge--unknown {
  background: rgba(120, 120, 120, 0.04);
  color: var(--text-soft);
  border: 1px dashed var(--border);
}

/* Actions */
.mw-card-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: auto;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}

.mw-action {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  height: 28px;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  text-decoration: none;
  font-family: inherit;
  transition: all 0.12s ease;
  white-space: nowrap;
}
.mw-action:hover {
  background: var(--soft-bg);
  color: var(--text-main);
  border-color: var(--border-strong);
}
.mw-action--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.mw-action--primary:hover {
  filter: brightness(1.08);
  background: var(--primary);
  color: #fff;
}
.mw-action--secondary { }
.mw-action--danger {
  flex: 0 0 30px;
  border-color: color-mix(in srgb, #ef4444 20%, var(--border));
  color: #ef4444;
}
.mw-action--danger:hover {
  background: color-mix(in srgb, #ef4444 8%, transparent);
  border-color: #ef4444;
}

/* ═══════════ LIST VIEW ═══════════ */
.mw-list {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.mw-list-header {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr 100px;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--text-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.mw-list-row {
  display: grid;
  grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr 100px;
  gap: 8px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  transition: background-color 0.15s;
}
.mw-list-row:last-child { border-bottom: none; }
.mw-list-row:hover { background: color-mix(in srgb, var(--primary) 3%, transparent); }

.mw-lr-name {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.mw-lr-nameblock { min-width: 0; }
.mw-lr-title {
  display: block;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mw-lr-domain {
  display: block;
  font-size: 0.68rem;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mw-lr-domain:hover { text-decoration: underline; }
.mw-lr-domain--empty { color: var(--text-muted); }
.mw-lr-type, .mw-lr-status { display: flex; align-items: center; }
.mw-lr-creator {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mw-lr-date {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
}
.mw-lr-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: flex-end;
}

.mw-action-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  text-decoration: none;
  transition: all 0.15s;
}
.mw-action-icon:hover { background: var(--soft-bg); color: var(--text-main); border-color: var(--border-strong); }
.mw-action-icon--primary:hover { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); border-color: var(--primary); }
.mw-action-icon--danger:hover { background: color-mix(in srgb, #ef4444 10%, transparent); color: #ef4444; border-color: #ef4444; }

/* ═══════════ EMPTY STATE ═══════════ */
.mw-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  text-align: center;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}
.mw-empty-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
  margin-bottom: 14px;
}
.mw-empty-title {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}
.mw-empty-desc {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin: 4px 0 0;
  max-width: 340px;
}
.mw-empty-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}

/* ═══════════ RESPONSIVE ═══════════ */
@media (max-width: 768px) {
  .mw-grid { grid-template-columns: 1fr; }
  .mw-search-wrap { max-width: 100%; min-width: 0; flex: 1 1 100%; }
  .mw-select { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .mw-stats { gap: 6px; }
  .mw-stat { padding: 5px 10px; }
  .mw-stat-num { font-size: 0.8rem; }
  .mw-stat-label { font-size: 0.62rem; }

  /* List view: hide columns on mobile */
  .mw-list-header { display: none; }
  .mw-list-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    padding: 12px 14px;
  }
  .mw-lr-name { flex: 1 1 100%; }
  .mw-lr-type, .mw-lr-status { flex: 0 0 auto; }
  .mw-lr-creator, .mw-lr-date { display: none; }
  .mw-lr-actions { flex: 0 0 auto; margin-left: auto; }
}
</style>
