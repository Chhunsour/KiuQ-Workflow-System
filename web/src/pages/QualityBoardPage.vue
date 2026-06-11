<template>
  <div class="qb-page">
    <!-- ── Hero: website identity + actions ─────────────────────────────── -->
    <section class="board-hero">
      <div class="board-hero-left">
        <div class="board-hero-icon">
          <img
            v-if="website?.faviconUrl"
            :src="website.faviconUrl"
            alt=""
            class="board-hero-favicon"
            @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
          />
          <span v-else>{{ (website?.name || 'QC').slice(0, 2).toUpperCase() }}</span>
        </div>
        <div class="board-hero-text">
          <span class="board-hero-kicker">Quality Check</span>
          <h1 class="page-title">{{ website?.name || 'Quality Board' }}</h1>
          <p class="page-subtitle">{{ website?.domain || 'Track and fix website issues — kanban-style.' }}</p>
        </div>
      </div>
      <div class="board-hero-actions">
        <RouterLink :to="qualityCheckHome" class="btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
          All Websites
        </RouterLink>
        <button class="btn-primary" type="button" @click="openCreate">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Issue
        </button>
      </div>
    </section>

    <!-- ── Loading ──────────────────────────────────────────────────────── -->
    <section v-if="loading && !issues.length" class="board-loading">
      <div v-for="col in QUALITY_STATUS_COLUMNS" :key="col.value" class="board-column skeleton-column" />
    </section>

    <!-- ── Board ────────────────────────────────────────────────────────── -->
    <section v-else class="board-shell">
      <div v-if="issues.length > 0 && filteredIssues.length === 0" class="filter-empty card">
        <div>
          <h2>No issues match these filters.</h2>
          <p>Clear search or filters to see more issues.</p>
        </div>
        <button class="btn-secondary" type="button" @click="clearFilters">Clear filters</button>
      </div>

      <!-- Toolbar: zoom + search + type filter -->
      <div class="board-toolbar card">
        <div class="zoom-controls">
          <span class="zoom-label">Board View</span>
          <div class="zoom-actions">
            <button class="zoom-btn" type="button" @click="zoomOut" :disabled="zoomLevel === 70" title="Zoom Out">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <span class="zoom-percentage">{{ zoomLevel }}%</span>
            <button class="zoom-btn" type="button" @click="zoomIn" :disabled="zoomLevel === 120" title="Zoom In">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            <button class="zoom-reset" type="button" @click="resetZoom" :class="{ visible: zoomLevel !== 100 }" title="Reset Board Zoom">Reset</button>
          </div>
          <span class="zoom-helper">Board zoom only.</span>
        </div>

        <div class="toolbar-filters">
          <div class="toolbar-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input v-model="search" type="search" placeholder="Search issues…" />
          </div>
          <select v-model="typeFilter" class="filter-select">
            <option value="all">All types</option>
            <option v-for="t in QUALITY_ISSUE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
      </div>

      <div class="board-scroll" aria-label="Quality issue board columns">
        <div class="board-zoom-layer" :style="{ '--board-zoom': zoomLevel / 100 }">
          <section
            v-for="col in QUALITY_STATUS_COLUMNS"
            :key="col.value"
            class="board-column"
            :class="{ 'is-drag-over': dragOverColumn === col.value }"
            :style="{ '--column-accent': columnAccent(col.value) }"
            @dragenter.prevent="dragOverColumn = col.value"
            @dragover.prevent="dragOverColumn = col.value"
            @dragleave="onColumnLeave($event, col.value)"
            @drop.prevent="onDrop(col.value)"
          >
            <header class="column-head">
              <div>
                <h2>{{ col.label }}</h2>
              </div>
              <span>{{ columnIssues(col.value).length }}</span>
            </header>

            <button
              v-if="col.value === 'in_progress'"
              class="add-card-mini"
              type="button"
              @click="openCreate"
            >
              + Add issue
            </button>

            <div class="column-card-list">
              <article
                v-for="issue in columnIssues(col.value)"
                :key="issue.id"
                class="tc-card"
                :class="{ 'tc-draggable': canMove(issue), 'tc-dragging': draggedId === issue.id }"
                :draggable="canMove(issue)"
                tabindex="0"
                @dragstart.stop="onDragStart(issue.id)"
                @dragend="onDragEnd"
                @click="openDetail(issue.id)"
                @keydown.enter.prevent="openDetail(issue.id)"
                @keydown.space.prevent="openDetail(issue.id)"
              >
                <!-- Manager Options Dropdown Menu -->
                <div v-if="isManager" class="tc-menu-container" @click.stop>
                  <button
                    class="tc-menu-trigger"
                    type="button"
                    title="Issue actions"
                    @click.stop="toggleCardMenu(issue.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  <div v-if="activeMenuCardId === issue.id" class="tc-menu-dropdown">
                    <button class="tc-menu-item" type="button" @click.stop="openDetail(issue.id)">Edit</button>
                    <button class="tc-menu-item" type="button" @click.stop="openDetail(issue.id)">Assign</button>
                    <button class="tc-menu-item" type="button" @click.stop="handleAlertCard(issue)">Send Alert</button>
                    <button class="tc-menu-item" type="button" @click.stop="handleReceiptsCard(issue)">View Receipts</button>
                    <div class="tc-menu-divider" />
                    <button class="tc-menu-item tc-menu-item--danger" type="button" @click.stop="handleArchiveCard(issue.id)">Archive</button>
                  </div>
                </div>

                <!-- Optional cover image -->
                <div v-if="issue.screenshotUrl" class="tc-image-container">
                  <img class="tc-cover" :src="issue.screenshotUrl" :alt="issue.title" loading="lazy" />
                </div>

                <div class="tc-content">
                  <h3 class="tc-title">{{ issue.title }}</h3>
                  <p v-if="issue.description" class="tc-desc">{{ issue.description }}</p>
                </div>

                <div class="tc-badges">
                  <span class="tc-type-pill">{{ typeLabel(issue.issueType) }}</span>
                  <span v-if="issue.priority !== 'normal'" class="tc-priority-pill" :class="`tc-priority--${issue.priority}`">
                    {{ priorityLabel(issue.priority) }}
                  </span>
                  <span v-if="issue.dueDate" class="tc-due-pill">Due {{ formatDate(issue.dueDate) }}</span>
                </div>

                <!-- Alert Tracking Panel -->
                <div v-if="isManager && receiptSummaries[issue.id] && receiptSummaries[issue.id].delivered > 0" class="tc-tracking-panel" @click.stop>
                  <div class="tc-tracking-header">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    Alert Status
                  </div>
                  <div class="tc-tracking-stats">
                    <span>Delivered: <strong>Yes</strong></span>
                    <span>Opened: <strong>{{ receiptSummaries[issue.id].opened > 0 ? 'Yes' : 'No' }}</strong></span>
                    <span>Acked: <strong>{{ receiptSummaries[issue.id].acknowledged === receiptSummaries[issue.id].delivered ? 'Yes' : 'No' }}</strong></span>
                  </div>
                  <div v-if="receiptSummaries[issue.id].lastAlertAt" class="tc-tracking-time">
                    Last Alert: <strong>{{ formattedAlertDate(receiptSummaries[issue.id].lastAlertAt) }}</strong>
                  </div>
                  <div class="tc-tracking-actions">
                    <button class="tc-track-btn" type="button" @click.stop="handleReceiptsCard(issue)">View Receipts</button>
                    <button class="tc-track-btn" type="button" :disabled="repushingAlerts[issue.id] || receiptSummaries[issue.id].pending === 0" @click.stop="handleRepushCard(issue.id)">
                      {{ repushingAlerts[issue.id] ? 'Nudging...' : 'Repush' }}
                    </button>
                  </div>
                </div>

                <div class="tc-footer">
                  <div v-if="issue.assignedTo && memberById(issue.assignedTo)" class="tc-member">
                    <div class="tc-avatar-wrap">
                      <span class="tc-avatar" :title="memberName(issue.assignedTo)">
                        <img
                          v-if="memberById(issue.assignedTo)?.avatarUrl"
                          :src="memberById(issue.assignedTo)?.avatarUrl"
                          :alt="memberName(issue.assignedTo)"
                          loading="lazy"
                          class="cursor-pointer transition hover:scale-110"
                          @click.stop.prevent="openPhotoPreview(memberById(issue.assignedTo))"
                        />
                        <span v-else>{{ initials(memberName(issue.assignedTo)) }}</span>
                      </span>
                      <span v-if="memberById(issue.assignedTo)?.currentStatus === 'online'" class="tc-online-dot" />
                    </div>
                    <span class="tc-name">{{ memberName(issue.assignedTo) }}</span>
                  </div>
                  <span v-else class="tc-unassigned">Unassigned</span>

                  <button class="tc-open" type="button" @click.stop="openDetail(issue.id)">Open</button>
                </div>
              </article>

              <div v-if="columnIssues(col.value).length === 0" class="column-empty">
                {{ columnEmpty(col.value) }}
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <!-- Create modal -->
    <CreateIssueModal
      :open="createOpen"
      :website-id="websiteId"
      :members="assignableMembers"
      @close="createOpen = false"
      @created="onCreated"
    />

    <!-- Detail modal -->
    <IssueDetailModal
      :open="!!detailIssueId"
      :issue-id="detailIssueId"
      :members="assignableMembers"
      @close="detailIssueId = null"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import CreateIssueModal from '@/components/quality/CreateIssueModal.vue';
