<template>
  <article
    class="tc-card"
    :class="{
      'tc-dragging': isDragging,
      'tc-moved': justMoved,
      'tc-draggable': canDrag,
      [`tc-prio-${priorityKey}`]: true
    }"
    :style="{ '--tc-priority': priorityColor }"
    :draggable="canDrag"
    tabindex="0"
    @dragstart.stop="$emit('dragstart')"
    @dragend="$emit('dragend')"
    @click="$emit('open')"
    @keydown.enter.prevent="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <!-- Priority accent strip — immediately readable on the left edge -->
    <span class="tc-priority-strip" aria-hidden="true" />

    <!-- Manager Options Dropdown Menu -->
    <div v-if="isManager" class="tc-menu-container" @click.stop>
      <button
        class="tc-menu-trigger"
        type="button"
        title="Task actions"
        @click.stop="toggleMenu"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
        </svg>
      </button>
      <div v-if="menuOpen" class="tc-menu-dropdown">
        <button class="tc-menu-item" type="button" @click.stop="handleEdit">Edit</button>
        <button class="tc-menu-item" type="button" @click.stop="handleAssign">Assign</button>
        <button class="tc-menu-item" type="button" @click.stop="handleAlert">Send Alert</button>
        <button class="tc-menu-item" type="button" @click.stop="handleReceipts">View Receipts</button>
        <div class="tc-menu-divider" />
        <button class="tc-menu-item tc-menu-item--danger" type="button" @click.stop="handleArchive">Archive</button>
      </div>
    </div>

    <!-- Optional cover image -->
    <div v-if="imageUrl" class="tc-image-container">
      <img class="tc-cover" :src="imageUrl" :alt="card.title" loading="lazy" />
      <div class="tc-image-overlay" @click.stop="openPreview">
        <button class="tc-view-btn" type="button">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          View Full
        </button>
      </div>
    </div>

    <!-- Title + meta -->
    <div class="tc-content">
      <div class="tc-content-top">
        <span v-if="priorityKey !== 'normal'" class="tc-prio-tag">{{ priorityLabel }}</span>
        <span v-if="card.websiteName" class="tc-site">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z"/></svg>
          {{ card.websiteName }}
        </span>
      </div>
      <h3 class="tc-title">{{ card.title }}</h3>
      <p v-if="descText" class="tc-desc">{{ descText }}</p>
    </div>

    <!-- Deadline badge -->
    <div v-if="card.dueDate" class="tc-badges">
      <TaskDeadlineBadge
        :due-date="card.dueDate"
        :due-time="card.dueTime"
        :status="card.status"
        :column-key="card.columnKey"
        compact
      />
    </div>

    <!-- Alert Tracking Panel -->
    <div v-if="isManager && receiptSummary && receiptSummary.delivered > 0" class="tc-tracking-panel" @click.stop>
      <div class="tc-tracking-header">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        Alert Status
      </div>
      <div class="tc-tracking-stats">
        <span>Delivered: <strong>Yes</strong></span>
        <span>Opened: <strong>{{ receiptSummary.opened > 0 ? 'Yes' : 'No' }}</strong></span>
        <span>Acked: <strong>{{ receiptSummary.acknowledged === receiptSummary.delivered ? 'Yes' : 'No' }}</strong></span>
      </div>
      <div v-if="receiptSummary.lastAlertAt" class="tc-tracking-time">
        Last Alert: <strong>{{ formattedAlertDate(receiptSummary.lastAlertAt) }}</strong>
      </div>
      <div class="tc-tracking-actions">
        <button class="tc-track-btn" type="button" @click.stop="handleReceipts">View Receipts</button>
        <button class="tc-track-btn" type="button" :disabled="repushingAlerts || receiptSummary.pending === 0" @click.stop="handleRepush">
          {{ repushingAlerts ? 'Nudging...' : 'Repush' }}
        </button>
      </div>
    </div>

    <!-- Footer: member + open button -->
    <div class="tc-footer">
      <div v-if="primaryMember" class="tc-member">
        <div class="tc-avatar-wrap">
          <span class="tc-avatar" :title="primaryMember.fullName || primaryMember.email">
            <img
              v-if="primaryMember.avatarUrl"
              :src="primaryMember.avatarUrl"
              :alt="primaryMember.fullName || primaryMember.email"
              loading="lazy"
              class="cursor-pointer transition hover:scale-110"
              @click.prevent.stop="openPhotoPreview"
            />
            <span v-else>{{ memberInitials(primaryMember) }}</span>
          </span>
          <span v-if="primaryMember.currentStatus === 'online'" class="tc-online-dot" />
        </div>
        <span class="tc-name">
          {{ primaryMember.fullName || primaryMember.email || 'Member' }}
          <span v-if="primaryMember.username" class="tc-username">(@{{ primaryMember.username }})</span>
          <span v-if="members.length > 1" class="tc-extra">+{{ members.length - 1 }}</span>
        </span>
      </div>
      <span v-else class="tc-unassigned">Unassigned</span>

      <button class="tc-open" type="button" @click.stop="$emit('open')">Open</button>
    </div>

    <!-- Move celebration sparkles -->
    <span v-if="justMoved" class="tc-sparkles" aria-hidden="true">
      <span /><span /><span /><span /><span />
    </span>

    <!-- Image Preview Modal -->
    <TaskImagePreviewModal
      v-if="imageUrl"
      :is-open="previewOpen"
      :image-url="imageUrl"
      :task-title="card.title"
      :description="descText"
      :assigned-member="primaryMember?.fullName || primaryMember?.email"
      :due-date="card.dueDate"
      :status="card.status"
      :created-by="createdBy"
      :on-close="closePreview"
    />
  </article>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';
