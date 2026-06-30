<template>
  <div class="be-page">
    <CmsLockedScreen v-if="auth.isQualityChecker" />

    <template v-else>
      <!-- ── Top bar ─────────────────────────────────────────────── -->
      <header class="be-top">
        <RouterLink to="/cms/blog" class="be-back">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
          {{ $t('All Posts') }}
        </RouterLink>
        <div class="be-top-right">
          <span class="be-saved" :class="{ 'be-saved--dirty': isDirty }">
            <span class="be-saved-dot" />
            {{ isDirty ? 'Unsaved changes' : (lastSaved ? `Saved ${lastSaved}` : 'All changes saved') }}
          </span>
          <span class="be-status-pill" :class="`be-status-pill--${form.status}`">
            <span class="be-status-dot" />{{ form.status === 'published' ? 'Published' : 'Draft' }}
          </span>
        </div>
      </header>

      <div v-if="loading" class="be-loading">{{ $t('Loading post…') }}</div>
      <div v-else-if="!post" class="be-loading">{{ $t('Post not found.') }}</div>

      <template v-else>
        <div class="be-grid">
          <!-- ════ MAIN COLUMN ════ -->
          <div class="be-main">
            <!-- Title + slug + excerpt -->
            <section class="be-card">
              <input
                v-model="form.title"
                class="be-title-input"
                type="text"
                :placeholder="$t('Post title…')"
                @blur="onTitleBlur"
              />

              <div class="be-slug">
                <span class="be-slug-prefix">{{ $t('/blog/') }}</span>
                <input v-model="form.slug" class="be-slug-input" type="text" :placeholder="$t('post-url')" @blur="onSlugBlur" />
              </div>

              <label class="be-label">{{ $t('Excerpt') }}</label>
              <textarea
                v-model="form.excerpt"
                class="be-input be-textarea"
                rows="2"
                maxlength="220"
                :placeholder="$t('A short summary shown on blog cards and previews.')"
              />
              <div class="be-counter">{{ form.excerpt.length }}/220</div>
            </section>

            <!-- Content editor -->
            <section class="be-card be-editor">
              <div class="be-editor-bar">
                <div class="be-tools" :class="{ 'be-tools--hidden': mode === 'preview' }">
                  <button type="button" class="be-tool" :title="$t('Bold (wrap **text**)')" @click="wrap('**')"><b>B</b></button>
                  <button type="button" class="be-tool" :title="$t('Italic (wrap *text*)')" @click="wrap('*')"><i>I</i></button>
                  <span class="be-tool-sep" />
                  <button type="button" class="be-tool" :title="$t('Heading')" @click="linePrefix('## ')">{{ $t('H2') }}</button>
                  <button type="button" class="be-tool" :title="$t('Subheading')" @click="linePrefix('### ')">{{ $t('H3') }}</button>
                  <span class="be-tool-sep" />
                  <button type="button" class="be-tool" :title="$t('Bullet list')" @click="linePrefix('- ')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                  </button>
                  <button type="button" class="be-tool" :title="$t('Quote')" @click="linePrefix('> ')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
                  </button>
                  <button type="button" class="be-tool" :title="$t('Insert link')" @click="wrap('[', '](https://)')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  </button>
                  <button type="button" class="be-tool" :title="$t('Insert image')" :disabled="insertingImage" @click="pickInlineImage">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                  </button>
                  <input ref="inlineImageInput" type="file" accept="image/*" class="be-hidden-file" @change="onInlineImageChange" />
                </div>

                <div class="be-segmented">
                  <button type="button" class="be-seg" :class="{ 'be-seg--active': mode === 'write' }" @click="mode = 'write'">{{ $t('Write') }}</button>
                  <button type="button" class="be-seg" :class="{ 'be-seg--active': mode === 'preview' }" @click="mode = 'preview'">{{ $t('Preview') }}</button>
                </div>
              </div>

              <textarea
                v-show="mode === 'write'"
                ref="contentRef"
                v-model="form.content"
                class="be-content"
                placeholder="Start writing your article…&#10;&#10;Use the toolbar above, or type Markdown:&#10;## A heading&#10;**bold**, *italic*, [a link](https://…)&#10;- a list item"
                spellcheck="true"
              />
              <div v-show="mode === 'preview'" class="be-preview cms-prose">
                <div v-if="form.content.trim()" v-html="renderedContent" />
                <p v-else class="be-preview-empty">{{ $t('Nothing to preview yet — switch to Write and start typing.') }}</p>
              </div>

              <div class="be-editor-foot">
                <span>{{ wordCount }} {{ wordCount === 1 ? 'word' : 'words' }}</span>
                <span v-if="wordCount > 0" class="be-dot-sep">·</span>
                <span v-if="wordCount > 0">~{{ readingTime }} min read</span>
                <span class="be-foot-hint">{{ $t('Markdown supported') }}</span>
              </div>
            </section>
          </div>

          <!-- ════ SIDEBAR ════ -->
          <aside class="be-side">
            <!-- Website — which site this post publishes to -->
            <section class="be-card be-side-card be-website-card">
              <h3 class="be-side-title">{{ $t('Website') }}</h3>
              <p class="be-website-help">{{ $t('Optional — published posts sync to all connected sites. Pick one only to organize.') }}</p>
              <div class="be-site-tiles">
                <button
                  v-for="w in websites"
                  :key="w.id"
                  type="button"
                  class="be-site-tile"
                  :class="{ 'be-site-tile--active': form.websiteId === w.id }"
                  :title="w.name || w.domain"
                  @click="form.websiteId = w.id"
                >
                  <img v-if="w.faviconUrl" :src="w.faviconUrl" class="be-site-tile-fav" :alt="w.name || w.domain" />
                  <span v-else class="be-site-tile-letter">{{ (w.name || w.domain || '?')[0].toUpperCase() }}</span>
                  <span class="be-site-tile-name">{{ w.name || w.domain }}</span>
                </button>
              </div>
              <p v-if="!websites.length" class="be-website-help">{{ $t('No framework site to assign — that’s fine. Published posts still go to every connected site on “Sync to sites”.') }}</p>
            </section>

            <!-- Publish status -->
            <section class="be-card be-side-card">
              <h3 class="be-side-title">{{ $t('Publishing') }}</h3>
              <div class="be-publish-row">
                <span class="be-publish-label">{{ $t('Status') }}</span>
                <span class="be-status-pill" :class="`be-status-pill--${form.status}`">
                  <span class="be-status-dot" />{{ form.status === 'published' ? 'Published' : 'Draft' }}
                </span>
              </div>
              <div class="be-publish-row">
                <span class="be-publish-label">{{ $t('Publish date') }}</span>
                <input v-model="form.publishDate" type="date" class="be-date" />
              </div>
              <div class="be-public-link">
                <span class="be-public-path">/blog/{{ form.slug || 'untitled' }}</span>
                <button type="button" class="be-copy" :title="copied ? 'Copied!' : 'Copy link'" @click="copyLink">
                  <svg v-if="copied" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
              </div>
            </section>

            <!-- Pre-publish checklist -->
            <section class="be-card be-side-card">
              <div class="be-check-head">
                <h3 class="be-side-title">{{ $t('Ready to publish?') }}</h3>
                <span class="be-check-score" :class="{ 'be-check-score--done': allReady }">{{ readyCount }}/{{ checklist.length }}</span>
              </div>
              <ul class="be-check-list">
                <li v-for="c in checklist" :key="c.key" class="be-check" :class="{ 'be-check--ok': c.ok }">
                  <span class="be-check-mark">
                    <svg v-if="c.ok" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                  {{ c.label }}
                </li>
              </ul>
            </section>

            <!-- Featured image -->
            <section
              class="be-card be-side-card"
              :class="{ 'be-drop': isDragging }"
              tabindex="0"
              @paste="onPaste"
              @dragover.prevent="onDragOver"
              @dragleave="onDragLeave"
              @drop.prevent="onDrop"
            >
              <div class="be-side-head">
                <h3 class="be-side-title">{{ $t('Featured image') }}</h3>
                <label class="be-mini-btn" :class="{ 'be-mini-btn--off': uploading }">
                  <input type="file" accept="image/*" :disabled="uploading" class="be-hidden-file" @change="onFileChange" />
                  {{ uploading ? 'Uploading…' : 'Upload' }}
                </label>
              </div>

              <template v-if="form.featuredImage">
                <div class="be-img-wrap">
                  <img :src="form.featuredImage" :alt="form.featuredImageAlt" />
                  <button type="button" class="be-img-x" :title="$t('Remove')" @click="form.featuredImage = ''">×</button>
                </div>
                <input v-model="form.featuredImageAlt" class="be-input be-input--sm" type="text" :placeholder="$t('Describe the image (alt text)')" />
              </template>
              <div v-else class="be-img-drop">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
                <span>{{ isDragging ? 'Drop to upload' : 'Drop, paste, or upload an image' }}</span>
              </div>
            </section>

            <!-- Organize -->
            <section class="be-card be-side-card">
              <h3 class="be-side-title">{{ $t('Organize') }}</h3>
              <label class="be-label">{{ $t('Category') }}</label>
              <select v-model="form.category" class="be-input">
                <option value="">{{ $t('— Select category —') }}</option>
                <option v-for="c in CATEGORIES" :key="c" :value="c">{{ c }}</option>
              </select>
              <label class="be-label">{{ $t('Author') }}</label>
              <input v-model="form.author" class="be-input" type="text" :placeholder="$t('e.g. TYPHON Team')" />
            </section>

            <!-- SEO -->
            <section class="be-card be-side-card">
              <h3 class="be-side-title">{{ $t('Search appearance') }}</h3>
              <div class="be-seo-preview">
                <span class="be-seo-url">your-site.com › blog › {{ form.slug || 'post' }}</span>
                <span class="be-seo-title">{{ form.seoTitle || form.title || 'Post title' }}</span>
                <span class="be-seo-desc">{{ form.seoDescription || form.excerpt || 'Add an SEO description to control how this appears in Google.' }}</span>
              </div>
              <label class="be-label">{{ $t('SEO title') }}</label>
              <input v-model="form.seoTitle" class="be-input be-input--sm" type="text" maxlength="70" :placeholder="form.title || 'Defaults to the post title'" />
              <div class="be-counter">{{ form.seoTitle.length }}/70</div>
              <label class="be-label">{{ $t('SEO description') }}</label>
              <textarea v-model="form.seoDescription" class="be-input be-textarea be-input--sm" rows="3" maxlength="180" :placeholder="form.excerpt || 'Defaults to the excerpt'" />
              <div class="be-counter">{{ form.seoDescription.length }}/180</div>
            </section>
          </aside>
        </div>

        <!-- ── Sticky action bar ───────────────────────────────────── -->
        <div class="be-actionbar">
          <div class="be-actionbar-left">
            <button v-if="store.canDelete()" type="button" class="btn-ghost be-del" :disabled="saving" @click="onDelete">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              {{ $t('Delete') }}
            </button>
            <span class="be-actionbar-status">
              <span class="be-saved-dot" :class="{ 'be-saved-dot--dirty': isDirty }" />
              {{ isDirty ? 'Unsaved changes' : (lastSaved ? `Saved ${lastSaved}` : 'Saved') }}
            </span>
          </div>

          <div class="be-actionbar-right">
            <!-- Draft state -->
            <template v-if="form.status === 'draft'">
              <button type="button" class="btn-secondary" :disabled="saving" @click="save('draft')">
                {{ saving ? 'Saving…' : 'Save Draft' }}
              </button>
              <button
                v-if="store.canPublish()"
                type="button"
                class="btn-primary be-publish-btn"
                :disabled="saving"
                @click="save('published')"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4Z"/></svg>
                {{ $t('Publish') }}
              </button>
              <span v-else class="be-publish-note">{{ $t('A Head or Supervisor can publish this.') }}</span>
            </template>

            <!-- Published state -->
            <template v-else>
              <button v-if="store.canPublish()" type="button" class="btn-secondary" :disabled="saving" @click="save('draft')">
                {{ $t('Unpublish') }}
              </button>
              <button type="button" class="btn-primary" :disabled="saving || !isDirty" @click="save('published')">
                {{ saving ? 'Saving…' : (isDirty ? 'Update Post' : 'Saved') }}
              </button>
            </template>
          </div>
        </div>

        <p v-if="store.error" class="be-error-line">{{ store.error }}</p>
      </template>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter, RouterLink } from 'vue-router';
