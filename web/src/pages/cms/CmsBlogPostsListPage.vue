<template>
  <div class="bl-page">
    <CmsLockedScreen v-if="auth.isQualityChecker" />

    <template v-else>
      <!-- ── Header ──────────────────────────────────────────────── -->
      <header class="bl-head">
        <div class="bl-head-text">
          <span class="eyebrow">Editorial</span>
          <h1 class="bl-title">Blog Posts</h1>
          <p class="bl-sub">Write, manage, and publish articles — organized by website.</p>
        </div>
        <div class="bl-head-actions">
          <button
            type="button"
            class="btn-primary bl-write"
            :disabled="creating || !canCreate"
            :title="canCreate ? '' : 'Choose a website first'"
            @click="onCreateNew"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            {{ creating ? 'Creating…' : 'Write New Post' }}
          </button>
        </div>
      </header>

      <!-- ── Website folder selector ─────────────────────────────── -->
      <div class="bl-folderbar">
        <span class="bl-folder-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        </span>
        <div class="bl-folder-field">
          <span class="bl-folder-label">Pick a website</span>
          <div class="bl-site-tiles">
            <button
              type="button"
              class="bl-site-tile"
              :class="{ 'bl-site-tile--active': websiteFilter === 'all' }"
              title="All websites"
              @click="websiteFilter = 'all'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
              <span class="bl-site-tile-label">All</span>
            </button>
            <button
              v-for="w in websites"
              :key="w.id"
              type="button"
              class="bl-site-tile"
              :class="{ 'bl-site-tile--active': websiteFilter === w.id }"
              :title="w.name || w.domain"
              @click="websiteFilter = w.id"
            >
              <img v-if="w.faviconUrl" :src="w.faviconUrl" class="bl-site-tile-fav" :alt="w.name || w.domain" />
              <span v-else class="bl-site-tile-letter">{{ (w.name || w.domain || '?')[0].toUpperCase() }}</span>
              <span class="bl-site-tile-label">{{ w.name || w.domain }}</span>
            </button>
            <button
              type="button"
              class="bl-site-tile"
              :class="{ 'bl-site-tile--active': websiteFilter === 'unassigned' }"
              title="Unassigned posts"
              @click="websiteFilter = 'unassigned'"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              <span class="bl-site-tile-label">None</span>
            </button>
          </div>
        </div>
        <span class="bl-folder-hint">
          <template v-if="canCreate">New posts go to <b>{{ selectedWebsite?.name || selectedWebsite?.domain }}</b></template>
          <template v-else>Pick a website to start a new post</template>
        </span>
        <span class="bl-folder-count">{{ filtered.length }} {{ filtered.length === 1 ? 'post' : 'posts' }}</span>
      </div>

      <!-- ── Status tabs ─────────────────────────────────────────── -->
      <div class="bl-controls">
        <div class="bl-tabs">
          <button
            v-for="t in tabs"
            :key="t.key"
            type="button"
            class="bl-tab"
            :class="{ 'bl-tab--active': statusFilter === t.key }"
            @click="statusFilter = t.key"
          >
            {{ t.label }}
            <span class="bl-tab-count">{{ t.count }}</span>
          </button>
        </div>

        <div class="bl-toolbar">
          <div class="bl-search">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" type="search" placeholder="Search posts…" />
          </div>
          <select v-model="categoryFilter" class="bl-select" aria-label="Filter by category">
            <option value="all">All categories</option>
            <option v-for="c in categoryOptions" :key="c" :value="c">{{ c }}</option>
          </select>
          <select v-model="sortBy" class="bl-select" aria-label="Sort posts">
            <option value="updated">Recently edited</option>
            <option value="published">Newest published</option>
            <option value="title">Title A–Z</option>
          </select>
        </div>
      </div>

      <!-- ── Error ───────────────────────────────────────────────── -->
      <div v-if="store.error" class="bl-error">
        <p class="bl-error-title">Couldn't load posts.</p>
        <p class="bl-error-msg">{{ store.error }}</p>
        <button class="btn-secondary" type="button" @click="store.fetchPosts">Try again</button>
      </div>

      <!-- ── Loading ─────────────────────────────────────────────── -->
      <div v-else-if="store.loading && store.posts.length === 0" class="bl-list">
        <div v-for="i in 4" :key="i" class="bl-skel" />
      </div>

      <!-- ── Empty ───────────────────────────────────────────────── -->
      <div v-else-if="filtered.length === 0" class="bl-empty">
        <div class="bl-empty-icon">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        </div>
        <p class="bl-empty-title">{{ emptyTitle }}</p>
        <p class="bl-empty-sub">{{ emptySub }}</p>
        <button v-if="canCreate && !hasActiveFilters" type="button" class="btn-primary mt-1" :disabled="creating" @click="onCreateNew">
          Write your first post
        </button>
        <button v-else-if="hasActiveFilters" type="button" class="btn-secondary mt-1" @click="clearFilters">Clear filters</button>
      </div>

      <!-- ── Post list ───────────────────────────────────────────── -->
      <ul v-else class="bl-list">
        <li
          v-for="p in filtered"
          :key="p.id"
          class="bl-row"
          @click="go(`/cms/blog/${p.id}`)"
        >
          <span v-if="p.featuredImage" class="bl-thumb">
            <img :src="p.featuredImage" :alt="p.featuredImageAlt || p.title" loading="lazy" />
          </span>
          <span v-else class="bl-thumb bl-thumb--blank">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </span>

          <div class="bl-row-main">
            <div class="bl-row-top">
              <span class="bl-badge" :class="`bl-badge--${p.status}`">
                <span class="bl-badge-dot" />{{ p.status === 'published' ? 'Published' : 'Draft' }}
              </span>
              <!-- Website chip — always show so authors never lose track of the site -->
              <span class="bl-site" :class="{ 'bl-site--none': !p.websiteId }">
                <img v-if="websiteMeta(p.websiteId)?.faviconUrl" :src="websiteMeta(p.websiteId)!.faviconUrl" class="bl-site-fav" alt="" />
                <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                {{ websiteMeta(p.websiteId)?.name || websiteMeta(p.websiteId)?.domain || 'Unassigned' }}
              </span>
              <span v-if="p.category" class="bl-cat">{{ p.category }}</span>
            </div>
            <h3 class="bl-row-title">{{ p.title || 'Untitled post' }}</h3>
            <p v-if="p.excerpt" class="bl-row-excerpt">{{ p.excerpt }}</p>
            <div class="bl-row-meta">
              <span v-if="p.author">{{ p.author }}</span>
              <span v-if="p.author" class="bl-dot-sep">·</span>
              <span>{{ p.status === 'published' && p.publishDate ? `Published ${p.publishDate}` : `Edited ${formatRelative(p.updatedAt)}` }}</span>
              <span class="bl-dot-sep">·</span>
              <span class="bl-slug">/blog/{{ p.slug }}</span>
            </div>
          </div>

          <div class="bl-row-actions" @click.stop>
            <RouterLink :to="`/cms/blog/${p.id}`" class="bl-action" title="Edit post">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </RouterLink>
            <button
              v-if="store.canPublish()"
              type="button"
              class="bl-action"
              :title="p.status === 'published' ? 'Unpublish' : 'Publish'"
              :disabled="busyId === p.id"
              @click="togglePublish(p)"
            >
              <svg v-if="p.status === 'published'" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </button>
            <button type="button" class="bl-action" title="Copy public link" @click="copyLink(p)">
              <svg v-if="copiedId === p.id" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            </button>
            <button
              v-if="store.canDelete()"
              type="button"
              class="bl-action bl-action--danger"
              title="Delete post"
              :disabled="busyId === p.id"
              @click="onDelete(p)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter, RouterLink } from 'vue-router';