import TaskDeadlineBadge from '@/components/ui/TaskDeadlineBadge.vue';
import TaskImagePreviewModal from '@/components/board/TaskImagePreviewModal.vue';
import { useImagePreviewStore } from '@/stores/imagePreview';
import { useAuthStore } from '@/stores/auth';
import { useTaskAlertsStore } from '@/stores/taskAlerts';
import { useDataStore, type Member } from '@/stores/data';

interface CardData {
  id: string;
  title: string;
  shortDescription: string;
  instructions: string;
  description: string;
  dueDate: string;
  dueTime: string;
  status: string;
  columnKey: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  websiteName?: string;
  assignedMemberId?: string | null;
  assignment: {
    assignedBy?: string | null;
    createdBy?: string | null;
  };
}

const props = defineProps<{
  card: CardData;
  imageUrl?: string;
  members: Member[];
  isDragging: boolean;
  justMoved: boolean;
  canDrag: boolean;
}>();

const emit = defineEmits<{
  open: [];
  dragstart: [];
  dragend: [];
}>();

const previewStore = useImagePreviewStore();
const auth = useAuthStore();
const alertsStore = useTaskAlertsStore();
const data = useDataStore();

const isManager = computed(() =>
  ['admin', 'owner', 'head', 'supervisor'].includes(auth.currentRole || '')
);

const menuOpen = ref(false);
const repushingAlerts = ref(false);
const receiptSummary = ref<any>(null);

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value;
  if (menuOpen.value) {
    document.addEventListener('click', closeMenu);
  }
};

const closeMenu = () => {
  menuOpen.value = false;
  document.removeEventListener('click', closeMenu);
};

const loadReceiptSummary = async () => {
  if (!isManager.value) return;
  const res = await alertsStore.fetchLinkedReceiptSummary('workboard_task', props.card.id);
  receiptSummary.value = res;
};

const handleRepush = async () => {
  repushingAlerts.value = true;
  const ok = await alertsStore.repushAlertsForLinkedItem('workboard_task', props.card.id);
  if (ok) {
    await loadReceiptSummary();
  }
  repushingAlerts.value = false;
};

const handleEdit = () => {
  closeMenu();
  emit('open');
};

const handleAssign = () => {
  closeMenu();
  emit('open');
};

const handleAlert = () => {
  closeMenu();
  alertsStore.openSendAlertModal({
    type: 'workboard_task',
    id: props.card.id,
    title: props.card.title,
    assigneeId: props.card.assignedMemberId
  });
};

const handleReceipts = () => {
  closeMenu();
  alertsStore.openReceiptsModal({
    type: 'workboard_task',
    id: props.card.id,
    title: props.card.title
  });
};

