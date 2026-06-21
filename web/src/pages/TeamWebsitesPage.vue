<template>
  <div class="tw-page">
    <!-- ════════ HEADER ════════ -->
    <header class="tw-header">
      <div class="tw-header-left">
        <span class="tw-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </span>
        <div>
          <h1 class="tw-title">Team Websites</h1>
          <p class="tw-subtitle">View all websites created, assigned, and managed by the team.</p>
        </div>
      </div>
      <div class="tw-header-right">
        <RouterLink v-if="!auth.isViewer" to="/websites/new" class="tw-btn-new">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New Website
        </RouterLink>
      </div>
    </header>

    <!-- ════════ STAT PILLS ════════ -->
    <div class="tw-stats">
      <div class="tw-stat">
        <span class="tw-stat-num">{{ summary.total }}</span>
        <span class="tw-stat-label">Total</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-num">{{ summary.newCount }}</span>
        <span class="tw-stat-label">New</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-num">{{ summary.existing }}</span>
        <span class="tw-stat-label">Existing</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-num tw-stat-num--accent">{{ summary.inDev }}</span>
        <span class="tw-stat-label">In Dev</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-num" :class="{ 'tw-stat-num--warn': summary.needsQC > 0 }">{{ summary.needsQC }}</span>
        <span class="tw-stat-label">Needs QC</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-num tw-stat-num--wp">{{ summary.wordpress }}</span>
        <span class="tw-stat-label">WordPress</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-num tw-stat-num--fw">{{ summary.framework }}</span>
        <span class="tw-stat-label">Framework</span>
      </div>
    </div>

    <!-- ════════ FILTER TOOLBAR ════════ -->
    <div class="tw-toolbar">
      <div class="tw-toolbar-left">
        <div class="tw-search-wrap">
          <svg class="tw-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input v-model="search" type="search" class="tw-search" placeholder="Search by name or domain…" />
        </div>
        <select v-model="filterMemberId" class="tw-select">
          <option value="">All members</option>
          <option v-for="m in eligibleMembers" :key="m.id" :value="m.id">{{ m.fullName || m.email }}</option>
        </select>
        <select v-model="filterType" class="tw-select">
          <option value="">All types</option>
          <option v-for="t in websiteTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
        </select>
        <select v-model="filterStatus" class="tw-select">
          <option value="">All statuses</option>
          <option v-for="s in websiteStatuses" :key="s" :value="s">{{ s }}</option>
        </select>
        <select v-if="qc.classes.length > 0" v-model="filterClassId" class="tw-select">
          <option value="">All folders</option>
          <option v-for="c in qc.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
          <option value="__none__">Unclassified</option>
        </select>
        <select v-model="filterPlatform" class="tw-select">
          <option value="">All Platforms</option>
          <option value="wordpress">WordPress</option>
          <option value="framework">Framework</option>
          <option value="unknown">Unknown</option>
        </select>
        <select v-model="sortBy" class="tw-select">
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="az">A → Z</option>
          <option value="za">Z → A</option>
        </select>
      </div>
      <div class="tw-toolbar-right">
        <div class="tw-view-toggle">
          <button type="button" class="tw-view-btn" :class="{ 'tw-view-btn--active': viewMode === 'grid' }" @click="viewMode = 'grid'" title="Grid View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
          </button>
          <button type="button" class="tw-view-btn" :class="{ 'tw-view-btn--active': viewMode === 'list' }" @click="viewMode = 'list'" title="List View">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- ════════ CONTENT ════════ -->
    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">

      <div v-if="sorted.length && viewMode === 'grid'" class="tw-grid-container">
        <div class="tw-grid">
          <article v-for="w in sorted" :key="w.id" class="tw-card">
            <!-- Top Row: Identity & Status -->
            <div class="tw-card-header">
              <div class="tw-avatar-wrap">
                <div class="tw-avatar">
                  <img v-if="w.faviconUrl && !failedFavicons[w.id]" :src="w.faviconUrl" alt="" class="tw-favicon" @error="failedFavicons[w.id] = true" />
                  <span v-else class="tw-initials">{{ w.name.slice(0, 2).toUpperCase() }}</span>
                </div>
                <span v-if="w.isFramework" class="tw-conn-dot-indicator" :class="getConnectionStatus(w).dotClass" :title="`Connection: ${getConnectionStatus(w).text}`" />
              </div>
              <div class="tw-card-info">
                <h3 class="tw-card-name">{{ w.name }}</h3>
                <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="tw-card-domain">{{ displayDomain(w.domain) }}</a>
                <span v-else class="tw-card-domain tw-card-domain--empty">No domain</span>
              </div>
              <div class="tw-card-status">
                <StatusBadge :status="w.status" />
              </div>
            </div>

            <!-- Middle Row: Meta & Badges -->
            <div class="tw-card-body">
              <!-- Meta row -->
              <div class="tw-card-meta">
                <div v-if="creatorName(w)" class="tw-meta-item" title="Assigned Member">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                  <span>{{ creatorName(w) }}</span>
                </div>
                <div v-if="w.createdAt" class="tw-meta-item" title="Created Date">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                  <span>{{ formatDate(w.createdAt) }}</span>
                </div>
                <div v-if="className(w)" class="tw-meta-item" title="QC Folder">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                  <span>{{ className(w) }}</span>
                </div>
              </div>
              <!-- Badges -->
              <div class="tw-card-badges">
                <span class="tw-type-badge" :class="`tw-type-badge--${w.websiteType || 'default'}`">{{ typeLabel(w.websiteType) }}</span>
                <span class="tw-platform-badge" :class="`tw-platform-badge--${w.platformType || 'unknown'}`">{{ platformLabel(w.platformType) }}</span>
                <span v-if="openIssuesCount(w.id) > 0" class="tw-qc-badge">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                  {{ openIssuesCount(w.id) }} QC open
                </span>
              </div>
            </div>

            <!-- Bottom Row: Compact actions -->
            <div class="tw-card-actions">
              <RouterLink :to="`/websites/${w.id}/edit`" class="tw-action tw-action--secondary">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
                <span>View Details</span>
              </RouterLink>
              <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="tw-action tw-action--primary">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span>Open</span>
              </a>
            </div>
          </article>
        </div>
      </div>

      <!-- ── List View ── -->
      <div v-else-if="sorted.length && viewMode === 'list'" class="tw-list">
        <div class="tw-list-header">
          <span class="tw-lh-name">Website</span>
          <span class="tw-lh-type">Type</span>
          <span class="tw-lh-status">Status</span>
          <span class="tw-lh-creator">Creator</span>
          <span class="tw-lh-date">Created</span>
          <span class="tw-lh-actions">Actions</span>
        </div>
        <div v-for="w in sorted" :key="w.id" class="tw-list-row">
          <div class="tw-lr-name">
            <div class="tw-avatar tw-avatar--sm">
              <img v-if="w.faviconUrl && !failedFavicons[w.id]" :src="w.faviconUrl" alt="" class="tw-favicon" @error="failedFavicons[w.id] = true" />
              <span v-else class="tw-initials">{{ w.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="tw-lr-nameblock">
              <span class="tw-lr-title">{{ w.name }}</span>
              <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="tw-lr-domain">{{ displayDomain(w.domain) }}</a>
              <span v-else class="tw-lr-domain tw-lr-domain--empty">No domain</span>
            </div>
          </div>
          <span class="tw-lr-type">
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <span class="tw-type-badge tw-type-badge--sm" :class="`tw-type-badge--${w.websiteType || 'default'}`">{{ typeLabel(w.websiteType) }}</span>
              <span class="tw-platform-badge tw-platform-badge--sm" :class="`tw-platform-badge--${w.platformType || 'unknown'}`">{{ platformLabel(w.platformType) }}</span>
            </div>
          </span>
          <span class="tw-lr-status"><StatusBadge :status="w.status" /></span>
          <span class="tw-lr-creator">{{ creatorName(w) || '—' }}</span>
          <span class="tw-lr-date">{{ formatDate(w.createdAt) }}</span>
          <div class="tw-lr-actions">
            <RouterLink :to="`/websites/${w.id}/edit`" class="tw-action-icon" title="Details">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
            </RouterLink>
            <a v-if="w.domain" :href="liveUrl(w.domain)" target="_blank" rel="noopener noreferrer" class="tw-action-icon tw-action-icon--primary" title="Open">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </div>
      </div>

      <!-- ── Empty State ── -->
      <div v-else class="tw-empty">
        <div class="tw-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
        </div>
        <h3 class="tw-empty-title">{{ hasActiveFilters ? 'No websites match your filters' : 'No team websites yet' }}</h3>
        <p class="tw-empty-desc">{{ hasActiveFilters ? 'Try adjusting your search or filters.' : 'Create a website profile to start managing team domains.' }}</p>
        <div class="tw-empty-actions">
          <button v-if="hasActiveFilters" class="tw-action tw-action--secondary" @click="clearFilters">Clear Filters</button>
          <RouterLink v-if="!auth.isViewer" to="/websites/new" class="tw-action tw-action--primary">New Website</RouterLink>
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
import { useQualityCheckStore } from '@/stores/qualityCheck';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites', 'quality_issues', 'quality_classes']);

const data = useDataStore();
const auth = useAuthStore();
const qc   = useQualityCheckStore();

// ── Filters ──
const search = ref('');
const filterMemberId = ref('');
const filterType = ref('');
const filterStatus = ref('');
const filterClassId = ref('');
const filterPlatform = ref('');
const sortBy = ref<'newest' | 'oldest' | 'az' | 'za'>('newest');
const viewMode = ref<'grid' | 'list'>('grid');
const failedFavicons = reactive<Record<string, boolean>>({});

const hasActiveFilters = computed(
  () => !!(search.value || filterMemberId.value || filterType.value || filterStatus.value || filterClassId.value || filterPlatform.value)
);

const clearFilters = () => {
  search.value = '';
  filterMemberId.value = '';
  filterType.value = '';
  filterStatus.value = '';
  filterClassId.value = '';
  filterPlatform.value = '';
};

const allWebsites = computed(() => data.websites);

const filtered = computed(() => {
  let list = allWebsites.value;
  if (filterMemberId.value) {
    list = list.filter((w) => w.createdBy === filterMemberId.value);
  }
  if (filterType.value) {
    list = list.filter((w) => w.websiteType === filterType.value);
  }
  if (filterStatus.value) {
    list = list.filter((w) => w.status === filterStatus.value);
  }
  if (filterClassId.value) {
    if (filterClassId.value === '__none__') {
      list = list.filter((w) => !w.qualityClassId);
    } else {
      list = list.filter((w) => w.qualityClassId === filterClassId.value);
    }
  }
  if (filterPlatform.value) {
    list = list.filter((w) => (w.platformType || 'unknown') === filterPlatform.value);
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.domain || '').toLowerCase().includes(q)
    );
  }
  return list;
});

