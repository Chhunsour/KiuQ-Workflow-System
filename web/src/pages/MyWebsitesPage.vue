<template>
  <div>
    <PageHeader
      title="My Websites"
      subtitle="All saved website profiles — yours and ones assigned to you."
    >
      <template #actions>
        <RouterLink to="/websites/new" class="btn-primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Website
        </RouterLink>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="mw-filters">
      <input v-model="search" class="input mw-search" type="search" placeholder="Search by name or domain…" />
      <select v-if="auth.isAdmin" v-model="filterMemberId" class="input mw-select">
        <option value="">All members</option>
        <option v-for="m in data.members" :key="m.id" :value="m.id">{{ m.fullName }}</option>
      </select>
      <select v-model="filterType" class="input mw-select">
        <option value="">All types</option>
        <option value="existing">Existing Website</option>
        <option value="ecommerce">E-commerce</option>
        <option value="landing">Landing Page</option>
        <option value="catalog">Catalog</option>
        <option value="blog">Blog / Guide</option>
        <option value="service">Service</option>
        <option value="brand">Brand</option>
      </select>
    </div>

    <LoadingBlock :loading="data.loading.websites" :error="data.errors.websites" :retry="data.fetchWebsites">
      <div v-if="filtered.length" class="mw-grid">
        <div v-for="w in filtered" :key="w.id" class="mw-card card">
          <!-- Card header -->
          <div class="mw-card-header">
            <div class="mw-card-identity">
              <div class="mw-avatar">
                <img
                  v-if="w.faviconUrl"
                  :src="w.faviconUrl"
                  alt=""
                  class="mw-favicon"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <span v-else class="mw-initials">{{ w.name.slice(0, 2).toUpperCase() }}</span>
              </div>
              <div class="mw-card-title-block">
                <h3 class="mw-card-name">{{ w.name }}</h3>
                <a
                  v-if="w.domain"
                  :href="w.domain.startsWith('http') ? w.domain : `https://${w.domain}`"
                  target="_blank"
                  rel="noopener"
                  class="mw-card-domain"
                >{{ displayDomain(w.domain) }}</a>
                <span v-else class="mw-card-domain mw-card-domain--empty">No domain</span>
              </div>
            </div>
            <div class="mw-card-badges">
              <span class="mw-type-badge" :class="`mw-type-badge--${w.websiteType || 'default'}`">
                {{ typeLabel(w.websiteType) }}
              </span>
              <StatusBadge :status="w.status" />
              <span v-if="w.isFramework" class="mw-conn-badge" :class="getConnectionStatus(w).dotClass" title="Framework connection status">
                <span class="mw-conn-dot" /> {{ getConnectionStatus(w).text }}
              </span>
            </div>
          </div>

          <!-- Meta row -->
          <div class="mw-card-meta">
            <div v-if="w.createdAt" class="mw-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              {{ formatDate(w.createdAt) }}
            </div>
            <div v-if="creatorName(w)" class="mw-meta-item">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
              {{ creatorName(w) }}
            </div>
          </div>

          <!-- Actions -->
          <div class="mw-card-actions">
            <RouterLink :to="`/websites/${w.id}/edit`" class="btn-secondary mw-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>
              Edit
            </RouterLink>
            <a
              v-if="w.domain"
              :href="w.domain.startsWith('http') ? w.domain : `https://${w.domain}`"
              target="_blank"
              rel="noopener"
              class="btn-secondary mw-btn"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              Open
            </a>
            <button
              v-if="canDelete(w)"
              class="btn-danger mw-btn mw-btn--icon"
              title="Delete website"
              @click="confirmDelete(w)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else
        title="No websites found"
        :description="search || filterMemberId || filterType ? 'No websites match your current filters.' : 'Add your first website to get started.'"
      >
        <template #action>
          <RouterLink to="/websites/new" class="btn-primary">New Website</RouterLink>
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
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['websites']);

const data = useDataStore();
const auth = useAuthStore();

const search        = ref('');
const filterMemberId = ref('');
const filterType    = ref('');

const currentUserId = computed(() => auth.user?.id ?? '');

const filtered = computed(() => {
  let list = data.websites;

  // Members only see websites they created or that were created with their userId
  if (!auth.isAdmin) {
    list = list.filter(
      (w) => w.createdBy === currentUserId.value
    );
  }

  if (filterMemberId.value) {
    list = list.filter((w) => w.createdBy === filterMemberId.value);
  }
  if (filterType.value) {
    list = list.filter((w) => w.websiteType === filterType.value);
  }
  if (search.value.trim()) {
    const q = search.value.toLowerCase();
    list = list.filter(
      (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q)
    );
  }
  return list;
});

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
  if (diffMinutes <= 15) {
    return { text: 'Connected (Active)', dotClass: 'dot--green' };
  } else if (diffMinutes <= 1440) {
    return { text: 'Inactive (Idle)', dotClass: 'dot--orange' };
  } else {
    return { text: 'Disconnected', dotClass: 'dot--red' };
  }
};

onMounted(() => {
  data.fetchWebsites();
  if (auth.isAdmin) data.fetchMembers();
});
</script>

<style scoped>
.mw-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}
.mw-search { flex: 1; min-width: 200px; max-width: 320px; }
.mw-select { min-width: 160px; }

.mw-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1rem;
}

/* Card */
.mw-card {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.mw-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.1rem 1.1rem 0.75rem;
}

.mw-card-identity {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 0;
  flex: 1;
}

/* Avatar / favicon circle */
.mw-avatar {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.mw-favicon {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.mw-card-title-block { min-width: 0; }
.mw-card-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-main);
  font-family: 'Raleway', 'Google Sans', sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin: 0;
}
.mw-card-domain {
  display: block;
  font-size: 0.78rem;
  color: var(--primary);
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 0.1rem;
}
.mw-card-domain:hover { text-decoration: underline; }
.mw-card-domain--empty { color: var(--text-muted); }

.mw-card-badges {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  flex-shrink: 0;
}

/* Type badge */
.mw-type-badge {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 600;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  white-space: nowrap;
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}
.mw-type-badge--existing {
  background: color-mix(in srgb, #22c55e 12%, transparent);
  color: #16a34a;
}
:root[data-theme='dark-gray'] .mw-type-badge--existing { color: #4ade80; }

/* Meta row */
.mw-card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  padding: 0 1.1rem 0.75rem;
  border-bottom: 1px solid var(--border);
}
.mw-meta-item {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--text-muted);
}
.mw-meta-item svg { flex-shrink: 0; opacity: 0.7; }

/* Actions */
.mw-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.1rem;
}
.mw-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  height: auto;
}
.mw-btn--icon {
  padding: 0.35rem 0.55rem;
}

.mw-conn-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
}
.mw-conn-badge.dot--green {
  color: #16a34a;
  background: color-mix(in srgb, #16a34a 9%, transparent);
}
.mw-conn-badge.dot--orange {
  color: #d97706;
  background: color-mix(in srgb, #d97706 9%, transparent);
}
.mw-conn-badge.dot--red {
  color: #dc2626;
  background: color-mix(in srgb, #dc2626 9%, transparent);
}
.mw-conn-badge.dot--gray {
  color: #64748b;
  background: color-mix(in srgb, #64748b 9%, transparent);
}
.mw-conn-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}

@media (max-width: 640px) {
  .mw-grid { grid-template-columns: 1fr; }
  .mw-search { max-width: 100%; }
}
</style>