import {
  useCmsBlogPostsStore,
  slugify,
  type CmsBlogPost,
  type CmsBlogPostStatus,
} from '@/stores/cmsBlogPosts';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Website } from '@/stores/data';
import CmsLockedScreen from '@/components/cms/CmsLockedScreen.vue';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['cms_blog_posts']);

const CATEGORIES = [
  'Buyer Guides', 'Skid Steer Guides', 'Mini Excavator Guides', 'Wheel Loader Education',
  'Hydraulic Maintenance', 'Operator Training', 'Attachment Tutorials', 'Construction Tips',
  'Equipment Comparisons', 'Troubleshooting', 'Industry News',
];

const route  = useRoute();
const router = useRouter();
const store  = useCmsBlogPostsStore();
const data   = useDataStore();
const auth   = useAuthStore();

const post        = ref<CmsBlogPost | null>(null);
const loading     = ref(false);
const saving      = ref(false);
const uploading   = ref(false);
const insertingImage = ref(false);
const isDragging  = ref(false);
const copied      = ref(false);
const mode        = ref<'write' | 'preview'>('write');
const lastSavedAt = ref<number | null>(null);
const savedSnapshot = ref('');
let dragLeaveTimer: ReturnType<typeof setTimeout> | null = null;

const contentRef       = ref<HTMLTextAreaElement | null>(null);
const inlineImageInput = ref<HTMLInputElement | null>(null);