// ── Sorted ──
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

// ── Filter dropdown options ──
const eligibleMembers = computed(() => {
  const ids = new Set<string>();
  data.websites.forEach((w) => { if (w.createdBy) ids.add(w.createdBy); });
  return data.members.filter((m) => ids.has(m.id));
});

const websiteTypes = computed(() => {
  const set = new Set<string>();
  data.websites.forEach((w) => { if (w.websiteType) set.add(w.websiteType); });
  return Array.from(set).sort();
});

const websiteStatuses = computed(() => {
  const set = new Set<string>();
  data.websites.forEach((w) => { if (w.status) set.add(w.status); });
  return Array.from(set).sort();
});

// ── Summary stats ──
const openIssuesCount = (websiteId: string) =>
  qc.issuesForWebsite(websiteId).filter((i) => i.status !== 'approved').length;

const summary = computed(() => {
  const list = filtered.value;
  const total = list.length;
  const existing = list.filter((w) => w.websiteType === 'existing').length;
  const newCount = total - existing;
  const inDev = list.filter((w) => {
    const s = (w.status || '').toLowerCase();
    return s && s !== 'live' && s !== 'completed';
  }).length;
  const needsQC = list.filter((w) => openIssuesCount(w.id) > 0).length;
  const followupsDue = 0;
  const wordpress = list.filter((w) => w.platformType === 'wordpress').length;
  const framework = list.filter((w) => w.platformType === 'framework').length;
  return { total, newCount, existing, inDev, needsQC, followupsDue, wordpress, framework };
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

const className = (w: Website) => {
  if (!w.qualityClassId) return '';
  return qc.classes.find((c) => c.id === w.qualityClassId)?.name ?? '';
};

const getConnectionStatus = (w: Website) => {
  if (!w.lastAccessedAt) return { text: 'Not Connected', dotClass: 'dot--gray' };
  const lastActive = new Date(w.lastAccessedAt).getTime();
  const diffMinutes = (Date.now() - lastActive) / 1000 / 60;
  if (diffMinutes <= 15) return { text: 'Active', dotClass: 'dot--green' };
  if (diffMinutes <= 1440) return { text: 'Idle', dotClass: 'dot--orange' };
  return { text: 'Disconnected', dotClass: 'dot--red' };
};

// ── Load ──
onMounted(() => {
  data.fetchWebsites();
  data.fetchMembers();
  qc.fetchClasses();
});
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   TeamWebsitesPage — Premium SaaS Dashboard
   ═══════════════════════════════════════════════════════════════════════════ */

.tw-page { display: flex; flex-direction: column; gap: 16px; }

/* ── Header ── */
.tw-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.tw-header-left { display: flex; align-items: center; gap: 12px; min-width: 0; }
.tw-header-icon {
  display: flex; align-items: center; justify-content: center;
  width: 38px; height: 38px; border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  color: var(--primary); flex-shrink: 0;
}
.tw-title { font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin: 0; line-height: 1.2; }
.tw-subtitle { font-size: 0.78rem; color: var(--text-muted); margin: 2px 0 0; }
.tw-header-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.tw-btn-new {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 16px; font-size: 0.78rem; font-weight: 700;
  color: #fff; background: var(--primary); border: none; border-radius: 10px;
  cursor: pointer; text-decoration: none; font-family: inherit;
  transition: filter 0.15s, transform 0.1s;
}
.tw-btn-new:hover { filter: brightness(1.1); transform: translateY(-1px); }
.tw-btn-new:active { transform: translateY(0); }

/* ── Stat Pills ── */
.tw-stats { display: flex; gap: 8px; flex-wrap: wrap; }
.tw-stat {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 10px;
  box-shadow: var(--shadow-sm);
}
.tw-stat-num {
  font-size: 0.88rem; font-weight: 800; color: var(--text-main);
  font-variant-numeric: tabular-nums; line-height: 1;
}
.tw-stat-num--accent { color: var(--primary); }
.tw-stat-num--warn { color: #f97316; }
.tw-stat-num--wp { color: #21759b; }
.tw-stat-num--fw { color: var(--primary); }
.tw-stat-label {
  font-size: 0.68rem; font-weight: 600; color: var(--text-muted);
  text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap;
}

/* ── Filter Toolbar ── */
.tw-toolbar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 12px; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 12px; flex-wrap: wrap;
  box-shadow: var(--shadow-sm);
}
.tw-toolbar-left { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; flex-wrap: wrap; }
.tw-toolbar-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

.tw-search-wrap { position: relative; flex: 1; min-width: 180px; max-width: 280px; }
.tw-search-icon {
  position: absolute; left: 10px; top: 50%; transform: translateY(-50%);
  color: var(--text-muted); pointer-events: none; opacity: 0.6;
}
.tw-search {
  width: 100%; height: 34px; padding: 0 10px 0 32px;
  font-size: 0.78rem; color: var(--text-main);
  background: var(--soft-bg); border: 1px solid var(--border);
  border-radius: 10px; outline: none; font-family: inherit;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tw-search:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
}
.tw-search::-webkit-search-cancel-button { -webkit-appearance: none; }

.tw-select {
  height: 34px; padding: 0 28px 0 10px;
  font-size: 0.75rem; font-weight: 600; color: var(--text-main);
  background: var(--soft-bg); border: 1px solid var(--border);
  border-radius: 10px; outline: none; font-family: inherit;
  cursor: pointer; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
  transition: border-color 0.2s, box-shadow 0.2s; min-width: 0;
}
.tw-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 12%, transparent);
}

.tw-view-toggle { display: flex; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.tw-view-btn {
  display: flex; align-items: center; justify-content: center;
  width: 34px; height: 32px; border: none;
  background: var(--soft-bg); color: var(--text-muted);
  cursor: pointer; transition: all 0.15s;
}
.tw-view-btn:first-child { border-right: 1px solid var(--border); }
.tw-view-btn:hover { color: var(--text-main); }
.tw-view-btn--active { background: var(--primary); color: #fff; }

/* ── Grid ── */
.tw-grid-container { container-type: inline-size; }
.tw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

/* ── Card ── */
.tw-card {
  display: flex; flex-direction: column;
  background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
  transition: border-color 0.18s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.18s cubic-bezier(0.4, 0, 0.2, 1), transform 0.18s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 16px; gap: 14px;
  box-shadow: var(--shadow-sm);
  position: relative;
}
.tw-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  box-shadow: var(--shadow-md);
}

.tw-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tw-avatar-wrap {
  position: relative;
  display: inline-block;
  flex-shrink: 0;
}
.tw-avatar {
  width: 40px; height: 40px; border-radius: 8px;
  background: var(--soft-bg); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  overflow: hidden; flex-shrink: 0;
  transition: border-color 0.15s;
}
.tw-card:hover .tw-avatar {
  border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
}
.tw-avatar--sm { width: 28px; height: 28px; border-radius: 6px; }
.tw-favicon { width: 65%; height: 65%; object-fit: contain; }
.tw-initials { font-size: 0.78rem; font-weight: 800; color: var(--primary); letter-spacing: -0.02em; }
.tw-avatar--sm .tw-initials { font-size: 0.6rem; }
.tw-conn-dot-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
  background-color: currentColor;
}
.tw-conn-dot-indicator.dot--green { color: #22c55e; }
.tw-conn-dot-indicator.dot--orange { color: #f59e0b; }
.tw-conn-dot-indicator.dot--red { color: #ef4444; }
.tw-conn-dot-indicator.dot--gray { color: #6b7280; }

.tw-card-info { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 2px; }
.tw-card-name {
  font-size: 0.9rem; font-weight: 700; color: var(--text-main); margin: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  line-height: 1.2;
}
.tw-card-domain {
  display: inline-block; font-size: 0.72rem; color: var(--primary);
  text-decoration: none; white-space: nowrap; overflow: hidden;
  text-overflow: ellipsis; font-weight: 600;
}
.tw-card-domain:hover { text-decoration: underline; }
.tw-card-domain--empty { color: var(--text-soft); }
.tw-card-status { flex-shrink: 0; }

/* Middle Row */
.tw-card-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tw-card-meta { display: flex; flex-wrap: wrap; gap: 10px; }
.tw-meta-item { display: flex; align-items: center; gap: 4px; font-size: 0.68rem; color: var(--text-muted); }
.tw-meta-item svg { opacity: 0.6; flex-shrink: 0; }

/* Badges */
.tw-card-badges { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.tw-type-badge, .tw-platform-badge {
  font-size: 0.65rem; font-weight: 700;
  padding: 3px 8px; border-radius: 6px; white-space: nowrap;
  border: 1px solid transparent;
}
.tw-type-badge {
  background: color-mix(in srgb, var(--primary) 8%, transparent); color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 12%, transparent);
}
.tw-type-badge--sm { font-size: 0.6rem; padding: 1px 5px; }
.tw-type-badge--existing { background: rgba(34, 197, 94, 0.08); color: #22c55e; border-color: rgba(34, 197, 94, 0.15); }
:root[data-theme='dark-gray'] .tw-type-badge--existing { color: #4ade80; }
.tw-type-badge--ecommerce, .tw-type-badge--normal_ecommerce {
  background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 20%, transparent);
}

.tw-qc-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 0.65rem; font-weight: 800; padding: 3px 8px;
  border-radius: 6px; color: #f97316;
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.15);
}

/* Platform Badges */
.tw-platform-badge {
  display: inline-block;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 3px 8px;
  border-radius: 6px;
  white-space: nowrap;
  border: 1px solid transparent;
}
.tw-platform-badge--sm { font-size: 0.6rem; padding: 1px 5px; }
.tw-platform-badge--wordpress {
  background: rgba(33, 117, 155, 0.08);
  color: #21759b;
  border-color: rgba(33, 117, 155, 0.15);
}
:root[data-theme='dark-gray'] .tw-platform-badge--wordpress {
  color: #55c1e6;
  background: rgba(85, 193, 230, 0.08);
  border-color: rgba(85, 193, 230, 0.15);
}
.tw-platform-badge--framework {
  background: color-mix(in srgb, var(--primary) 8%, transparent);
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 15%, transparent);
}
.tw-platform-badge--unknown {
  background: rgba(120, 120, 120, 0.04);
  color: var(--text-soft);
  border: 1px dashed var(--border);
}

/* Actions */
.tw-card-actions {
  display: flex; align-items: center; gap: 6px;
  margin-top: auto; border-top: 1px solid var(--border);
  padding-top: 12px;
}
.tw-action {
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
.tw-action:hover {
  background: var(--soft-bg);
  color: var(--text-main);
  border-color: var(--border-strong);
}
.tw-action--primary {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.tw-action--primary:hover {
  filter: brightness(1.08);
  background: var(--primary);
  color: #fff;
}
.tw-action--secondary { }

/* ═══════════ LIST VIEW ═══════════ */
.tw-list {
  background: var(--card-bg); border: 1px solid var(--border);
  border-radius: 12px; overflow: hidden;
  box-shadow: var(--shadow-sm);
}
.tw-list-header {
  display: grid; grid-template-columns: 2.5fr 1fr 1fr 1fr 1fr 100px;
  gap: 8px; padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 0.65rem; font-weight: 700; color: var(--text-soft);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.tw-list-row {
  display: grid; grid-template-columns: 2.5fr 1fr 1fr 1fr 100px;
  gap: 8px; align-items: center; padding: 10px 16px;
  border-bottom: 1px solid var(--border); transition: background-color 0.15s;
}
.tw-list-row:last-child { border-bottom: none; }
.tw-list-row:hover { background: color-mix(in srgb, var(--primary) 3%, transparent); }

.tw-lr-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
.tw-lr-nameblock { min-width: 0; }
.tw-lr-title {
  display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-main);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tw-lr-domain {
  display: block; font-size: 0.68rem; color: var(--primary);
  text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.tw-lr-domain:hover { text-decoration: underline; }
.tw-lr-domain--empty { color: var(--text-muted); }
.tw-lr-type, .tw-lr-status { display: flex; align-items: center; }
.tw-lr-creator { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tw-lr-date { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
.tw-lr-actions { display: flex; align-items: center; gap: 4px; justify-content: flex-end; }

.tw-action-icon {
  display: flex; align-items: center; justify-content: center;
  width: 30px; height: 30px; border-radius: 8px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); cursor: pointer; text-decoration: none;
  transition: all 0.15s;
}
.tw-action-icon:hover { background: var(--soft-bg); color: var(--text-main); border-color: var(--border-strong); }
.tw-action-icon--primary:hover { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); border-color: var(--primary); }

/* ═══════════ EMPTY STATE ═══════════ */
.tw-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 48px 24px; text-align: center;
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 12px;
  box-shadow: var(--shadow-sm);
}
.tw-empty-icon {
  width: 52px; height: 52px; display: flex; align-items: center; justify-content: center;
  border-radius: 14px; background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary); margin-bottom: 14px;
}
.tw-empty-title { font-size: 0.92rem; font-weight: 700; color: var(--text-main); margin: 0; }
.tw-empty-desc { font-size: 0.78rem; color: var(--text-muted); margin: 4px 0 0; max-width: 340px; }
.tw-empty-actions { display: flex; align-items: center; gap: 8px; margin-top: 16px; }

/* ═══════════ RESPONSIVE ═══════════ */
@container (max-width: 900px) {
  .tw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (max-width: 560px) {
  .tw-grid { grid-template-columns: 1fr; }
}
@media (max-width: 768px) {
  .tw-stats { gap: 6px; }
  .tw-stat { padding: 5px 10px; }
  .tw-stat-num { font-size: 0.8rem; }
  .tw-stat-label { font-size: 0.62rem; }
  .tw-search-wrap { max-width: 100%; min-width: 0; flex: 1 1 100%; }
  .tw-select { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .tw-list-header { display: none; }
  .tw-list-row { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 14px; }
  .tw-lr-name { flex: 1 1 100%; }
  .tw-lr-type, .tw-lr-status { flex: 0 0 auto; }
  .tw-lr-creator, .tw-lr-date { display: none; }
  .tw-lr-actions { flex: 0 0 auto; margin-left: auto; }
}
</style>
