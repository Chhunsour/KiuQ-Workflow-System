<template>
  <div class="img">
    <!-- ════════ HEADER ════════ -->
    <header class="img-head">
      <div class="img-head-titles">
        <h1 class="img-h1">
          <span class="img-h1-mark" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </span>
          Team Media Library
        </h1>
        <p class="img-h1-sub">A shared workspace for storing, organizing, and accessing team images.</p>
      </div>

      <div class="img-stats">
        <span class="img-stat">
          <span class="img-stat-num">{{ library.length }}</span>
          <span class="img-stat-lbl">Library</span>
        </span>
        <span class="img-stat">
          <span class="img-stat-num">{{ customFolders.length }}</span>
          <span class="img-stat-lbl">Folders</span>
        </span>
      </div>
    </header>

    <!-- ════════ UPLOADER ════════ -->
    <section class="img-section">
      <div class="img-section-head">
        <h2 class="img-section-title">Upload Images</h2>
        <p class="img-section-sub">
          Drop, paste (⌘V), or click to upload. Files are automatically optimized to WebP and added to your team library.
        </p>
      </div>

      <div
        class="img-drop"
        :class="{ 'img-drop--active': isDragging, 'img-drop--busy': converting }"
        tabindex="0"
        @paste="onPaste"
        @dragover.prevent="onDragOver"
        @dragleave="onDragLeave"
        @drop.prevent="onDrop"
        @click="openFilePicker"
      >
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          multiple
          class="img-drop-input"
          @change="onPick"
        />
        <span class="img-drop-icon" aria-hidden="true">
          <svg v-if="converting" class="img-spin" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        <div class="img-drop-text">
          <span class="img-drop-title">
            {{ converting ? 'Optimizing & Uploading…' : 'Drop, paste, or click to upload team images' }}
          </span>
          <span class="img-drop-sub">PNG · JPG · GIF · WebP · SVG &nbsp;·&nbsp; up to 20MB</span>
        </div>
      </div>
    </section>

    <!-- ════════ IMAGE LIBRARY ORGANISER ════════ -->
    <div class="img-library-container">
      <!-- ─── FOLDER SIDEBAR ─── -->
      <aside class="img-sidebar">
        <div class="img-sidebar-head">
          <h3 class="img-sidebar-title">Folders</h3>
          <button type="button" class="img-btn-add-folder" @click="onAddFolderClick">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add
          </button>
        </div>

        <!-- Inline New Folder Creator -->
        <div v-if="showNewFolderInput" class="img-new-folder-row">
          <input
            ref="newFolderInputRef"
            v-model="newFolderName"
            type="text"
            placeholder="Folder name..."
            class="img-new-folder-input"
            @keyup.enter="createFolder"
            @keyup.esc="showNewFolderInput = false"
          />
          <div class="img-new-folder-actions">
            <button type="button" class="img-btn-confirm" @click="createFolder" title="Confirm" v-html="ICON_SVG.check"></button>
            <button type="button" class="img-btn-cancel" @click="showNewFolderInput = false" title="Cancel" v-html="ICON_SVG.close"></button>
          </div>
        </div>

        <ul class="img-folder-list">
          <li
            class="img-folder-item"
            :class="{ 'img-folder-item--active': currentFolder === 'all' }"
            @click="currentFolder = 'all'"
          >
            <span class="img-folder-icon-wrap" v-html="ICON_SVG.folder"></span>
            <span class="img-folder-name">All Library</span>
            <span class="img-folder-count">{{ library.length }}</span>
          </li>
          <li
            class="img-folder-item"
            :class="{ 
              'img-folder-item--active': currentFolder === 'uncategorized',
              'img-folder-item--dragover': dragOverFolderId === 'uncategorized'
            }"
            @click="currentFolder = 'uncategorized'"
            @dragover.prevent
            @dragenter.prevent="dragOverFolderId = 'uncategorized'"
            @dragleave="onDragLeaveFolder('uncategorized')"
            @drop="onImageDrop($event, null)"
          >
            <span class="img-folder-icon-wrap" v-html="ICON_SVG.folderOpen"></span>
            <span class="img-folder-name">Uncategorized</span>
            <span class="img-folder-count">{{ uncategorizedCount }}</span>
          </li>

          <!-- Custom Folders -->
          <li
            v-for="folder in customFolders"
            :key="folder.id"
            class="img-folder-item"
            :class="{ 
              'img-folder-item--active': currentFolder === folder.id,
              'img-folder-item--dragover': dragOverFolderId === folder.id
            }"
            @click="currentFolder = folder.id"
            @dblclick="startFolderRename(folder)"
            @dragover.prevent
            @dragenter.prevent="dragOverFolderId = folder.id"
            @dragleave="onDragLeaveFolder(folder.id)"
            @drop="onImageDrop($event, folder.id)"
            title="Double-click to rename / Drag images here to organize"
          >
            <div class="img-folder-main">
              <span class="img-folder-icon-wrap" v-html="ICON_SVG.folder"></span>
              <span v-if="editingFolderId !== folder.id" class="img-folder-text-name">{{ folder.name }}</span>
              <input
                v-else
                ref="renameFolderInputRef"
                v-model="editFolderInput"
                type="text"
                class="img-folder-rename-input"
                @blur="saveFolderRename(folder.id)"
                @keyup.enter="saveFolderRename(folder.id)"
                @keyup.esc="editingFolderId = null"
                @click.stop
              />
            </div>

            <!-- Inline controls (no edit icon, double-click handles renaming) -->
            <div v-if="editingFolderId !== folder.id" class="img-folder-controls">
              <button type="button" class="img-folder-btn img-folder-btn--delete" @click.stop="deleteFolder(folder.id)" title="Delete" v-html="ICON_SVG.trash"></button>
            </div>
            
            <span v-if="editingFolderId !== folder.id" class="img-folder-count">{{ getFolderImageCount(folder.id) }}</span>
          </li>
        </ul>
      </aside>

      <!-- ─── MAIN GALLERY CONTENT ─── -->
      <section class="img-library-main img-section">
        <div class="img-section-head">
          <div class="img-flex-title-row">
            <h2 class="img-section-title">
              {{ currentFolderTitle }}
            </h2>
            <span class="img-section-sub">
              {{ filteredLibrary.length }} image{{ filteredLibrary.length === 1 ? '' : 's' }}
            </span>
          </div>
        </div>

        <!-- Filter bar -->
        <div class="img-toolbar">
          <div class="img-input-wrap">
            <svg class="img-input-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              v-model="search"
              type="search"
              class="img-input img-input--with-icon"
              placeholder="Search by name..."
            />
          </div>
        </div>

        <!-- Library Gallery Grid -->
        <div v-if="!library.length" class="img-empty">
          <div class="img-empty-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
            </svg>
          </div>
          <p>No images in your library yet.</p>
          <p class="img-empty-tip">Drag & drop your team files or click the uploader above to add your first image!</p>
        </div>

        <div v-else-if="!filteredLibrary.length" class="img-empty">
          <p>No images in this folder yet.</p>
          <p class="img-empty-tip">
            Go to <strong>All Library</strong> or <strong>Uncategorized</strong> and drag images here, or use the card dropdown.
          </p>
          <button type="button" class="img-btn img-btn-sm" @click="currentFolder = 'all'">Go to Library</button>
        </div>

        <div v-else>
          <!-- Smooth grid animations -->
          <TransitionGroup name="img-fade-grid" tag="div" class="img-grid">
            <div
              v-for="img in pagedLibrary"
              :key="img.key"
              class="img-card"
              :class="{ 'img-card--dragging': draggedImage?.key === img.key }"
              draggable="true"
              @dragstart="onImageDragStart($event, img)"
              @dragend="onImageDragEnd"
            >
              <!-- Main Thumbnail Link -->
              <a
                class="img-card-link"
                :href="img.url"
                target="_blank"
                rel="noopener"
                :title="`Open ${img.displayName}`"
              >
                <img
                  :src="img.url"
                  :alt="img.displayName"
                  loading="lazy"
                  @error="(e) => ((e.target as HTMLImageElement).style.opacity = '0.2')"
                />
              </a>

              <div class="img-card-meta">
                <!-- Inline rename input or standard title -->
                <div v-if="renamingImageKey === img.key" class="img-card-rename-wrap" @click.stop>
                  <input
                    ref="renameImageInputRef"
                    v-model="renameImageInput"
                    type="text"
                    class="img-card-rename-input"
                    @blur="saveImageRename(img.key)"
                    @keyup.enter="saveImageRename(img.key)"
                    @keyup.esc="renamingImageKey = null"
                  />
                </div>
                <div v-else class="img-card-name" :title="img.displayName" @dblclick="startRenameImage(img)">
                  {{ img.displayName }}
                </div>

                <div class="img-card-row">
                  <span class="img-card-site">
                    <span class="img-chip-dot" :style="{ background: img.brand }" />
                    {{ img.websiteName }}
                  </span>
                  
                  <!-- Folder select dropdown (always visible, intuitive) -->
                  <div class="img-card-folder-select-wrap">
                    <span class="img-folder-icon-wrap select-icon" v-html="ICON_SVG.folder"></span>
                    <select
                      :value="img.folderId || ''"
                      @change="(e) => moveImage(img.key, (e.target as HTMLSelectElement).value || null)"
                      class="img-card-folder-select"
                    >
                      <option value="">Uncategorized</option>
                      <option v-for="f in customFolders" :key="f.id" :value="f.id">
                        {{ f.name }}
                      </option>
                    </select>
                  </div>
                </div>
              </div>

              <div class="img-card-actions">
                <button
                  type="button"
                  class="img-btn img-btn-sm"
                  :class="{ 'img-btn--copied': copiedKey === img.key }"
                  @click="copyUrl(img)"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  {{ copiedKey === img.key ? 'Copied' : 'Copy URL' }}
                </button>
                <a
                  class="img-btn img-btn-sm img-btn-ghost"
                  :href="img.url"
                  target="_blank"
                  rel="noopener"
                  title="Open in new tab"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <button
                  type="button"
                  class="img-btn img-btn-sm img-btn-ghost img-btn-delete"
                  @click="deleteImage(img)"
                  title="Delete image"
                  v-html="ICON_SVG.trash"
                ></button>
              </div>
            </div>
          </TransitionGroup>
        </div>

        <button
          v-if="filteredLibrary.length > visibleCount"
          type="button"
          class="img-loadmore"
          @click="visibleCount += 24"
        >
          Show more ({{ filteredLibrary.length - visibleCount }} hidden)
        </button>
      </section>
    </div>

    <!-- Toast Notification -->
    <Transition name="img-toast">
      <div v-if="toastVisible" class="img-toast">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {{ toastMsg }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, nextTick } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { optimizeImage, formatFileSize, type OptimizeResult } from '@/utils/imageOptimizer';