import IssueDetailModal from '@/components/quality/IssueDetailModal.vue';
import { playCardDropSound } from '@/composables/useCardDropSound';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member } from '@/stores/data';
import {
  useQualityCheckStore,
  QUALITY_ISSUE_TYPES,
  QUALITY_STATUS_COLUMNS,
  type QualityIssue,
  type QualityIssueStatus,
  type QualityIssueType,
  type QualityIssuePriority
} from '@/stores/qualityCheck';
import { usePageRealtime, pushToast } from '@/services/realtimeService';
import { useTaskAlertsStore } from '@/stores/taskAlerts';

usePageRealtime(['quality_issues', 'quality_issue_comments', 'websites']);
import { useImagePreviewStore } from '@/stores/imagePreview';

const route = useRoute();
const auth  = useAuthStore();
const previewStore = useImagePreviewStore();
const alertsStore = useTaskAlertsStore();

const openPhotoPreview = (member: any) => {
  if (member?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: member.avatarUrl,
      fullName: member.fullName,
      email: member.email,
      role: member.role
    });
  }
};
const data  = useDataStore();
const qc    = useQualityCheckStore();

const websiteId = computed(() => String(route.params.websiteId || ''));
const website   = computed(() => data.websites.find((w) => w.id === websiteId.value));
const issues    = computed(() => qc.issuesForWebsite(websiteId.value).filter((i) => i.isArchived !== true));

