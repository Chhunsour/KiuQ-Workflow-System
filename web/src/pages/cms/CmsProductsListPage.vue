<template>
  <div class="cms-page">
    <CmsLockedScreen
      v-if="true"
      badge="Under Review"
      :title="$t('Product Catalog CMS is Locked')"
      description="The Product CMS dashboard is currently disabled while the management team reviews its implementation scope and guidelines."
      :hint="null"
    />

    <template v-else>
    <PageHeader
      :title="$t('Products')"
      subtitle="Manage product content for the public website. Published rows are visible to the framework site; drafts stay private."
    >
      <template #actions>
        <button
          v-if="store.canEdit()"
          type="button"
          class="btn-primary"
          @click="onCreateNew"
          :disabled="creating"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ creating ? 'Creating…' : 'New Product' }}
        </button>
      </template>
    </PageHeader>

    <!-- Filters -->
    <div class="cms-filters">
      <div class="cms-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input v-model="search" type="search" :placeholder="$t('Search products by name or slug…')" />
      </div>
      <select v-model="statusFilter" class="cms-select">
        <option value="all">{{ $t('All statuses') }}</option>
        <option value="draft">{{ $t('Draft') }}</option>
        <option value="published">{{ $t('Published') }}</option>
      </select>
      <select v-model="productTypeFilter" class="cms-select">
        <option value="all">{{ $t('All types') }}</option>
        <option value="equipment">{{ $t('Equipment') }}</option>
        <option value="attachment">{{ $t('Attachments') }}</option>
        <option value="unknown">{{ $t('Needs Type') }}</option>
      </select>
      <select v-model="categoryFilter" class="cms-select">
        <option value="all">{{ $t('All categories') }}</option>
        <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
      </select>
    </div>

    <!-- Error -->
    <div v-if="store.error" class="cms-error card card-pad">
      <p class="font-semibold text-status-needs-fix-fg">{{ $t('Failed to load products.') }}</p>
      <p class="text-sm text-text-muted mt-1">{{ store.error }}</p>
      <button class="btn-primary mt-3 w-fit" type="button" @click="store.fetchProducts">{{ $t('Retry') }}</button>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="store.loading && store.products.length === 0" class="cms-skeleton">
      <div v-for="i in 5" :key="i" class="cms-skel-row" />
    </div>

    <!-- Empty state -->
    <div v-else-if="filtered.length === 0" class="cms-empty card card-pad">
      <p class="cms-empty-title">{{ $t('No products yet.') }}</p>
      <p class="cms-empty-sub">
        {{ hasActiveFilters ? 'No products match your filters.' : 'Click “New Product” to add your first one.' }}
      </p>
    </div>

    <!-- Table -->
    <div v-else class="cms-table-wrap">
      <table class="cms-table">
        <thead>
          <tr>
            <th>{{ $t('Product') }}</th>
            <th>{{ $t('Type') }}</th>
            <th>{{ $t('Category') }}</th>
            <th>{{ $t('Status') }}</th>
            <th>{{ $t('Updated') }}</th>
            <th class="cms-actions-col">{{ $t('Actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtered" :key="p.id" class="cms-row">
            <td>
              <div class="cms-product-cell">
                <span v-if="firstImage(p)" class="cms-thumb">
                  <img :src="firstImage(p) ?? ''" :alt="p.productName" loading="lazy" />
                </span>
                <span v-else class="cms-thumb cms-thumb--blank">{{ initials(p.productName) }}</span>
                <div class="cms-product-meta">
                  <span class="cms-product-name">{{ p.productName || 'Untitled' }}</span>
                  <span class="cms-product-slug">/{{ p.slug || 'no-slug' }}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="cms-tag">{{ productTypeLabel(p.productType) }}</span>
            </td>
            <td>
              <span v-if="p.category" class="cms-tag">{{ p.category }}</span>
              <span v-else class="cms-muted">—</span>
            </td>
            <td>
              <span class="cms-badge" :class="`cms-badge--${p.status}`">
                <span class="cms-badge-dot" />
                {{ p.status === 'published' ? 'Published' : 'Draft' }}
              </span>
            </td>
            <td class="cms-muted">{{ formatRelative(p.updatedAt) }}</td>
            <td>
              <div class="cms-row-actions">
                <RouterLink :to="`/cms/products/${p.id}`" class="btn-secondary cms-row-btn">
                  {{ $t('Edit') }}
                </RouterLink>
                <button
                  v-if="store.canPublish()"
                  type="button"
                  class="btn-secondary cms-row-btn"
                  :disabled="busyId === p.id"
                  @click="togglePublish(p)"
                >
                  {{ p.status === 'published' ? 'Unpublish' : 'Publish' }}
                </button>
                <button
                  v-if="store.canDelete()"
                  type="button"
                  class="btn-danger cms-row-btn"
                  :disabled="busyId === p.id"
                  @click="onDelete(p)"
                >
                  {{ $t('Delete') }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import CmsLockedScreen from '@/components/cms/CmsLockedScreen.vue';
import { useCmsProductsStore, type CmsProduct } from '@/stores/cmsProducts';
import { useAuthStore } from '@/stores/auth';
import { usePageRealtime } from '@/services/realtimeService';
import { productTypeLabel } from '@/lib/productIdentity';

usePageRealtime(['cms_products']);

const router = useRouter();
const store  = useCmsProductsStore();
const auth   = useAuthStore();

const search         = ref('');
const statusFilter   = ref<'all' | 'draft' | 'published'>('all');
const productTypeFilter = ref<'all' | 'equipment' | 'attachment' | 'unknown'>('all');
const categoryFilter = ref<string>('all');
const creating       = ref(false);
const busyId         = ref<string | null>(null);

onMounted(() => {
  // Everyone but Quality Checkers can browse the catalog. RLS still
  // limits what each role can actually change (members: drafts only).
  if (!auth.isQualityChecker) void store.fetchProducts();
});

const categoryOptions = computed(() => {
  const set = new Set<string>();
  store.products.forEach((p) => { if (p.category) set.add(p.category); });
  return Array.from(set).sort();
});

const hasActiveFilters = computed(
  () => !!(search.value || statusFilter.value !== 'all' || productTypeFilter.value !== 'all' || categoryFilter.value !== 'all')
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  return store.products.filter((p) => {
    if (statusFilter.value !== 'all' && p.status !== statusFilter.value) return false;
    if (productTypeFilter.value !== 'all' && (p.productType || 'unknown') !== productTypeFilter.value) return false;
    if (categoryFilter.value !== 'all' && p.category !== categoryFilter.value) return false;
    if (q && !p.productName.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q) && !p.compatibleWith.join(' ').toLowerCase().includes(q)) return false;
    return true;
  });
});

const firstImage = (p: CmsProduct): string | null => p.productImages[0]?.url ?? null;

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((s) => s[0] ?? '').join('').toUpperCase() || '?';

const formatRelative = (iso: string): string => {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const onCreateNew = async () => {
  creating.value = true;
  try {
    const product = await store.createProduct({
      productName: 'Untitled product',
      slug:        '',
      status:      'draft',
    });
    if (product) await router.push(`/cms/products/${product.id}`);
  } finally {
    creating.value = false;
  }
};

const togglePublish = async (p: CmsProduct) => {
  busyId.value = p.id;
  try {
    if (p.status === 'published') await store.unpublishProduct(p.id);
    else                          await store.publishProduct(p.id);
  } finally {
    busyId.value = null;
  }
};

const onDelete = async (p: CmsProduct) => {
  if (!window.confirm(`Delete "${p.productName}"? This cannot be undone.`)) return;
  busyId.value = p.id;
  try {
    await store.deleteProduct(p.id);
  } finally {
    busyId.value = null;
  }
};
</script>

<style scoped>
.cms-page { display: flex; flex-direction: column; gap: 1.1rem; }

/* ── Filters ────────────────────────────────────────────────────── */
.cms-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}
.cms-search { position: relative; min-width: 16rem; flex: 1; max-width: 24rem; }
.cms-search svg {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  width: 0.9rem; height: 0.9rem;
  color: var(--text-muted);
  transform: translateY(-50%);
}
.cms-search input,
.cms-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
  font-family: inherit;
  outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.cms-search input { padding-left: 2rem; }
.cms-select { width: auto; min-width: 10rem; }
.cms-search input:focus,
.cms-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}

/* ── Skeleton + states ──────────────────────────────────────────── */
.cms-skeleton { display: flex; flex-direction: column; gap: 0.45rem; }
.cms-skel-row {
  height: 3.4rem;
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: cms-pulse 1.4s ease-in-out infinite;
}
@keyframes cms-pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }
.cms-empty { text-align: center; }
.cms-empty-title {
  margin: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
}
.cms-empty-sub { margin: 0.3rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.cms-error { display: flex; flex-direction: column; }

/* ── Table ──────────────────────────────────────────────────────── */
.cms-table-wrap {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  overflow: hidden;
}
.cms-table {
  width: 100%;
  border-collapse: collapse;
}
.cms-table th,
.cms-table td {
  text-align: left;
  padding: 0.7rem 0.85rem;
  font-size: 0.85rem;
  vertical-align: middle;
  border-bottom: 1px solid var(--border);
}
.cms-table thead th {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  background: color-mix(in srgb, var(--soft-bg) 60%, var(--card-bg));
}
.cms-row:last-child td { border-bottom: 0; }
.cms-actions-col { width: 1%; white-space: nowrap; }

.cms-product-cell { display: flex; align-items: center; gap: 0.65rem; }
.cms-thumb {
  width: 2.4rem; height: 2.4rem;
  border-radius: 8px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.cms-thumb img { width: 100%; height: 100%; object-fit: cover; }
.cms-thumb--blank {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  color: var(--primary);
}
.cms-product-meta { display: flex; flex-direction: column; min-width: 0; }
.cms-product-name {
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 22rem;
}
.cms-product-slug {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
}

.cms-tag {
  display: inline-block;
  font-size: 0.72rem;
  font-weight: 700;
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  background: var(--soft-bg);
  color: var(--text-main);
  border: 1px solid var(--border);
}
.cms-muted { color: var(--text-muted); }

.cms-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  border: 1px solid var(--border);
}
.cms-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.cms-badge--draft     { color: var(--text-muted); }
.cms-badge--published { color: #16a34a; background: rgba(22,163,74,0.10); border-color: rgba(22,163,74,0.28); }

.cms-row-actions { display: flex; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end; }
.cms-row-btn {
  font-size: 0.76rem;
  padding: 0.35rem 0.7rem;
  height: auto;
}

/* ── Responsive ─────────────────────────────────────────────────── */
@media (max-width: 720px) {
  .cms-table thead { display: none; }
  .cms-table tbody tr {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.4rem;
    padding: 0.7rem 0.85rem;
    border-bottom: 1px solid var(--border);
  }
  .cms-table td { padding: 0; border: 0; }
  .cms-row-actions { justify-content: flex-start; }
}
</style>