import CmsLockedScreen from '@/components/cms/CmsLockedScreen.vue';
import { useCmsBlogPostsStore, type CmsBlogPost } from '@/stores/cmsBlogPosts';
import { useDataStore, type Website } from '@/stores/data';
import { useAuthStore } from '@/stores/auth';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['cms_blog_posts']);

const router = useRouter();
const store  = useCmsBlogPostsStore();
const data   = useDataStore();
const auth   = useAuthStore();

type StatusTab = 'all' | 'published' | 'draft';
const search         = ref('');
const statusFilter   = ref<StatusTab>('all');
const categoryFilter = ref('all');
const websiteFilter  = ref<string>('all'); // 'all' | 'unassigned' | <websiteId>
const sortBy         = ref<'updated' | 'published' | 'title'>('updated');
const creating       = ref(false);
const busyId         = ref<string | null>(null);
const copiedId       = ref<string | null>(null);

onMounted(() => {
  if (auth.isQualityChecker) return;
  void store.fetchPosts();
  void data.fetchWebsites();
});

// Allow all authenticated users (admins, heads, members) to filter and assign posts to any team website.
const websites = computed<Website[]>(() => {
  return data.websites
    .filter((w) => w.isFramework)
    .sort((a, b) => (a.name || a.domain).localeCompare(b.name || b.domain));
});
const websiteById = computed(() => {
  const m = new Map<string, Website>();
  data.websites.forEach((w) => m.set(w.id, w));
  return m;
});
const websiteMeta = (id: string | null): Website | null => (id ? websiteById.value.get(id) ?? null : null);
const selectedWebsite = computed<Website | null>(() =>
  websiteFilter.value !== 'all' && websiteFilter.value !== 'unassigned'
    ? websiteById.value.get(websiteFilter.value) ?? null
    : null
);
const canCreate = computed(() => !!selectedWebsite.value);

