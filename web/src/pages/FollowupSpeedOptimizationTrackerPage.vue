<template>
  <div class="fpt-page">
    <!-- Header -->
    <div class="fpt-header">
      <RouterLink to="/followup/speed-optimization" class="fpt-back">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
        All Websites
      </RouterLink>

      <div v-if="website" class="fpt-site-info">
        <div class="fpt-site-avatar">
          <img v-if="website.faviconUrl" :src="website.faviconUrl" alt="" class="fpt-site-favicon" @error="(e) => ((e.target as HTMLImageElement).style.display='none')" />
          <span v-else>{{ website.name.slice(0, 2).toUpperCase() }}</span>
        </div>
        <div>
          <div class="fpt-site-name">{{ website.name }}</div>
          <div class="fpt-site-domain">{{ website.domain || 'No domain' }}</div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="fpt-error card card-pad">
      <p class="font-semibold text-status-needs-fix-fg">Could not load. Please try again.</p>
      <button class="btn-primary mt-3 w-fit" type="button" @click="load">Retry</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="fpt-skeleton-wrap">
      <div class="fpt-skel fpt-skel--bar" />
      <div class="fpt-skel-list">
        <div v-for="i in 6" :key="i" class="fpt-skel fpt-skel--row" />
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!website" class="card card-pad text-sm text-text-muted">
      Website not found.
    </div>

    <template v-else>
      <!-- Summary pills -->
      <div class="fpt-summary">
        <div class="fpt-sum-item fpt-sum--done">
          <span class="fpt-sum-num">{{ viewStats.done }}</span>
          <span class="fpt-sum-lbl">Done</span>
        </div>
        <div class="fpt-sum-item fpt-sum--missed">
          <span class="fpt-sum-num">{{ viewStats.missed }}</span>
          <span class="fpt-sum-lbl">Missed</span>
        </div>
        <div class="fpt-sum-item fpt-sum--pending">
          <span class="fpt-sum-num">{{ viewStats.pending }}</span>
          <span class="fpt-sum-lbl">Pending</span>
        </div>
        <div class="fpt-sum-progress">
          <div class="fpt-sum-prog-track">
            <div
              class="fpt-sum-prog-fill"
              :class="viewStats.total ? (viewStats.done === viewStats.total ? 'fill--complete' : 'fill--partial') : ''"
              :style="{ width: viewStats.total ? (viewStats.done / viewStats.total * 100) + '%' : '0%' }"
            />
          </div>
          <span class="fpt-sum-prog-text">{{ viewStats.done }}/{{ viewStats.total }} {{ viewMode === 'week' ? 'this week' : 'this month' }}</span>
        </div>
      </div>

      <!-- View toggle -->
      <div class="fpt-view-toggle">
        <button
          class="fpt-vtab"
          :class="{ 'fpt-vtab--active': viewMode === 'week' }"
          type="button"
          @click="viewMode = 'week'"
        >This Week</button>
        <button
          class="fpt-vtab"
          :class="{ 'fpt-vtab--active': viewMode === 'month' }"
          type="button"
          @click="viewMode = 'month'"
        >This Month</button>
      </div>

      <!-- ── THIS WEEK VIEW ── -->
      <div v-if="viewMode === 'week'" class="fpt-week-view">
        <!-- Speed optimization checklist (informational — does not block Done) -->
        <div class="fpt-checklist">
          <div class="fpt-checklist-head">Speed optimization checklist</div>
          <ul class="fpt-checklist-list">
            <li v-for="item in CHECKLIST" :key="item">• {{ item }}</li>
          </ul>
        </div>

        <div
          class="fpt-week-card"
          :class="thisWeekSlot ? `wcard--${thisWeekSlot.status}` : 'wcard--pending'"
        >
          <!-- Week range label -->
          <div class="fpt-wcard-top">
            <div>
              <div class="fpt-wcard-range">{{ currentWeekRangeLabel }}</div>
              <div class="fpt-wcard-hint">Weekly speed-optimization check</div>
            </div>
            <span class="fpt-wcard-badge" :class="`wbadge--${thisWeekSlot?.status ?? 'pending'}`">
              {{ statusLabel(thisWeekSlot?.status ?? 'pending') }}
            </span>
          </div>

          <!-- Checkbox -->
          <div class="fpt-wcard-check-row">
            <label
              class="fpt-checkbox-label"
              :class="[
                thisWeekSlot?.status === 'done' ? 'check--done' : '',
                savingWeek ? 'check--saving' : '',
              ]"
            >
              <input
                type="checkbox"
                class="fpt-checkbox"
                :checked="thisWeekSlot?.status === 'done'"
                :disabled="!!savingWeek"
                @change="onWeekCheck($event)"
              />
              <span class="fpt-checkbox-box">
                <svg v-if="thisWeekSlot?.status === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span v-else-if="savingWeek" class="fpt-saving-dot" />
              </span>
              <span class="fpt-check-text">{{ thisWeekSlot?.status === 'done' ? 'Done — speed check complete' : 'Mark as Done' }}</span>
            </label>

            <button
              v-if="auth.isAdmin && thisWeekSlot?.status === 'done'"
              class="fpt-undo-btn"
              type="button"
              :disabled="!!savingWeek"
              @click="undoWeek"
            >Undo</button>
          </div>

          <!-- Completed info -->
          <div v-if="thisWeekSlot?.completedAt" class="fpt-wcard-completed">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            Completed on {{ formatDate(thisWeekSlot.completedAt) }}
            <span v-if="thisWeekSlot.completedBy && memberName(thisWeekSlot.completedBy)">
              by {{ memberName(thisWeekSlot.completedBy) }}
            </span>
          </div>

          <!-- "Add details" expandable panel (optional) -->
          <div class="fpt-details">
            <button class="fpt-details-toggle" type="button" @click="detailsOpen = !detailsOpen">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ transform: detailsOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 180ms' }"><polyline points="9 18 15 12 9 6"/></svg>
              {{ detailsOpen ? 'Hide details' : 'Add details (optional)' }}
            </button>

            <div class="fpt-details-panel" :class="{ 'is-open': detailsOpen }">
              <div class="fpt-details-inner">
                <div class="fpt-row2">
                  <label class="fpt-field">
                    <span>Before score</span>
                    <input v-model.number="detail.beforeScore" type="number" min="0" max="100" class="fpt-input" placeholder="e.g. 62" />
                  </label>
                  <label class="fpt-field">
                    <span>After score</span>
                    <input v-model.number="detail.afterScore" type="number" min="0" max="100" class="fpt-input" placeholder="e.g. 89" />
                  </label>
                </div>
                <label class="fpt-field">
                  <span>Notes</span>
                  <textarea v-model="detail.notes" rows="3" class="fpt-input" placeholder="What did you optimize? Any issues?" />
                </label>
                <label class="fpt-field">
                  <span>Screenshot URL</span>
                  <input v-model="detail.screenshotUrl" type="url" class="fpt-input" placeholder="https://…" />
                </label>
                <div class="fpt-flags">
                  <label class="fpt-flag">
                    <input v-model="detail.issueFound" type="checkbox" />
                    <span>Issue found</span>
                  </label>
                  <label class="fpt-flag">
                    <input v-model="detail.needsAdminHelp" type="checkbox" />
                    <span>Needs admin help</span>
                  </label>
                </div>
                <div class="fpt-details-actions">
                  <button class="btn-primary" type="button" :disabled="savingDetails" @click="saveDetails">
                    {{ savingDetails ? 'Saving…' : 'Save details' }}
                  </button>
                  <span v-if="detailsMsg" class="fpt-details-msg">{{ detailsMsg }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ── THIS MONTH VIEW ── -->
      <div v-else class="fpt-month-view">
        <div class="fpt-month-nav">
          <button class="fpt-nav-btn" type="button" @click="prevMonth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span class="fpt-month-label">{{ monthLabel }}</span>
          <button class="fpt-nav-btn" type="button" :disabled="isCurrentMonth" @click="nextMonth">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        </div>

        <div class="fpt-week-list">
          <div
            v-for="week in monthWeeks"
            :key="week.weekStart"
            class="fpt-week-row"
            :class="[
              week.slot ? `wrow--${week.slot.status}` : (week.isPast ? 'wrow--missed' : 'wrow--pending'),
              week.isCurrent ? 'wrow--current' : '',
            ]"
          >
            <div class="fpt-wrow-left">
              <span class="fpt-wrow-range">{{ week.rangeLabel }}</span>
              <span v-if="week.isCurrent" class="fpt-wrow-current-tag">Current</span>
            </div>

            <div class="fpt-wrow-mid">
              <span
                class="fpt-wrow-badge"
                :class="`wbadge--${week.slot?.status ?? (week.isPast ? 'missed' : 'pending')}`"
              >
                {{ statusLabel(week.slot?.status ?? (week.isPast ? 'missed' : 'pending')) }}
              </span>
              <span v-if="week.slot?.completedAt" class="fpt-wrow-completed">
                {{ formatDate(week.slot.completedAt) }}
              </span>
            </div>

            <label
              class="fpt-checkbox-label fpt-wrow-check"
              :class="[
                week.slot?.status === 'done' ? 'check--done' : '',
                savingWeek === week.weekStart ? 'check--saving' : '',
              ]"
            >
              <input
                type="checkbox"
                class="fpt-checkbox"
                :checked="week.slot?.status === 'done'"
                :disabled="savingWeek === week.weekStart"
                @change="onWeekRowCheck(week, $event)"
              />
              <span class="fpt-checkbox-box">
                <svg v-if="week.slot?.status === 'done'" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span v-else-if="savingWeek === week.weekStart" class="fpt-saving-dot" />
              </span>
            </label>

            <button
              v-if="auth.isAdmin && week.slot?.status === 'done'"
              class="fpt-undo-btn"
              type="button"
              :disabled="savingWeek === week.weekStart"
              @click="undoWeekRow(week)"
            >Undo</button>
          </div>
        </div>
      </div>

      <!-- Legend -->
      <div class="fpt-legend">
        <span class="fpt-leg-item"><span class="fpt-leg-dot dot--done" /> Done</span>
        <span class="fpt-leg-item"><span class="fpt-leg-dot dot--missed" /> Missed</span>
        <span class="fpt-leg-item"><span class="fpt-leg-dot dot--pending" /> Pending</span>
        <span class="fpt-leg-item"><span class="fpt-leg-dot dot--attn" /> Needs Attention</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore, type SpeedSlot, type SpeedSlotStatus } from '@/stores/followup';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['speed_optimization_slots']);