interface EditForm {
  title: string; slug: string; excerpt: string; category: string; content: string;
  websiteId: string | null;
  featuredImage: string; featuredImageAlt: string; author: string; publishDate: string;
  seoTitle: string; seoDescription: string; status: CmsBlogPostStatus;
}
const blank = (): EditForm => ({
  title: '', slug: '', excerpt: '', category: '', content: '',
  websiteId: null,
  featuredImage: '', featuredImageAlt: '', author: '', publishDate: '',
  seoTitle: '', seoDescription: '', status: 'draft',
});
const form = reactive<EditForm>(blank());

const postId = computed(() => route.params.id as string);

// Allow all authenticated users (admins, heads, members) to assign posts to any team website.
const websites = computed<Website[]>(() => {
  return data.websites
    .filter((w) => w.isFramework)
    .sort((a, b) => (a.name || a.domain).localeCompare(b.name || b.domain));
});
// Resolve the post's current website from the full set so its name/favicon
// always render, even if it isn't in the (filtered) picker options.
const currentWebsite = computed<Website | null>(() =>
  form.websiteId ? data.websites.find((w) => w.id === form.websiteId) ?? null : null
);

const serialize = () => JSON.stringify(form);

const hydrate = (p: CmsBlogPost) => {
  form.title = p.title; form.slug = p.slug; form.excerpt = p.excerpt; form.category = p.category;
  form.websiteId = p.websiteId;
  form.content = p.content; form.featuredImage = p.featuredImage; form.featuredImageAlt = p.featuredImageAlt;
  form.author = p.author; form.publishDate = p.publishDate ?? ''; form.seoTitle = p.seoTitle;
  form.seoDescription = p.seoDescription; form.status = p.status;
  savedSnapshot.value = serialize();
};

