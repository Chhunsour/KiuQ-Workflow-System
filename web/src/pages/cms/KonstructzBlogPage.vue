<template>
  <div class="blog-dashboard-container">
    <!-- Header -->
    <header class="blog-header">
      <div class="flex items-center gap-3">
        <span class="header-icon-tile">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        </span>
        <div>
          <span class="eyebrow block">CMS HEADLESS STUDIO</span>
          <h1 class="page-title mt-0.5">Konstructz Blog</h1>
        </div>
      </div>
      <button type="button" class="btn-primary" :disabled="creatingPost || !siteId" @click="createNewPost">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Create Post
      </button>
    </header>

    <div v-if="loadingSite" class="loading-state">
      <div class="spinner"></div>
      <p>Loading Konstructz website connection…</p>
    </div>

    <div v-else-if="!siteId" class="error-banner">
      <h3>Connection Not Found</h3>
      <p>Could not locate the connected website record for <code>konstructz.com</code>. Please ensure it is configured in Connected Websites.</p>
    </div>

    <!-- Main Workspace -->
    <div v-else class="blog-main-grid">
      <!-- Left Column: Posts List -->
      <section class="blog-list-panel card">
        <div class="panel-header">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search posts…"
            class="search-input"
          />
          
          <!-- Filters & Status Tabs -->
          <div class="status-tabs mt-3">
            <button
              v-for="tab in statusTabs"
              :key="tab"
              type="button"
              class="status-tab"
              :class="{ 'status-tab--active': activeTab === tab }"
              @click="activeTab = tab"
            >
              {{ tab }}
              <span class="tab-badge">{{ getTabCount(tab) }}</span>
            </button>
          </div>
        </div>

        <div class="panel-scroll">
          <div v-if="filteredPosts.length === 0" class="empty-list">
            No posts found.
          </div>
          
          <div
            v-for="post in filteredPosts"
            :key="post.id"
            class="post-list-item"
            :class="{ 'post-list-item--active': activePost?.id === post.id }"
            @click="selectPost(post)"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div v-if="post.featured_image_url" class="post-thumb">
                <img :src="post.featured_image_url" alt="" />
              </div>
              <div v-else class="post-thumb-placeholder">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="post-title-link truncate">{{ post.title || 'Untitled' }}</h4>
                <div class="flex items-center gap-2 mt-1">
                  <span class="badge badge-category">{{ post.category || 'Uncategorized' }}</span>
                  <span class="post-date text-[10px] text-text-muted">
                    {{ formatRelative(post.updated_at) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-2 mt-2 pt-2 border-t border-border/30">
              <span class="status-dot-badge" :class="`status--${post.status.toLowerCase()}`">
                <span class="dot" />
                {{ post.status }}
              </span>
              <span v-if="post.pushed_to_website" class="synced-badge">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Synced
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Right Column: Editor Workspace -->
      <section class="blog-editor-panel card">
        <div v-if="!activePost" class="no-active-post">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-text-muted"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          <h3>No Post Selected</h3>
          <p>Select an existing post from the list or create a new one to start editing.</p>
        </div>

        <div v-else class="editor-workspace">
          <!-- Editor Sticky Sub-Header -->
          <div class="editor-workspace-header">
            <div class="min-w-0 flex-1">
              <span class="text-xs uppercase font-bold text-primary tracking-wider">Editor Mode</span>
              <h2 class="editor-current-title truncate">{{ activePost.title || 'Untitled' }}</h2>
            </div>
            <div class="flex items-center gap-2">
              <button type="button" class="btn-secondary" @click="showPreview = true">
                Preview
              </button>
              <button type="button" class="btn-primary" :disabled="publishing" @click="publishPost(activePost)">
                {{ publishing ? 'Publishing…' : 'Publish to Konstructz' }}
              </button>
              <button type="button" class="btn-danger-icon" title="Delete Post" @click="confirmDelete(activePost)">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </div>

          <!-- Editor Body Scroll -->
          <div class="editor-workspace-scroll">
            <!-- Sync / Error Notices -->
            <div v-if="activePost.publish_error" class="publish-error-box">
              <div class="flex items-start gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-red-500 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <div class="flex-1">
                  <strong>Publish Failure:</strong>
                  <p class="mt-0.5">{{ activePost.publish_error }}</p>
                </div>
              </div>
            </div>

            <!-- Basic Fields Grid -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Title -->
              <div class="form-group">
                <label class="form-label">Post Title *</label>
                <input
                  v-model="activePost.title"
                  type="text"
                  class="form-control"
                  placeholder="Enter blog post title…"
                  @input="onTitleInput"
                />
              </div>

              <!-- Slug -->
              <div class="form-group">
                <label class="form-label">Slug (URL Path) *</label>
                <input
                  v-model="activePost.slug"
                  type="text"
                  class="form-control"
                  placeholder="e.g. equipment-buying-guide"
                />
              </div>

              <!-- Category -->
              <div class="form-group">
                <div class="flex items-center justify-between">
                  <label class="form-label">Category</label>
                  <button type="button" class="text-xs text-primary font-bold hover:underline" @click="addCustomCategory">
                    + Add Custom
                  </button>
                </div>
                <select v-model="activePost.category" class="form-control">
                  <option value="">Uncategorized</option>
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>

              <!-- Status -->
              <div class="form-group">
                <label class="form-label">Status</label>
                <select v-model="activePost.status" class="form-control">
                  <option value="Draft">Draft</option>
                  <option value="Ready">Ready</option>
                  <option value="Published">Published</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
            </div>

            <!-- Featured Image -->
            <div class="form-group mt-4">
              <label class="form-label">Featured Image</label>
              <div class="flex gap-2">
                <input
                  v-model="activePost.featured_image_url"
                  type="text"
                  class="form-control flex-1"
                  placeholder="Paste image URL here…"
                />
                <label class="btn-secondary cursor-pointer flex items-center justify-center px-4">
                  <input
                    type="file"
                    class="hidden"
                    accept="image/*"
                    @change="handleImageUpload"
                    :disabled="uploadingImage"
                  />
                  {{ uploadingImage ? 'Uploading…' : 'Upload File' }}
                </label>
              </div>
              <div v-if="activePost.featured_image_url" class="featured-image-preview mt-2">
                <img :src="activePost.featured_image_url" alt="Featured Image Preview" />
                <button type="button" class="btn-remove-img" @click="activePost.featured_image_url = ''">Remove Image</button>
              </div>
            </div>

            <!-- Excerpt -->
            <div class="form-group mt-4">
              <label class="form-label">Excerpt / Summary</label>
              <textarea
                v-model="activePost.excerpt"
                rows="3"
                class="form-control font-sans"
                placeholder="Brief excerpt shown on list pages…"
              ></textarea>
            </div>

            <!-- Full Content (Tiptap Rich-Text Editor) -->
            <div class="form-group mt-4">
              <label class="form-label">Full Article Content</label>
              <div class="folder-desc-editor">
                <!-- Toolbar -->
                <div class="fde-toolbar">
                  <div class="fde-btn-group">
                    <button
                      type="button"
                      class="fde-btn"
                      :class="{ 'fde-btn--active': editor?.isActive('heading', { level: 1 }) }"
                      @click="editor?.chain().focus().toggleHeading({ level: 1 }).run()"
                    >
                      H1
                    </button>
                    <button
                      type="button"
                      class="fde-btn"
                      :class="{ 'fde-btn--active': editor?.isActive('heading', { level: 2 }) }"
                      @click="editor?.chain().focus().toggleHeading({ level: 2 }).run()"
                    >
                      H2
                    </button>
                    <button
                      type="button"
                      class="fde-btn"
                      :class="{ 'fde-btn--active': editor?.isActive('heading', { level: 3 }) }"
                      @click="editor?.chain().focus().toggleHeading({ level: 3 }).run()"
                    >
                      H3
                    </button>
                  </div>

                  <span class="fde-divider" />

                  <div class="fde-btn-group">
                    <button
                      type="button"
                      class="fde-btn fde-btn--fmt"
                      :class="{ 'fde-btn--active': editor?.isActive('bold') }"
                      @click="editor?.chain().focus().toggleBold().run()"
                    >
                      <strong>B</strong>
                    </button>
                    <button
                      type="button"
                      class="fde-btn fde-btn--fmt"
                      :class="{ 'fde-btn--active': editor?.isActive('italic') }"
                      @click="editor?.chain().focus().toggleItalic().run()"
                    >
                      <em>I</em>
                    </button>
                    <button
                      type="button"
                      class="fde-btn fde-btn--fmt"
                      :class="{ 'fde-btn--active': editor?.isActive('underline') }"
                      @click="editor?.chain().focus().toggleUnderline().run()"
                    >
                      <u>U</u>
                    </button>
                  </div>

                  <span class="fde-divider" />

                  <div class="fde-btn-group">
                    <button
                      type="button"
                      class="fde-btn"
                      :class="{ 'fde-btn--active': editor?.isActive('bulletList') }"
                      @click="editor?.chain().focus().toggleBulletList().run()"
                    >
                      • List
                    </button>
                    <button
                      type="button"
                      class="fde-btn"
                      :class="{ 'fde-btn--active': editor?.isActive('orderedList') }"
                      @click="editor?.chain().focus().toggleOrderedList().run()"
                    >
                      1. List
                    </button>
                  </div>

                  <span class="fde-divider" />

                  <div class="fde-btn-group">
                    <button
                      type="button"
                      class="fde-btn"
                      :class="{ 'fde-btn--active': editor?.isActive('link') }"
                      @click="setLink"
                    >
                      Link
                    </button>
                    <button
                      type="button"
                      class="fde-btn"
                      @click="insertImage"
                    >
                      Image
                    </button>
                    <button
                      type="button"
                      class="fde-btn"
                      @click="editor?.chain().focus().clearNodes().unsetAllMarks().run()"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <!-- Content Area -->
                <EditorContent :editor="editor" class="fde-content" />
              </div>
            </div>

            <!-- Tags -->
            <div class="form-group mt-4">
              <label class="form-label">Tags (comma separated)</label>
              <input
                v-model="tagsInput"
                type="text"
                class="form-control"
                placeholder="e.g. excavator, tips, diy"
                @change="onTagsInputChange"
              />
            </div>

            <!-- SEO Block -->
            <div class="seo-card card card-pad mt-5">
              <h3 class="seo-card-title">SEO Settings</h3>
              
              <div class="form-group mt-3">
                <label class="form-label">SEO Page Title</label>
                <input
                  v-model="activePost.seo_title"
                  type="text"
                  class="form-control"
                  placeholder="Custom <title> tag (defaults to Post Title if empty)"
                />
              </div>

              <div class="form-group mt-3">
                <label class="form-label">SEO Meta Description</label>
                <textarea
                  v-model="activePost.seo_description"
                  rows="2"
                  class="form-control font-sans"
                  placeholder="Meta description summary shown in Google search results"
                ></textarea>
              </div>
            </div>
            
            <div class="mt-6 text-xs text-text-muted italic">
              * Target website is locked to <strong>konstructz.com</strong>.
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Preview Modal -->
    <Transition name="fade">
      <div v-if="showPreview && activePost" class="preview-overlay" @click.self="showPreview = false">
        <div class="preview-card card">
          <header class="preview-header">
            <h3>Konstructz Blog Preview</h3>
            <button type="button" class="btn-close-preview" @click="showPreview = false">✕</button>
          </header>
          
          <div class="preview-body scrollable">
            <div class="preview-article">
              <div class="preview-meta">
                <span class="preview-cat">{{ activePost.category || 'Uncategorized' }}</span>
                <span class="preview-date">June 30, 2026</span>
              </div>
              <h1 class="preview-title">{{ activePost.title || 'Untitled Post' }}</h1>
              
              <div v-if="activePost.featured_image_url" class="preview-hero">
                <img :src="activePost.featured_image_url" alt="" />
              </div>

              <div v-if="activePost.excerpt" class="preview-excerpt">
                {{ activePost.excerpt }}
              </div>

              <div class="preview-content font-serif mt-6" v-html="activePost.content || '<p><i>No content written yet.</i></p>'"></div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';

interface BlogPost {
  id: string;
  target_website_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featured_image_url: string;
  category: string;
  tags: string[];
  seo_title: string;
  seo_description: string;
  status: 'Draft' | 'Ready' | 'Published' | 'Failed';
  remote_post_id?: string;
  pushed_to_website: boolean;
  publish_error?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

const auth = useAuthStore();

// UI States
const siteId = ref<string | null>(null);
const loadingSite = ref(true);
const loadingPosts = ref(false);
const creatingPost = ref(false);
const uploadingImage = ref(false);
const publishing = ref(false);
const showPreview = ref(false);

const posts = ref<BlogPost[]>([]);
const activePost = ref<BlogPost | null>(null);
const searchQuery = ref('');
const activeTab = ref<'All' | 'Draft' | 'Ready' | 'Published' | 'Failed'>('All');

const statusTabs: Array<'All' | 'Draft' | 'Ready' | 'Published' | 'Failed'> = [
  'All', 'Draft', 'Ready', 'Published', 'Failed'
];

const categories = ref<string[]>([
  'Equipment Guides',
  'Construction Tips',
  'Product Knowledge',
  'Maintenance',
  'Buying Guide',
  'Company Updates'
]);

const tagsInput = ref('');

// ── Tiptap Editor ──
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
    Underline,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { rel: 'noopener noreferrer nofollow', class: 'editor-link' }
    }),
    Image.configure({
      HTMLAttributes: { class: 'editor-image' }
    }),
    Placeholder.configure({
      placeholder: 'Write your blog post content here… Use the formatting toolbar to add headings, bold, underline, lists, links, or inline images.'
    })
  ],
  editorProps: {
    attributes: { class: 'editor-prosemirror' }
  },
  onUpdate({ editor: e }) {
    if (activePost.value) {
      activePost.value.content = e.getHTML();
      debouncedSave();
    }
  }
});

