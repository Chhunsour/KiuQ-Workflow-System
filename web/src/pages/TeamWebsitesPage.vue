<template>
  <div>
    <PageHeader
      title="Team Websites"
      subtitle="View all websites created, assigned, and managed by the team."
    >
      <template #actions>
        <RouterLink v-if="!auth.isViewer" to="/websites/new" class="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Website
        </RouterLink>
      </template>
    </PageHeader>

    <!-- ── Summary cards (2-col mobile, 3-col tablet, 6-col desktop) ────── -->
    <div class="tw-summary">
      <div class="tw-stat">
        <span class="tw-stat-label">Total</span>
        <span class="tw-stat-num">{{ summary.total }}</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-label">New</span>
        <span class="tw-stat-num">{{ summary.newCount }}</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-label">Existing</span>
        <span class="tw-stat-num">{{ summary.existing }}</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-label">In Development</span>
        <span class="tw-stat-num">{{ summary.inDev }}</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-label">Needs QC</span>
        <span class="tw-stat-num tw-stat-num--warn">{{ summary.needsQC }}</span>
      </div>
      <div class="tw-stat">
        <span class="tw-stat-label">Followups Due</span>
        <span class="tw-stat-num">{{ summary.followupsDue }}</span>
      </div>
    </div>

    <!-- ── Filters ─────────────────────────────────────────────────────── -->
    <div class="tw-filters">
      <input
        v-model="search"
        class="input tw-search"
        type="search"
        placeholder="Search by name or domain…"
      />
      <select v-model="filterMemberId" class="input tw-select">
        <option value="">All members</option>
        <option v-for="m in eligibleMembers" :key="m.id" :value="m.id">
          {{ m.fullName || m.email }}
        </option>
      </select>
      <select v-model="filterType" class="input tw-select">
        <option value="">All types</option>
        <option v-for="t in websiteTypes" :key="t" :value="t">{{ typeLabel(t) }}</option>
      </select>
      <select v-model="filterStatus" class="input tw-select">
        <option value="">All statuses</option>
        <option v-for="s in websiteStatuses" :key="s" :value="s">{{ s }}</option>
      </select>
      <select v-if="qc.classes.length > 0" v-model="filterClassId" class="input tw-select">
        <option value="">All folders</option>
        <option v-for="c in qc.classes" :key="c.id" :value="c.id">{{ c.name }}</option>
        <option value="__none__">Unclassified</option>
      </select>
    </div>

    <!-- ── Grid ────────────────────────────────────────────────────────── -->
    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">
      <div v-if="filtered.length" class="tw-grid-wrap">
        <div class="tw-grid">
          <article v-for="w in filtered" :key="w.id" class="tw-card card">
          <header class="tw-card-head">
            <div class="tw-card-identity">
              <div class="tw-avatar">
                <img
                  v-if="w.faviconUrl"
                  :src="w.faviconUrl"
                  alt=""
                  class="tw-favicon"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <span v-else class="tw-initials">{{ w.name.slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="tw-title-block">
                <h3 class="tw-name">{{ w.name }}</h3>
                <a
                  v-if="w.domain"
                  :href="liveUrl(w.domain)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="tw-domain"
                >{{ displayDomain(w.domain) }}</a>
                <span v-else class="tw-domain tw-domain--empty">No domain</span>
              </div>
            </div>
            <div class="tw-card-badges">
              <span class="tw-type-badge" :class="`tw-type-badge--${w.websiteType || 'default'}`">
                {{ typeLabel(w.websiteType) }}
              </span>
              <StatusBadge :status="w.status" />
              <span v-if="w.isFramework" class="tw-conn-badge" :class="getConnectionStatus(w).dotClass" title="Framework connection status">
                <span class="tw-conn-dot" /> {{ getConnectionStatus(w).text }}
              </span>
            </div>
          </header>

          <!-- Meta row -->
          <div class="tw-meta">
            <div v-if="w.createdAt" class="tw-meta-item" :title="`Created ${formatDate(w.createdAt)}`">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {{ formatDate(w.createdAt) }}
            </div>
            <div v-if="creatorName(w)" class="tw-meta-item" :title="`Created by ${creatorName(w)}`">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {{ creatorName(w) }}
            </div>
            <div v-if="className(w)" class="tw-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              {{ className(w) }}
            </div>
          </div>

          <!-- Quality Check badge: only when we have data for it -->
          <div v-if="openIssuesCount(w.id) > 0" class="tw-badges">
            <span class="tw-badge tw-badge--qc" :title="`${openIssuesCount(w.id)} open quality issue${openIssuesCount(w.id) === 1 ? '' : 's'}`">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
              {{ openIssuesCount(w.id) }} QC open
            </span>
          </div>

          <!-- Actions -->
          <div class="tw-actions">
            <RouterLink :to="`/websites/${w.id}/edit`" class="btn-secondary tw-btn">
              View Details
            </RouterLink>
            <a
              v-if="w.domain"
              :href="liveUrl(w.domain)"
              target="_blank"
              rel="noopener noreferrer"
              class="btn-secondary tw-btn"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </a>
          </div>
          </article>
        </div>
      </div>

      <EmptyState
        v-else
        title="No websites match"
        :description="hasActiveFilters ? 'Try clearing some filters.' : 'No team websites yet.'"
      >
        <template #action>
          <RouterLink v-if="!auth.isViewer" to="/websites/new" class="btn-primary">New Website</RouterLink>
        </template>
      </EmptyState>
    </LoadingBlock>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import StatusBadge from '@/components/ui/StatusBadge.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import LoadingBlock from '@/components/ui/LoadingBlock.vue';
import { useDataStore, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { useQualityCheckStore } from '@/stores/qualityCheck';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites', 'quality_issues', 'quality_classes']);

const data = useDataStore();
const auth = useAuthStore();
const qc   = useQualityCheckStore();

// ── Filters ─────────────────────────────────────────────────────────
const search        = ref('');
const filterMemberId = ref('');
const filterType    = ref('');
const filterStatus  = ref('');
const filterClassId = ref('');

const hasActiveFilters = computed(
  () => !!(search.value || filterMemberId.value || filterType.value || filterStatus.value || filterClassId.value)
);

// All websites in the org are visible to admin/AH/member; QC role is
// blocked at the route level (member-class meta excludes QC).
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
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (w) => w.name.toLowerCase().includes(q) || (w.domain || '').toLowerCase().includes(q)
    );
  }
  return list;
});

