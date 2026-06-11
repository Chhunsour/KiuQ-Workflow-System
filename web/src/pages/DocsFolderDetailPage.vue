<template>
  <div class="dfd-root">
    <!-- Breadcrumb -->
    <nav class="dfd-breadcrumb" aria-label="Breadcrumb">
      <RouterLink to="/docs" class="dfd-bc-link">Docs Drive</RouterLink>
      <span class="dfd-bc-sep">›</span>
      <span class="dfd-bc-current">{{ folder?.name ?? 'Folder' }}</span>
    </nav>

    <!-- Folder missing -->
    <div v-if="folderMissing" class="dfd-missing">
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.3"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
      <h3>Folder not found</h3>
      <p>It may have been deleted, or you do not have access.</p>
      <RouterLink to="/docs" class="btn-primary">Back to Docs</RouterLink>
    </div>

    <!-- Loading skeleton -->
    <div v-else-if="loading" class="dfd-skeleton-wrap">
      <div class="dfd-skeleton-sidebar" />
      <div class="dfd-skeleton-editor" />
    </div>

    <!-- Workspace -->
    <div v-else class="dfd-workspace">

      <!-- ── Left sidebar ── -->
      <aside class="dfd-sidebar" :class="{ 'dfd-sidebar--mobile-open': mobileSidebarOpen }">

        <!-- Sidebar header -->
        <div class="dfd-sidebar-head">
          <div class="dfd-sidebar-folder-name">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            <span>{{ folder?.name }}</span>
          </div>
          <button v-if="canWrite" class="dfd-new-doc-btn" type="button" @click="createDoc" :disabled="creating" title="New document">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            New
          </button>
        </div>

        <!-- Search -->
        <div class="dfd-search-wrap">
          <svg class="dfd-search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="sidebarSearch" class="dfd-search" type="text" placeholder="Search docs…" />
        </div>

        <!-- Doc list -->
        <div class="dfd-doc-list">
          <!-- Empty state inside sidebar -->
          <div v-if="textDocs.length === 0 && !creating" class="dfd-sidebar-empty">
            <p>No docs yet.</p>
            <button v-if="canWrite" class="dfd-sidebar-create-btn" type="button" @click="createDoc">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              Create New Doc
            </button>
          </div>

          <div v-else-if="filteredDocs.length === 0 && sidebarSearch" class="dfd-sidebar-empty">
            <p>No matches.</p>
          </div>

          <div
            v-for="doc in filteredDocs"
            :key="doc.id"
            class="dfd-doc-item"
            :class="{ 'dfd-doc-item--active': activeDocId === doc.id, 'dfd-doc-item--renaming': renamingDocId === doc.id }"
            role="button"
            tabindex="0"
            @click="onDocItemClick(doc)"
            @dblclick="startRename(doc)"
            @keydown.enter="onDocItemEnter(doc, $event)"
          >
            <svg class="dfd-doc-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
            <div class="dfd-doc-item-body">
              <input
                v-if="renamingDocId === doc.id"
                :ref="(el) => setRenameInputRef(el, doc.id)"
                v-model="renameDraft"
                class="dfd-doc-item-rename"
                type="text"
                maxlength="200"
                @click.stop
                @dblclick.stop
                @keydown.enter.prevent="commitRename"
                @keydown.esc.prevent="cancelRename"
                @blur="commitRename"
              />
              <template v-else>
                <span class="dfd-doc-item-title">{{ doc.title || 'Untitled' }}</span>
                <span v-if="doc.updatedAt" class="dfd-doc-item-date">{{ relativeDate(doc.updatedAt) }}</span>
              </template>
            </div>
            <span v-if="unsavedDocIds.has(doc.id)" class="dfd-unsaved-dot" title="Unsaved changes" />
          </div>
        </div>
      </aside>

      <!-- ── Main editor ── -->
      <main class="dfd-editor-area">

        <!-- Mobile toggle -->
        <button class="dfd-mobile-toggle" type="button" @click="mobileSidebarOpen = !mobileSidebarOpen">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          <span>{{ folder?.name }}</span>
        </button>

        <!-- No doc selected / empty folder -->
        <div v-if="!activeDoc && textDocs.length === 0" class="dfd-empty-main">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
          <h3>No documents yet</h3>
          <p>Create your first document to get started.</p>
          <button v-if="canWrite" class="btn-primary" type="button" :disabled="creating" @click="createDoc">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            {{ creating ? 'Creating…' : 'Create New Doc' }}
          </button>
        </div>

        <div v-else-if="!activeDoc" class="dfd-empty-main">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity="0.25"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          <p>Select a document from the sidebar.</p>
        </div>

        <template v-else>
          <!-- Top bar: title + save status + actions -->
          <div class="dfd-topbar">
            <!-- Title (inline editable) -->
            <div class="dfd-title-wrap">
              <input
                ref="titleRef"
                v-model="draftTitle"
                class="dfd-title-input"
                type="text"
                placeholder="Untitled"
                maxlength="200"
                :disabled="auth.isViewer"
                @input="onTitleInput"
                @blur="flushTitle"
              />
            </div>

            <!-- Save status -->
            <div class="dfd-save-status" :class="`dfd-save-status--${saveStatus}`">
              <template v-if="saveStatus === 'saving'">
                <span class="dfd-save-spinner" />
                Saving…
              </template>
              <template v-else-if="saveStatus === 'saved'">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Saved
              </template>
              <template v-else-if="saveStatus === 'error'">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Error saving
              </template>
            </div>

            <!-- Actions -->
            <div class="dfd-actions">
              <!-- Copy -->
              <button class="dfd-action-btn" type="button" :title="copyLabel" @click="copyText">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                <span class="dfd-action-label">{{ copyLabel }}</span>
              </button>
              <!-- Duplicate -->
              <button v-if="!auth.isViewer" class="dfd-action-btn" type="button" title="Duplicate" @click="duplicateDoc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 17H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3"/><rect x="11" y="11" width="11" height="11" rx="2"/></svg>
                <span class="dfd-action-label">Duplicate</span>
              </button>
              <!-- Delete -->
              <button v-if="canDeleteDoc" class="dfd-action-btn dfd-action-btn--danger" type="button" title="Delete" @click="confirmDeleteDoc">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                <span class="dfd-action-label">Delete</span>
              </button>
              <!-- Manual save -->
              <button v-if="!auth.isViewer" class="dfd-action-btn dfd-action-btn--save" type="button" :disabled="saveStatus === 'saving'" @click="saveNow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span class="dfd-action-label">Save</span>
              </button>
            </div>
          </div>

          <!-- Editor body -->
          <div ref="editorBodyRef" class="dfd-editor-body" @click="focusEditor">
            <textarea
              ref="editorRef"
              v-model="draftContent"
              class="dfd-editor"
              placeholder="Start writing…"
              spellcheck="true"
              :readonly="auth.isViewer"
              @input="onContentInput"
              @paste="onPaste"
            />
          </div>

          <!-- Footer meta -->
          <div class="dfd-footer">
            <span>Created {{ fmtDate(activeDoc.createdAt) }} by {{ memberName(activeDoc.createdBy) }}</span>
            <template v-if="activeDoc.updatedAt">
              <span class="dfd-footer-sep">·</span>
              <span>Updated {{ fmtDate(activeDoc.updatedAt) }}{{ activeDoc.updatedBy ? ' by ' + memberName(activeDoc.updatedBy) : '' }}</span>
            </template>
          </div>
        </template>
      </main>
    </div>

    <!-- Mobile backdrop -->
    <Teleport to="body">
      <div v-if="mobileSidebarOpen" class="dfd-mobile-backdrop" @click="mobileSidebarOpen = false" />
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="dfd-toast-anim">
        <div v-if="toast" class="dfd-toast" :class="`dfd-toast--${toast.type}`">
          <svg v-if="toast.type === 'error'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          {{ toast.msg }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type DocsFile } from '@/stores/data';