// Watch activePost to load content into Tiptap
watch(activePost, (newPost, oldPost) => {
  if (oldPost && oldPost.id === newPost?.id) return;
  if (!editor.value) return;

  if (newPost) {
    editor.value.commands.setContent(newPost.content || '', { emitUpdate: false });
    tagsInput.value = (newPost.tags || []).join(', ');
  } else {
    editor.value.commands.setContent('', { emitUpdate: false });
    tagsInput.value = '';
  }
});

// Auto-save logic
let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const debouncedSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(saveActivePost, 1200);
};

onMounted(async () => {
  await fetchSiteId();
  if (siteId.value) {
    await fetchPosts();
  }
});

onBeforeUnmount(() => {
  if (saveTimeout) clearTimeout(saveTimeout);
  if (editor.value) editor.value.destroy();
});

// ── Load website connection ──
const fetchSiteId = async () => {
  loadingSite.value = true;
  try {
    const { data, error } = await supabase
      .from('connected_websites')
      .select('id')
      .eq('domain', 'konstructz.com')
      .maybeSingle();

    if (error) throw error;
    if (data) {
      siteId.value = data.id;
    } else {
      // Fallback
      siteId.value = '4c83ba48-ad05-4528-857d-39f220e1f45f';
    }
  } catch (err) {
    console.error('Error fetching site connection:', err);
  } finally {
    loadingSite.value = false;
  }
};

