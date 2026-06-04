<template>
  <Modal
    :open="open && !!issue"
    :title="issue?.title || ''"
    :subtitle="typeLabel(issue?.issueType)"
    size="xl"
    @close="$emit('close')"
  >
    <div v-if="issue" class="id-body">
      <!-- ── Top strip: status pills + page URL chip ──────────────── -->
      <div class="id-strip">
        <div class="id-strip-pills">
          <span class="id-meta-pill" :class="`id-status--${issue.status}`">
            {{ statusLabel(issue.status) }}
          </span>
          <span v-if="issue.priority !== 'normal'" class="id-meta-pill" :class="`id-prio--${issue.priority}`">
            {{ issue.priority.toUpperCase() }}
          </span>
          <span v-if="issue.dueDate" class="id-meta-text">Due {{ formatDate(issue.dueDate) }}</span>
        </div>
        <a
          v-if="issue.pageUrl"
          :href="issue.pageUrl"
          target="_blank"
          rel="noopener"
          class="id-url-chip"
          :title="`Open ${issue.pageUrl} in a new tab`"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
          <span class="id-url-chip-text">{{ shortUrl(issue.pageUrl) }}</span>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </a>
      </div>

      <!-- ── Two-column grid: media (left) + details (right) ──────── -->
      <div class="id-grid">
        <!-- LEFT: screenshot -->
        <div class="id-col id-col-media">
          <div v-if="issue.screenshotUrl" class="id-shot-card">
            <button
              type="button"
              class="id-shot-thumb-btn"
              title="Click to view full size"
              @click="lightboxOpen = true"
            >
              <img :src="issue.screenshotUrl" alt="Issue screenshot" class="id-screenshot" />
              <span class="id-shot-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                Review fully
              </span>
            </button>
            <button
              type="button"
              class="id-shot-review"
              title="View the screenshot full size"
              @click="lightboxOpen = true"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
              Review fully
            </button>
          </div>
          <div v-else class="id-shot-empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span>No screenshot attached</span>
          </div>
        </div>

        <!-- RIGHT: details + comments -->
        <div class="id-col id-col-details">
          <!-- Description -->
          <div class="id-section">
            <span class="id-section-label">Description</span>
            <p class="id-description">{{ issue.description || '—' }}</p>
          </div>

          <!-- Assignment -->
          <div class="id-section">
            <span class="id-section-label">Assigned to</span>
            <div v-if="isAdmin" class="id-assign-row">
              <select v-model="assignedLocal" class="id-select" @change="onAssignChange">
                <option value="">Unassigned</option>
                <option v-for="m in members" :key="m.id" :value="m.id">
                  {{ m.fullName || m.email }}
                </option>
              </select>
            </div>
            <div v-else class="id-assigned">
              <span>{{ memberName(issue.assignedTo) }}</span>
            </div>
          </div>

          <!-- Comments -->
          <div class="id-section id-section-comments">
            <span class="id-section-label">Comments &amp; updates</span>
            <div v-if="issueComments.length === 0" class="id-comments-empty">No comments yet.</div>
            <div v-else class="id-comments">
              <div v-for="c in issueComments" :key="c.id" class="id-comment">
                <div class="id-comment-head">
                  <span class="id-comment-author">{{ memberName(c.userId) }}</span>
                  <span class="id-comment-time">{{ formatTimestamp(c.createdAt) }}</span>
                </div>
                <p class="id-comment-msg">{{ c.message }}</p>
                <img v-if="c.screenshotUrl" :src="c.screenshotUrl" alt="" class="id-comment-shot" />
              </div>
            </div>
            <div v-if="canComment" class="id-comment-form">
              <textarea
                v-model="newComment"
                class="id-input id-textarea"
                placeholder="Add an update…"
                rows="2"
                @keydown.enter.exact.prevent="postComment"
              />
              <div v-if="commentScreenshotUrl" class="id-comment-upload-preview">
                <img :src="commentScreenshotUrl" alt="" />
                <button type="button" class="btn-ghost id-remove-shot" :disabled="posting" @click="removeCommentScreenshot">
                  Remove
                </button>
              </div>
              <div class="id-comment-actions">
                <label class="btn-secondary id-upload-btn" :class="{ 'is-disabled': posting || uploadingCommentShot }">
                  <input type="file" accept="image/*" :disabled="posting || uploadingCommentShot" @change="onCommentScreenshotChange" />
                  {{ uploadingCommentShot ? 'Uploading…' : commentScreenshotUrl ? 'Replace image' : 'Add image' }}
                </label>
                <button
                  type="button"
                  class="btn-secondary id-post-btn"
                  :disabled="!newComment.trim() || posting || uploadingCommentShot"
                  @click="postComment"
                >
                  {{ posting ? 'Posting…' : 'Post' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Lightbox: full-size screenshot review -->
      <Teleport to="body">
        <Transition name="idlb-fade">
          <div
            v-if="lightboxOpen && issue.screenshotUrl"
            class="idlb-backdrop"
            role="dialog"
            aria-modal="true"
            aria-label="Screenshot review"
            @click.self="lightboxOpen = false"
          >
            <button class="idlb-close" type="button" title="Close (Esc)" @click="lightboxOpen = false">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
            <img :src="issue.screenshotUrl" alt="Issue screenshot full size" class="idlb-img" />
            <a
              :href="issue.screenshotUrl"
              target="_blank"
              rel="noopener"
              class="idlb-open"
              title="Open image in a new tab"
              @click.stop
            >
              Open in new tab
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
        </Transition>
      </Teleport>

      <div v-if="err" class="id-error">{{ err }}</div>
    </div>

    <template #footer>
      <div v-if="issue" class="id-footer">
        <!-- Admin destructive actions -->
        <button v-if="isAdmin" class="btn-danger" type="button" :disabled="busy" @click="onDelete">
          Delete
        </button>

        <div class="id-footer-actions">
          <button
            v-if="canEditIssue"
            class="btn-secondary"
            type="button"
            :disabled="busy"
            @click="$emit('edit', issue.id)"
          >
            Edit Issue
          </button>

          <button
            v-if="canMemberAct && (issue.status === 'new_issue' || issue.status === 'in_progress')"
            class="btn-primary"
            type="button"
            :disabled="busy"
            @click="move('fixed')"
          >
            Mark Fixed
          </button>
          <button
            v-if="canMemberAct && issue.status === 'fixed'"
            class="btn-primary"
            type="button"
            :disabled="busy"
            @click="move('needs_review')"
          >
            Send for Review
          </button>
          <button
            v-if="canMemberAct && (issue.status === 'fixed' || issue.status === 'needs_review')"
            class="btn-secondary"
            type="button"
            :disabled="busy"
            @click="move('new_issue')"
          >
            Reopen
          </button>

          <button
            v-if="canApprove && (issue.status === 'fixed' || issue.status === 'needs_review')"
            class="btn-secondary"
            type="button"
            :disabled="busy"
            @click="move('new_issue')"
          >
            Send back
          </button>
          <button
            v-if="canApprove && (issue.status === 'fixed' || issue.status === 'needs_review')"
            class="btn-primary"
            type="button"
            :disabled="busy"
            @click="move('approved')"
          >
            Approve
          </button>
          <button
            v-if="canApprove && issue.status === 'approved'"
            class="btn-secondary"
            type="button"
            :disabled="busy"
            @click="move('new_issue')"
          >
            Reopen
          </button>

          <button class="btn-ghost" type="button" @click="$emit('close')">Close</button>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member } from '@/stores/data';
import { optimizeImage } from '@/utils/imageOptimizer';
import {
  useQualityCheckStore,
  QUALITY_ISSUE_TYPES,
  type QualityIssueStatus,
  type QualityIssueType
} from '@/stores/qualityCheck';

const props = defineProps<{
  open: boolean;
  issueId: string | null;
  members: Member[];
}>();
const emit = defineEmits<{ (e: 'close'): void; (e: 'edit', id: string): void }>();

const auth = useAuthStore();
const data = useDataStore();
const qc   = useQualityCheckStore();

const issue = computed(() =>
  props.issueId ? qc.issues.find((i) => i.id === props.issueId) ?? null : null
);
const isAdmin = computed(() => auth.isAdmin);
const isAssistantHead = computed(() => auth.isAssistantHead);
const canApprove = computed(() => isAdmin.value || isAssistantHead.value);
const isAssignee = computed(
  () => !!issue.value && issue.value.assignedTo === auth.user?.id
);
const isReporter = computed(
  () => !!issue.value && issue.value.createdBy === auth.user?.id
);
// Any authenticated team member (not just the assignee) can act on cards —
// matches the DB policy in migration 0065.
const isTeamMember = computed(() => !auth.isQualityChecker);
const canMemberAct = computed(() => isTeamMember.value && !isAdmin.value && !isAssistantHead.value);
// Any team member can comment; quality checkers can only comment on their own issues.
const canComment = computed(() =>
  isAdmin.value ||
  isAssistantHead.value ||
  (isTeamMember.value) ||
  isAssignee.value ||
  isReporter.value
);
const canEditIssue = computed(() => isAdmin.value || isTeamMember.value);

const assignedLocal = ref('');
watch(issue, (i) => { assignedLocal.value = i?.assignedTo ?? ''; }, { immediate: true });

watch(
  () => props.issueId,
  async (id) => {
    if (id) await qc.fetchComments(id);
  },
  { immediate: true }
);

const issueComments = computed(() =>
  props.issueId ? qc.commentsForIssue(props.issueId) : []
);

const busy = ref(false);
const posting = ref(false);
const uploadingCommentShot = ref(false);
const newComment = ref('');
const commentScreenshotUrl = ref<string | null>(null);
const err = ref('');

// Lightbox state for the "Review fully" full-size screenshot viewer
const lightboxOpen = ref(false);
const onLightboxKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape') lightboxOpen.value = false;
};
watch(lightboxOpen, (v) => {
  if (v) {
    document.addEventListener('keydown', onLightboxKey);
    document.body.style.overflow = 'hidden';
  } else {
    document.removeEventListener('keydown', onLightboxKey);
    document.body.style.overflow = '';
  }
});
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onLightboxKey);
  document.body.style.overflow = '';
});