const route = useRoute();
const auth  = useAuthStore();
const data  = useDataStore();

const folderId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''));
const folder   = computed(() => data.docsFolders.find((f) => f.id === folderId.value));

const defaultTextDoc = (): DocsFile => ({
  id: '',
  folderId: folderId.value,
  title: 'Untitled',
  type: 'text_doc',
  url: '',
  description: '',
  content: '',
  relatedProjectId: null,
  relatedWebsiteId: null,
  relatedTaskId: null,
  createdBy: null,
  updatedBy: null,
  createdAt: '',
  updatedAt: '',
  category: 'other',
  productName: '',
  productUrl: '',
  productImageUrl: '',
  productShortDesc: '',
  productLongDesc: '',
  productFeatures: '',
  productSpecs: '',
  productPrice: '',
  productSku: '',
  productNotes: '',
  driveLink: '',
  linkedPromptId: null
});

const loading       = ref(true);
const loadedOnce    = ref(false);
const creating      = ref(false);
const folderMissing = computed(() => loadedOnce.value && !loading.value && !folder.value);

// ── Mobile sidebar ────────────────────────────────────────────────────────────
const mobileSidebarOpen = ref(false);

// ── Docs in this folder ───────────────────────────────────────────────────────
const textDocs = computed(() =>
  data.docsFiles
    .filter((f) => f.folderId === folderId.value && f.type === 'text_doc')
    .sort((a, b) => {
      // Most recently updated first
      const da = a.updatedAt || a.createdAt || '';
      const db = b.updatedAt || b.createdAt || '';
      return db.localeCompare(da);
    })
);