// ── Fetch Posts ──
const fetchPosts = async () => {
  if (!siteId.value) return;
  loadingPosts.value = true;
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('target_website_id', siteId.value)
      .order('created_at', { ascending: false });

    if (error) throw error;
    posts.value = (data || []) as BlogPost[];

    // Auto-select first post if available
    if (posts.value.length > 0 && !activePost.value) {
      selectPost(posts.value[0]);
    }
  } catch (err) {
    console.error('Error loading blog posts:', err);
  } finally {
    loadingPosts.value = false;
  }
};

// ── Selection helper ──
const selectPost = async (post: BlogPost) => {
  // If there's an active post, save it first immediately
  if (activePost.value) {
    await saveActivePost();
  }
  activePost.value = { ...post };
};

// ── Create Post ──
const createNewPost = async () => {
  if (creatingPost.value || !siteId.value) return;
  creatingPost.value = true;
  try {
    const defaultPost = {
      target_website_id: siteId.value,
      title: 'Untitled Post',
      slug: 'untitled-post',
      excerpt: '',
      content: '',
      featured_image_url: '',
      category: 'Equipment Guides',
      tags: [],
      seo_title: '',
      seo_description: '',
      status: 'Draft' as const,
      pushed_to_website: false,
      created_by: auth.user?.id || null
    };

    const { data, error } = await supabase
      .from('blog_posts')
      .insert(defaultPost)
      .select()
      .single();

    if (error) throw error;
    const newPost = data as BlogPost;
    posts.value = [newPost, ...posts.value];
    selectPost(newPost);
  } catch (err) {
    console.error('Failed to create new post:', err);
    alert('Error creating new post.');
  } finally {
    creatingPost.value = false;
  }
};