const isManager = computed(() => ['admin', 'owner', 'head', 'supervisor'].includes(auth.currentRole || ''));

const activeMenuCardId = ref<string | null>(null);
const receiptSummaries = ref<Record<string, any>>({});
const repushingAlerts = ref<Record<string, boolean>>({});

const toggleCardMenu = (id: string) => {
  if (activeMenuCardId.value === id) {
    closeCardMenu();
  } else {
    activeMenuCardId.value = id;
    document.addEventListener('click', closeCardMenu);
  }
};

const closeCardMenu = () => {
  activeMenuCardId.value = null;
  document.removeEventListener('click', closeCardMenu);
};

const loadReceiptSummaryForCard = async (issueId: string) => {
  if (!isManager.value) return;
  const res = await alertsStore.fetchLinkedReceiptSummary('quality_check_item', issueId);
  receiptSummaries.value[issueId] = res;
};

const handleRepushCard = async (issueId: string) => {
  repushingAlerts.value[issueId] = true;
  const ok = await alertsStore.repushAlertsForLinkedItem('quality_check_item', issueId);
  if (ok) {
    await loadReceiptSummaryForCard(issueId);
  }
  repushingAlerts.value[issueId] = false;
};

const handleAlertCard = (issue: any) => {
  closeCardMenu();
  alertsStore.openSendAlertModal({
    type: 'quality_check_item',
    id: issue.id,
    title: issue.title,
    assigneeId: issue.assignedTo
  });
};

const handleReceiptsCard = (issue: any) => {
  closeCardMenu();
  alertsStore.openReceiptsModal({
    type: 'quality_check_item',
    id: issue.id,
    title: issue.title
  });
};

const handleArchiveCard = async (id: string) => {
  closeCardMenu();
  if (window.confirm('Are you sure you want to archive this Quality Check card?')) {
    const ok = await qc.archiveIssue(id);
    if (!ok) {
      alert('Could not archive Quality Check: ' + (qc.error || ''));
    }
  }
};