// ── Sidebar search ────────────────────────────────────────────────────────────
const sidebarSearch = ref('');
const filteredDocs  = computed(() => {
  if (!sidebarSearch.value.trim()) return textDocs.value;
  const q = sidebarSearch.value.toLowerCase();
  return textDocs.value.filter((d) => d.title.toLowerCase().includes(q));
});

// ── Active document ───────────────────────────────────────────────────────────
const activeDocId  = ref<string | null>(null);
const activeDoc    = computed(() => textDocs.value.find((d) => d.id === activeDocId.value) ?? null);

const draftTitle   = ref('');
const draftContent = ref('');

const titleRef      = ref<HTMLInputElement | null>(null);
const editorRef     = ref<HTMLTextAreaElement | null>(null);
const editorBodyRef = ref<HTMLDivElement | null>(null);

const focusEditor = () => editorRef.value?.focus();

const scrollEditorToTop = () => {
  if (editorBodyRef.value) editorBodyRef.value.scrollTop = 0;
  if (editorRef.value)     editorRef.value.scrollTop = 0;
};

const unsavedDocIds = ref<Set<string>>(new Set());

// ── Save status ───────────────────────────────────────────────────────────────
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';
const saveStatus = ref<SaveStatus>('idle');
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let savedStatusTimer: ReturnType<typeof setTimeout> | null = null;

const setSaved = () => {
  saveStatus.value = 'saved';
  if (savedStatusTimer) clearTimeout(savedStatusTimer);
  savedStatusTimer = setTimeout(() => { saveStatus.value = 'idle'; }, 2500);
};

// ── Auto-save logic ───────────────────────────────────────────────────────────
const AUTOSAVE_DEBOUNCE_MS = 700;

const scheduleAutoSave = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => { void performSave(); }, AUTOSAVE_DEBOUNCE_MS);
};

const performSave = async (showToastOnSuccess = false): Promise<boolean> => {
  if (!activeDoc.value) return false;
  if (saveStatus.value === 'saving') return false;
  saveStatus.value = 'saving';
  // Capture the doc ID at save start; the user may switch away mid-save.
  const docIdAtSaveStart = activeDocId.value;
  try {
    const ok = await data.upsertDocsFile({
      ...activeDoc.value,
      title:     draftTitle.value.trim() || 'Untitled',
      content:   draftContent.value,
      updatedBy: auth.user?.id ?? null
    }, { skipRefetch: true });
    if (ok) {
      unsavedDocIds.value.delete(docIdAtSaveStart!);
      unsavedDocIds.value = new Set(unsavedDocIds.value);
      setSaved();
      if (showToastOnSuccess) showToast('Saved.');
      return true;
    } else {
      saveStatus.value = 'error';
      return false;
    }
  } catch {
    saveStatus.value = 'error';
    return false;
  }
};

const saveNow = () => {
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  void performSave(true);
};

// ── Input handlers ────────────────────────────────────────────────────────────
const markDirty = () => {
  if (activeDocId.value) {
    unsavedDocIds.value = new Set([...unsavedDocIds.value, activeDocId.value]);
  }
};

const onTitleInput = () => {
  markDirty();
  scheduleAutoSave();
};

const onContentInput = () => {
  markDirty();
  scheduleAutoSave();
};

// After paste the browser scrolls the textarea to the new caret position (end
// of pasted text). We reset the scroll container to top so the user sees the
// beginning of the content, not the bottom. The pasted text is never lost.
const onPaste = () => {
  setTimeout(() => { scrollEditorToTop(); }, 0);
};