const handleArchive = async () => {
  closeMenu();
  if (window.confirm('Are you sure you want to archive this task card?')) {
    const ok = await data.archiveAssignment(props.card.id);
    if (!ok) {
      alert('Could not archive task: ' + (data.errors.assignments || ''));
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

onMounted(() => {
  loadReceiptSummary();
});

watch(() => props.card.status, () => {
  loadReceiptSummary();
});

const openPhotoPreview = () => {
  if (primaryMember.value?.avatarUrl) {
    previewStore.triggerPreview({
      avatarUrl: primaryMember.value.avatarUrl,
      fullName: primaryMember.value.fullName || primaryMember.value.email || 'Member',
      email: primaryMember.value.email,
      role: primaryMember.value.role
    });
  }
};

const primaryMember = computed(() => props.members[0] ?? null);

// ── Priority → label + color ──────────────────────────────────────────────
// urgent = Critical (red), high = High (orange), normal = Medium (blue),
// low = Low (gray). Surfaced as a left accent strip + a tag for non-normal.
const priorityKey = computed(() => props.card.priority ?? 'normal');
const PRIORITY_META: Record<string, { label: string; color: string }> = {
  urgent: { label: 'Critical', color: '#dc2626' },
  high:   { label: 'High',     color: '#f97316' },
  normal: { label: 'Medium',   color: 'var(--primary)' },
  low:    { label: 'Low',      color: '#9ca3af' }
};
const priorityColor = computed(() => PRIORITY_META[priorityKey.value]?.color ?? 'var(--primary)');
const priorityLabel = computed(() => PRIORITY_META[priorityKey.value]?.label ?? 'Medium');

const descText = computed(
  () => props.card.shortDescription || props.card.instructions || props.card.description
);

const memberInitials = (member: Member) => {
  const source = (member.fullName || member.email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
};

const previewOpen = ref(false);
const openPreview = () => (previewOpen.value = true);
const closePreview = () => (previewOpen.value = false);

const createdBy = computed(() => {
  const actorId = props.card.assignment?.assignedBy;
  if (!actorId) return undefined;
  const member = data.memberById(actorId);
  return member ? (member.fullName || member.email) : 'Admin';
});
</script>

<style scoped>
/* ── Card shell ─────────────────────────────────────────── */
.tc-card {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  text-align: left;
  box-shadow: var(--shadow-sm);
  transition:
    transform 180ms cubic-bezier(0.16, 1, 0.3, 1),
    border-color 150ms ease,
    box-shadow 150ms ease,
    opacity 150ms ease;
  cursor: pointer;
  user-select: none;
  will-change: transform;
}

.tc-card:hover,
.tc-card:focus-visible {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
  outline: none;
}

/* Priority accent strip on the left edge. */
.tc-priority-strip {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--tc-priority, var(--primary));
  z-index: 2;
}
/* Normal/medium priority is quieter so urgent/high genuinely pop. */
.tc-prio-normal .tc-priority-strip { opacity: 0.35; }
.tc-prio-low .tc-priority-strip { opacity: 0.5; }

.tc-card.tc-draggable {
  cursor: grab;
}

.tc-card.tc-dragging {
  border-color: color-mix(in srgb, var(--primary) 62%, var(--border));
  box-shadow: 0 24px 60px color-mix(in srgb, var(--primary) 24%, transparent);
  cursor: grabbing;
  opacity: 0.62;
  transform: rotate(1.4deg) scale(0.97);
}

.tc-card.tc-moved {
  border-color: color-mix(in srgb, var(--column-accent, var(--primary)) 70%, var(--primary));
  box-shadow: 0 22px 55px color-mix(in srgb, var(--column-accent, var(--primary)) 22%, transparent);
  animation: tcCardLanded 720ms cubic-bezier(0.16, 1, 0.3, 1);
}

.tc-card.tc-moved::after {
  content: 'Moved';
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--column-accent, var(--primary)) 16%, var(--card-bg));
  color: var(--column-accent, var(--primary));
  font-family: 'Jost Numbers', 'Google Sans', 'Product Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 900;
  padding: 0.22rem 0.5rem;
  animation: tcMovedBadge 900ms ease-out forwards;
}

/* ── Cover image ────────────────────────────────────────── */
.tc-image-container {
  position: relative;
  width: 100%;
  height: 7.5rem;
  overflow: hidden;
  border-radius: 13px 13px 0 0;
}

.tc-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.tc-image-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: all 200ms ease;
  backdrop-filter: blur(0px);
}