const load = async () => {
  loading.value = true;
  try {
    const p = await store.fetchPostById(postId.value);
    post.value = p;
    if (p) hydrate(p);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  if (auth.isQualityChecker) return;
  void load();
  void data.fetchWebsites();
});

// ── Dirty + saved indicator ───────────────────────────────────────────
const isDirty = computed(() => savedSnapshot.value !== serialize());
const lastSaved = computed(() => {
  if (!lastSavedAt.value) return '';
  const ago = Math.floor((Date.now() - lastSavedAt.value) / 1000);
  if (ago < 5) return 'just now';
  if (ago < 60) return `${ago}s ago`;
  if (ago < 3600) return `${Math.floor(ago / 60)}m ago`;
  return new Date(lastSavedAt.value).toLocaleTimeString();
});

// ── Title / slug ──────────────────────────────────────────────────────
const onTitleBlur = () => {
  // Auto-fill slug from the title while the slug is still empty/placeholder.
  if (!form.slug || form.slug === 'untitled' || form.slug === slugify('Untitled post')) {
    form.slug = slugify(form.title);
  }
};
const onSlugBlur = () => { form.slug = form.slug ? slugify(form.slug) : slugify(form.title); };

// ── Word count / reading time ─────────────────────────────────────────
const wordCount = computed(() => {
  const t = form.content.trim();
  return t ? t.split(/\s+/).length : 0;
});
const readingTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 200)));

// ── Checklist ─────────────────────────────────────────────────────────
const checklist = computed(() => [
  { key: 'website', label: 'Assigned to a website', ok: !!form.websiteId },
  { key: 'title',   label: 'Has a title',          ok: !!form.title.trim() && form.title.trim().toLowerCase() !== 'untitled post' },
  { key: 'excerpt', label: 'Has an excerpt',        ok: form.excerpt.trim().length > 0 },
  { key: 'image',   label: 'Has a featured image',  ok: form.featuredImage.trim().length > 0 },
  { key: 'category',label: 'Has a category',        ok: form.category.trim().length > 0 },
  { key: 'content', label: 'Has article content',   ok: form.content.trim().length > 30 },
]);
const readyCount = computed(() => checklist.value.filter((c) => c.ok).length);
const allReady   = computed(() => readyCount.value === checklist.value.length);

// ── Markdown preview (mirrors the public site's renderer for true WYSIWYG) ──
const escapeHtml = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');

const inlineMd = (v: string) =>
  escapeHtml(v)
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');