const move = async (status: QualityIssueStatus) => {
  if (!issue.value) return;
  if (!canApprove.value && status === 'approved') {
    err.value = 'Only Head, Assistant Head, or Admins can approve fixes.';
    return;
  }
  busy.value = true;
  err.value = '';
  try {
    const ok = await qc.moveStatus(issue.value.id, status);
    if (!ok) err.value = qc.error || 'Could not move issue.';
  } finally {
    busy.value = false;
  }
};

const onAssignChange = async () => {
  if (!issue.value) return;
  busy.value = true;
  err.value = '';
  try {
    const ok = await qc.updateIssue(issue.value.id, {
      assignedTo: assignedLocal.value || null
    });
    if (!ok) err.value = qc.error || 'Could not change assignee.';
  } finally {
    busy.value = false;
  }
};

const onDelete = async () => {
  if (!issue.value) return;
  if (!window.confirm(`Delete "${issue.value.title}"? This cannot be undone.`)) return;
  busy.value = true;
  try {
    const ok = await qc.deleteIssue(issue.value.id);
    if (ok) emit('close');
  } finally {
    busy.value = false;
  }
};

const postComment = async () => {
  if (!issue.value || !newComment.value.trim()) return;
  posting.value = true;
  err.value = '';
  try {
    const ok = await qc.addComment(issue.value.id, newComment.value, commentScreenshotUrl.value);
    if (ok) {
      newComment.value = '';
      commentScreenshotUrl.value = null;
    }
    else err.value = qc.error || 'Could not post comment.';
  } finally {
    posting.value = false;
  }
};

const onCommentScreenshotChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;

  uploadingCommentShot.value = true;
  err.value = '';
  try {
    let uploadFile = file;
    try {
      const optimized = await optimizeImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetSizeKB: 180,
        maxSizeKB: 350
      });
      uploadFile = optimized.file;
    } catch (optErr) {
      console.warn('[qualityCheck] comment screenshot optimization skipped', optErr);
    }

    const url = await qc.uploadIssueScreenshot(uploadFile);
    if (url) commentScreenshotUrl.value = url;
    else err.value = qc.error || 'Could not upload screenshot.';
  } finally {
    uploadingCommentShot.value = false;
  }
};

const removeCommentScreenshot = () => {
  commentScreenshotUrl.value = null;
};

// Formatters
const typeLabel = (t?: QualityIssueType) =>
  t ? (QUALITY_ISSUE_TYPES.find((x) => x.value === t)?.label ?? t) : '';
const statusLabel = (s: QualityIssueStatus) =>
  ({ new_issue: 'New', in_progress: 'In Progress', fixed: 'Fixed', needs_review: 'Needs Review', approved: 'Approved' }[s]);
const memberName = (id: string | null) =>
  id ? (data.members.find((m) => m.id === id)?.fullName || 'Unassigned') : 'Unassigned';
const formatDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const formatTimestamp = (ts: string) =>
  new Date(ts).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

/**
 * Short, readable form of the page URL for the chip. Strips protocol and
 * trailing slash; falls back to the full string if parsing fails.
 */
const shortUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '');
    return path && path !== '/' ? `${u.host}${path}` : u.host;
  } catch {
    return url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }
};
</script>

<style scoped>
/* ── Body shell ──────────────────────────────────────────────────── */
.id-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* ── Top strip: pills + URL chip ─────────────────────────────────── */
.id-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  flex-wrap: wrap;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border);
}
.id-strip-pills {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}
.id-meta-pill {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-radius: 999px;
  padding: 0.22rem 0.7rem;
}
.id-status--new_issue    { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
.id-status--in_progress  { background: rgba(245,158,11,0.16); color: #f59e0b; }
.id-status--fixed        { background: rgba(22,163,74,0.14); color: #16a34a; }
.id-status--needs_review { background: rgba(168,85,247,0.16); color: #a855f7; }
.id-status--approved     { background: rgba(22,163,74,0.16); color: #16a34a; }
.id-prio--urgent { background: rgba(220,38,38,0.14); color: #dc2626; }
.id-prio--high   { background: rgba(245,158,11,0.16); color: #f59e0b; }
.id-prio--low    { background: var(--soft-bg); color: var(--text-muted); }
.id-meta-text { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }

.id-url-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  max-width: 26rem;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--primary);
  border-radius: 999px;
  padding: 0.28rem 0.75rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 700;
  text-decoration: none;
  transition: background 140ms, border-color 140ms, color 140ms;
}
.id-url-chip:hover {
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  border-color: color-mix(in srgb, var(--primary) 35%, var(--border));
}
.id-url-chip-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

/* ── Two-column grid ─────────────────────────────────────────────── */
.id-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
  gap: 1.2rem;
  align-items: start;
}
@media (max-width: 900px) {
  .id-grid { grid-template-columns: 1fr; }
}
.id-col { min-width: 0; }
.id-col-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.id-section { display: flex; flex-direction: column; gap: 0.4rem; }
.id-section-label {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.id-description {
  white-space: pre-wrap;
  font-size: 0.88rem;
  line-height: 1.55;
  color: var(--text-main);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.8rem 0.95rem;
  margin: 0;
}

/* ── Screenshot card (left column) ───────────────────────────────── */
.id-shot-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #0b0f17;
  overflow: hidden;
  /* keep the screenshot visible without dominating the modal */
  max-height: 32rem;
}
.id-shot-thumb-btn {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  padding: 0;
  cursor: zoom-in;
  position: relative;
}
.id-screenshot {
  display: block;
  width: 100%;
  max-height: 32rem;
  object-fit: contain;
  background: #0b0f17;
}
.id-shot-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  color: #fff;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.86rem;
  font-weight: 800;
  background: rgba(8, 12, 20, 0);
  opacity: 0;
  transition: opacity 160ms ease, background 160ms ease;
  pointer-events: none;
}
.id-shot-thumb-btn:hover .id-shot-overlay,
.id-shot-thumb-btn:focus-visible .id-shot-overlay {
  opacity: 1;
  background: rgba(8, 12, 20, 0.45);
}
.id-shot-review {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(8, 12, 20, 0.55);
  color: #fff;
  border-radius: 999px;
  padding: 0.3rem 0.7rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  transition: background 140ms, border-color 140ms;
}
.id-shot-review:hover {
  background: rgba(8, 12, 20, 0.8);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Empty screenshot state — keeps left column from collapsing */
.id-shot-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 14rem;
  border: 1px dashed var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg));
  color: var(--text-muted);
  font-size: 0.85rem;
}

/* ── Lightbox ────────────────────────────────────────────────────── */
.idlb-backdrop {
  position: fixed;
  inset: 0;
  z-index: 110;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.82);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.idlb-img {
  max-width: min(100%, 1200px);
  max-height: calc(100vh - 4rem);
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 10px;
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.6);
}
.idlb-close {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 140ms;
}
.idlb-close:hover { background: rgba(255, 255, 255, 0.22); }
.idlb-open {
  position: absolute;
  bottom: 1.1rem;
  right: 1.1rem;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  color: #fff;
  text-decoration: none;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  transition: background 140ms;
}
.idlb-open:hover { background: rgba(255, 255, 255, 0.22); }
.idlb-fade-enter-active,
.idlb-fade-leave-active { transition: opacity 180ms ease; }
.idlb-fade-enter-from,
.idlb-fade-leave-to { opacity: 0; }