// ── Status tab counts (respect the current website folder) ────────────
const inFolder = (p: CmsBlogPost) => {
  if (websiteFilter.value === 'all') return true;
  if (websiteFilter.value === 'unassigned') return !p.websiteId;
  return p.websiteId === websiteFilter.value;
};
const folderPosts = computed(() => store.posts.filter(inFolder));

const publishedCount = computed(() => folderPosts.value.filter((p) => p.status === 'published').length);
const draftCount     = computed(() => folderPosts.value.filter((p) => p.status === 'draft').length);
const tabs = computed(() => [
  { key: 'all' as const,       label: 'All',       count: folderPosts.value.length },
  { key: 'published' as const, label: 'Published', count: publishedCount.value },
  { key: 'draft' as const,     label: 'Drafts',    count: draftCount.value },
]);

const categoryOptions = computed(() => {
  const set = new Set<string>();
  folderPosts.value.forEach((p) => { if (p.category) set.add(p.category); });
  return Array.from(set).sort();
});

const hasActiveFilters = computed(
  () => !!(search.value || statusFilter.value !== 'all' || categoryFilter.value !== 'all' || websiteFilter.value !== 'all')
);

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  const list = folderPosts.value.filter((p) => {
    if (statusFilter.value !== 'all' && p.status !== statusFilter.value) return false;
    if (categoryFilter.value !== 'all' && p.category !== categoryFilter.value) return false;
    if (q && !p.title.toLowerCase().includes(q) && !p.slug.toLowerCase().includes(q)) return false;
    return true;
  });
  return [...list].sort((a, b) => {
    if (sortBy.value === 'title') return (a.title || '').localeCompare(b.title || '');
    if (sortBy.value === 'published') {
      return new Date(b.publishDate || b.createdAt).getTime() - new Date(a.publishDate || a.createdAt).getTime();
    }
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
});

const emptyTitle = computed(() => {
  if (hasActiveFilters.value) return 'No posts match your filters.';
  if (statusFilter.value === 'draft') return 'No drafts here yet.';
  if (statusFilter.value === 'published') return 'Nothing published here yet.';
  return selectedWebsite.value ? `No posts for ${selectedWebsite.value.name || selectedWebsite.value.domain} yet.` : 'No posts yet.';
});
const emptySub = computed(() => {
  if (hasActiveFilters.value) return 'Try a different search or clear your filters.';
  if (!canCreate.value) return 'Pick a website from the folder above, then write your first post.';
  return 'Create your first article — it only takes a minute.';
});

const formatRelative = (iso: string): string => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

const go = (to: string) => { void router.push(to); };