const formattedAlertDate = (dStr?: string | null) => {
  if (!dStr) return '—';
  try {
    const d = new Date(dStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '—';
  }
};

watch(() => issues.value, (newIssues) => {
  if (isManager.value && newIssues) {
    newIssues.forEach((issue) => {
      loadReceiptSummaryForCard(issue.id);
    });
  }
}, { immediate: true, deep: true });
const qualityCheckHome = computed(() => (auth.isQualityChecker ? '/quality-check' : '/work-board/quality-check'));

const loading = ref(false);
const search  = ref('');
const typeFilter = ref<'all' | QualityIssueType>('all');

// ── Drag-and-drop ────────────────────────────────────────────────────────
const dragOverColumn = ref<QualityIssueStatus | ''>('');
const draggedId = ref<string | null>(null);

const canMove = (_issue: QualityIssue) => {
  // Any authenticated team member can move any card.
  // The 'approved' column is still guarded separately in onDrop.
  return true;
};

const onDragStart = (id: string) => {
  const issue = issues.value.find((i) => i.id === id);
  if (!issue || !canMove(issue)) return;
  draggedId.value = id;
};

const onDragEnd = () => {
  draggedId.value = null;
  dragOverColumn.value = '';
};

const onColumnLeave = (e: DragEvent, col: QualityIssueStatus) => {
  if (dragOverColumn.value === col && e.relatedTarget) {
    dragOverColumn.value = '';
  }
};

const onDrop = async (status: QualityIssueStatus) => {
  const id = draggedId.value;
  draggedId.value = null;
  dragOverColumn.value = '';
  if (!id) return;
  const issue = issues.value.find((i) => i.id === id);
  if (!issue || issue.status === status) return;

  const isManager = ['admin', 'owner', 'head', 'supervisor'].includes(auth.currentRole || '');
  
  if (!isManager) {
    // Regular employees must be the assignee
    if (issue.assignedTo !== auth.user?.id) {
      pushToast('Action Blocked', 'Only the assigned employee can update this Quality Check.', 'warning', 'move-blocked');
      return;
    }
    // Employees cannot transition to Completed
    if (status === 'approved') {
      pushToast('Action Blocked', 'Employees cannot approve Quality Checks.', 'warning', 'move-blocked');
      return;
    }
    // Employees can only transition to Review
    if (status !== 'needs_review') {
      pushToast('Action Blocked', 'Employees can only transition tasks to Review.', 'warning', 'move-blocked');
      return;
    }
    // Employees can only transition issues currently in Progress
    const inProgressStatuses = ['in_progress', 'new_issue', 'reopened', 'rejected', 'acknowledged'];
    if (!inProgressStatuses.includes(issue.status)) {
      pushToast('Action Blocked', 'You can only transition tasks that are in Progress.', 'warning', 'move-blocked');
      return;
    }
  } else {
    // Managers: dragging Review -> Progress requires a reason
    if (status === 'in_progress' && (issue.status === 'needs_review' || issue.status === 'fixed')) {
      const reason = window.prompt('Please enter a reason for rejecting the fix (required):');
      if (reason === null) return; // user cancelled
      if (!reason.trim()) {
        pushToast('Reason Required', 'You must enter a reason to reject the fix.', 'warning', 'reason-required');
        return;
      }
      const ok = await qc.updateIssue(id, {
        status: 'rejected',
        rejectionReason: reason.trim()
      } as any);
      if (ok) {
        playCardDropSound();
        await qc.addComment(id, `Rejection Reason: ${reason.trim()}`);
      } else {
        pushToast('Could not reject issue', qc.error || 'Please try again.', 'warning', 'move-failed');
      }
      return;
    }
  }

  // If transitioning to Ready For Review, check proof of completion
  if (status === 'needs_review' || status === 'fixed') {
    let hasLocalProof = !!issue.screenshotUrl || (!!issue.pageUrl && issue.pageUrl.trim() !== '');
    if (!hasLocalProof) {
      await qc.fetchComments(id);
      const comments = qc.commentsForIssue(id);
      if (comments.length === 0) {
        pushToast(
          'Proof Required',
          'You must provide at least one proof of completion (screenshot, comment, or URL) before submitting for review.',
          'warning',
          'proof-required'
        );
        return;
      }
    }
  }

  const ok = await qc.moveStatus(id, status);
  if (ok) {
    playCardDropSound();
  } else {
    pushToast('Could not move card', qc.error || 'Please try again.', 'warning', 'move-failed');
  }
};

// ── Zoom (persisted) ─────────────────────────────────────────────────────
const ZOOM_KEY = 'kiuq_qb_zoom';
const zoomLevels = [70, 80, 90, 100, 110, 120];
const zoomLevel = ref<number>(
  (() => {
    try {
      const v = parseInt(localStorage.getItem(ZOOM_KEY) ?? '100', 10);
      return zoomLevels.includes(v) ? v : 100;
    } catch { return 100; }
  })()
);
const setZoom = (v: number) => {
  if (!zoomLevels.includes(v)) return;
  zoomLevel.value = v;
  try { localStorage.setItem(ZOOM_KEY, String(v)); } catch { /* ignore */ }
};
const zoomIn  = () => { const i = zoomLevels.indexOf(zoomLevel.value); if (i < zoomLevels.length - 1) setZoom(zoomLevels[i + 1]); };
const zoomOut = () => { const i = zoomLevels.indexOf(zoomLevel.value); if (i > 0)                    setZoom(zoomLevels[i - 1]); };
const resetZoom = () => setZoom(100);

// ── Filters / column buckets ─────────────────────────────────────────────
const filteredIssues = computed(() => {
  const q = search.value.trim().toLowerCase();
  return issues.value.filter((i) => {
    if (typeFilter.value !== 'all' && i.issueType !== typeFilter.value) return false;
    if (!q) return true;
    return i.title.toLowerCase().includes(q) || (i.pageUrl || '').toLowerCase().includes(q);
  });
});

const columnIssues = (status: QualityIssueStatus) =>
  filteredIssues.value.filter((i) => {
    if (status === 'in_progress') {
      return i.status === 'in_progress' || i.status === 'new_issue' || i.status === 'reopened' || i.status === 'rejected' || i.status === 'acknowledged';
    }
    if (status === 'needs_review') {
      return i.status === 'needs_review' || i.status === 'fixed';
    }
    if (status === 'approved') {
      return i.status === 'approved' || i.status === 'closed';
    }
    return i.status === status;
  });

const clearFilters = () => {
  search.value = '';
  typeFilter.value = 'all';
};

// ── Visual helpers ───────────────────────────────────────────────────────
const COLUMN_ACCENT: Record<string, string> = {
  in_progress:  '#f59e0b',
  needs_review: '#a855f7',
  approved:     '#16a34a'
};
const COLUMN_HELPER: Record<string, string> = {
  in_progress:  'Fix in progress',
  needs_review: 'Ready for review',
  approved:     'Completed issues'
};
const COLUMN_EMPTY: Record<string, string> = {
  in_progress:  'No cards in progress yet.',
  needs_review: 'Fixed cards waiting for a manager to review.',
  approved:     'Approved cards appear here. 🎉'
};
const columnAccent = (s: QualityIssueStatus) => COLUMN_ACCENT[s] || '#9ca3af';
const columnHelper = (s: QualityIssueStatus) => COLUMN_HELPER[s] || '';
const columnEmpty  = (s: QualityIssueStatus) => COLUMN_EMPTY[s] || '';

const assignableMembers = computed<Member[]>(() => {
  if (auth.isQualityChecker) return auth.profile ? [auth.profile] : [];
  return data.members.filter((m) => m.status === 'active');
});

const memberById = (id: string | null): Member | undefined =>
  id ? data.members.find((m) => m.id === id) ?? (auth.profile?.id === id ? auth.profile : undefined) : undefined;
const memberName = (id: string | null) =>
  memberById(id)?.fullName || memberById(id)?.email || 'Unassigned';
const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';

const typeLabel = (t: QualityIssueType) =>
  QUALITY_ISSUE_TYPES.find((x) => x.value === t)?.label ?? t;
const priorityLabel = (p: QualityIssuePriority) =>
  p.charAt(0).toUpperCase() + p.slice(1);
const formatDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

// ── Modals ───────────────────────────────────────────────────────────────
const createOpen = ref(false);
const detailIssueId = ref<string | null>(null);
const openCreate = () => { createOpen.value = true; };
const onCreated  = () => { createOpen.value = false; };
const openDetail = (id: string) => { detailIssueId.value = id; };

watch(
  () => route.query.issue,
  (newVal: any) => {
    if (newVal) {
      detailIssueId.value = String(newVal);
    }
  },
  { immediate: true }
);

// ── Load ─────────────────────────────────────────────────────────────────
onMounted(async () => {
  loading.value = true;
  try {
    const loads: Promise<unknown>[] = [
      data.fetchWebsites(),
      qc.fetchIssues(websiteId.value)
    ];
    if (!auth.isQualityChecker) loads.push(data.fetchMembers());
    await Promise.all(loads);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* ── Page shell ─────────────────────────────────────────────── */
.qb-page {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

/* ── Hero ───────────────────────────────────────────────────── */
.board-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 10%, transparent), transparent 35%),
    var(--card-bg);
  padding: 1.1rem 1.25rem;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.05);
}
.board-hero-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}
.board-hero-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 14px;
  background: #fff;
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
.board-hero-favicon { width: 70%; height: 70%; object-fit: contain; }
.board-hero-text { min-width: 0; }
.board-hero-kicker {
  display: block;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 850;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
}
.board-hero-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