// Flush title on blur (instant save without debounce)
const flushTitle = () => {
  if (!draftTitle.value.trim()) draftTitle.value = 'Untitled';
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
  void performSave();
};

// ── Inline rename in sidebar ──────────────────────────────────────────────────
const renamingDocId = ref<string | null>(null);
const renameDraft   = ref('');
const renameInputs  = new Map<string, HTMLInputElement>();

const setRenameInputRef = (el: unknown, id: string) => {
  if (el instanceof HTMLInputElement) {
    renameInputs.set(id, el);
  } else {
    renameInputs.delete(id);
  }
};

const startRename = (doc: DocsFile) => {
  if (auth.isViewer) return;
  renamingDocId.value = doc.id;
  renameDraft.value   = doc.title || '';
  nextTick(() => {
    const input = renameInputs.get(doc.id);
    if (input) {
      input.focus();
      input.select();
    }
  });
};

const cancelRename = () => {
  renamingDocId.value = null;
  renameDraft.value   = '';
};

const commitRename = async () => {
  const id = renamingDocId.value;
  if (!id) return;
  const doc = data.docsFiles.find((d) => d.id === id);
  renamingDocId.value = null;
  if (!doc) return;

  const nextTitle = renameDraft.value.trim() || 'Untitled';
  if (nextTitle === doc.title) return;

  // Optimistic local update — instant in the UI.
  const idx = data.docsFiles.findIndex((d) => d.id === id);
  if (idx !== -1) data.docsFiles[idx] = { ...data.docsFiles[idx], title: nextTitle };

  // If this is the active doc, keep the editor title in sync.
  if (activeDocId.value === id) draftTitle.value = nextTitle;

  // Persist (skipRefetch so we don't clobber local state).
  const wasSaving = saveStatus.value === 'saving';
  if (!wasSaving) saveStatus.value = 'saving';
  try {
    const ok = await data.upsertDocsFile({
      ...doc,
      title: nextTitle,
      updatedBy: auth.user?.id ?? null
    }, { skipRefetch: true });
    if (ok) {
      setSaved();
    } else {
      saveStatus.value = 'error';
      showToast('Could not rename.', 'error');
    }
  } catch {
    saveStatus.value = 'error';
    showToast('Could not rename.', 'error');
  }
};

// Click on doc row — but don't trigger select while renaming this row.
const onDocItemClick = (doc: DocsFile) => {
  if (renamingDocId.value === doc.id) return;
  selectDoc(doc);
  mobileSidebarOpen.value = false;
};

// Enter key on focused doc row (keyboard navigation). Not while renaming.
const onDocItemEnter = (doc: DocsFile, e: KeyboardEvent) => {
  if (renamingDocId.value === doc.id) return;
  e.preventDefault();
  selectDoc(doc);
};

// ── Select doc ────────────────────────────────────────────────────────────────
const selectDoc = (doc: DocsFile, focusTitle = false) => {
  // Flush pending save on old doc first
  if (activeDocId.value && autoSaveTimer) {
    clearTimeout(autoSaveTimer);
    void performSave();
  }
  activeDocId.value  = doc.id;
  draftTitle.value   = doc.title;
  draftContent.value = doc.content;
  saveStatus.value   = 'idle';
  // Scroll to top after Vue updates the textarea value.
  // Do NOT focus the editor here — focusing a textarea moves the caret to the
  // end and the browser scrolls the container to follow it.
  nextTick(() => {
    scrollEditorToTop();
    if (focusTitle) {
      titleRef.value?.select();
      titleRef.value?.focus();
    }
  });
};

// ── Permissions ───────────────────────────────────────────────────────────────
const canWrite = computed(() => {
  if (auth.isViewer) return false;
  if (!folder.value) return false;
  if (auth.isAdmin) return true;
  if (folder.value.createdBy === auth.user?.id) return true;
  return data.docsAssignments.some(
    (a) => a.assignedTo === auth.user?.id && a.folderId === folderId.value
  );
});

const canDeleteDoc = computed(() => {
  if (auth.isViewer) return false;
  if (!activeDoc.value) return false;
  return auth.isAdmin || activeDoc.value.createdBy === auth.user?.id;
});