/* ── Assignment ──────────────────────────────────────────────────── */
.id-assigned {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-main);
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.55rem 0.8rem;
}
.id-assign-row { display: flex; gap: 0.5rem; }
.id-select, .id-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.55rem 0.75rem;
  font-size: 0.88rem;
  font-family: inherit;
  outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.id-select:focus,
.id-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}
.id-textarea { resize: vertical; min-height: 4.5rem; font-family: inherit; }

/* ── Comments ────────────────────────────────────────────────────── */
.id-section-comments { gap: 0.55rem; }
.id-comments {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 22rem;
  overflow-y: auto;
  padding-right: 0.15rem;
}
.id-comments-empty { font-size: 0.82rem; color: var(--text-muted); font-style: italic; }
.id-comment {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 55%, var(--card-bg));
  padding: 0.7rem 0.85rem;
}
.id-comment-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.3rem;
}
.id-comment-author {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.82rem;
  font-weight: 800;
  color: var(--text-main);
}
.id-comment-time { font-size: 0.7rem; color: var(--text-muted); }
.id-comment-msg {
  font-size: 0.86rem;
  line-height: 1.5;
  color: var(--text-main);
  margin: 0;
  white-space: pre-wrap;
}
.id-comment-shot {
  margin-top: 0.5rem;
  max-width: 100%;
  max-height: 12rem;
  border-radius: 10px;
  border: 1px solid var(--border);
}

.id-comment-form {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  margin-top: 0.5rem;
}
.id-comment-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.id-upload-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.id-upload-btn input { display: none; }
.id-upload-btn.is-disabled {
  opacity: 0.55;
  pointer-events: none;
}
.id-comment-upload-preview {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--soft-bg);
  padding: 0.45rem;
}
.id-comment-upload-preview img {
  width: 4.25rem;
  height: 3rem;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
}
.id-remove-shot { margin-left: auto; }

.id-error {
  font-size: 0.8rem;
  color: #ef4444;
  font-weight: 600;
}

/* ── Footer ──────────────────────────────────────────────────────── */
.id-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  flex-wrap: wrap;
}
.id-footer-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-left: auto;
}
</style>