const clearFilters = () => {
  search.value = '';
  statusFilter.value = 'all';
  categoryFilter.value = 'all';
  websiteFilter.value = 'all';
};

const onCreateNew = async () => {
  if (!canCreate.value || !selectedWebsite.value) return;
  creating.value = true;
  try {
    const post = await store.createPost({
      title: 'Untitled post',
      slug: '',
      status: 'draft',
      websiteId: selectedWebsite.value.id,
    });
    if (post) await router.push(`/cms/blog/${post.id}`);
  } finally {
    creating.value = false;
  }
};

const togglePublish = async (p: CmsBlogPost) => {
  busyId.value = p.id;
  try {
    if (p.status === 'published') await store.unpublishPost(p.id);
    else                          await store.publishPost(p.id);
  } finally {
    busyId.value = null;
  }
};

const copyLink = async (p: CmsBlogPost) => {
  try {
    await navigator.clipboard.writeText(`/blog/${p.slug}`);
    copiedId.value = p.id;
    setTimeout(() => { if (copiedId.value === p.id) copiedId.value = null; }, 1600);
  } catch { /* clipboard blocked — ignore */ }
};

const onDelete = async (p: CmsBlogPost) => {
  if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
  busyId.value = p.id;
  try {
    await store.deletePost(p.id);
  } finally {
    busyId.value = null;
  }
};
</script>

<style scoped>
.bl-page { display: flex; flex-direction: column; gap: 1rem; }

/* ── Header ───────────────────────────────────────────────────────── */
.bl-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.bl-title { margin: 0.3rem 0 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.025em; color: var(--text-main); }
.bl-sub { margin: 0.3rem 0 0; font-size: 0.88rem; color: var(--text-muted); }
.bl-head-actions { display: flex; align-items: center; gap: 0.6rem; }
.bl-write { font-size: 0.9rem; }

/* ── Website folder bar ───────────────────────────────────────────── */
.bl-folderbar {
  display: flex; align-items: center; gap: 0.85rem; flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 7%, var(--card-bg)) 0%, var(--card-bg) 60%);
  padding: 0.75rem 1rem;
  box-shadow: var(--shadow-sm);
}
.bl-folder-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 2.5rem; height: 2.5rem; border-radius: 11px; flex-shrink: 0;
  background: var(--primary-soft); color: var(--primary);
}
.bl-folder-field { display: flex; flex-direction: column; gap: 0.15rem; }
.bl-folder-label { font-size: 0.66rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-soft); }
.bl-folder-selectwrap { display: inline-flex; align-items: center; gap: 0.45rem; }
.bl-folder-fav { width: 1.1rem; height: 1.1rem; border-radius: 4px; object-fit: cover; }
.bl-folder-select {
  border: 1px solid var(--border); border-radius: 9px; background: var(--card-bg);
  color: var(--text-main); font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.95rem; font-weight: 700; padding: 0.3rem 0.6rem; cursor: pointer; outline: none;
  letter-spacing: -0.01em;
}
.bl-folder-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
.bl-folder-hint { font-size: 0.76rem; color: var(--text-muted); }
.bl-folder-hint b { color: var(--text-main); font-weight: 700; }
.bl-folder-count {
  margin-left: auto; font-size: 0.76rem; font-weight: 700; color: var(--text-muted);
  background: var(--soft-bg); border: 1px solid var(--border); border-radius: 999px; padding: 0.2rem 0.6rem;
  font-variant-numeric: tabular-nums;
}

/* ── Controls ─────────────────────────────────────────────────────── */
.bl-controls { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap; }