// ── Create ────────────────────────────────────────────────────────────────────
const createDoc = async () => {
  if (!canWrite.value || !folder.value || creating.value) return;
  creating.value = true;
  try {
    const ok = await data.upsertDocsFile(defaultTextDoc());
    if (ok) {
      // upsertDocsFile already refetched docs list. Pick the newest doc in this folder.
      const newest = [...data.docsFiles]
        .filter((f) => f.folderId === folderId.value && f.type === 'text_doc')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (newest) selectDoc(newest, true);
    } else {
      showToast(data.errors.docsFiles ?? 'Could not create document.', 'error');
    }
  } catch {
    showToast('Could not create document.', 'error');
  } finally {
    creating.value = false;
  }
};

// ── Duplicate ─────────────────────────────────────────────────────────────────
const duplicateDoc = async () => {
  if (!activeDoc.value) return;
  try {
    const ok = await data.upsertDocsFile({
      ...defaultTextDoc(),
      title: `${draftTitle.value.trim() || activeDoc.value.title} (copy)`,
      description: activeDoc.value.description,
      content: draftContent.value,
    });
    if (ok) {
      const newest = [...data.docsFiles]
        .filter((f) => f.folderId === folderId.value && f.type === 'text_doc')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
      if (newest) selectDoc(newest);
      showToast('Duplicated.');
    }
  } catch {
    showToast('Could not duplicate.', 'error');
  }
};

// ── Delete ────────────────────────────────────────────────────────────────────
const confirmDeleteDoc = async () => {
  if (!activeDoc.value) return;
  if (!confirm(`Delete "${activeDoc.value.title}"? This cannot be undone.`)) return;
  const id = activeDocId.value!;
  activeDocId.value = null;
  try {
    await data.removeDocsFile(id);
    showToast('Document deleted.');
    if (textDocs.value.length > 0) selectDoc(textDocs.value[0]);
  } catch {
    showToast('Could not delete.', 'error');
  }
};

// ── Copy text ─────────────────────────────────────────────────────────────────
const copyLabel = ref('Copy');
const copyText = async () => {
  try {
    await navigator.clipboard.writeText(draftContent.value);
    copyLabel.value = 'Copied!';
    setTimeout(() => (copyLabel.value = 'Copy'), 2000);
  } catch {
    showToast('Could not copy.', 'error');
  }
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const memberName = (id: string | null) => {
  if (!id) return 'Team';
  const m = data.memberById(id);
  return m?.fullName || m?.email || 'Team';
};

const fmtDate = (iso: string) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch { return iso.slice(0, 10); }
};