const auth = useAuthStore();

// ─── Type Interfaces ────────────────────────────────────────────────────────
interface CustomFolder {
  id: string;
  name: string;
}

interface DBImage {
  id: string;
  url: string;
  name: string;
  folder_id: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const dbImages = ref<DBImage[]>([]);

// ─── SVG Vector Icons (Emoji Replacement) ──────────────────────────────
const ICON_SVG = {
  folder: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  folderOpen: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><path d="M2 10h20"/></svg>`,
  edit: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  trash: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
  check: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  close: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};

// ─── Library Organiser State ────────────────────────────────────
const currentFolder = ref<string>('all');
const customFolders = ref<CustomFolder[]>([]);

// Drag & Drop States
const draggedImage = ref<LibImage | null>(null);
const dragOverFolderId = ref<string | null>(null);

// Inline Creator/Rename States
const showNewFolderInput = ref(false);
const newFolderName = ref('');
const newFolderInputRef = ref<HTMLInputElement | null>(null);

const editingFolderId = ref<string | null>(null);
const editFolderInput = ref('');
const renameFolderInputRef = ref<HTMLInputElement[] | null>(null);

// Card Image Renaming States
const renamingImageKey = ref<string | null>(null);
const renameImageInput = ref('');
const renameImageInputRef = ref<HTMLInputElement[] | null>(null);

// Realtime subscriptions
let foldersSubscription: any = null;
let imagesSubscription: any = null;

// Helper to sanitize filenames for Supabase storage paths
const getSafeName = (fileName: string) => {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
};

const loadLibraryFromDB = async () => {
  if (!supabaseConfigured) return;
  try {
    // 1. Fetch folders
    const { data: foldersData, error: foldersErr } = await supabase
      .from('team_folders')
      .select('*')
      .order('created_at', { ascending: true });
    
    if (foldersErr) {
      console.error('[images] failed to fetch folders', foldersErr);
    } else if (foldersData) {
      customFolders.value = foldersData.map((f: any) => ({
        id: f.id,
        name: f.name
      }));
    }

    // 2. Fetch images
    const { data: imagesData, error: imagesErr } = await supabase
      .from('team_images')
      .select('*')
      .order('created_at', { ascending: false });

    if (imagesErr) {
      console.error('[images] failed to fetch images', imagesErr);
    } else if (imagesData) {
      dbImages.value = imagesData;
    }
  } catch (e) {
    console.error('[images] failed to load DB data', e);
  }
};

const subscribeRealtime = () => {
  if (!supabaseConfigured) return;
  
  foldersSubscription = supabase
    .channel('public:team_folders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_folders' }, () => {
      loadLibraryFromDB();
    })
    .subscribe();

  imagesSubscription = supabase
    .channel('public:team_images')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'team_images' }, () => {
      loadLibraryFromDB();
    })
    .subscribe();
};

// ─── Folder Actions ──────────────────────────────────────────────────────────
const onAddFolderClick = async () => {
  showNewFolderInput.value = true;
  await nextTick();
  newFolderInputRef.value?.focus();
};

const createFolder = async () => {
  const name = newFolderName.value.trim();
  if (!name || !supabaseConfigured) return;

  const uid = auth.user?.id;

  const { data, error } = await supabase
    .from('team_folders')
    .insert({
      name,
      created_by: uid
    })
    .select()
    .single();

  if (error) {
    showToast('Failed to create folder');
    console.error(error);
  } else {
    newFolderName.value = '';
    showNewFolderInput.value = false;
    if (data) {
      currentFolder.value = data.id;
      showToast(`Folder "${name}" created`);
    }
    loadLibraryFromDB();
  }
};

const startFolderRename = async (folder: CustomFolder) => {
  editingFolderId.value = folder.id;
  editFolderInput.value = folder.name;
  await nextTick();
  if (renameFolderInputRef.value && renameFolderInputRef.value[0]) {
    renameFolderInputRef.value[0].focus();
  }
};

const saveFolderRename = async (folderId: string) => {
  const name = editFolderInput.value.trim();
  if (!name || !supabaseConfigured) {
    editingFolderId.value = null;
    return;
  }

  const { error } = await supabase
    .from('team_folders')
    .update({ name })
    .eq('id', folderId);

  if (error) {
    showToast('Failed to rename folder');
    console.error(error);
  } else {
    showToast('Folder renamed');
    loadLibraryFromDB();
  }
  editingFolderId.value = null;
};

const deleteFolder = async (folderId: string) => {
  if (!supabaseConfigured) return;
  if (confirm('Are you sure you want to delete this folder? Organized images will be returned to "Uncategorized".')) {
    const { error } = await supabase
      .from('team_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      showToast('Failed to delete folder');
      console.error(error);
    } else {
      if (currentFolder.value === folderId) {
        currentFolder.value = 'all';
      }
      showToast('Folder deleted');
      loadLibraryFromDB();
    }
  }
};

const getFolderImageCount = (folderId: string) => {
  return dbImages.value.filter((img) => img.folder_id === folderId).length;
};

const uncategorizedCount = computed(() => {
  return dbImages.value.filter((img) => !img.folder_id).length;
});

const currentFolderTitle = computed(() => {
  if (currentFolder.value === 'all') return 'All Library';
  if (currentFolder.value === 'uncategorized') return 'Uncategorized';
  const folder = customFolders.value.find((f) => f.id === currentFolder.value);
  return folder ? folder.name : 'Library';
});

// ─── Image Organisation Actions ──────────────────────────────────────────────
const moveImage = async (imageKey: string, folderId: string | null) => {
  if (!supabaseConfigured) return;

  const { error } = await supabase
    .from('team_images')
    .update({ folder_id: folderId })
    .eq('id', imageKey);

  if (error) {
    showToast('Failed to move image');
    console.error(error);
  } else {
    const targetName = folderId
      ? customFolders.value.find((f) => f.id === folderId)?.name || 'Folder'
      : 'Uncategorized';
    showToast(`Moved to ${targetName}`);
    loadLibraryFromDB();
  }
};

const startRenameImage = async (img: LibImage) => {
  renamingImageKey.value = img.key;
  renameImageInput.value = img.displayName;
  await nextTick();
  if (renameImageInputRef.value && renameImageInputRef.value[0]) {
    renameImageInputRef.value[0].focus();
  }
};

const saveImageRename = async (imageKey: string) => {
  const name = renameImageInput.value.trim();
  if (!name || !supabaseConfigured) {
    renamingImageKey.value = null;
    return;
  }

  const { error } = await supabase
    .from('team_images')
    .update({ name })
    .eq('id', imageKey);

  if (error) {
    showToast('Failed to rename image');
    console.error(error);
  } else {
    showToast('Image renamed');
    loadLibraryFromDB();
  }
  renamingImageKey.value = null;
};

const deleteImage = async (img: LibImage) => {
  if (!supabaseConfigured) return;
  if (confirm(`Are you sure you want to permanently delete "${img.displayName}"?`)) {
    try {
      const { error: dbErr } = await supabase
        .from('team_images')
        .delete()
        .eq('id', img.key);

      if (dbErr) {
        showToast('Failed to delete image');
        console.error(dbErr);
        return;
      }

      const bucketMarker = '/public/team-images/';
      const markerIndex = img.url.indexOf(bucketMarker);
      if (markerIndex !== -1) {
        const storagePath = decodeURIComponent(img.url.substring(markerIndex + bucketMarker.length));
        const { error: storageErr } = await supabase.storage
          .from('team-images')
          .remove([storagePath]);
        
        if (storageErr) {
          console.warn('[images] failed to remove storage file', storageErr);
        }
      }

      showToast('Image deleted');
      loadLibraryFromDB();
    } catch (e) {
      console.error('[images] delete image failed', e);
      showToast('Error deleting image');
    }
  }
};

// ─── Drag & Drop Handlers ──────────────────────────────────────────────────
const onImageDragStart = (e: DragEvent, img: LibImage) => {
  draggedImage.value = img;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', img.key);
  }
};

const onImageDragEnd = () => {
  draggedImage.value = null;
  dragOverFolderId.value = null;
};

const onDragLeaveFolder = (folderId: string | null) => {
  if (dragOverFolderId.value === folderId) {
    dragOverFolderId.value = null;
  }
};

const onImageDrop = (e: DragEvent, folderId: string | null) => {
  dragOverFolderId.value = null;
  const imageKey = e.dataTransfer?.getData('text/plain') || draggedImage.value?.key;
  if (imageKey) {
    moveImage(imageKey, folderId);
  }
};

// ─── Library Compute & Filter Logic ───────────────────────────────────────────
interface LibImage {
  key: string;
  url: string;
  name: string;
  displayName: string;
  folderId: string | null;
  category: string;
  websiteId: string;
  websiteName: string;
  brand: string;
  product: any;
}

const library = computed<LibImage[]>(() => {
  return dbImages.value.map((img) => ({
    key: img.id,
    url: img.url,
    name: img.name,
    displayName: img.name,
    folderId: img.folder_id,
    category: '',
    websiteId: '',
    websiteName: 'Team Upload',
    brand: 'var(--primary)',
    product: null
  }));
});

const search = ref('');
const visibleCount = ref(36);

const filteredLibrary = computed(() => {
  const q = search.value.trim().toLowerCase();
  return library.value.filter((img) => {
    // 1. Folder filtering
    const folderId = img.folderId;

    if (currentFolder.value === 'uncategorized') {
      if (folderId !== null) return false;
    } else if (currentFolder.value !== 'all') {
      if (folderId !== currentFolder.value) return false;
    }

    // 2. Search query filtering
    if (!q) return true;
    return img.displayName.toLowerCase().includes(q);
  });
});

const pagedLibrary = computed(() => filteredLibrary.value.slice(0, visibleCount.value));

const resetFilters = () => {
  search.value = '';
};

// ─── Uploader Logic ────────────────────────────────────────────────────────
const converting = ref(false);
const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
let dragTimer: ReturnType<typeof setTimeout> | null = null;

const openFilePicker = () => fileInput.value?.click();

const onPick = async (e: Event) => {
  const input = e.target as HTMLInputElement;
  const files = Array.from(input.files ?? []);
  input.value = '';
  await convertFiles(files);
};

const onPaste = async (e: ClipboardEvent) => {
  const items = e.clipboardData?.items;
  if (!items) return;
  const files: File[] = [];
  for (const item of items) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile();
      if (f) files.push(f);
    }
  }
  if (files.length) {
    e.preventDefault();
    await convertFiles(files);
  }
};

const onDragOver = () => {
  if (dragTimer) clearTimeout(dragTimer);
  isDragging.value = true;
};
const onDragLeave = () => {
  if (dragTimer) clearTimeout(dragTimer);
  dragTimer = setTimeout(() => { isDragging.value = false; }, 60);
};
const onDrop = async (e: DragEvent) => {
  isDragging.value = false;
  const files = Array.from(e.dataTransfer?.files ?? []).filter((f) => f.type.startsWith('image/'));
  await convertFiles(files);
};

const convertFiles = async (files: File[]) => {
  if (!files.length || converting.value || !supabaseConfigured) return;
  converting.value = true;

  const uid = auth.user?.id;
  if (!uid) {
    showToast('Please sign in to upload images');
    converting.value = false;
    return;
  }

  try {
    for (const file of files) {
      let fileToUpload = file;
      let finalName = file.name;

      const isGifOrSvg = file.type === 'image/gif' || file.type === 'image/svg+xml';
      if (!isGifOrSvg && file.type.startsWith('image/')) {
        try {
          const result = await optimizeImage(file, {
            maxWidth: 2048,
            maxHeight: 2048,
            targetSizeKB: 500,
            maxSizeKB: 800,
            initialQuality: 0.9,
            minQuality: 0.7,
            outputType: 'image/webp'
          });
          const resBlob = await fetch(result.previewUrl).then((r) => r.blob());
          fileToUpload = new File([resBlob], file.name.replace(/\.[^/.]+$/, '.webp'), {
            type: 'image/webp'
          });
          finalName = fileToUpload.name;
        } catch (err) {
          console.warn('[images] optimize failed, uploading original', err);
        }
      }

      const safeName = getSafeName(finalName);
      const storagePath = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safeName}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('team-images')
        .upload(storagePath, fileToUpload, {
          cacheControl: '31536000',
          upsert: false
        });

      if (uploadError) {
        console.error('[images] storage upload failed', uploadError);
        showToast(`Failed to upload ${file.name}`);
        continue;
      }

      const { data: publicUrlData } = supabase.storage
        .from('team-images')
        .getPublicUrl(storagePath);
      const publicUrl = publicUrlData?.publicUrl;

      if (!publicUrl) {
        showToast(`Failed to get URL for ${file.name}`);
        continue;
      }

      const destFolderId = (currentFolder.value !== 'all' && currentFolder.value !== 'uncategorized')
        ? currentFolder.value
        : null;

      const { error: dbError } = await supabase
        .from('team_images')
        .insert({
          url: publicUrl,
          name: finalName.replace(/\.[^/.]+$/, ''),
          folder_id: destFolderId,
          uploaded_by: uid
        });

      if (dbError) {
        console.error('[images] database insert failed', dbError);
        showToast(`Failed to save ${file.name}`);
      } else {
        showToast(`${finalName} uploaded successfully`);
      }
    }
    
    loadLibraryFromDB();
  } finally {
    converting.value = false;
  }
};

// ─── Copy URL ──────────────────────────────────────────────────────────────
const copiedKey = ref<string>('');
const copyUrl = async (img: LibImage) => {
  try {
    await navigator.clipboard.writeText(img.url);
    copiedKey.value = img.key;
    showToast('URL copied to clipboard');
    setTimeout(() => { if (copiedKey.value === img.key) copiedKey.value = ''; }, 1600);
  } catch {
    showToast('Could not copy');
  }
};

// ─── Toast Notification ───────────────────────────────────────────────────────
const toastVisible = ref(false);
const toastMsg = ref('');
const showToast = (msg: string) => {
  toastMsg.value = msg;
  toastVisible.value = true;
  setTimeout(() => { toastVisible.value = false; }, 1600);
};

const fmt = (bytes: number) => formatFileSize(bytes);

onMounted(() => {
  loadLibraryFromDB();
  subscribeRealtime();
});

onUnmounted(() => {
  if (foldersSubscription) foldersSubscription.unsubscribe();
  if (imagesSubscription) imagesSubscription.unsubscribe();
});
</script>

<style scoped>
.img {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Header ── */
.img-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 0.2rem 0 0.6rem;
  border-bottom: 1px solid var(--border);
  flex-wrap: wrap;
}

.img-h1 {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--text-main);
  margin: 0;
  line-height: 1.1;
}

.img-h1-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 7px;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #9333ea));
  color: #fff;
  box-shadow: 0 2px 6px color-mix(in srgb, var(--primary) 35%, transparent);
}

.img-h1-sub {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  margin: 0.3rem 0 0;
}

.img-stats {
  display: flex;
  gap: 0.3rem;
}

.img-stat {
  display: flex;
  flex-direction: column;
  padding: 0.32rem 0.65rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 7px;
  min-width: 58px;
}

.img-stat-num {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.92rem;
  font-weight: 800;
  color: var(--text-main);
  line-height: 1.1;
  font-feature-settings: 'tnum' on;
}

.img-stat-lbl {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.1rem;
}

/* ── Section ── */
.img-section {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.95rem 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.img-section-head {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.img-flex-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.img-section-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.img-section-sub {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin: 0;
}

/* ── Drop zone ── */
.img-drop {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  background: var(--soft-bg);
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.img-drop:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  background: color-mix(in srgb, var(--primary) 4%, var(--card-bg));
}
.img-drop--active {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
  outline: none;
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 12%, transparent);
}
.img-drop--busy { cursor: progress; }

.img-drop-input { display: none; }

.img-drop-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--primary);
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px var(--border);
}

.img-spin {
  animation: img-spin 1s linear infinite;
}
@keyframes img-spin {
  to { transform: rotate(360deg); }
}

.img-drop-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.img-drop-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
}

.img-drop-sub {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  color: var(--text-muted);
}

/* ── Conversion results ── */
.img-converted {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.img-converted-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.img-converted-title {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.img-converted-list {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.img-converted-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.5rem 0.6rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 9px;
}

.img-converted-thumb {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  overflow: hidden;
  background: var(--card-bg);
  flex-shrink: 0;
}
.img-converted-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.img-converted-meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}

.img-converted-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.img-converted-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--text-muted);
}

.img-converted-size strong {
  color: var(--text-main);
  font-weight: 800;
}

.img-converted-saved {
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: color-mix(in srgb, #16a34a 12%, transparent);
  color: #16a34a;
  font-weight: 800;
}
:root[data-theme='dark-gray'] .img-converted-saved { color: #4ade80; }

.img-converted-dim {
  font-feature-settings: 'tnum' on;
  opacity: 0.7;
}

.img-converted-actions {
  display: flex;
  gap: 0.25rem;
}

/* ─── FOLDER SPLIT LAYOUT ─── */
.img-library-container {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 1rem;
  align-items: start;
}

.img-sidebar {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem;
}

.img-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--border);
}

.img-sidebar-title {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-main);
  margin: 0;
}

.img-btn-add-folder {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--primary);
  padding: 0.2rem 0.45rem;
  cursor: pointer;
  transition: all 0.12s ease;
}
.img-btn-add-folder:hover {
  background: var(--primary-soft);
  border-color: var(--primary);
  transform: translateY(-0.5px);
}

.img-new-folder-row {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.1rem;
  border-bottom: 1px dashed var(--border);
}

.img-new-folder-input {
  flex: 1;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.22rem 0.45rem;
  font-family: inherit;
  font-size: 0.75rem;
  color: var(--text-main);
  outline: none;
}
.img-new-folder-input:focus {
  border-color: var(--primary);
}

.img-new-folder-actions {
  display: flex;
  gap: 0.15rem;
}

.img-btn-confirm,
.img-btn-cancel {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 5px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.1s ease;
}
.img-btn-confirm {
  color: #16a34a;
  border-color: color-mix(in srgb, #16a34a 30%, var(--border));
}
.img-btn-confirm:hover {
  background: #16a34a;
  color: #fff;
}
.img-btn-cancel {
  color: var(--text-muted);
}
.img-btn-cancel:hover {
  background: var(--border);
  color: var(--text-main);
}

.img-folder-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.img-folder-item {
  display: flex;
  align-items: center;
  padding: 0.4rem 0.55rem;
  border-radius: 7px;
  cursor: pointer;
  user-select: none;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-muted);
  transition: all 0.12s ease;
  min-width: 0;
}
.img-folder-item:hover {
  background: var(--soft-bg);
  color: var(--text-main);
}
.img-folder-item--active {
  background: var(--primary-soft) !important;
  color: var(--primary) !important;
}

.img-folder-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  margin-right: 0.45rem;
  flex-shrink: 0;
}
.img-folder-item--active .img-folder-icon-wrap {
  color: var(--primary);
}

.img-folder-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.img-folder-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  flex: 1;
}

.img-folder-text-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.img-folder-rename-input {
  background: var(--card-bg);
  border: 1px solid var(--primary);
  border-radius: 4px;
  padding: 0.08rem 0.3rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-main);
  outline: none;
  width: 90%;
}

.img-folder-controls {
  display: flex;
  gap: 0.15rem;
  opacity: 0;
  transition: opacity 0.12s ease;
  margin-right: 0.35rem;
}
.img-folder-item:hover .img-folder-controls {
  opacity: 1;
}

.img-folder-btn {
  background: transparent;
  border: none;
  padding: 0.05rem;
  font-size: 0.72rem;
  cursor: pointer;
  transition: transform 0.1s ease;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
}
.img-folder-btn:hover {
  transform: scale(1.18);
  color: var(--text-main);
}
.img-folder-btn--delete:hover {
  color: #ef4444;
}

.img-folder-count {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.64rem;
  background: var(--soft-bg);
  color: var(--text-muted);
  padding: 0.08rem 0.35rem;
  border-radius: 999px;
  font-weight: 700;
  margin-left: auto;
  flex-shrink: 0;
}
.img-folder-item--active .img-folder-count {
  background: var(--primary);
  color: #fff;
}

/* ── Toolbar (search + filter chips) ── */
.img-toolbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.img-input-wrap {
  position: relative;
  flex: 1;
  min-width: 220px;
  max-width: 360px;
}

.img-input-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}

.img-input {
  width: 100%;
  padding: 0.45rem 0.7rem;
  background: var(--soft-bg);
  border: 1px solid transparent;
  border-radius: 8px;
  font: inherit;
  font-size: 0.82rem;
  color: var(--text-main);
  transition: all 0.15s ease;
}
.img-input:focus {
  outline: none;
  background: var(--card-bg);
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 12%, transparent);
}
.img-input--with-icon { padding-left: 1.95rem; }

.img-chips {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.img-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.3rem 0.6rem;
  background: var(--soft-bg);
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
}
.img-chip:hover {
  color: var(--text-main);
  border-color: var(--border);
}
.img-chip--active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.img-chip-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}
:root[data-theme='dark-gray'] .img-chip-dot { border-color: rgba(255, 255, 255, 0.14); }

/* ── Library grid ── */
.img-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
  gap: 0.65rem;
}

.img-card {
  position: relative;
  display: flex;
  flex-direction: column;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: visible;
  transition: all 0.15s ease;
  cursor: grab;
  user-select: none;
}
.img-card:hover {
  border-color: color-mix(in srgb, var(--primary) 30%, var(--border));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(63, 141, 254, 0.08);
}
.img-card:active {
  cursor: grabbing;
}
.img-card--dragging {
  opacity: 0.4;
  border-style: dashed;
}

/* ── FOLDER SELECT DROPDOWN ── */
.img-card-folder-select-wrap {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.12rem 0.35rem;
  background: var(--soft-bg);
  max-width: 105px;
  transition: all 0.12s ease;
}
.img-card-folder-select-wrap:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
}

.img-card-folder-select-wrap .select-icon {
  margin-right: 0;
  width: 12px;
  height: 12px;
  color: var(--text-muted);
}

.img-card-folder-select {
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: 0.68rem;
  font-weight: 650;
  color: var(--text-muted);
  outline: none;
  cursor: pointer;
  width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  padding: 0;
  line-height: 1.2;
}
.img-card-folder-select:focus {
  color: var(--text-main);
}

.img-card-link {
  display: block;
  aspect-ratio: 1 / 1;
  background: var(--soft-bg);
  overflow: hidden;
  border-top-left-radius: 9px;
  border-top-right-radius: 9px;
}
.img-card-link img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.25s ease;
}
.img-card:hover .img-card-link img { transform: scale(1.04); }

.img-card-meta {
  padding: 0.55rem 0.65rem 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.img-card-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
}
.img-card-name:hover {
  color: var(--primary);
}

.img-card-rename-wrap {
  width: 100%;
}
.img-card-rename-input {
  width: 100%;
  font-family: inherit;
  font-size: 0.78rem;
  font-weight: 700;
  background: var(--soft-bg);
  border: 1px solid var(--primary);
  border-radius: 5px;
  padding: 0.1rem 0.35rem;
  color: var(--text-main);
  outline: none;
}

.img-card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-width: 0;
}

.img-card-site {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.img-card-cat {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
  flex-shrink: 0;
}

.img-card-actions {
  display: flex;
  gap: 0.2rem;
  padding: 0 0.5rem 0.55rem;
  margin-top: auto;
}

/* ── Buttons ── */
.img-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.35rem 0.6rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 7px;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  transition: all 0.12s ease;
  white-space: nowrap;
  text-decoration: none;
}
.img-btn:hover {
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
  color: var(--primary);
}

.img-btn-sm {
  padding: 0.3rem 0.55rem;
  font-size: 0.68rem;
  flex: 1;
  justify-content: center;
}

.img-btn-ghost {
  background: transparent;
  border-color: transparent;
  flex: 0 0 auto;
  padding: 0.3rem 0.45rem;
  color: var(--text-muted);
}
.img-btn-ghost:hover { border-color: var(--border); }

.img-btn--copied {
  background: #16a34a !important;
  border-color: #16a34a !important;
  color: #fff !important;
}

.img-link {
  background: none;
  border: none;
  font: inherit;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  text-decoration: none;
  padding: 0;
}
.img-link:hover { text-decoration: underline; }

/* Dragover / empty tip styles */
.img-folder-item--dragover {
  background: var(--primary-soft) !important;
  color: var(--primary) !important;
  outline: 2px dashed var(--primary) !important;
  outline-offset: -2px;
}
.img-empty-tip {
  font-size: 0.78rem;
  max-width: 320px;
  opacity: 0.8;
  line-height: 1.4;
  margin-bottom: 0.4rem !important;
}

/* ── Empty / load more ── */
.img-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1rem;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.img-empty-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  background: var(--soft-bg);
  color: var(--text-muted);
}

.img-empty p { margin: 0; }

.img-loadmore {
  align-self: center;
  background: transparent;
  border: 1px dashed var(--border);
  border-radius: 8px;
  padding: 0.45rem 0.9rem;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  margin-top: 0.3rem;
  transition: all 0.12s ease;
}
.img-loadmore:hover {
  color: var(--primary);
  border-color: var(--primary);
}

/* ── Toast ── */
.img-toast {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.9rem;
  background: #16a34a;
  color: #fff;
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(22, 163, 74, 0.35);
}
.img-toast-enter-active,
.img-toast-leave-active {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.img-toast-enter-from,
.img-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}

/* ─── SMOOTH FLUID TRANSITIONS ─── */
.img-fade-grid-enter-active,
.img-fade-grid-leave-active {
  transition: all 0.28s cubic-bezier(0.25, 1, 0.5, 1);
}
.img-fade-grid-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(5px);
}
.img-fade-grid-leave-to {
  opacity: 0;
  transform: scale(0.92) translateY(-5px);
  position: absolute;
}
.img-fade-grid-move {
  transition: transform 0.28s cubic-bezier(0.25, 1, 0.5, 1);
}

/* Responsive grid layout */
@media (max-width: 768px) {
  .img-library-container {
    grid-template-columns: 1fr;
  }
  .img-sidebar {
    position: relative;
    max-height: 250px;
    overflow-y: auto;
  }
}

@media (max-width: 640px) {
  .img-h1 { font-size: 1.15rem; }
  .img-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); }
  .img-drop { padding: 0.85rem; }
  .img-converted-row { flex-wrap: wrap; }
  .img-converted-actions { width: 100%; justify-content: flex-end; }
}

.img-btn-delete:hover {
  color: #ef4444 !important;
  background: color-mix(in srgb, #ef4444 10%, transparent) !important;
}
</style>