.bl-tabs {
  display: inline-flex; gap: 0.25rem; padding: 0.28rem;
  border: 1px solid var(--border); border-radius: 12px; background: var(--soft-bg); width: fit-content;
}
.bl-tab {
  display: inline-flex; align-items: center; gap: 0.45rem;
  border: none; background: transparent; border-radius: 9px; padding: 0.4rem 0.85rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.82rem; font-weight: 700;
  color: var(--text-muted); cursor: pointer; transition: background 140ms ease, color 140ms ease, box-shadow 140ms ease;
}
.bl-tab:hover { color: var(--text-main); }
.bl-tab--active { background: var(--card-bg); color: var(--primary); box-shadow: var(--shadow-sm); }
.bl-tab-count {
  font-size: 0.72rem; font-weight: 800; padding: 0.05rem 0.4rem; border-radius: 999px;
  background: color-mix(in srgb, var(--text-soft) 18%, transparent); color: var(--text-muted); font-variant-numeric: tabular-nums;
}
.bl-tab--active .bl-tab-count { background: color-mix(in srgb, var(--primary) 16%, transparent); color: var(--primary); }

.bl-toolbar { display: flex; flex-wrap: wrap; gap: 0.6rem; align-items: center; }
.bl-search { position: relative; min-width: 13rem; }
.bl-search svg { position: absolute; left: 0.8rem; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
.bl-search input,
.bl-select {
  border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main);
  font-size: 0.85rem; padding: 0.55rem 0.8rem; font-family: inherit; outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.bl-search input { padding-left: 2.1rem; width: 100%; }
.bl-select { cursor: pointer; }
.bl-search input:focus,
.bl-select:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }

/* ── States ───────────────────────────────────────────────────────── */
.bl-error {
  display: flex; flex-direction: column; gap: 0.4rem; align-items: flex-start;
  border: 1px solid color-mix(in srgb, #e5484d 30%, var(--border));
  background: color-mix(in srgb, #e5484d 6%, var(--card-bg));
  border-radius: 14px; padding: 1.1rem 1.25rem;
}
.bl-error-title { margin: 0; font-weight: 800; color: #e5484d; }
.bl-error-msg { margin: 0; font-size: 0.85rem; color: var(--text-muted); }

.bl-empty {
  display: flex; flex-direction: column; align-items: center; gap: 0.45rem; text-align: center;
  border: 1px dashed var(--border-strong); border-radius: 16px; padding: 3rem 1.5rem; background: var(--card-bg);
}
.bl-empty-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 3.4rem; height: 3.4rem; border-radius: 14px; margin-bottom: 0.3rem; background: var(--primary-soft); color: var(--primary);
}
.bl-empty-title { margin: 0; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.bl-empty-sub { margin: 0; font-size: 0.86rem; color: var(--text-muted); max-width: 24rem; }

/* ── List ─────────────────────────────────────────────────────────── */
.bl-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.bl-skel { height: 6.2rem; border-radius: 14px; background: var(--soft-bg); animation: bl-pulse 1.4s ease-in-out infinite; }
@keyframes bl-pulse { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .bl-skel { animation: none; } }

.bl-row {
  display: flex; align-items: center; gap: 1rem;
  border: 1px solid var(--border); border-radius: 14px; background: var(--card-bg);
  padding: 0.85rem; box-shadow: var(--shadow-sm); cursor: pointer;
  transition: border-color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}
.bl-row:hover { border-color: color-mix(in srgb, var(--primary) 28%, var(--border)); box-shadow: var(--shadow-md); transform: translateY(-2px); }
.bl-thumb {
  width: 5.2rem; height: 4rem; flex-shrink: 0; border-radius: 10px; overflow: hidden;
  border: 1px solid var(--border); background: var(--soft-bg);
  display: inline-flex; align-items: center; justify-content: center;
}
.bl-thumb img { width: 100%; height: 100%; object-fit: cover; }
.bl-thumb--blank { color: var(--text-soft); }

.bl-row-main { flex: 1; min-width: 0; }
.bl-row-top { display: flex; align-items: center; gap: 0.45rem; margin-bottom: 0.25rem; flex-wrap: wrap; }
.bl-badge {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.02em;
  border-radius: 999px; padding: 0.16rem 0.5rem; border: 1px solid var(--border);
}
.bl-badge-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.bl-badge--draft { color: var(--text-muted); }
.bl-badge--published { color: #16a34a; background: color-mix(in srgb, #16a34a 9%, transparent); border-color: color-mix(in srgb, #16a34a 24%, transparent); }
.bl-site {
  display: inline-flex; align-items: center; gap: 0.3rem;
  font-size: 0.68rem; font-weight: 700; color: var(--primary);
  background: var(--primary-soft); border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
  border-radius: 999px; padding: 0.14rem 0.5rem; max-width: 12rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bl-site-fav { width: 0.8rem; height: 0.8rem; border-radius: 3px; object-fit: cover; }
.bl-site--none { color: var(--text-soft); background: var(--soft-bg); border-color: var(--border); }
.bl-cat {
  font-size: 0.7rem; font-weight: 700; color: var(--text-muted);
  background: var(--soft-bg); border: 1px solid var(--border); border-radius: 999px; padding: 0.14rem 0.55rem;
}
.bl-row-title {
  margin: 0; font-size: 1.02rem; font-weight: 700; color: var(--text-main); letter-spacing: -0.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bl-row-excerpt {
  margin: 0.2rem 0 0; font-size: 0.82rem; color: var(--text-muted); line-height: 1.45;
  display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden;
}
.bl-row-meta { margin-top: 0.4rem; display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem; font-size: 0.74rem; color: var(--text-soft); }
.bl-dot-sep { opacity: 0.6; }
.bl-slug { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; }

.bl-row-actions { display: flex; gap: 0.3rem; flex-shrink: 0; }
.bl-action {
  display: inline-flex; align-items: center; justify-content: center; width: 2.1rem; height: 2.1rem; border-radius: 9px;
  border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted); cursor: pointer;
  transition: color 130ms, border-color 130ms, background 130ms;
}
.bl-action:hover { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); background: var(--primary-soft); }
.bl-action--danger:hover { color: #e5484d; border-color: color-mix(in srgb, #e5484d 40%, var(--border)); background: color-mix(in srgb, #e5484d 8%, transparent); }
.bl-action:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 640px) {
  .bl-row { flex-wrap: wrap; }
  .bl-thumb { width: 3.4rem; height: 3.4rem; }
  .bl-row-actions { width: 100%; justify-content: flex-end; }
  .bl-row-excerpt { display: none; }
  .bl-folder-count { margin-left: 0; }
}

/* ── Favicon tile picker ─────────────────────────────────────────── */
.bl-site-tiles {
  display: flex; flex-wrap: wrap; gap: 0.4rem; align-items: center;
}
.bl-site-tile {
  display: inline-flex; flex-direction: column; align-items: center; gap: 0.2rem;
  width: 3.6rem; padding: 0.45rem 0.25rem 0.35rem; border-radius: 10px;
  border: 1.5px solid var(--border); background: var(--card-bg); cursor: pointer;
  transition: border-color 140ms, background 140ms, box-shadow 140ms, transform 140ms;
}
.bl-site-tile:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  background: var(--primary-soft); transform: translateY(-1px); box-shadow: var(--shadow-sm);
}
.bl-site-tile--active {
  border-color: var(--primary) !important;
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 22%, transparent);
}
.bl-site-tile-fav {
  width: 1.6rem; height: 1.6rem; border-radius: 6px; object-fit: cover;
  border: 1px solid var(--border);
}
.bl-site-tile-letter {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.6rem; height: 1.6rem; border-radius: 6px; font-size: 0.78rem; font-weight: 800;
  background: var(--primary-soft); color: var(--primary); border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}
.bl-site-tile svg {
  width: 1.5rem; height: 1.5rem; color: var(--text-muted);
}
.bl-site-tile--active svg { color: var(--primary); }
.bl-site-tile-label {
  font-size: 0.58rem; font-weight: 700; color: var(--text-muted);
  max-width: 3.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
  line-height: 1.1;
}
.bl-site-tile--active .bl-site-tile-label { color: var(--primary); }

@media (max-width: 640px) {
  .bl-site-tiles { gap: 0.3rem; }
  .bl-site-tile { width: 3rem; padding: 0.35rem 0.15rem 0.25rem; }
  .bl-site-tile-fav, .bl-site-tile-letter { width: 1.3rem; height: 1.3rem; }
  .bl-site-tile-label { font-size: 0.5rem; max-width: 2.6rem; }
}
</style>