/* ── Toolbar ────────────────────────────────────────────────── */
.board-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.6rem 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
}
.zoom-controls { display: flex; align-items: center; gap: 1rem; }
.zoom-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.zoom-actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: var(--soft-bg);
  padding: 0.2rem;
  border-radius: 10px;
  border: 1px solid var(--border);
}
.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 7px;
  border: 1px solid transparent;
  background: var(--card-bg);
  color: var(--text-main);
  cursor: pointer;
  transition: all 160ms ease;
}
.zoom-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.06);
}
.zoom-btn:active:not(:disabled) { transform: translateY(0); }
.zoom-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.zoom-percentage {
  font-family: 'Jost Numbers', 'Google Sans', sans-serif;
  font-size: 0.82rem;
  font-weight: 850;
  min-width: 2.8rem;
  text-align: center;
  color: var(--text-main);
}
.zoom-reset {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--primary);
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: all 200ms ease;
  background: transparent;
  border: none;
}
.zoom-reset.visible { opacity: 1; pointer-events: auto; }
.zoom-reset:hover { background: color-mix(in srgb, var(--primary) 10%, transparent); }
.zoom-helper {
  font-size: 0.68rem;
  color: var(--text-muted);
  font-weight: 500;
  opacity: 0.75;
}
@media (max-width: 860px) { .zoom-helper { display: none; } }
@media (max-width: 540px) {
  .zoom-label { display: none; }
  .board-toolbar { justify-content: center; }
}