// ── Save Post ──
const saveActivePost = async () => {
  if (!activePost.value) return;
  const post = { ...activePost.value, updated_at: new Date().toISOString() };
  
  try {
    const { error } = await supabase
      .from('blog_posts')
      .update({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featured_image_url: post.featured_image_url,
        category: post.category,
        tags: post.tags,
        seo_title: post.seo_title,
        seo_description: post.seo_description,
        status: post.status,
        updated_at: post.updated_at
      })
      .eq('id', post.id);

    if (error) throw error;
    
    // Update local lists
    const idx = posts.value.findIndex((p) => p.id === post.id);
    if (idx !== -1) {
      posts.value[idx] = post;
    }
  } catch (err) {
    console.error('Auto-save failed:', err);
  }
};

// Auto-generate slug on title input if status is Draft/Ready
const onTitleInput = () => {
  if (!activePost.value) return;
  if (activePost.value.status === 'Draft' || activePost.value.status === 'Ready') {
    activePost.value.slug = activePost.value.title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  debouncedSave();
};

const onTagsInputChange = () => {
  if (!activePost.value) return;
  activePost.value.tags = tagsInput.value
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  debouncedSave();
};

// ── Custom Category ──
const addCustomCategory = () => {
  const custom = prompt('Enter custom category name:');
  if (custom && custom.trim()) {
    const clean = custom.trim();
    if (!categories.value.includes(clean)) {
      categories.value.push(clean);
    }
    if (activePost.value) {
      activePost.value.category = clean;
      debouncedSave();
    }
  }
};

// ── Delete Post ──
const confirmDelete = async (post: BlogPost) => {
  if (!confirm(`Are you sure you want to delete "${post.title || 'Untitled'}"?`)) return;
  try {
    const { error } = await supabase.from('blog_posts').delete().eq('id', post.id);
    if (error) throw error;

    posts.value = posts.value.filter((p) => p.id !== post.id);
    if (activePost.value?.id === post.id) {
      activePost.value = posts.value.length > 0 ? { ...posts.value[0] } : null;
    }
  } catch (err) {
    console.error('Failed to delete post:', err);
    alert('Error deleting post.');
  }
};

// ── Featured Image File Upload ──
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file || !activePost.value) return;

  uploadingImage.value = true;
  try {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const random = Math.random().toString(36).slice(2, 9);
    const path = `${auth.user?.id || 'public'}/${Date.now()}-${random}.${ext}`;

    const { error: uploadErr } = await supabase.storage
      .from('blog-images')
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type
      });

    if (uploadErr) throw uploadErr;

    const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(path);
    activePost.value.featured_image_url = urlData.publicUrl;
    await saveActivePost();
  } catch (err) {
    console.error('Failed to upload image:', err);
    alert('Failed to upload image. Please try again.');
  } finally {
    uploadingImage.value = false;
  }
};