const relativeDate = (iso: string) => {
  if (!iso) return '';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d}d ago`;
    return fmtDate(iso);
  } catch { return ''; }
};

// ── Toast ─────────────────────────────────────────────────────────────────────
const toast = ref<{ msg: string; type: 'success' | 'error' } | null>(null);
let toastTimer: ReturnType<typeof setTimeout> | null = null;
const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
  if (toastTimer) clearTimeout(toastTimer);
  toast.value = { msg, type };
  toastTimer = setTimeout(() => (toast.value = null), 2800);
};

// ── Keyboard shortcut: Cmd/Ctrl+S ────────────────────────────────────────────
const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault();
    saveNow();
  }
};

// ── Load ──────────────────────────────────────────────────────────────────────
onMounted(async () => {
  window.addEventListener('keydown', onKeydown);
  loading.value = true;
  try {
    await Promise.allSettled([
      data.fetchDocsFolders(),
      data.fetchDocsFiles(),
      data.fetchDocsAssignments(),
      data.members.length ? Promise.resolve() : data.fetchMembers()
    ]);
  } finally {
    loadedOnce.value = true;
    loading.value = false;
    if (textDocs.value.length > 0) selectDoc(textDocs.value[0]);
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  if (autoSaveTimer) clearTimeout(autoSaveTimer);
});

// Sync when active doc data changes from store (e.g. after save refreshes)
watch(activeDoc, (doc, prev) => {
  if (doc && doc.id !== prev?.id) {
    draftTitle.value   = doc.title;
    draftContent.value = doc.content;
  }
});
</script>

<style scoped>
.dfd-root {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 128px);
}

/* Breadcrumb */
.dfd-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 0.85rem;
  flex-shrink: 0;
}
.dfd-bc-link { color: var(--primary); text-decoration: none; }
.dfd-bc-link:hover { text-decoration: underline; }
.dfd-bc-sep { opacity: 0.4; }
.dfd-bc-current { font-weight: 600; color: var(--text-main); }

/* Missing folder */
.dfd-missing {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--text-muted);
}
.dfd-missing h3 { font-size: 1rem; font-weight: 800; color: var(--text-main); margin: 0; }
.dfd-missing p  { font-size: 0.85rem; margin: 0 0 0.5rem; }

/* Skeleton */
.dfd-skeleton-wrap {
  display: flex;
  gap: 0;
  flex: 1;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  height: calc(100vh - 164px);
  min-height: 400px;
}
.dfd-skeleton-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--soft-bg);
  animation: dfd-pulse 1.4s ease-in-out infinite;
}
.dfd-skeleton-editor {
  flex: 1;
  background: color-mix(in srgb, var(--soft-bg) 40%, var(--card-bg));
  animation: dfd-pulse 1.4s ease-in-out 0.2s infinite;
}
@keyframes dfd-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Workspace ── */
.dfd-workspace {
  display: flex;
  flex: 1;
  height: calc(100vh - 164px);
  min-height: 500px;
  border: 1px solid var(--border);
  border-radius: 16px;
  overflow: hidden;
  background: var(--card-bg);
}

/* ── Sidebar ── */
.dfd-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background: var(--soft-bg);
  min-height: 0;
}

.dfd-sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.9rem 1rem 0.7rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.dfd-sidebar-folder-name {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.73rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 0;
  overflow: hidden;
}
.dfd-sidebar-folder-name span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dfd-sidebar-folder-name svg { flex-shrink: 0; }

.dfd-new-doc-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 7px;
  padding: 0.28rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  transition: opacity 120ms;
}
.dfd-new-doc-btn:hover:not(:disabled) { opacity: 0.88; }
.dfd-new-doc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Search */
.dfd-search-wrap {
  position: relative;
  padding: 0.6rem 0.75rem 0.5rem;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
}
.dfd-search-icon {
  position: absolute;
  left: 1.25rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
  pointer-events: none;
}
.dfd-search {
  width: 100%;
  padding: 0.42rem 0.65rem 0.42rem 2rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.8rem;
  outline: none;
  transition: border-color 120ms;
}
.dfd-search:focus { border-color: var(--primary); }

/* Doc list */
.dfd-doc-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.4rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.dfd-sidebar-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.65rem;
  padding: 2rem 1rem;
  text-align: center;
}
.dfd-sidebar-empty p {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin: 0;
}

.dfd-sidebar-create-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: transparent;
  border: 1.5px dashed var(--border);
  border-radius: 8px;
  padding: 0.4rem 0.8rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  transition: border-color 120ms, background 120ms;
}
.dfd-sidebar-create-btn:hover { border-color: var(--primary); background: color-mix(in srgb, var(--primary) 5%, transparent); }

.dfd-doc-item {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  text-align: left;
  padding: 0.55rem 0.65rem;
  border-radius: 9px;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-main);
  transition: background 110ms;
  position: relative;
}
.dfd-doc-item:hover { background: var(--border); }
.dfd-doc-item--active {
  background: var(--card-bg);
  box-shadow: 0 1px 4px rgba(0,0,0,0.07);
}

.dfd-doc-icon { flex-shrink: 0; color: var(--text-muted); }
.dfd-doc-item--active .dfd-doc-icon { color: var(--primary); }

.dfd-doc-item-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.dfd-doc-item-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.3;
}
.dfd-doc-item--active .dfd-doc-item-title { color: var(--primary); font-weight: 700; }

.dfd-doc-item-date {
  font-size: 0.68rem;
  color: var(--text-muted);
  line-height: 1.2;
}

.dfd-unsaved-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
  flex-shrink: 0;
}

/* Inline rename input */
.dfd-doc-item--renaming { background: var(--card-bg); }
.dfd-doc-item-rename {
  width: 100%;
  border: 1px solid var(--primary);
  border-radius: 6px;
  padding: 0.2rem 0.4rem;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.82rem;
  font-weight: 600;
  outline: none;
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 20%, transparent);
}

/* ── Editor area ── */
.dfd-editor-area {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Mobile toggle — hidden on desktop */
.dfd-mobile-toggle {
  display: none;
  align-items: center;
  gap: 0.5rem;
  background: var(--soft-bg);
  border: none;
  border-bottom: 1px solid var(--border);
  padding: 0.65rem 1rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-main);
  cursor: pointer;
  width: 100%;
  text-align: left;
}

/* Empty main */
.dfd-empty-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: var(--text-muted);
  padding: 3rem 2rem;
  text-align: center;
}
.dfd-empty-main h3 { font-size: 1rem; font-weight: 800; color: var(--text-main); margin: 0; }
.dfd-empty-main p  { font-size: 0.85rem; margin: 0; }
.dfd-empty-main .btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
}

/* ── Top bar ── */
.dfd-topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1.25rem;
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.dfd-title-wrap { flex: 1; min-width: 0; }

.dfd-title-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--text-main);
  padding: 0;
  caret-color: var(--primary);
}
.dfd-title-input::placeholder { color: var(--text-muted); opacity: 0.4; }

/* Save status */
.dfd-save-status {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.73rem;
  font-weight: 700;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 200ms;
}
.dfd-save-status--saving,
.dfd-save-status--saved,
.dfd-save-status--error { opacity: 1; }

.dfd-save-status--saving { color: var(--text-muted); }
.dfd-save-status--saved  { color: #16a34a; }
.dfd-save-status--error  { color: #dc2626; }

.dfd-save-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid var(--border);
  border-top-color: var(--text-muted);
  border-radius: 50%;
  animation: dfd-spin 0.6s linear infinite;
}
@keyframes dfd-spin { to { transform: rotate(360deg); } }

/* Actions */
.dfd-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.dfd-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 8px;
  padding: 0.3rem 0.6rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 700;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-main);
  cursor: pointer;
  transition: background 110ms, color 110ms, border-color 110ms;
}
.dfd-action-btn:hover { background: var(--soft-bg); }
.dfd-action-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.dfd-action-btn--danger { color: #dc2626; border-color: rgba(220,38,38,0.22); }
.dfd-action-btn--danger:hover { background: rgba(220,38,38,0.07); border-color: rgba(220,38,38,0.35); }

.dfd-action-btn--save {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}
.dfd-action-btn--save:hover:not(:disabled) { opacity: 0.88; }

/* Editor body */
.dfd-editor-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 1.75rem 3rem;
  cursor: text;
}

.dfd-editor {
  flex: 1;
  width: 100%;
  min-height: 100%;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  font-family: 'Georgia', 'Raleway', serif;
  font-size: 1rem;
  line-height: 1.85;
  color: var(--text-main);
  caret-color: var(--primary);
}
.dfd-editor::placeholder { color: var(--text-muted); opacity: 0.4; font-style: italic; }

/* Footer */
.dfd-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  padding: 0.5rem 1.25rem;
  font-size: 0.71rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  flex-shrink: 0;
}
.dfd-footer-sep { opacity: 0.4; }

/* Toast */
.dfd-toast {
  position: fixed;
  bottom: 1.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1.25rem;
  border-radius: 999px;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: 0 4px 20px rgba(0,0,0,0.18);
  pointer-events: none;
  white-space: nowrap;
}
.dfd-toast--success { background: #16a34a; color: #fff; }
.dfd-toast--error   { background: #dc2626; color: #fff; }

.dfd-toast-anim-enter-active { transition: opacity 160ms, transform 160ms; }
.dfd-toast-anim-leave-active { transition: opacity 200ms, transform 200ms; }
.dfd-toast-anim-enter-from  { opacity: 0; transform: translateX(-50%) translateY(8px); }
.dfd-toast-anim-leave-to    { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* Mobile backdrop */
.dfd-mobile-backdrop {
  position: fixed;
  inset: 0;
  z-index: 149;
  background: rgba(0,0,0,0.35);
}

/* ── Mobile ── */
@media (max-width: 768px) {
  .dfd-workspace {
    flex-direction: column;
    height: auto;
    min-height: calc(100vh - 140px);
  }

  .dfd-mobile-toggle {
    display: flex;
  }

  .dfd-sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 150;
    width: 280px;
    border-right: 1px solid var(--border);
    transform: translateX(-100%);
    transition: transform 220ms cubic-bezier(0.4, 0, 0.2, 1);
    border-radius: 0;
  }

  .dfd-sidebar--mobile-open {
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0,0,0,0.18);
  }

  .dfd-editor-body { padding: 1rem 1.1rem; }
  .dfd-topbar { padding: 0.6rem 0.9rem; }
  .dfd-footer { padding: 0.4rem 0.9rem; }

  .dfd-action-label { display: none; }
  .dfd-action-btn { padding: 0.35rem 0.5rem; }
}
</style>