// ── Filter dropdown options (derived from the data so we never show
// types/statuses that don't exist in this org) ─────────────────────
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

// ── Summary stats ──────────────────────────────────────────────────
const openIssuesCount = (websiteId: string) =>
  qc.issuesForWebsite(websiteId).filter((i) => i.status !== 'approved').length;

const summary = computed(() => {
  const list = allWebsites.value;
  const total = list.length;
  // "Existing" = the existing-website type tag the team uses for legacy sites.
  const existing = list.filter((w) => w.websiteType === 'existing').length;
  const newCount = total - existing;
  // In Development: anything not "live" or "completed" if those statuses are used,
  // otherwise treat the non-empty-status websites whose status isn't 'live' as in-dev.
  const inDev = list.filter((w) => {
    const s = (w.status || '').toLowerCase();
    return s && s !== 'live' && s !== 'completed';
  }).length;
  const needsQC = list.filter((w) => openIssuesCount(w.id) > 0).length;
  // Followups due: placeholder — a true cross-source count would need to
  // load blog/plugin/speed slot data which we don't currently prefetch
  // here. Defer until the follow-up data is centrally cached.
  const followupsDue = 0;
  return { total, newCount, existing, inDev, needsQC, followupsDue };
});

// ── Display helpers ────────────────────────────────────────────────
const typeLabel = (t: string) => {
  const map: Record<string, string> = {
    existing: 'Existing Website',
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
  if (diffMinutes <= 15) {
    return { text: 'Connected (Active)', dotClass: 'dot--green' };
  } else if (diffMinutes <= 1440) {
    return { text: 'Inactive (Idle)', dotClass: 'dot--orange' };
  } else {
    return { text: 'Disconnected', dotClass: 'dot--red' };
  }
};

// ── Load ───────────────────────────────────────────────────────────
onMounted(() => {
  data.fetchWebsites();
  data.fetchMembers();
  qc.fetchClasses();
});
</script>

<style scoped>
/* ── Summary cards: 2-col mobile, 3-col tablet, 6-col desktop ───────── */
.tw-summary {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.6rem;
  margin-bottom: 1.1rem;
}
.tw-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
}
.tw-stat-label {
  font-size: 0.66rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tw-stat-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.2rem;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--text-main);
  line-height: 1.1;
}
.tw-stat-num--warn { color: #f97316; }

/* ── Filters ────────────────────────────────────────────────────────── */
.tw-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  margin-bottom: 1rem;
}
.tw-search { flex: 1; min-width: 200px; max-width: 320px; }
.tw-select { min-width: 150px; max-width: 200px; }