const renderMarkdown = (md: string): string => {
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let items: string[] = [];
  const flush = () => { if (items.length) { out.push(`<ul>${items.join('')}</ul>`); items = []; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { flush(); continue; }
    const imgOnly = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgOnly) { flush(); out.push(`<img src="${escapeHtml(imgOnly[2])}" alt="${escapeHtml(imgOnly[1])}" loading="lazy" />`); continue; }
    if (line.startsWith('### ')) { flush(); out.push(`<h3>${inlineMd(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## '))  { flush(); out.push(`<h2>${inlineMd(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# '))   { flush(); out.push(`<h2>${inlineMd(line.slice(2))}</h2>`); continue; }
    if (line.startsWith('> '))   { flush(); out.push(`<blockquote>${inlineMd(line.slice(2))}</blockquote>`); continue; }
    if (/^[-*] /.test(line))     { items.push(`<li>${inlineMd(line.slice(2))}</li>`); continue; }
    flush(); out.push(`<p>${inlineMd(line)}</p>`);
  }
  flush();
  return out.join('\n');
};
const renderedContent = computed(() => renderMarkdown(form.content));

// ── Markdown toolbar ──────────────────────────────────────────────────
const wrap = (before: string, after = before) => {
  const el = contentRef.value;
  if (!el) return;
  const start = el.selectionStart, end = el.selectionEnd;
  const sel = form.content.slice(start, end);
  form.content = form.content.slice(0, start) + before + sel + after + form.content.slice(end);
  void nextTick(() => {
    el.focus();
    const pos = start + before.length;
    el.setSelectionRange(pos, pos + sel.length);
  });
};
const linePrefix = (prefix: string) => {
  const el = contentRef.value;
  if (!el) return;
  const start = el.selectionStart;
  const lineStart = form.content.lastIndexOf('\n', start - 1) + 1;
  form.content = form.content.slice(0, lineStart) + prefix + form.content.slice(lineStart);
  void nextTick(() => { el.focus(); const pos = start + prefix.length; el.setSelectionRange(pos, pos); });
};
const insertAtCursor = (text: string) => {
  const el = contentRef.value;
  const start = el ? el.selectionStart : form.content.length;
  form.content = form.content.slice(0, start) + text + form.content.slice(start);
  void nextTick(() => { el?.focus(); const pos = start + text.length; el?.setSelectionRange(pos, pos); });
};

const pickInlineImage = () => { mode.value = 'write'; inlineImageInput.value?.click(); };
const onInlineImageChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  insertingImage.value = true;
  try {
    const url = await store.uploadPostImage(file);
    if (url) insertAtCursor(`\n![${file.name.replace(/\.[^.]+$/, '')}](${url})\n`);
  } finally {
    insertingImage.value = false;
  }
};

// ── Featured image upload ─────────────────────────────────────────────
const uploadFeatured = async (file: File) => {
  if (uploading.value || !file.type.startsWith('image/')) return;
  uploading.value = true;
  try {
    const url = await store.uploadPostImage(file);
    if (url) { form.featuredImage = url; form.featuredImageAlt = form.featuredImageAlt || form.title; }
  } finally {
    uploading.value = false;
  }
};
const onFileChange = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (file) await uploadFeatured(file);
};
const onPaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const it of items) {
    if (it.kind === 'file' && it.type.startsWith('image/')) {
      const file = it.getAsFile();
      if (file) { e.preventDefault(); await uploadFeatured(file); return; }
    }
  }
};
const onDragOver = () => { if (dragLeaveTimer) clearTimeout(dragLeaveTimer); isDragging.value = true; };
const onDragLeave = () => { if (dragLeaveTimer) clearTimeout(dragLeaveTimer); dragLeaveTimer = setTimeout(() => { isDragging.value = false; }, 60); };
const onDrop = async (e: DragEvent) => {
  isDragging.value = false;
  const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith('image/'));
  if (file) await uploadFeatured(file);
};

// ── Copy public link ──────────────────────────────────────────────────
const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(`/blog/${form.slug}`);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 1600);
  } catch { /* ignore */ }
};

// ── Save / publish ────────────────────────────────────────────────────
const save = async (target?: CmsBlogPostStatus) => {
  if (saving.value) return;
  saving.value = true;
  try {
    if (!form.slug) form.slug = slugify(form.title);
    const status = target ?? form.status;
    let publishDate = form.publishDate || null;
    if (status === 'published' && !publishDate) {
      publishDate = new Date().toISOString().slice(0, 10);
      form.publishDate = publishDate;
    }
    const updated = await store.updatePost(postId.value, {
      title: form.title, slug: form.slug, excerpt: form.excerpt, category: form.category,
      websiteId: form.websiteId,
      content: form.content, featuredImage: form.featuredImage, featuredImageAlt: form.featuredImageAlt,
      author: form.author, publishDate, seoTitle: form.seoTitle, seoDescription: form.seoDescription,
      status,
    });
    if (updated) {
      post.value = updated;
      hydrate(updated);
      lastSavedAt.value = Date.now();
    }
  } finally {
    saving.value = false;
  }
};

const onDelete = async () => {
  if (!window.confirm('Delete this post? This cannot be undone.')) return;
  const ok = await store.deletePost(postId.value);
  if (ok) await router.push('/cms/blog');
};
</script>

<style scoped>
.be-page { display: flex; flex-direction: column; gap: 0.85rem; padding-bottom: 5.5rem; }

