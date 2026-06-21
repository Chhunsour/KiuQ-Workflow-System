<template>
  <div class="fbt-page">
    <!-- Header -->
    <div class="fbt-header">
      <RouterLink to="/followup/blog" class="fbt-back">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
        All Websites
      </RouterLink>

      <div v-if="website" class="fbt-site-info">
        <div class="fbt-site-avatar">
          <img v-if="website.faviconUrl" :src="website.faviconUrl" alt="" class="fbt-site-favicon" @error="(e) => ((e.target as HTMLImageElement).style.display='none')" />
          <span v-else>{{ website.name.slice(0, 2).toUpperCase() }}</span>
        </div>
        <div>
          <div class="fbt-site-name">{{ website.name }}</div>
          <div class="fbt-site-domain">{{ website.domain || 'No domain' }}</div>
        </div>
      </div>

      <!-- Schedule button — open to every role that can see the blog
           tracker. Quality Checker is already blocked at the router
           level so they never reach this page. RLS remains permissive
           (open to authenticated); if we tighten roles later we'll
           tighten the policy in the same pass. -->
      <button
        v-if="website && !auth.isQualityChecker"
        type="button"
        class="btn-secondary fbt-schedule-btn"
        title="Edit this website's blog schedule"
        @click="scheduleOpen = true"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
        Edit Schedule
      </button>
    </div>

    <!-- Error -->
    <div v-if="error" class="fbt-error card card-pad">
      <p class="font-semibold text-status-needs-fix-fg">Could not load. Please try again.</p>
      <button class="btn-primary mt-3 w-fit" type="button" @click="load">Retry</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="fbt-skeleton-wrap">
      <div class="fbt-skel fbt-skel--bar" />
      <div class="fbt-skel-grid">
        <div v-for="i in 35" :key="i" class="fbt-skel fbt-skel--cell" />
      </div>
    </div>

    <!-- Not found -->
    <div v-else-if="!website" class="card card-pad text-sm text-text-muted">
      Website not found.
    </div>

    <template v-else>
      <!-- Summary pills -->
      <div class="fbt-summary">
        <div class="fbt-sum-item fbt-sum--done">
          <span class="fbt-sum-num">{{ monthStats.done }}</span>
          <span class="fbt-sum-lbl">Done</span>
        </div>
        <div class="fbt-sum-item fbt-sum--missed">
          <span class="fbt-sum-num">{{ monthStats.missed }}</span>
          <span class="fbt-sum-lbl">Missed</span>
        </div>
        <div class="fbt-sum-item fbt-sum--pending">
          <span class="fbt-sum-num">{{ monthStats.pending }}</span>
          <span class="fbt-sum-lbl">Pending</span>
        </div>
        <div class="fbt-sum-progress">
          <div class="fbt-sum-prog-track">
            <div
              class="fbt-sum-prog-fill"
              :class="monthStats.total ? (monthStats.done === monthStats.total ? 'fill--complete' : 'fill--partial') : ''"
              :style="{ width: monthStats.total ? (monthStats.done / monthStats.total * 100) + '%' : '0%' }"
            />
          </div>
          <span class="fbt-sum-prog-text">{{ monthStats.done }}/{{ monthStats.total }} this month</span>
        </div>
      </div>

      <!-- Month navigator -->
      <div class="fbt-month-nav">
        <button class="fbt-nav-btn" type="button" @click="prevMonth">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <span class="fbt-month-label">{{ monthLabel }}</span>
        <button class="fbt-nav-btn" type="button" :disabled="isCurrentMonth" @click="nextMonth">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>

      <!-- Calendar grid -->
      <div class="fbt-cal-wrap">
        <!-- Day-of-week headers (Mon–Sun) -->
        <div class="fbt-cal-grid fbt-cal-headers">
          <div v-for="h in dayHeaders" :key="h" class="fbt-cal-hcell" :class="{ 'hcell--active': h === 'TUE' || h === 'SAT' }">
            {{ h }}
          </div>
        </div>

        <!-- Calendar cells -->
        <div class="fbt-cal-grid fbt-cal-body">
          <!-- leading blank cells -->
          <div v-for="i in leadingBlanks" :key="`b${i}`" class="fbt-cal-cell fbt-cal-cell--blank" />

          <!-- day cells -->
          <div
            v-for="cell in dayCells"
            :key="cell.dateStr"
            class="fbt-cal-cell"
            :class="[
              cell.isBlogDay ? 'fbt-cal-cell--blog' : 'fbt-cal-cell--muted',
              cell.isToday ? 'cell--today' : '',
              cell.isBlogDay && cell.slot ? `cell--${cell.slot.status}` : '',
            ]"
          >
            <div class="fbt-cell-top">
              <span class="fbt-cell-num">{{ cell.day }}</span>
              <span v-if="cell.isBlogDay" class="fbt-cell-dow">{{ cell.dayLabel }}</span>
            </div>

            <!-- Blog day: checkbox -->
            <div v-if="cell.isBlogDay" class="fbt-cell-check-wrap">
              <label
                class="fbt-checkbox-label"
                :class="[
                  cell.slot?.status === 'done' || cell.slot?.status === 'late' ? 'check--done' : '',
                  cell.slot?.status === 'missed' ? 'check--missed' : '',
                  savingSlot === cell.dateStr ? 'check--saving' : '',
                ]"
                :title="cell.slot ? statusLabel(cell.slot.status) : 'Pending'"
              >
                <input
                  type="checkbox"
                  class="fbt-checkbox"
                  :checked="isDone(cell)"
                  :disabled="savingSlot === cell.dateStr"
                  @change="onCheck(cell, ($event.target as HTMLInputElement).checked)"
                />
                <span class="fbt-checkbox-box">
                  <svg v-if="isDone(cell)" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span v-else-if="savingSlot === cell.dateStr" class="fbt-saving-dot" />
                </span>
                <span class="fbt-check-status">{{ cell.slot ? statusLabel(cell.slot.status) : 'Pending' }}</span>
              </label>

              <!-- Undo for admin -->
              <button
                v-if="auth.isAdmin && isDone(cell) && cell.slot"
                class="fbt-undo-btn"
                type="button"
                :disabled="savingSlot === cell.dateStr"
                @click.stop="undo(cell)"
              >Undo</button>
            </div>
          </div>

          <!-- trailing blank cells to complete the last row -->
          <div v-for="i in trailingBlanks" :key="`t${i}`" class="fbt-cal-cell fbt-cal-cell--blank" />
        </div>
      </div>

      <!-- Legend -->
      <div class="fbt-legend">
        <span class="fbt-leg-item"><span class="fbt-leg-dot dot--done" /> Done</span>
        <span class="fbt-leg-item"><span class="fbt-leg-dot dot--missed" /> Missed</span>
        <span class="fbt-leg-item"><span class="fbt-leg-dot dot--pending" /> Pending</span>
      </div>
    </template>

    <BlogScheduleModal
      :open="scheduleOpen"
      :website-id="websiteId"
      @close="scheduleOpen = false"
      @saved="onScheduleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore, type BlogSlot, type BlogSlotStatus } from '@/stores/followup';