/* ── Grid + cards ───────────────────────────────────────────────────── */
.tw-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.tw-grid-wrap {
  container-type: inline-size;
}

.tw-card {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.tw-card-head {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 1rem 1rem 0.7rem;
}

.tw-card-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

.tw-avatar {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.95rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.tw-favicon { width: 70%; height: 70%; object-fit: contain; }

.tw-title-block { min-width: 0; }
.tw-name {
  font-size: 0.94rem;
  font-weight: 700;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
.tw-domain {
  display: block;
  font-size: 0.76rem;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}
.tw-domain:hover { text-decoration: underline; }
.tw-domain--empty { color: var(--text-muted); }

.tw-card-badges {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.tw-type-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}
.tw-type-badge--existing {
  background: color-mix(in srgb, #22c55e 12%, transparent);
  color: #16a34a;
}
:root[data-theme='dark-gray'] .tw-type-badge--existing { color: #4ade80; }

/* Meta row */
.tw-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0 1rem 0.7rem;
}
.tw-meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.74rem;
  color: var(--text-muted);
}
.tw-meta-item svg { flex-shrink: 0; opacity: 0.7; }

/* Followup / QC badges */
.tw-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0 1rem 0.6rem;
}
.tw-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--border);
}
.tw-badge--qc {
  color: #f97316;
  background: color-mix(in srgb, #f97316 12%, transparent);
  border-color: color-mix(in srgb, #f97316 25%, transparent);
}

/* Actions */
.tw-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: auto;
  padding: 0.7rem 1rem;
  border-top: 1px solid var(--border);
}
.tw-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  padding: 0.4rem 0.8rem;
  height: auto;
}

.tw-conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
}
.tw-conn-badge.dot--green {
  color: #16a34a;
  background: color-mix(in srgb, #16a34a 9%, transparent);
}
.tw-conn-badge.dot--orange {
  color: #d97706;
  background: color-mix(in srgb, #d97706 9%, transparent);
}
.tw-conn-badge.dot--red {
  color: #dc2626;
  background: color-mix(in srgb, #dc2626 9%, transparent);
}
.tw-conn-badge.dot--gray {
  color: #64748b;
  background: color-mix(in srgb, #64748b 9%, transparent);
}
.tw-conn-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

/* ── Responsive ─────────────────────────────────────────────────────── */
@container (max-width: 1040px) {
  .tw-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@container (max-width: 560px) {
  .tw-grid { grid-template-columns: 1fr; gap: 0.7rem; }
}
@media (max-width: 1024px) {
  .tw-summary { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 600px) {
  .tw-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; margin-bottom: 0.9rem; }
  .tw-stat { padding: 0.6rem 0.7rem; border-radius: 10px; }
  .tw-stat-num { font-size: 1.05rem; }
  .tw-stat-label { font-size: 0.62rem; }

  .tw-filters { gap: 0.45rem; margin-bottom: 0.85rem; }
  .tw-search,
  .tw-select { max-width: 100%; min-width: 0; flex: 1 1 calc(50% - 0.45rem); }

  .tw-card-head { padding: 0.85rem 0.85rem 0.6rem; }
  .tw-meta { padding: 0 0.85rem 0.6rem; }
  .tw-badges { padding: 0 0.85rem 0.55rem; }
  .tw-actions { padding: 0.6rem 0.85rem; }
}
</style>