.tc-image-container:hover .tc-image-overlay {
  background: rgba(15, 23, 42, 0.4);
  opacity: 1;
  backdrop-filter: blur(2px);
}

.tc-view-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: white;
  color: #0f172a;
  border: none;
  padding: 0.4rem 0.75rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
  transform: translateY(10px);
  transition: all 250ms cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.tc-image-container:hover .tc-view-btn {
  transform: translateY(0);
}

.tc-view-btn:hover {
  background: var(--primary);
  color: white;
  transform: scale(1.05);
}

/* ── Body ───────────────────────────────────────────────── */
.tc-content {
  padding: 0.8rem 0.9rem 0 0.95rem;
}

.tc-content-top {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 0.4rem;
}

.tc-prio-tag {
  display: inline-flex;
  align-items: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.12rem 0.4rem;
  border-radius: 5px;
  color: var(--tc-priority);
  background: color-mix(in srgb, var(--tc-priority) 12%, transparent);
}

.tc-site {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--text-muted);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tc-site svg { flex-shrink: 0; opacity: 0.7; }

.tc-title {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 850;
  line-height: 1.3;
  color: var(--text-main);
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

/* ── Badges row ─────────────────────────────────────────── */
.tc-badges {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.9rem 0;
}

/* ── Footer ─────────────────────────────────────────────── */
.tc-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.9rem 0.8rem;
  margin-top: 0.5rem;
  border-top: 1px solid var(--border);
}

.tc-member {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex: 1;
}

.tc-avatar-wrap {
  position: relative;
  flex-shrink: 0;
}

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

.tc-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

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

.tc-username {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
  margin-left: 0.2rem;
}

.tc-extra {
  display: inline-block;
  font-size: 0.68rem;
  font-weight: 700;
  background: var(--soft-bg);
  color: var(--primary);
  padding: 0.08rem 0.3rem;
  border-radius: 6px;
  margin-left: 0.15rem;
  border: 1px solid var(--border);
}

.tc-unassigned {
  font-size: 0.78rem;
  color: var(--text-muted);
  flex: 1;
}

/* ── Open button ─────────────────────────────────────────── */
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

.tc-open:active {
  transform: scale(0.95);
}

/* ── Move sparkles ──────────────────────────────────────── */
.tc-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.tc-sparkles span {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: var(--column-accent, var(--primary));
  box-shadow: 0 0 18px color-mix(in srgb, var(--column-accent, var(--primary)) 42%, transparent);
  opacity: 0;
  animation: tcSparkleBurst 760ms ease-out forwards;
}

.tc-sparkles span:nth-child(1) { --spark-x: -5.4rem; --spark-y: -2.4rem; }
.tc-sparkles span:nth-child(2) { --spark-x: 4.8rem;  --spark-y: -2rem;   animation-delay: 40ms; }
.tc-sparkles span:nth-child(3) { --spark-x: -4rem;   --spark-y: 2.7rem;  animation-delay: 70ms; }
.tc-sparkles span:nth-child(4) { --spark-x: 5.2rem;  --spark-y: 2.2rem;  animation-delay: 110ms; }
.tc-sparkles span:nth-child(5) { --spark-x: 0.6rem;  --spark-y: -3.4rem; animation-delay: 130ms; }

/* ── Animations ──────────────────────────────────────────── */
@keyframes tcCardLanded {
  0%   { transform: scale(0.97); }
  60%  { transform: scale(1.015); }
  100% { transform: scale(1); }
}

@keyframes tcMovedBadge {
  0%   { opacity: 0; transform: translateY(4px); }
  15%  { opacity: 1; transform: translateY(0); }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes tcSparkleBurst {
  0%   { opacity: 1; transform: translate(-50%, -50%) scale(0.3); }
  60%  { opacity: 0.8; transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(1); }
  100% { opacity: 0;   transform: translate(calc(-50% + var(--spark-x)), calc(-50% + var(--spark-y))) scale(0.5); }
}

@media (prefers-reduced-motion: reduce) {
  .tc-card,
  .tc-card.tc-moved,
  .tc-card.tc-moved::after,
  .tc-sparkles span {
    animation: none !important;
    transition: none !important;
  }
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