.toolbar-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  align-items: center;
}
.toolbar-search {
  position: relative;
  min-width: min(100%, 18rem);
}
.toolbar-search svg {
  position: absolute;
  left: 0.9rem;
  top: 50%;
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
  transform: translateY(-50%);
}
.toolbar-search input,
.filter-select {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-main);
  font-size: 0.86rem;
  outline: none;
  transition: border-color 160ms ease, box-shadow 160ms ease;
}
.toolbar-search input { padding: 0.6rem 0.9rem 0.6rem 2.4rem; }
.filter-select { width: auto; min-width: 9rem; padding: 0.6rem 0.8rem; }
.toolbar-search input:focus,
.filter-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}

/* ── Filter empty / loading skeleton ───────────────────────── */
.filter-empty {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 0.9rem;
  padding: 1rem;
}
.filter-empty h2 { font-size: 0.95rem; font-weight: 850; }
.filter-empty p { margin-top: 0.2rem; color: var(--text-muted); font-size: 0.84rem; }

.board-loading,
.board-scroll {
  overflow-x: auto;
  padding-bottom: 0.8rem;
  min-height: 0;
}
.board-loading {
  display: grid;
  grid-auto-columns: minmax(18rem, 20rem);
  grid-auto-flow: column;
  gap: 0.9rem;
  align-items: start;
}
.skeleton-column {
  min-height: 18rem;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: qb-pulse 1.4s ease-in-out infinite;
}
@keyframes qb-pulse {
  0%, 100% { opacity: 0.55; }
  50%      { opacity: 1; }
}

/* ── Board grid + zoom ──────────────────────────────────────── */
.board-shell { min-width: 0; }
.board-zoom-layer {
  display: grid;
  grid-auto-columns: minmax(18rem, 20rem);
  grid-auto-flow: column;
  gap: 0.9rem;
  align-items: start;
  transform-origin: top left;
  zoom: var(--board-zoom, 1);
}
@-moz-document url-prefix() {
  .board-zoom-layer {
    transform: scale(var(--board-zoom, 1));
    width: calc(100% / var(--board-zoom, 1));
  }
}