/* ── Top bar ───────────────────────────────────────────────────────── */
.be-top {
  display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;
}
.be-back {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-size: 0.82rem; font-weight: 600; color: var(--text-muted);
  border: 1px solid var(--border); border-radius: 9px; padding: 0.38rem 0.75rem;
  background: var(--card-bg); transition: color 120ms, border-color 120ms;
}
.be-back:hover { color: var(--text-main); border-color: var(--border-strong); }
.be-top-right { display: inline-flex; align-items: center; gap: 0.7rem; }
.be-saved { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; color: var(--text-soft); }
.be-saved-dot { width: 7px; height: 7px; border-radius: 50%; background: #16a34a; }
.be-saved--dirty { color: #d97706; }
.be-saved-dot--dirty, .be-saved--dirty .be-saved-dot { background: #d97706; }

.be-status-pill {
  display: inline-flex; align-items: center; gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem; font-weight: 800; border-radius: 999px; padding: 0.2rem 0.6rem; border: 1px solid var(--border);
}
.be-status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.be-status-pill--draft { color: var(--text-muted); }
.be-status-pill--published { color: #16a34a; background: color-mix(in srgb, #16a34a 9%, transparent); border-color: color-mix(in srgb, #16a34a 24%, transparent); }

.be-loading { color: var(--text-muted); padding: 2rem; text-align: center; border: 1px solid var(--border); border-radius: 14px; background: var(--card-bg); }

/* ── Grid ──────────────────────────────────────────────────────────── */
.be-grid { display: grid; grid-template-columns: 1fr 21rem; gap: 0.85rem; align-items: start; }
@media (max-width: 980px) { .be-grid { grid-template-columns: 1fr; } }
.be-main { display: flex; flex-direction: column; gap: 0.85rem; min-width: 0; }
.be-side { display: flex; flex-direction: column; gap: 0.85rem; position: sticky; top: 0.5rem; }
@media (max-width: 980px) { .be-side { position: static; } }

.be-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: var(--shadow-sm);
  padding: 1.1rem;
}
.be-side-card { padding: 1rem; display: flex; flex-direction: column; gap: 0.55rem; }

/* ── Title / slug / excerpt ───────────────────────────────────────── */
.be-title-input {
  width: 100%; border: none; outline: none; background: transparent;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.5rem; font-weight: 800; letter-spacing: -0.025em; color: var(--text-main);
  padding: 0.1rem 0;
}
.be-title-input::placeholder { color: var(--text-soft); }
.be-slug { display: flex; align-items: center; gap: 0.1rem; margin-top: 0.4rem; padding-bottom: 0.7rem; border-bottom: 1px solid var(--border); }
.be-slug-prefix { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.82rem; color: var(--text-soft); font-weight: 600; }
.be-slug-input {
  flex: 1; border: none; outline: none; background: transparent;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem; color: var(--text-muted);
}
.be-label {
  display: block; margin-top: 0.35rem;
  font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-soft);
}
.be-input {
  width: 100%; border: 1px solid var(--border); border-radius: 10px;
  background: var(--card-bg); color: var(--text-main);
  padding: 0.5rem 0.7rem; font-size: 0.86rem; font-family: inherit; outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.be-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
.be-input--sm { font-size: 0.82rem; padding: 0.45rem 0.6rem; }
.be-textarea { resize: vertical; min-height: 3.2rem; line-height: 1.5; }
.be-counter { font-size: 0.68rem; color: var(--text-soft); text-align: right; margin-top: -0.15rem; }

/* ── Editor ────────────────────────────────────────────────────────── */
.be-editor { padding: 0; overflow: hidden; }
.be-editor-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.5rem 0.6rem; border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg));
  flex-wrap: wrap;
}
.be-tools { display: inline-flex; align-items: center; gap: 0.15rem; flex-wrap: wrap; }
.be-tools--hidden { opacity: 0.35; pointer-events: none; }
.be-tool {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 1.9rem; height: 1.9rem; padding: 0 0.4rem;
  border: 1px solid transparent; border-radius: 7px;
  background: transparent; color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem; font-weight: 700; cursor: pointer;
  transition: background 120ms, color 120ms, border-color 120ms;
}
.be-tool:hover { background: var(--card-bg); color: var(--primary); border-color: var(--border); }
.be-tool:disabled { opacity: 0.45; cursor: not-allowed; }
.be-tool-sep { width: 1px; height: 1.2rem; background: var(--border); margin: 0 0.25rem; }
.be-hidden-file { display: none; }

.be-segmented { display: inline-flex; padding: 0.15rem; background: var(--soft-bg); border: 1px solid var(--border); border-radius: 9px; }
.be-seg {
  border: none; background: transparent; border-radius: 7px;
  padding: 0.3rem 0.75rem; font-size: 0.76rem; font-weight: 700; color: var(--text-muted);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; cursor: pointer;
  transition: background 130ms, color 130ms, box-shadow 130ms;
}
.be-seg--active { background: var(--card-bg); color: var(--primary); box-shadow: var(--shadow-sm); }