// ── Publish Flow ──
const publishPost = async (post: BlogPost) => {
  if (publishing.value) return;
  
  // Validation
  if (!post.title.trim()) {
    alert('Post Title is required.');
    return;
  }
  if (!post.slug.trim()) {
    alert('Post Slug is required.');
    return;
  }

  publishing.value = true;
  post.status = 'Published';
  post.publish_error = undefined;
  post.pushed_to_website = false;
  post.published_at = new Date().toISOString();
  
  activePost.value = { ...post };
  await saveActivePost();

  try {
    const { data, error } = await supabase.functions.invoke('blog-sync', {
      body: {
        websiteIds: [siteId.value],
        postIds: [post.id]
      }
    });

    if (error) throw error;
    
    // Check results inside data response
    const results = data?.results || [];
    const konstructzResult = results.find((r: any) => r.website === 'Konstructz Store') || results[0];

    if (data?.ok && konstructzResult?.ok !== false) {
      post.pushed_to_website = true;
      post.publish_error = undefined;
      post.status = 'Published';
      alert('Successfully published to Konstructz.com!');
    } else {
      const errMsg = konstructzResult?.error || 'Target framework receiver endpoint error.';
      post.pushed_to_website = false;
      post.publish_error = errMsg;
      post.status = 'Failed';
      alert(`Publish Failed: ${errMsg}`);
    }
  } catch (err: any) {
    console.error('Publish invocation error:', err);
    post.pushed_to_website = false;
    post.publish_error = err.message || String(err);
    post.status = 'Failed';
    alert(`Publish invocation error: ${err.message || String(err)}`);
  } finally {
    activePost.value = { ...post };
    await saveActivePost();
    publishing.value = false;
  }
};