/* ── Columns ────────────────────────────────────────────────── */
.board-column {
  position: relative;
  display: flex;
  min-height: 24rem;
  flex-direction: column;
  border: 1px solid color-mix(in srgb, var(--column-accent, var(--primary)) 24%, var(--border));
  border-radius: 18px;
  background: color-mix(in srgb, var(--soft-bg) 45%, var(--card-bg));
  padding: 0.75rem;
  transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
}
.board-column::before {
  position: absolute;
  inset: -1px;
  pointer-events: none;
  border: 1px solid color-mix(in srgb, var(--column-accent, var(--primary)) 65%, transparent);
  border-radius: inherit;
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--column-accent, var(--primary)) 20%, transparent);
  content: '';
  opacity: 0;
  transition: opacity 180ms ease, box-shadow 180ms ease;
}
.board-column.is-drag-over {
  border-color: color-mix(in srgb, var(--column-accent, var(--primary)) 70%, var(--border));
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 8%, var(--card-bg));
  box-shadow: 0 20px 50px color-mix(in srgb, var(--column-accent, var(--primary)) 18%, transparent);
  transform: translateY(-4px) scale(1.01);
}
.board-column.is-drag-over::before {
  box-shadow: 0 0 0 6px color-mix(in srgb, var(--column-accent, var(--primary)) 12%, transparent);
  opacity: 1;
  animation: qbColumnPulse 950ms ease-in-out infinite;
}
@keyframes qbColumnPulse {
  0%, 100% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--column-accent, var(--primary)) 10%, transparent); }
  50%      { box-shadow: 0 0 0 9px color-mix(in srgb, var(--column-accent, var(--primary)) 18%, transparent); }
}

.column-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.65rem;
}
.column-head h2 {
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.92rem;
  font-weight: 900;
  margin: 0;
}
.column-head p {
  margin-top: 0.15rem;
  color: var(--text-muted);
  font-size: 0.72rem;
}
.column-head span {
  border-radius: 999px;
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 12%, var(--card-bg));
  color: var(--column-accent, var(--primary));
  padding: 0.25rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 900;
}

.add-card-mini {
  margin-top: 0.6rem;
  border: 1px dashed color-mix(in srgb, var(--column-accent, var(--primary)) 35%, var(--border));
  border-radius: 12px;
  color: var(--text-muted);
  padding: 0.5rem;
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  transition: color 160ms ease, background 160ms ease;
  cursor: pointer;
  background: transparent;
}
.add-card-mini:hover { background: var(--card-bg); color: var(--primary); }

.column-card-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.7rem;
  padding-top: 0.75rem;
}
.column-empty {
  border: 1px dashed var(--border);
  border-radius: 14px;
  color: var(--text-muted);
  padding: 1rem;
  text-align: center;
  font-size: 0.82rem;
}

/* ── Card (visually identical to TaskCard) ─────────────────── */
.tc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1.5px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  text-align: left;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
  transition:
    transform 190ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
  cursor: pointer;
  user-select: none;
  will-change: transform;
}
.tc-card:hover,
.tc-card:focus-visible {
  border-color: color-mix(in srgb, var(--primary) 42%, var(--border));
  box-shadow:
    0 10px 28px rgba(15, 23, 42, 0.1),
    0 0 0 2px color-mix(in srgb, var(--primary) 14%, transparent);
  transform: translateY(-2px);
  outline: none;
}
.tc-card.tc-draggable { cursor: grab; }
.tc-card.tc-dragging {
  border-color: color-mix(in srgb, var(--primary) 62%, var(--border));
  box-shadow: 0 24px 60px color-mix(in srgb, var(--primary) 24%, transparent);
  cursor: grabbing;
  opacity: 0.62;
  transform: rotate(1.4deg) scale(0.97);
}

.tc-image-container {
  position: relative;
  width: 100%;
  height: 7.5rem;
  overflow: hidden;
  border-radius: 18px 18px 0 0;
}
.tc-cover { width: 100%; height: 100%; object-fit: cover; display: block; }