import { usePageRealtime } from '@/services/realtimeService';
import BlogScheduleModal from '@/components/followup/BlogScheduleModal.vue';

usePageRealtime(['blog_upload_slots', 'blog_followup_schedules']);

const route    = useRoute();
const auth     = useAuthStore();
const data     = useDataStore();
const followup = useFollowupStore();

const websiteId = computed(() => route.params.websiteId as string);
const website   = computed(() => data.websiteById(websiteId.value));

const loading    = ref(false);
const error      = ref<string | null>(null);
const savingSlot = ref<string | null>(null); // dateStr of slot being saved

// ── Month navigation ──────────────────────────────────────────────────────────
const today = new Date();
today.setHours(0, 0, 0, 0);
// Timezone-safe (local parts, not toISOString which shifts to UTC).
const todayStr =
  `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

const viewYear  = ref(today.getFullYear());
const viewMonth = ref(today.getMonth()); // 0-indexed

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

// ── Calendar helpers ──────────────────────────────────────────────────────────
// Timezone-safe: build YYYY-MM-DD from LOCAL date parts. Using
// toISOString() converts to UTC and shifts the day in non-UTC zones,
// which made the calendar's date string mismatch the overview's
// (Mark Tue from the overview wouldn't appear here).
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const dayHeaders = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

interface DayCell {
  day: number;
  dow: number;        // 0=Sun,1=Mon…6=Sat
  dateStr: string;    // YYYY-MM-DD
  isBlogDay: boolean; // required by this website's schedule
  /** Short label shown on required cells: "Tue" / "Sat" for weekly,
   *  the day-of-month number ("5", "27") for monthly schedules. */
  dayLabel: string;
  isToday: boolean;
  isPast: boolean;
  slot: BlogSlot | null;
}

const slots = computed(() => followup.blogSlotsForWebsite(websiteId.value));

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Build calendar cells for the viewed month, marking which dates this
 * website's schedule actually requires. Reads the schedule directly
 * instead of relying on pre-generated slot rows, so the calendar
 * updates the moment the schedule is saved.
 *
 * Required-day resolution:
 *   weekly  → schedule.weekdays  (or Tue+Sat default if no schedule)
 *   monthly → schedule.monthlyDays (preferred) or monthly_target slots (legacy)
 *   custom  → schedule.customDates  (legacy mode)
 */
const dayCells = computed((): DayCell[] => {
  const year  = viewYear.value;
  const month = viewMonth.value;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const cells: DayCell[] = [];
  const schedule = followup.scheduleFor(websiteId.value);

  const weeklyDows = new Set<number>(
    !schedule
      ? [2, 6]                                                // legacy default
      : schedule.kind === 'weekly' && schedule.weekdays.length > 0
        ? schedule.weekdays
        : []
  );
  const customSet = new Set<string>(
    schedule?.kind === 'custom' ? schedule.customDates : []
  );
  const monthlyWantedDays = (() => {
    if (schedule?.kind !== 'monthly') return new Set<number>();
    const wanted = (schedule.monthlyDays ?? [])
      .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)
      .map((d) => Math.min(d, lastDay));
    return new Set<number>(wanted);
  })();

  for (let d = 1; d <= lastDay; d++) {
    const date    = new Date(year, month, d);
    const dow     = date.getDay();
    const dateStr = isoDate(date);

    let isBlog = false;
    let dayLabel = '';

    if (schedule?.kind === 'monthly') {
      if (monthlyWantedDays.has(d)) {
        isBlog = true;
        dayLabel = String(d);
      } else if (monthlyWantedDays.size === 0 && schedule.monthlyTarget) {
        // Legacy monthly_target — defer to whatever slot the store placed.
        const slot = slots.value.find((s) => s.scheduledDate === dateStr);
        if (slot) {
          isBlog = true;
          dayLabel = String(d);
        }
      }
    } else if (customSet.has(dateStr)) {
      isBlog = true;
      dayLabel = String(d);
    } else if (weeklyDows.has(dow)) {
      isBlog = true;
      dayLabel = SHORT_DAY[dow];
    }

    const slot = isBlog ? (slots.value.find((s) => s.scheduledDate === dateStr) ?? null) : null;
    cells.push({
      day: d,
      dow,
      dateStr,
      isBlogDay: isBlog,
      dayLabel,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      slot,
    });
  }
  return cells;
});

// Leading blanks so the grid starts on Monday (Mon=0 in our layout)
const leadingBlanks = computed(() => {
  const firstDow = new Date(viewYear.value, viewMonth.value, 1).getDay(); // 0=Sun
  return firstDow === 0 ? 6 : firstDow - 1;
});

// Trailing blanks to fill the last grid row
const trailingBlanks = computed(() => {
  const total = leadingBlanks.value + dayCells.value.length;
  const remainder = total % 7;
  return remainder === 0 ? 0 : 7 - remainder;
});

// ── Month stats ───────────────────────────────────────────────────────────────
const monthStats = computed(() => {
  const year  = viewYear.value;
  const month = viewMonth.value;
  const start = isoDate(new Date(year, month, 1));
  const end   = isoDate(new Date(year, month + 1, 0));
  const ms    = slots.value.filter((s) => s.scheduledDate >= start && s.scheduledDate <= end);
  return {
    done:    ms.filter((s) => s.status === 'done' || s.status === 'late').length,
    missed:  ms.filter((s) => s.status === 'missed').length,
    pending: ms.filter((s) => s.status === 'pending').length,
    total:   ms.length,
  };
});

// ── Status helpers ────────────────────────────────────────────────────────────
const statusLabel = (s: BlogSlotStatus) => {
  if (s === 'done')    return 'Done';
  if (s === 'late')    return 'Done';
  if (s === 'missed')  return 'Missed';
  return 'Pending';
};

const isDone = (cell: DayCell) =>
  cell.slot?.status === 'done' || cell.slot?.status === 'late';

// ── Actions ───────────────────────────────────────────────────────────────────
const onCheck = async (cell: DayCell, checked: boolean) => {
  if (savingSlot.value) return;
  savingSlot.value = cell.dateStr;
  try {
    if (checked) {
      const isLate = cell.isPast;
      await followup.upsertBlogSlot({
        id:            cell.slot?.id,
        websiteId:     websiteId.value,
        scheduledDate: cell.dateStr,
        dayOfWeek:     cell.dow,
        status:        isLate ? 'late' : 'done',
        completedBy:   auth.user?.id,
        completedAt:   new Date().toISOString(),
      });
    } else {
      // Unchecking — mark back to pending (or missed if past)
      if (!cell.slot) return;
      await followup.upsertBlogSlot({
        id:            cell.slot.id,
        websiteId:     websiteId.value,
        scheduledDate: cell.dateStr,
        dayOfWeek:     cell.dow,
        status:        cell.isPast ? 'missed' : 'pending',
        completedBy:   null,
        completedAt:   null,
      });
    }
  } finally {
    savingSlot.value = null;
  }
};

const undo = async (cell: DayCell) => {
  if (!auth.isAdmin || !cell.slot) return;
  savingSlot.value = cell.dateStr;
  try {
    await followup.upsertBlogSlot({
      id:            cell.slot.id,
      websiteId:     websiteId.value,
      scheduledDate: cell.dateStr,
      dayOfWeek:     cell.dow,
      status:        cell.isPast ? 'missed' : 'pending',
      completedBy:   null,
      completedAt:   null,
    });
  } finally {
    savingSlot.value = null;
  }
};

// ── Schedule modal ────────────────────────────────────────────────────────────
const scheduleOpen = ref(false);
// After saving a schedule, ensureBlogSlots fires automatically inside the
// store. Re-fetch the slot list so the calendar reflects new dates.
const onScheduleSaved = async () => {
  await followup.fetchBlogSlots(websiteId.value);
};

// ── Load ──────────────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true;
  error.value   = null;
  try {
    await data.fetchWebsites();
    // Schedule must be loaded BEFORE ensureBlogSlots so per-site weekday
    // settings are honored on first generation (otherwise we'd fall back
    // to the Tue+Sat default).
    await followup.fetchBlogSchedules();
    await followup.ensureBlogSlots(websiteId.value);
    await followup.fetchBlogSlots(websiteId.value);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.fbt-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 2rem;
}

/* ── Header ── */
.fbt-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.fbt-back {
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
.fbt-back:hover { color: var(--text-main); border-color: color-mix(in srgb, var(--border) 50%, var(--text-muted)); }

/* Schedule button sits to the right side of the header. flex auto-margin
   pushes it past the .fbt-site-info block on wide screens; wraps below
   the site info on narrow widths thanks to the parent flex-wrap. */
.fbt-schedule-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.82rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.fbt-site-info {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-width: 0;
}

.fbt-site-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 10px;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
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
.fbt-site-favicon { width: 70%; height: 70%; object-fit: contain; }
.fbt-site-name {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fbt-site-domain { font-size: 0.75rem; color: var(--text-muted); }

/* ── Skeleton ── */
.fbt-skeleton-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
.fbt-skel {
  border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: fbt-pulse 1.4s ease-in-out infinite;
}
.fbt-skel--bar  { height: 2.8rem; }
.fbt-skel-grid  { display: grid; grid-template-columns: repeat(7, 1fr); gap: 0.4rem; }
.fbt-skel--cell { height: 5.5rem; }
@keyframes fbt-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Summary ── */
.fbt-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.25rem;
  padding: 0.65rem 1rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
}

.fbt-sum-item {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.fbt-sum-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.15rem;
  font-weight: 900;
}

.fbt-sum-lbl {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.fbt-sum--done    .fbt-sum-num { color: #16a34a; }
.fbt-sum--missed  .fbt-sum-num { color: #dc2626; }
.fbt-sum--pending .fbt-sum-num { color: var(--text-muted); }

.fbt-sum-progress {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-left: auto;
  flex-shrink: 0;
}

.fbt-sum-prog-track {
  width: 6rem;
  height: 6px;
  border-radius: 999px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.fbt-sum-prog-fill {
  height: 100%;
  border-radius: 999px;
  background: var(--primary);
  transition: width 300ms ease;
}
.fbt-sum-prog-fill.fill--complete { background: #16a34a; }
.fbt-sum-prog-fill.fill--partial  { background: var(--primary); }

.fbt-sum-prog-text {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  white-space: nowrap;
}

/* ── Month navigator ── */
.fbt-month-nav {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: fit-content;
}

.fbt-nav-btn {
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
.fbt-nav-btn:hover:not(:disabled) { color: var(--text-main); border-color: color-mix(in srgb, var(--border) 50%, var(--text-muted)); }
.fbt-nav-btn:disabled { opacity: 0.35; cursor: default; }

.fbt-month-label {
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--text-main);
  min-width: 10rem;
  text-align: center;
}

/* ── Calendar ── */
.fbt-cal-wrap { display: flex; flex-direction: column; gap: 0; }

.fbt-cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}

/* Day headers */
.fbt-cal-headers { margin-bottom: 0.2rem; }
.fbt-cal-hcell {
  text-align: center;
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  padding: 0.25rem 0;
}
.hcell--active { color: var(--primary); }

/* Cells */
.fbt-cal-body { }

.fbt-cal-cell {
  border: 1px solid var(--border);
  border-radius: 12px;
  min-height: 5.5rem;
  padding: 0.55rem 0.6rem;
  background: var(--card-bg);
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: border-color 140ms;
}

.fbt-cal-cell--blank {
  border: none;
  background: transparent;
  min-height: 5.5rem;
}

.fbt-cal-cell--muted {
  background: var(--soft-bg);
  border-color: transparent;
  opacity: 0.45;
}

/* Required blog day base color — unified for all schedule kinds
   (weekly weekdays, monthly day-numbers, custom dates). */
.fbt-cal-cell--blog { background: color-mix(in srgb, var(--primary) 4%, var(--card-bg)); }

/* Status border accents */
.cell--done, .cell--late { border-color: rgba(22, 163, 74, 0.4); }
.cell--missed            { border-color: rgba(220, 38, 38, 0.35); }

/* Today outline */
.cell--today {
  outline: 2px solid var(--primary);
  outline-offset: -1px;
}

.fbt-cell-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.25rem;
}

.fbt-cell-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.88rem;
  font-weight: 900;
  color: var(--text-main);
  line-height: 1;
}
.fbt-cal-cell--muted .fbt-cell-num {
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-muted);
}

.fbt-cell-dow {
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--primary);
}

/* Checkbox area */
.fbt-cell-check-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
  justify-content: flex-end;
}

.fbt-checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  cursor: pointer;
  user-select: none;
  width: fit-content;
}
.fbt-checkbox-label.check--saving { opacity: 0.6; cursor: wait; }

/* Hide native checkbox */
.fbt-checkbox {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* Custom checkbox box */
.fbt-checkbox-box {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 6px;
  border: 2px solid var(--border);
  background: var(--card-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: border-color 140ms, background 140ms;
  color: #fff;
}

.fbt-checkbox-label:hover .fbt-checkbox-box {
  border-color: #16a34a;
}

.check--done .fbt-checkbox-box {
  background: #16a34a;
  border-color: #16a34a;
}

.check--missed .fbt-checkbox-box {
  border-color: rgba(220, 38, 38, 0.5);
  background: rgba(220, 38, 38, 0.06);
}

.fbt-saving-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: #fff;
  animation: fbt-spin 0.6s linear infinite;
}
@keyframes fbt-spin { to { transform: rotate(360deg); } }

.fbt-check-status {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  line-height: 1;
}

.check--done .fbt-check-status   { color: #16a34a; }
.check--missed .fbt-check-status { color: #dc2626; }

/* Undo button */
.fbt-undo-btn {
  font-size: 0.6rem;
  font-weight: 700;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 5px;
  padding: 0.12rem 0.4rem;
  cursor: pointer;
  width: fit-content;
  transition: color 120ms;
}
.fbt-undo-btn:hover { color: var(--text-main); }
.fbt-undo-btn:disabled { opacity: 0.5; cursor: default; }

/* ── Legend ── */
.fbt-legend {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding-top: 0.25rem;
}
.fbt-leg-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 600;
}
.fbt-leg-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot--done    { background: #16a34a; }
.dot--missed  { background: #dc2626; }
.dot--pending { background: var(--border); }

/* ── Error ── */
.fbt-error { display: flex; flex-direction: column; }

/* ── Responsive ── */
@media (max-width: 640px) {
  .fbt-cal-cell { min-height: 4.2rem; padding: 0.4rem 0.4rem; border-radius: 9px; }
  .fbt-cal-cell--blank { min-height: 4.2rem; }
  .fbt-cal-grid { gap: 0.22rem; }
  .fbt-checkbox-box { width: 1.15rem; height: 1.15rem; border-radius: 5px; }
  .fbt-check-status { display: none; }
  .fbt-cell-num { font-size: 0.78rem; }
}

@media (max-width: 380px) {
  .fbt-cal-cell { min-height: 3.6rem; padding: 0.3rem; }
  .fbt-cal-cell--blank { min-height: 3.6rem; }
}
</style>