// ── Tiptap toolbar helpers ──
const setLink = () => {
  if (!editor.value) return;
  const previousUrl = editor.value.getAttributes('link').href;
  const url = window.prompt('URL:', previousUrl);
  if (url === null) return;
  if (url === '') {
    editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
  } else {
    editor.value.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }
};

const insertImage = () => {
  if (!editor.value) return;
  const url = window.prompt('Enter Image URL:');
  if (url) {
    editor.value.chain().focus().setImage({ src: url }).run();
  }
};

// ── List Filters ──
const getTabCount = (tab: typeof activeTab.value) => {
  if (tab === 'All') return posts.value.length;
  return posts.value.filter((p) => p.status === tab).length;
};

const filteredPosts = computed(() => {
  let list = posts.value;
  
  // Tab filter
  if (activeTab.value !== 'All') {
    list = list.filter((p) => p.status === activeTab.value);
  }
  
  // Search query filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter((p) => 
      (p.title || '').toLowerCase().includes(q) ||
      (p.excerpt || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q)
    );
  }
  
  return list;
});

// Helper for relative timestamps
const formatRelative = (iso: string): string => {
  if (!iso) return '';
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'Just now';
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
};

// Watch internal changes to auto-save other fields
watch([
  () => activePost.value?.title,
  () => activePost.value?.slug,
  () => activePost.value?.excerpt,
  () => activePost.value?.featured_image_url,
  () => activePost.value?.category,
  () => activePost.value?.status,
  () => activePost.value?.seo_title,
  () => activePost.value?.seo_description
], () => {
  debouncedSave();
});
</script>

<style scoped>
/* Container Layout */
.blog-dashboard-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 1.25rem;
  overflow: hidden;
  background: var(--bg);
  box-sizing: border-box;
  font-family: 'Raleway', var(--font-sans), sans-serif;
}

/* Header */
.blog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-shrink: 0;
}
.header-icon-tile {
  background: rgba(124, 92, 252, 0.12);
  color: #7c5cfc;
  padding: 0.6rem;
  border-radius: 10px;
  display: flex;
}
.page-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: -0.02em;
}

/* Loading & Error States */
.loading-state, .error-banner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--text-muted);
}
.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s infinite linear;
  margin-bottom: 1rem;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Dashboard Workspace Grid */