.tc-content { padding: 0.85rem 0.9rem 0; }
.tc-title {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 850;
  line-height: 1.3;
  color: var(--text-main);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tc-desc {
  margin-top: 0.3rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tc-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.9rem 0;
}
.tc-type-pill,
.tc-priority-pill,
.tc-due-pill {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
}
.tc-type-pill {
  background: var(--soft-bg);
  color: var(--text-muted);
  border: 1px solid var(--border);
  text-transform: uppercase;
}
.tc-priority-pill { text-transform: uppercase; }
.tc-priority--urgent { background: rgba(220,38,38,0.14); color: #dc2626; }
.tc-priority--high   { background: rgba(245,158,11,0.16); color: #f59e0b; }
.tc-priority--low    { background: var(--soft-bg); color: var(--text-muted); border: 1px solid var(--border); }
.tc-due-pill {
  background: color-mix(in srgb, var(--primary) 10%, transparent);
  color: var(--primary);
}

.tc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem 0.8rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border);
}
.tc-member { display: flex; align-items: center; gap: 0.45rem; min-width: 0; flex: 1; }
.tc-avatar-wrap { position: relative; flex-shrink: 0; }
.tc-avatar {
  display: inline-flex;
  width: 1.9rem;
  height: 1.9rem;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 999px;
  border: 1.5px solid var(--card-bg);
  background: color-mix(in srgb, var(--primary) 12%, var(--soft-bg));
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.65rem;
  font-weight: 900;
}
.tc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.tc-online-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0.55rem;
  height: 0.55rem;
  background: #16a34a;
  border: 1.5px solid var(--card-bg);
  border-radius: 999px;
}
.tc-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
}
.tc-unassigned { font-size: 0.78rem; color: var(--text-muted); flex: 1; }

.tc-open {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1.5px solid var(--border);
  border-radius: 999px;
  background: transparent;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 850;
  padding: 0.28rem 0.8rem;
  cursor: pointer;
  transition:
    background 140ms ease,
    border-color 140ms ease,
    color 140ms ease,
    box-shadow 140ms ease,
    transform 100ms ease;
  white-space: nowrap;
}
.tc-open:hover {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 36%, transparent);
}
.tc-open:active { transform: scale(0.95); }

/* ── Mobile: make the board comfortable on phones ──────────────
   Columns snap into view one at a time so rookies can swipe between
   lanes instead of fighting a tiny horizontal scroll. */
@media (max-width: 640px) {
  .board-hero { padding: 0.9rem 1rem; }
  .board-hero-actions { width: 100%; }
  .board-scroll {
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
  }
  .board-zoom-layer,
  .board-loading {
    grid-auto-columns: 86vw;
    gap: 0.7rem;
    /* Board zoom is awkward on small screens — pin to 100%. */
    zoom: 1;
  }
  .board-column {
    scroll-snap-align: start;
    min-height: 20rem;
  }
  /* Hide the desktop-only zoom controls on phones. */
  .zoom-controls { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .tc-card,
  .board-column { transition: none !important; animation: none !important; }
}

/* ── Manager Dropdown menu options ── */
.tc-menu-container {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 10;
}

.tc-menu-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.85);
  cursor: pointer;
  transition: all 0.2s;
}

.tc-menu-trigger:hover {
  background: rgba(15, 23, 42, 0.75);
  color: #fff;
}

.tc-menu-dropdown {
  position: absolute;
  top: 1.95rem;
  right: 0;
  width: 130px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-lg);
  padding: 0.3rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  z-index: 20;
}

.tc-menu-item {
  width: 100%;
  text-align: left;
  border: none;
  background: transparent;
  color: var(--text-main);
  font-family: 'Outfit', sans-serif;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s;
}

.tc-menu-item:hover {
  background: var(--soft-bg);
  color: var(--primary);
}

.tc-menu-item--danger {
  color: #ef4444;
}

.tc-menu-item--danger:hover {
  background: rgba(239, 68, 68, 0.08);
  color: #ef4444;
}

.tc-menu-divider {
  height: 1px;
  background: var(--border);
  margin: 0.15rem 0;
}

/* ── Tracking Panel ── */
.tc-tracking-panel {
  margin: 0.6rem 0.9rem 0;
  padding: 0.6rem 0.7rem;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  border-radius: 10px;
  font-size: 0.7rem;
}

.tc-tracking-header {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-family: 'Outfit', sans-serif;
  font-weight: 800;
  color: var(--text-main);
  text-transform: uppercase;
  font-size: 0.64rem;
  margin-bottom: 0.35rem;
}

.tc-tracking-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.2rem;
  color: var(--text-muted);
}

.tc-tracking-stats span {
  display: block;
}

.tc-tracking-stats strong {
  color: var(--text-main);
}

.tc-tracking-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.45rem;
}

.tc-track-btn {
  flex: 1;
  font-family: 'Outfit', sans-serif;
  font-size: 0.66rem;
  font-weight: 750;
  padding: 0.2rem 0;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.tc-track-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
  background: var(--primary-soft);
}

.tc-track-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tc-tracking-time {
  display: block;
  font-size: 0.64rem;
  color: var(--text-muted);
  border-top: 1px solid var(--border);
  padding-top: 0.3rem;
  margin-top: 0.3rem;
}
</style>