.be-content {
  width: 100%; border: none; outline: none; resize: vertical;
  background: var(--card-bg); color: var(--text-main);
  min-height: 26rem; padding: 1.1rem;
  font-family: 'Jost Numbers', 'Google Sans', monospace;
  font-size: 0.92rem; line-height: 1.7;
}
.be-content::placeholder { color: var(--text-soft); }
.be-preview { min-height: 26rem; padding: 1.1rem; }
.be-preview-empty { color: var(--text-soft); font-style: italic; }
.be-editor-foot {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.5rem 0.9rem; border-top: 1px solid var(--border);
  font-size: 0.73rem; color: var(--text-soft);
  background: color-mix(in srgb, var(--soft-bg) 45%, var(--card-bg));
}
.be-dot-sep { opacity: 0.6; }
.be-foot-hint { margin-left: auto; opacity: 0.8; }

/* ── Rendered markdown (preview) ──────────────────────────────────── */
.cms-prose :deep(h2) { font-size: 1.3rem; font-weight: 800; margin: 1.2rem 0 0.5rem; color: var(--text-main); letter-spacing: -0.01em; }
.cms-prose :deep(h3) { font-size: 1.08rem; font-weight: 700; margin: 1rem 0 0.4rem; color: var(--text-main); }
.cms-prose :deep(p) { margin: 0 0 0.85rem; line-height: 1.7; color: var(--text-main); }
.cms-prose :deep(ul) { margin: 0 0 0.9rem; padding-left: 1.25rem; }
.cms-prose :deep(li) { margin: 0.2rem 0; line-height: 1.6; }
.cms-prose :deep(a) { color: var(--primary); font-weight: 600; text-decoration: underline; }
.cms-prose :deep(strong) { font-weight: 800; }
.cms-prose :deep(blockquote) { margin: 0 0 0.9rem; padding: 0.5rem 0.9rem; border-left: 3px solid var(--primary); background: var(--soft-bg); border-radius: 0 8px 8px 0; color: var(--text-muted); }
.cms-prose :deep(img) { max-width: 100%; border-radius: 10px; margin: 0.5rem 0; border: 1px solid var(--border); }

/* ── Sidebar cards ─────────────────────────────────────────────────── */
.be-side-title { margin: 0 0 0.15rem; font-size: 0.82rem; font-weight: 800; color: var(--text-main); letter-spacing: -0.005em; }