const route    = useRoute();
const auth     = useAuthStore();
const data     = useDataStore();
const followup = useFollowupStore();

const websiteId = computed(() => route.params.websiteId as string);
const website   = computed(() => data.websiteById(websiteId.value));

const loading    = ref(false);
const error      = ref<string | null>(null);
const savingWeek = ref<string | null>(null);

type ViewMode = 'week' | 'month';
const viewMode = ref<ViewMode>('week');

// Static checklist text — purely informational
const CHECKLIST = [
  'Run speed test or Hostinger performance test',
  'Check cache / plugin optimization',
  'Check WordPress editor speed',
  'Check homepage loading speed',
  'Check mobile loading experience',
  'Confirm website still works after optimization',
];

// ── Date helpers (timezone-safe) ─────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);

const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getWeekStart = (d: Date): Date => {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const getWeekEnd = (weekStartDate: Date): Date => {
  const sun = new Date(weekStartDate);
  sun.setDate(weekStartDate.getDate() + 6);
  return sun;
};

const weekRangeLabel = (weekStartIso: string) => {
  const mon = new Date(`${weekStartIso}T00:00:00`);
  const sun = getWeekEnd(mon);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(mon)} – ${fmt(sun)}`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── This week ────────────────────────────────────────────────────────────────
const currentWeekStart = isoDate(getWeekStart(today));
const currentWeekRangeLabel = computed(() => weekRangeLabel(currentWeekStart));

const slots = computed(() => followup.speedSlotsForWebsite(websiteId.value));

const thisWeekSlot = computed(() =>
  slots.value.find((s) => s.weekStart === currentWeekStart) ?? null
);

// ── Month navigation ─────────────────────────────────────────────────────────
const viewYear  = ref(today.getFullYear());
const viewMonth = ref(today.getMonth());

const isCurrentMonth = computed(
  () => viewYear.value === today.getFullYear() && viewMonth.value === today.getMonth()
);

const prevMonth = () => {
  if (viewMonth.value === 0) { viewMonth.value = 11; viewYear.value--; }
  else viewMonth.value--;
};
const nextMonth = () => {
  if (isCurrentMonth.value) return;
  if (viewMonth.value === 11) { viewMonth.value = 0; viewYear.value++; }
  else viewMonth.value++;
};

const monthLabel = computed(() =>
  new Date(viewYear.value, viewMonth.value, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
);

interface WeekRow {
  weekStart: string;
  rangeLabel: string;
  slot: SpeedSlot | null;
  isPast: boolean;
  isCurrent: boolean;
}

const monthWeeks = computed((): WeekRow[] => {
  const year  = viewYear.value;
  const month = viewMonth.value;
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const cur = getWeekStart(new Date(firstDay));
  const weeks: WeekRow[] = [];
  while (cur <= lastDay) {
    const ws  = isoDate(cur);
    const we  = isoDate(getWeekEnd(cur));
    const slot = slots.value.find((s) => s.weekStart === ws) ?? null;
    const weekEndDate = new Date(`${we}T23:59:59`);
    weeks.push({
      weekStart: ws,
      rangeLabel: weekRangeLabel(ws),
      slot,
      isPast: weekEndDate < today,
      isCurrent: ws === currentWeekStart,
    });
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
});

// ── Summary stats for viewed period ──────────────────────────────────────────
const viewStats = computed(() => {
  if (viewMode.value === 'week') {
    const s = thisWeekSlot.value;
    return {
      done:    s?.status === 'done' ? 1 : 0,
      missed:  s?.status === 'missed' ? 1 : 0,
      pending: !s || s.status === 'pending' ? 1 : 0,
      total: 1,
    };
  }
  const ms = monthWeeks.value;
  return {
    done:    ms.filter((w) => w.slot?.status === 'done').length,
    missed:  ms.filter((w) => w.slot?.status === 'missed' || (!w.slot && w.isPast)).length,
    pending: ms.filter((w) => !w.slot && !w.isPast).length,
    total:   ms.length,
  };
});

// ── Member names ─────────────────────────────────────────────────────────────
const memberName = (userId: string): string => {
  const m = data.members?.find((x) => x.id === userId);
  return m?.fullName ?? m?.email ?? '';
};

const statusLabel = (s: SpeedSlotStatus | 'pending') => {
  if (s === 'done')            return 'Done';
  if (s === 'missed')          return 'Missed';
  if (s === 'needs_attention') return 'Needs Attention';
  return 'Pending';
};

// ── Actions ──────────────────────────────────────────────────────────────────
const onWeekCheck = async (e: Event) => {
  const checked = (e.target as HTMLInputElement).checked;
  if (savingWeek.value) return;
  savingWeek.value = currentWeekStart;
  try {
    if (checked) {
      await followup.upsertSpeedSlot({
        id:          thisWeekSlot.value?.id,
        websiteId:   websiteId.value,
        weekStart:   currentWeekStart,
        status:      'done',
        completedBy: auth.user?.id,
        completedAt: new Date().toISOString(),
      });
    } else {
      if (!thisWeekSlot.value) return;
      await followup.upsertSpeedSlot({
        id:          thisWeekSlot.value.id,
        websiteId:   websiteId.value,
        weekStart:   currentWeekStart,
        status:      'pending',
        completedBy: null,
        completedAt: null,
      });
    }
  } finally {
    savingWeek.value = null;
  }
};

const undoWeek = async () => {
  if (!auth.isAdmin || !thisWeekSlot.value) return;
  savingWeek.value = currentWeekStart;
  try {
    await followup.upsertSpeedSlot({
      id:          thisWeekSlot.value.id,
      websiteId:   websiteId.value,
      weekStart:   currentWeekStart,
      status:      'pending',
      completedBy: null,
      completedAt: null,
    });
  } finally {
    savingWeek.value = null;
  }
};

const onWeekRowCheck = async (week: WeekRow, e: Event) => {
  const checked = (e.target as HTMLInputElement).checked;
  if (savingWeek.value) return;
  savingWeek.value = week.weekStart;
  try {
    if (checked) {
      await followup.upsertSpeedSlot({
        id:          week.slot?.id,
        websiteId:   websiteId.value,
        weekStart:   week.weekStart,
        status:      'done',
        completedBy: auth.user?.id,
        completedAt: new Date().toISOString(),
      });
    } else {
      if (!week.slot) return;
      await followup.upsertSpeedSlot({
        id:          week.slot.id,
        websiteId:   websiteId.value,
        weekStart:   week.weekStart,
        status:      week.isPast ? 'missed' : 'pending',
        completedBy: null,
        completedAt: null,
      });
    }
  } finally {
    savingWeek.value = null;
  }
};

const undoWeekRow = async (week: WeekRow) => {
  if (!auth.isAdmin || !week.slot) return;
  savingWeek.value = week.weekStart;
  try {
    await followup.upsertSpeedSlot({
      id:          week.slot.id,
      websiteId:   websiteId.value,
      weekStart:   week.weekStart,
      status:      week.isPast ? 'missed' : 'pending',
      completedBy: null,
      completedAt: null,
    });
  } finally {
    savingWeek.value = null;
  }
};

// ── "Add details" panel ──────────────────────────────────────────────────────
const detailsOpen   = ref(false);
const savingDetails = ref(false);
const detailsMsg    = ref('');

interface DetailForm {
  beforeScore: number | null;
  afterScore:  number | null;
  notes:       string;
  screenshotUrl: string;
  issueFound:    boolean;
  needsAdminHelp: boolean;
}
const blankDetail = (): DetailForm => ({
  beforeScore: null,
  afterScore:  null,
  notes:        '',
  screenshotUrl: '',
  issueFound:    false,
  needsAdminHelp: false,
});
const detail = ref<DetailForm>(blankDetail());

// Hydrate the form whenever the current-week slot changes
watch(thisWeekSlot, (slot) => {
  if (!slot) { detail.value = blankDetail(); return; }
  detail.value = {
    beforeScore:    slot.beforeScore,
    afterScore:     slot.afterScore,
    notes:          slot.notes ?? '',
    screenshotUrl:  slot.screenshotUrl ?? '',
    issueFound:     slot.issueFound,
    needsAdminHelp: slot.needsAdminHelp,
  };
}, { immediate: true });

const saveDetails = async () => {
  savingDetails.value = true;
  detailsMsg.value = '';
  try {
    // "Needs admin help" forces Needs Attention status (unless slot is still pending and unchecked)
    const currentStatus: SpeedSlotStatus = thisWeekSlot.value?.status ?? 'pending';
    const nextStatus: SpeedSlotStatus =
      detail.value.needsAdminHelp ? 'needs_attention' :
      currentStatus === 'needs_attention' ? 'done' :   // un-flagging help clears Needs Attention
      currentStatus;

    await followup.upsertSpeedSlot({
      id:             thisWeekSlot.value?.id,
      websiteId:      websiteId.value,
      weekStart:      currentWeekStart,
      status:         nextStatus,
      beforeScore:    detail.value.beforeScore,
      afterScore:     detail.value.afterScore,
      notes:          detail.value.notes || null,
      screenshotUrl:  detail.value.screenshotUrl || null,
      issueFound:     detail.value.issueFound,
      needsAdminHelp: detail.value.needsAdminHelp,
    });
    detailsMsg.value = 'Saved.';
    setTimeout(() => { detailsMsg.value = ''; }, 1800);
  } finally {
    savingDetails.value = false;
  }
};

// ── Load ─────────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true;
  error.value   = null;
  try {
    await data.fetchWebsites();
    await data.fetchMembers();
    await followup.ensureSpeedSlots(websiteId.value);
    await followup.fetchSpeedSlots(websiteId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.fpt-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

/* ── Header ── */
.fpt-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.fpt-back {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-muted);
  text-decoration: none;
  border: 1px solid var(--border);
  border-radius: 9px;
  padding: 0.35rem 0.75rem;
  background: var(--card-bg);
  transition: color 120ms, border-color 120ms;
  white-space: nowrap;
  flex-shrink: 0;
}
.fpt-back:hover { color: var(--text-main); border-color: color-mix(in srgb, var(--border) 50%, var(--text-muted)); }

.fpt-site-info { display: flex; align-items: center; gap: 0.65rem; min-width: 0; }
.fpt-site-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.85rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.fpt-site-favicon { width: 70%; height: 70%; object-fit: contain; }
.fpt-site-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fpt-site-domain { font-size: 0.75rem; color: var(--text-muted); }

/* ── Skeleton ── */
.fpt-skeleton-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
.fpt-skel {
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: fpt-pulse 1.4s ease-in-out infinite;
}
.fpt-skel--bar { height: 2.8rem; }
.fpt-skel-list { display: flex; flex-direction: column; gap: 0.5rem; }
.fpt-skel--row { height: 4.5rem; }
@keyframes fpt-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Summary ── */
.fpt-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
}
.fpt-sum-item { display: flex; align-items: baseline; gap: 0.35rem; }
.fpt-sum-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
}
.fpt-sum-lbl {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}
.fpt-sum--done    .fpt-sum-num { color: #16a34a; }
.fpt-sum--missed  .fpt-sum-num { color: #dc2626; }
.fpt-sum--pending .fpt-sum-num { color: var(--text-muted); }
.fpt-sum-progress { display: flex; align-items: center; gap: 0.6rem; margin-left: auto; flex-shrink: 0; }
.fpt-sum-prog-track {
  width: 6rem;
  height: 6px;
  border-radius: 999px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  overflow: hidden;
}
.fpt-sum-prog-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--primary);
  transition: width 300ms ease;
}
.fpt-sum-prog-fill.fill--complete { background: #16a34a; }
.fpt-sum-prog-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── View toggle ── */
.fpt-view-toggle {
  display: flex;
  gap: 0.3rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.3rem;
  width: fit-content;
}
.fpt-vtab {
  border: none;
  background: transparent;
  border-radius: 9px;
  padding: 0.38rem 1rem;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 120ms, color 120ms;
  white-space: nowrap;
}
.fpt-vtab--active {
  background: var(--card-bg);
  color: var(--primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
}

/* ── This Week ── */
.fpt-week-view { display: flex; flex-direction: column; gap: 0.75rem; }

.fpt-checklist {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 4%, var(--card-bg));
  padding: 0.85rem 1rem;
}
.fpt-checklist-head {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--primary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 0.4rem;
}
.fpt-checklist-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
  gap: 0.2rem 0.75rem;
  font-size: 0.82rem;
  color: var(--text-main);
}

.fpt-week-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1.25rem 1.35rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 150ms;
}
.wcard--done            { border-color: rgba(22,163,74,0.4); background: color-mix(in srgb, #16a34a 3%, var(--card-bg)); }
.wcard--missed          { border-color: rgba(220,38,38,0.35); }
.wcard--needs_attention { border-color: rgba(249,115,22,0.4); background: color-mix(in srgb, #f97316 4%, var(--card-bg)); }

.fpt-wcard-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
.fpt-wcard-range {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.05rem;
  font-weight: 900;
  color: var(--text-main);
}
.fpt-wcard-hint { font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem; }

.fpt-wcard-badge,
.fpt-wrow-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.22rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
  flex-shrink: 0;
}
.wbadge--pending         { background: var(--soft-bg); color: var(--text-muted); border: 1px solid var(--border); }
.wbadge--done            { background: rgba(22,163,74,0.12); color: #16a34a; border: 1px solid rgba(22,163,74,0.25); }
.wbadge--missed          { background: rgba(220,38,38,0.10); color: #dc2626; border: 1px solid rgba(220,38,38,0.25); }
.wbadge--needs_attention { background: rgba(249,115,22,0.12); color: #f97316; border: 1px solid rgba(249,115,22,0.25); }

.fpt-wcard-check-row { display: flex; align-items: center; gap: 0.75rem; }
.fpt-wcard-completed {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: #16a34a;
  font-weight: 600;
}

/* Checkbox */
.fpt-checkbox-label { display: flex; align-items: center; gap: 0.55rem; cursor: pointer; user-select: none; }
.fpt-checkbox-label.check--saving { opacity: 0.6; cursor: wait; }
.fpt-checkbox { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
.fpt-checkbox-box {
  width: 1.45rem;
  height: 1.45rem;
  border-radius: 7px;
  border: 2px solid var(--border);
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 140ms, background 140ms;
  color: #fff;
}
.fpt-checkbox-label:hover .fpt-checkbox-box { border-color: #16a34a; }
.check--done .fpt-checkbox-box { background: #16a34a; border-color: #16a34a; }
.fpt-check-text { font-size: 0.88rem; font-weight: 700; color: var(--text-main); }
.check--done .fpt-check-text { color: #16a34a; }
.fpt-saving-dot {
  width: 8px; height: 8px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  animation: fpt-spin 0.6s linear infinite;
}
@keyframes fpt-spin { to { transform: rotate(360deg); } }

.fpt-undo-btn {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 0.18rem 0.5rem;
  cursor: pointer;
  transition: color 120ms;
  white-space: nowrap;
  flex-shrink: 0;
}
.fpt-undo-btn:hover { color: var(--text-main); }
.fpt-undo-btn:disabled { opacity: 0.5; cursor: default; }

/* ── Details panel ── */
.fpt-details { border-top: 1px dashed var(--border); padding-top: 0.85rem; }
.fpt-details-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: none;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--primary);
  cursor: pointer;
  padding: 0;
}
.fpt-details-panel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 220ms cubic-bezier(0.4, 0, 0.2, 1);
}
.fpt-details-panel.is-open { grid-template-rows: 1fr; }
.fpt-details-inner {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-top: 0.6rem;
  min-height: 0;
}
.fpt-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
@media (max-width: 560px) { .fpt-row2 { grid-template-columns: 1fr; } }
.fpt-field { display: flex; flex-direction: column; gap: 0.25rem; }
.fpt-field > span {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.fpt-input {
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--card-bg);
  color: var(--text-main);
  padding: 0.5rem 0.7rem;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
  transition: border-color 140ms, box-shadow 140ms;
}
.fpt-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 16%, transparent);
}
.fpt-flags { display: flex; gap: 1rem; flex-wrap: wrap; }
.fpt-flag {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.84rem;
  color: var(--text-main);
  cursor: pointer;
}
.fpt-flag input { accent-color: var(--primary); width: 1rem; height: 1rem; }
.fpt-details-actions { display: flex; align-items: center; gap: 0.6rem; }
.fpt-details-msg { font-size: 0.78rem; color: #16a34a; font-weight: 600; }

/* ── Month view ── */
.fpt-month-view { display: flex; flex-direction: column; gap: 0.75rem; }
.fpt-month-nav { display: flex; align-items: center; gap: 0.75rem; width: fit-content; }
.fpt-nav-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: color 120ms, border-color 120ms;
  flex-shrink: 0;
}
.fpt-nav-btn:hover:not(:disabled) { color: var(--text-main); }
.fpt-nav-btn:disabled { opacity: 0.35; cursor: default; }
.fpt-month-label {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
  min-width: 10rem;
  text-align: center;
}

.fpt-week-list { display: flex; flex-direction: column; gap: 0.45rem; }
.fpt-week-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--card-bg);
  padding: 0.7rem 1rem;
  transition: border-color 140ms;
}
.wrow--done   { border-left: 3px solid #16a34a; }
.wrow--missed { border-left: 3px solid rgba(220,38,38,0.4); background: color-mix(in srgb, #dc2626 2%, var(--card-bg)); }
.wrow--needs_attention { border-left: 3px solid #f97316; }
.wrow--current { outline: 2px solid var(--primary); outline-offset: -1px; }

.fpt-wrow-left { display: flex; align-items: center; gap: 0.5rem; min-width: 10rem; }
.fpt-wrow-range {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--text-main);
}
.fpt-wrow-current-tag {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 12%, transparent);
  border-radius: 999px;
  padding: 0.1rem 0.45rem;
}
.fpt-wrow-mid { display: flex; align-items: center; gap: 0.55rem; flex: 1; min-width: 0; flex-wrap: wrap; }
.fpt-wrow-completed { font-size: 0.72rem; color: var(--text-muted); }
.fpt-wrow-check { margin-left: auto; flex-shrink: 0; }

/* ── Error ── */
.fpt-error { display: flex; flex-direction: column; }

/* ── Legend ── */
.fpt-legend { display: flex; gap: 1rem; flex-wrap: wrap; padding-top: 0.25rem; }
.fpt-leg-item { display: flex; align-items: center; gap: 0.35rem; font-size: 0.72rem; color: var(--text-muted); font-weight: 600; }
.fpt-leg-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.dot--done    { background: #16a34a; }
.dot--missed  { background: #dc2626; }
.dot--pending { background: var(--border); }
.dot--attn    { background: #f97316; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .fpt-wrow-left { min-width: 0; }
  .fpt-wrow-mid  { display: none; }
  .fpt-wrow-check { margin-left: 0; }
  .fpt-sum-progress { margin-left: 0; }
}
</style>