.blog-main-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 1.25rem;
  overflow: hidden;
  min-height: 0;
}

/* Left Column: Posts List */
.blog-list-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card-bg, #1e293b);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.panel-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.search-input {
  width: 100%;
  background: var(--input-bg, #0f172a);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  color: var(--text-main);
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus {
  border-color: var(--primary);
}
.status-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
.status-tab {
  background: none;
  border: none;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.status-tab:hover {
  background: var(--soft-bg, #334155);
  color: var(--text-main);
}
.status-tab--active {
  background: var(--primary-soft, rgba(59, 130, 246, 0.15)) !important;
  color: var(--primary, #3b82f6) !important;
}
.tab-badge {
  background: var(--border);
  font-size: 0.6rem;
  padding: 0.05rem 0.3rem;
  border-radius: 99px;
  color: var(--text-soft);
}

.panel-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.empty-list {
  padding: 2rem;
  text-align: center;
  color: var(--text-muted);
  font-style: italic;
  font-size: 0.85rem;
}
.post-list-item {
  padding: 0.75rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(255, 255, 255, 0.02);
}
.post-list-item:hover {
  background: var(--soft-bg, #334155);
}
.post-list-item--active {
  background: var(--soft-bg, #334155) !important;
  border-color: var(--primary) !important;
}
.post-thumb {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.post-thumb img {
  width: 100%;
  height: 100%;
  object-cover: cover;
}
.post-thumb-placeholder {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  background: var(--soft-bg, #334155);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.post-title-link {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}
.badge-category {
  background: rgba(59, 130, 246, 0.08);
  color: var(--primary);
  font-size: 0.65rem;
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
}
.synced-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.65rem;
  font-weight: 800;
  color: #10b981;
  background: rgba(16, 185, 129, 0.08);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  margin-left: auto;
}
.status-dot-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 700;
}
.status-dot-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.status--draft { color: var(--text-muted); }
.status--draft .dot { background: #64748b; }
.status--ready { color: #d97706; }
.status--ready .dot { background: #d97706; }
.status--published { color: #10b981; }
.status--published .dot { background: #10b981; }
.status--failed { color: #ef4444; }
.status--failed .dot { background: #ef4444; }

/* Right Column: Editor Workspace */
.blog-editor-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card-bg, #1e293b);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.no-active-post {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: var(--text-muted);
}
.no-active-post h3 {
  font-size: 1.1rem;
  color: var(--text-main);
  margin: 1rem 0 0.25rem;
}
.no-active-post p {
  max-width: 320px;
  font-size: 0.85rem;
}

.editor-workspace {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.editor-workspace-header {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex-shrink: 0;
}
.editor-current-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0.15rem 0 0;
}
.editor-workspace-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem;
}

.publish-error-box {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
  font-size: 0.82rem;
  color: #f87171;
}

/* Forms styling */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.form-label {
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.03em;
}
.form-control {
  background: var(--input-bg, #0f172a);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 0.55rem 0.75rem;
  border-radius: 8px;
  font-size: 0.85rem;
  outline: none;
  transition: border-color 0.15s;
}
.form-control:focus {
  border-color: var(--primary);
}
.featured-image-preview {
  position: relative;
  max-width: 280px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.featured-image-preview img {
  width: 100%;
  height: auto;
  display: block;
}
.btn-remove-img {
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(15, 23, 42, 0.8);
  border: none;
  color: #ef4444;
  padding: 0.25rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 700;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
}
.btn-remove-img:hover {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

/* FolderDescriptionEditor (Tiptap styling overlay) */
.folder-desc-editor {
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--input-bg, #0f172a);
}
.fde-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 6px;
  background: var(--soft-bg, #334155);
  border-bottom: 1px solid var(--border);
}
.fde-btn-group {
  display: flex;
  align-items: center;
  gap: 2px;
}
.fde-btn {
  background: none;
  border: none;
  color: var(--text-soft);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  min-width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.fde-btn:hover {
  background: var(--border);
  color: var(--text-main);
}
.fde-btn--active {
  background: var(--primary) !important;
  color: #fff !important;
}
.fde-divider {
  width: 1px;
  height: 16px;
  background: var(--border);
  margin: 0 4px;
}
.fde-content {
  padding: 0.75rem;
  min-height: 250px;
  max-height: 500px;
  overflow-y: auto;
}

/* SEO Card */
.seo-card {
  border: 1px dashed var(--border);
  background: rgba(255, 255, 255, 0.01);
}
.seo-card-title {
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  color: var(--text-soft);
  letter-spacing: 0.03em;
  margin: 0;
}

/* Custom Preview overlay */
.preview-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.8);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}
.preview-card {
  width: 100%;
  max-width: 800px;
  height: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--card-bg, #1e293b);
  border: 1px solid var(--border);
  border-radius: 12px;
}
.preview-header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}
.preview-header h3 {
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}
.btn-close-preview {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 1.15rem;
  cursor: pointer;
  padding: 0.2rem;
}
.btn-close-preview:hover {
  color: #ef4444;
}
.preview-body {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  background: var(--bg);
}
.preview-article {
  max-width: 650px;
  margin: 0 auto;
}
.preview-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  margin-bottom: 0.75rem;
}
.preview-cat {
  color: var(--primary);
  text-transform: uppercase;
}
.preview-date {
  color: var(--text-muted);
}
.preview-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.25;
  margin-top: 0;
  margin-bottom: 1.25rem;
  font-family: var(--font-sans);
}
.preview-hero {
  margin: 1.5rem 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
}
.preview-hero img {
  width: 100%;
  height: auto;
  display: block;
}
.preview-excerpt {
  font-size: 1.05rem;
  line-height: 1.5;
  color: var(--text-soft);
  font-style: italic;
  border-left: 3px solid var(--primary);
  padding-left: 1rem;
  margin: 1.5rem 0;
}
.preview-content {
  font-size: 1rem;
  line-height: 1.7;
  color: var(--text-soft);
}
.preview-content :deep(p) {
  margin-bottom: 1.25rem;
}
.preview-content :deep(h1),
.preview-content :deep(h2),
.preview-content :deep(h3) {
  color: var(--text-main);
  font-weight: 800;
  margin-top: 1.75rem;
  margin-bottom: 0.75rem;
}
.preview-content :deep(ul),
.preview-content :deep(ol) {
  margin-bottom: 1.25rem;
  padding-left: 1.5rem;
}
.preview-content :deep(ul) {
  list-style-type: disc;
}
.preview-content :deep(ol) {
  list-style-type: decimal;
}
.preview-content :deep(a) {
  color: var(--primary);
  text-decoration: underline;
}

/* ProseMirror editor styles overrides */
:deep(.editor-prosemirror) {
  outline: none;
  min-height: 250px;
  color: var(--text-soft);
  font-size: 0.9rem;
  line-height: 1.6;
}
:deep(.editor-prosemirror p) {
  margin-bottom: 0.75rem;
}
:deep(.editor-prosemirror h1) {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--text-main);
  margin-top: 1.2rem;
  margin-bottom: 0.5rem;
}
:deep(.editor-prosemirror h2) {
  font-size: 1.2rem;
  font-weight: 800;
  color: var(--text-main);
  margin-top: 1.1rem;
  margin-bottom: 0.4rem;
}
:deep(.editor-prosemirror h3) {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
  margin-top: 1rem;
  margin-bottom: 0.3rem;
}
:deep(.editor-prosemirror ul) {
  list-style-type: disc;
  padding-left: 1.2rem;
  margin-bottom: 0.75rem;
}
:deep(.editor-prosemirror ol) {
  list-style-type: decimal;
  padding-left: 1.2rem;
  margin-bottom: 0.75rem;
}
:deep(.editor-prosemirror a) {
  color: var(--primary);
  text-decoration: underline;
}
:deep(.editor-prosemirror.placeholder::before) {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-muted);
  pointer-events: none;
  height: 0;
  font-style: italic;
}
</style>