/* Website card — visually emphasized so authors never lose track of the target site */
.be-website-card { border-color: color-mix(in srgb, var(--primary) 26%, var(--border)); background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 6%, var(--card-bg)) 0%, var(--card-bg) 65%); }
.be-website-help { margin: 0; font-size: 0.74rem; color: var(--text-muted); }
.be-website-warn { margin: 0; font-size: 0.72rem; color: #d97706; font-weight: 600; }

/* Website favicon tile picker */
.be-site-tiles { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.35rem; }
.be-site-tile {
  display: inline-flex; flex-direction: column; align-items: center; gap: 0.15rem;
  width: 3.4rem; padding: 0.4rem 0.2rem 0.3rem; border-radius: 9px;
  border: 1.5px solid var(--border); background: var(--card-bg); cursor: pointer;
  transition: border-color 140ms, background 140ms, box-shadow 140ms, transform 140ms;
}
.be-site-tile:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  background: var(--primary-soft); transform: translateY(-1px); box-shadow: var(--shadow-sm);
}
.be-site-tile--active {
  border-color: var(--primary) !important;
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 22%, transparent);
}
.be-site-tile-fav {
  width: 1.5rem; height: 1.5rem; border-radius: 5px; object-fit: cover;
  border: 1px solid var(--border);
}
.be-site-tile-letter {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.5rem; height: 1.5rem; border-radius: 5px; font-size: 0.72rem; font-weight: 800;
  background: var(--primary-soft); color: var(--primary); border: 1px solid color-mix(in srgb, var(--primary) 22%, transparent);
}
.be-site-tile-name {
  font-size: 0.52rem; font-weight: 700; color: var(--text-muted);
  max-width: 3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-align: center;
  line-height: 1.1;
}
.be-site-tile--active .be-site-tile-name { color: var(--primary); }
.be-side-head { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.be-mini-btn {
  font-size: 0.72rem; font-weight: 700; cursor: pointer;
  color: var(--primary); padding: 0.2rem 0.5rem; border-radius: 7px;
  border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
  background: var(--primary-soft); transition: background 120ms;
}
.be-mini-btn:hover { background: var(--primary-soft-strong); }
.be-mini-btn--off { opacity: 0.6; pointer-events: none; }

.be-publish-row { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
.be-publish-label { font-size: 0.78rem; color: var(--text-muted); }
.be-date {
  border: 1px solid var(--border); border-radius: 8px; background: var(--card-bg);
  color: var(--text-main); font-size: 0.78rem; padding: 0.3rem 0.5rem; font-family: inherit; outline: none;
}
.be-date:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
.be-public-link {
  display: flex; align-items: center; gap: 0.4rem; margin-top: 0.2rem;
  padding: 0.4rem 0.5rem; border: 1px solid var(--border); border-radius: 8px; background: var(--soft-bg);
}
.be-public-path { flex: 1; min-width: 0; font-size: 0.74rem; color: var(--text-muted); font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.be-copy { display: inline-flex; align-items: center; justify-content: center; width: 1.6rem; height: 1.6rem; border: none; background: transparent; color: var(--text-muted); cursor: pointer; border-radius: 6px; }
.be-copy:hover { color: var(--primary); background: var(--card-bg); }

/* Checklist */
.be-check-head { display: flex; align-items: center; justify-content: space-between; }
.be-check-score {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.74rem; font-weight: 800;
  color: var(--text-muted); padding: 0.1rem 0.45rem; border-radius: 999px; background: var(--soft-bg);
}
.be-check-score--done { color: #16a34a; background: color-mix(in srgb, #16a34a 12%, transparent); }
.be-check-list { list-style: none; margin: 0.1rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.be-check { display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-muted); }
.be-check-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 1.05rem; height: 1.05rem; border-radius: 50%; flex-shrink: 0;
  border: 1.5px solid var(--border-strong); background: var(--card-bg); color: #f8fbff;
  transition: background 140ms, border-color 140ms;
}
.be-check--ok { color: var(--text-main); }
.be-check--ok .be-check-mark { background: #16a34a; border-color: #16a34a; }

/* Featured image */
.be-drop { outline: 2px dashed color-mix(in srgb, var(--primary) 55%, transparent); outline-offset: -4px; background: color-mix(in srgb, var(--primary) 5%, var(--card-bg)); }
.be-img-wrap { position: relative; border-radius: 10px; overflow: hidden; border: 1px solid var(--border); }
.be-img-wrap img { width: 100%; height: 9rem; object-fit: cover; display: block; }
.be-img-x {
  position: absolute; top: 0.4rem; right: 0.4rem; width: 1.7rem; height: 1.7rem; border-radius: 50%;
  border: 1px solid rgba(248,251,255,0.4); background: rgba(0,0,0,0.55); color: #f8fbff; font-size: 1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: background 120ms;
}
.be-img-x:hover { background: rgba(220,38,38,0.85); }
.be-img-drop {
  display: flex; flex-direction: column; align-items: center; gap: 0.4rem;
  padding: 1.4rem 1rem; text-align: center; color: var(--text-soft);
  border: 1px dashed var(--border-strong); border-radius: 10px; font-size: 0.78rem;
}

/* SEO preview */
.be-seo-preview {
  display: flex; flex-direction: column; gap: 0.15rem;
  padding: 0.6rem 0.7rem; border: 1px solid var(--border); border-radius: 10px; background: var(--soft-bg); margin-bottom: 0.2rem;
}
.be-seo-url { font-size: 0.68rem; color: #16a34a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.be-seo-title { font-size: 0.92rem; color: #1a0dab; font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:root[data-theme='dark-gray'] .be-seo-title { color: #8ab4f8; }
.be-seo-desc { font-size: 0.74rem; color: var(--text-muted); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

/* ── Sticky action bar ─────────────────────────────────────────────── */
.be-actionbar {
  position: sticky; bottom: 0;
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; flex-wrap: wrap;
  padding: 0.7rem 0.95rem; border-radius: 14px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--card-bg) 88%, transparent);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: var(--shadow-lg);
}
.be-actionbar-left { display: inline-flex; align-items: center; gap: 0.8rem; }
.be-del { color: var(--text-muted); padding-left: 0.6rem; padding-right: 0.6rem; }
.be-del:hover { color: #e5484d; }
.be-actionbar-status { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.76rem; color: var(--text-soft); }
.be-actionbar-right { display: inline-flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.be-publish-btn { box-shadow: 0 1px 2px rgba(16,24,40,0.1), 0 4px 12px -2px var(--primary-ring); }
.be-publish-note { font-size: 0.74rem; color: var(--text-soft); max-width: 12rem; line-height: 1.3; }

.be-error-line { font-size: 0.82rem; color: #e5484d; font-weight: 600; }

@media (max-width: 560px) {
  .be-actionbar-status { display: none; }
  .be-actionbar { gap: 0.5rem; }
  .be-actionbar-right { width: 100%; }
  .be-actionbar-right .btn-primary, .be-actionbar-right .btn-secondary { flex: 1; }
}
</style>
