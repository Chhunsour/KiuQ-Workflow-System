<template>
  <div class="fb-page">
    <PageHeader title="Blog Followup" subtitle="Track blog uploads for every website on its own schedule.">
      <template #actions>
        <RouterLink to="/followup" class="btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
          Back
        </RouterLink>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="fb-error card card-pad">
      <p class="font-semibold text-status-needs-fix-fg">Failed to load websites.</p>
      <p class="text-sm text-text-muted mt-1">{{ error }}</p>
      <button class="btn-primary mt-3 w-fit" type="button" @click="load">Retry</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="fb-grid">
      <div v-for="i in 6" :key="i" class="fb-skeleton" />
    </div>

    <!-- Empty -->
    <EmptyState
      v-else-if="websites.length === 0"
      title="No websites yet."
      description="Add website profiles first — they will automatically appear here."
    >
      <template #action>
        <RouterLink to="/websites/new" class="btn-primary">Add Website</RouterLink>
      </template>
    </EmptyState>

    <!-- Direct website grid -->
    <div>
      <!-- Search -->
      <div class="mb-5">
        <input v-model="search" class="input max-w-sm" type="search" placeholder="Search websites…" />
      </div>

      <div v-if="filtered.length === 0" class="fb-no-match card card-pad text-sm text-text-muted">
        No websites match your search.
      </div>

      <div v-else class="fb-grid">
        <RouterLink
          v-for="w in filtered"
          :key="w.id"
          :to="`/followup/blog/${w.id}`"
          class="fb-card"
        >
          <div class="fb-card-top">
            <div class="fb-card-initial">
              <img v-if="w.faviconUrl" :src="w.faviconUrl" alt="" class="fb-favicon" @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')" />
              <span v-else>{{ w.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="fb-card-info">
              <h3 class="fb-card-name">{{ w.name }}</h3>
              <span class="fb-card-domain">{{ w.domain || 'No domain' }}</span>
            </div>
            <!-- Inline Schedule button — opens BlogScheduleModal without
                 navigating into the calendar. Hidden for Quality Checker
                 (also blocked at router level). -->
            <button
              v-if="!auth.isQualityChecker"
              type="button"
              class="fb-schedule-btn"
              title="Edit blog schedule for this website"
              aria-label="Edit blog schedule"
              @click.prevent.stop="openSchedule(w.id)"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
              Schedule
            </button>
          </div>

          <!-- Progress — period (week or month) follows the schedule cadence -->
          <div class="fb-progress-row">
            <div class="fb-progress-label">
              {{ periodFor(w.id) === 'month' ? 'This month' : 'This week' }}
            </div>
            <div class="fb-progress-track">
              <div
                class="fb-progress-fill"
                :class="progressClass(w.id)"
                :style="{ width: progressPct(w.id) + '%' }"
              />
            </div>
            <div class="fb-progress-count" :class="progressClass(w.id)">
              {{ thisWeekDone(w.id) }}/{{ thisWeekTarget(w.id) }}
            </div>
          </div>

          <!-- Secondary line: monthly progress (only for weekly schedules
               where the main progress shows the week). For monthly/custom
               schedules the main progress is already this-month so we
               skip the redundant line and show just the summary. -->
          <div class="fb-month-line">
            <template v-if="periodFor(w.id) === 'week'">
              {{ thisMonthDone(w.id) }}/{{ thisMonthTotal(w.id) }} this month
              <span class="fb-schedule-summary">· {{ scheduleSummary(w.id) }}</span>
            </template>
            <template v-else>
              <span class="fb-schedule-summary">{{ scheduleSummary(w.id) }}</span>
            </template>
          </div>

          <!-- Footer: one quick-Done button per required date this week
               (driven by the website's schedule — weekly, monthly, or
               custom). Falls back to "Nothing scheduled this week" when
               the schedule has no dates in the current ISO week. -->
          <div class="fb-card-footer">
            <div class="fb-quick-pair">
              <button
                v-for="cell in weekRequiredCells(w.id)"
                :key="cell.date"
                type="button"
                class="fb-quick-done"
                :class="{
                  'fb-quick-done--done':   cell.done,
                  'fb-quick-done--missed': cell.missed,
                  'fb-quick-done--saving': savingKey === `${w.id}|${cell.date}`,
                }"
                :disabled="savingKey === `${w.id}|${cell.date}`"
                :title="cell.done ? `${cell.label} done — click to undo` : `Mark ${cell.label} as done`"
                @click.prevent.stop="quickDone(w.id, cell.date, cell.dow)"
              >
                <span class="fb-quick-done-box">
                  <svg v-if="cell.done" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span v-else-if="savingKey === `${w.id}|${cell.date}`" class="fb-quick-done-dot" />
                </span>
                {{ cell.done ? `${cell.label} done` : `Mark ${cell.label}` }}
              </button>
              <span v-if="weekRequiredCells(w.id).length === 0" class="fb-no-week">
                <template v-if="nextRequiredLabel(w.id)">
                  Next: <strong>{{ nextRequiredLabel(w.id) }}</strong>
                </template>
                <template v-else>
                  No upcoming dates
                </template>
              </span>
            </div>
            <span class="fb-card-open">
              Open
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- One shared modal targets the currently-clicked website. Keeping
         a single instance avoids spinning up N modals for N cards. -->
    <BlogScheduleModal
      v-if="scheduleWebsiteId"
      :open="!!scheduleWebsiteId"
      :website-id="scheduleWebsiteId"
      @close="scheduleWebsiteId = null"
      @saved="onScheduleSaved"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';

import BlogScheduleModal from '@/components/followup/BlogScheduleModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore, type BlogSlotStatus } from '@/stores/followup';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['blog_upload_slots', 'blog_followup_schedules', 'websites']);

const auth    = useAuthStore();
const data    = useDataStore();
const followup = useFollowupStore();

const search     = ref('');
const loading    = ref(false);
const error      = ref<string | null>(null);
// `${websiteId}|${dow}` of the chip currently saving (only one at a time).
const savingKey  = ref<string | null>(null);

// Inline Schedule modal — opens against whichever website was clicked.
// Single instance shared across all cards.
const scheduleWebsiteId = ref<string | null>(null);
const openSchedule = (websiteId: string) => {
  scheduleWebsiteId.value = websiteId;
};
const onScheduleSaved = async () => {
  // The store regenerates blog slots after upserting a schedule; refresh
  // the local slot list so card progress reflects the new schedule.
  await followup.fetchBlogSlots();
};

const websites = computed(() => {
  if (auth.isAdmin || auth.isHeadOrSupervisor || auth.isAssistantHead) return data.websites;
  const userId = auth.user?.id ?? '';
  // Websites with blog slots assigned to this user
  const slotWebsiteIds = new Set(
    followup.blogSlots.filter((s) => s.assignedTo === userId).map((s) => s.websiteId)
  );
  // Add websites that have follow-up schedules or slots
  const allFollowupIds = new Set([
    ...followup.blogSchedules.map((s) => s.websiteId),
    ...followup.blogSlots.map((s) => s.websiteId),
    ...followup.pluginSlots.map((s) => s.websiteId),
    ...followup.speedSlots.map((s) => s.websiteId),
  ]);
  return data.websites.filter(
    (w) => w.createdBy === userId || slotWebsiteIds.has(w.id) || allFollowupIds.has(w.id)
  );
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return websites.value;
  return websites.value.filter(
    (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q)
  );
});

const slotsForWebsite = (websiteId: string, status: BlogSlotStatus) =>
  followup.blogSlots.filter((s) => s.websiteId === websiteId && s.status === status).length;

// Current ISO week (Mon–Sun)
const getWeekBounds = () => {
  const today = new Date();
  const dow = today.getDay(); // 0=Sun
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { mon, sun };
};

// Timezone-safe (local parts, not toISOString which shifts to UTC).
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const thisWeekSlots = (websiteId: string) => {
  const { mon, sun } = getWeekBounds();
  const monStr = isoDate(mon);
  const sunStr = isoDate(sun);
  return followup.blogSlots.filter(
    (s) => s.websiteId === websiteId &&
           s.scheduledDate >= monStr &&
           s.scheduledDate <= sunStr
  );
};

// ── Schedule-aware week cells ────────────────────────────────────────
//
// Resolves each website's per-site schedule (or the legacy Tue+Sat
// default when no row exists) and builds the list of REQUIRED dates
// for this ISO week. The card renders one "Mark X" button per cell,
// so a Monday-only schedule shows one button, a Tue+Thu+Sat shows
// three, a custom-dates schedule shows whichever fall in this week.
//
// label rules:
//   weekly/monthly  → 3-letter weekday  ("Mon", "Tue", "Sat" …)
//   custom          → "MMM D"           ("May 27") — so the user can
//                     tell which arbitrary date the button represents
//
// done detection looks up the slot row for that exact date so any
// future schedule (custom or generated) works uniformly.

interface WeekCell {
  date: string;    // YYYY-MM-DD
  dow: number;     // 0..6
  label: string;
  done: boolean;
  missed: boolean;
}

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Period the card shows for a website:
 *   - 'week'  for weekly schedules (cadence is weekly, so show this ISO week)
 *   - 'month' for monthly + custom + no-schedule fallback (cadence is monthly,
 *     so show this calendar month so all picked day-numbers are visible
 *     together)
 *
 * No-schedule websites fall back to weekly (Tue+Sat) — same cadence as
 * weekly so 'week' is the natural period for them too.
 */
const periodFor = (websiteId: string): 'week' | 'month' => {
  const s = followup.scheduleFor(websiteId);
  if (!s) return 'week';
  if (s.kind === 'weekly') return 'week';
  return 'month';
};

/**
 * Build the list of required-date cells for a website's current period
 * (this ISO week for weekly schedules, this calendar month for monthly /
 * custom). Reads the schedule directly so labels are correct immediately
 * after saving — no waiting for slot regeneration.
 *
 * Label rules:
 *   - Weekly schedule       → weekday short name  ("Mon", "Tue", "Sat")
 *   - Monthly by day-number → day-of-month        ("8", "13", "27")
 *   - Legacy custom dates   → day-of-month        ("12", "27")
 *   - No schedule (legacy)  → weekday short name, Tue+Sat default
 */
const weekRequiredCells = (websiteId: string): WeekCell[] => {
  const schedule = followup.scheduleFor(websiteId);
  const cells: WeekCell[] = [];

  // Resolve the date range we walk based on the period for this site.
  const period = periodFor(websiteId);
  const today = new Date();
  let rangeStart: Date, rangeEnd: Date;
  if (period === 'week') {
    const { mon, sun } = getWeekBounds();
    rangeStart = mon;
    rangeEnd = sun;
  } else {
    // Calendar month for monthly / custom: shows day 13 AND day 28 side
    // by side instead of "next: day 28" in isolation.
    rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
    rangeEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  }

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

  const cur = new Date(rangeStart);
  while (cur <= rangeEnd) {
    const iso = isoDate(cur);
    const dow = cur.getDay();
    const dayOfMonth = cur.getDate();
    let required = false;
    let label = '';

    if (schedule?.kind === 'monthly') {
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const wantedDays = (schedule.monthlyDays ?? [])
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)
        .map((d) => Math.min(d, lastDay));
      if (wantedDays.includes(dayOfMonth)) {
        required = true;
        label = String(dayOfMonth);
      } else if (wantedDays.length === 0 && schedule.monthlyTarget) {
        // Legacy monthly_target — defer to whatever slot the store placed.
        const slot = followup.blogSlots.find(
          (s) => s.websiteId === websiteId && s.scheduledDate === iso
        );
        if (slot) {
          required = true;
          label = String(dayOfMonth);
        }
      }
    } else if (customSet.has(iso)) {
      required = true;
      label = String(dayOfMonth);
    } else if (weeklyDows.has(dow)) {
      required = true;
      label = SHORT_DAY[dow];
    }

    if (required) {
      const slot = followup.blogSlots.find(
        (s) => s.websiteId === websiteId && s.scheduledDate === iso
      );
      const done   = slot?.status === 'done' || slot?.status === 'late';
      const missed = slot?.status === 'missed';
      cells.push({ date: iso, dow, label, done, missed });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return cells;
};

const thisWeekTarget = (websiteId: string) =>
  weekRequiredCells(websiteId).length;

/**
 * Walks forward up to 90 days from today to find the next required
 * date for a website. Used as the empty-state hint when this week has
 * no slots, so the user can see their schedule actually saved.
 * Returns null if no upcoming date is found in range.
 */
const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const nextRequiredLabel = (websiteId: string): string | null => {
  const schedule = followup.scheduleFor(websiteId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const limit = new Date(today);
  limit.setDate(today.getDate() + 90);

  // Pre-resolve the per-kind "is this day required?" check.
  const weeklyDows = new Set<number>(
    !schedule
      ? [2, 6]
      : schedule.kind === 'weekly' && schedule.weekdays.length > 0
        ? schedule.weekdays
        : []
  );
  const customSet = new Set<string>(
    schedule?.kind === 'custom' ? schedule.customDates : []
  );

  const cur = new Date(today);
  while (cur <= limit) {
    const iso = isoDate(cur);
    const dow = cur.getDay();
    const dayOfMonth = cur.getDate();
    let required = false;

    if (schedule?.kind === 'monthly') {
      const lastDay = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
      const wantedDays = (schedule.monthlyDays ?? [])
        .filter((d) => Number.isInteger(d) && d >= 1 && d <= 31)
        .map((d) => Math.min(d, lastDay));
      if (wantedDays.includes(dayOfMonth)) required = true;
    } else if (customSet.has(iso)) {
      required = true;
    } else if (weeklyDows.has(dow)) {
      required = true;
    }

    if (required) {
      return `${SHORT_DAY[dow]} ${SHORT_MONTH[cur.getMonth()]} ${cur.getDate()}`;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return null;
};

const thisWeekDone = (websiteId: string) =>
  weekRequiredCells(websiteId).filter((c) => c.done).length;

const progressPct = (websiteId: string) => {
  const target = thisWeekTarget(websiteId);
  if (target === 0) return 0;
  return Math.min(100, (thisWeekDone(websiteId) / target) * 100);
};

const progressClass = (websiteId: string) => {
  const done = thisWeekDone(websiteId);
  const target = thisWeekTarget(websiteId);
  if (target > 0 && done === target) return 'complete';
  if (done > 0) return 'partial';
  return 'empty';
};

// This-month helpers
const thisMonthSlots = (websiteId: string) => {
  const today = new Date();
  const year  = today.getFullYear();
  const month = today.getMonth();
  const start = isoDate(new Date(year, month, 1));
  const end   = isoDate(new Date(year, month + 1, 0));
  return followup.blogSlots.filter(
    (s) => s.websiteId === websiteId && s.scheduledDate >= start && s.scheduledDate <= end
  );
};

const thisMonthDone  = (websiteId: string) =>
  thisMonthSlots(websiteId).filter((s) => s.status === 'done' || s.status === 'late').length;
const thisMonthTotal = (websiteId: string) => thisMonthSlots(websiteId).length;

/**
 * Human-readable summary of a website's schedule, used on the card.
 * Examples: "Tue + Sat weekly", "Days 8, 16, 27", "Tue+Sat" (default).
 */
const scheduleSummary = (websiteId: string): string => {
  const s = followup.scheduleFor(websiteId);
  if (!s) return 'Tue + Sat (default)';
  if (s.kind === 'weekly') {
    const days = (s.weekdays.length > 0 ? s.weekdays : [2, 6])
      .slice()
      .sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b)) // Mon-first ordering
      .map((d) => SHORT_DAY[d]);
    return `${days.join(' + ')} weekly`;
  }
  if (s.kind === 'monthly') {
    if (s.monthlyDays.length > 0) {
      const sorted = [...s.monthlyDays].sort((a, b) => a - b);
      return `Days ${sorted.join(', ')}`;
    }
    if (s.monthlyTarget) return `${s.monthlyTarget}× monthly`;
    return 'Monthly';
  }
  // legacy custom
  if (s.customDates.length > 0) return `${s.customDates.length} custom dates`;
  return 'Custom';
};

/**
 * Inline quick-toggle for any scheduled day of the current ISO week.
 * Flips the slot between done ↔ pending. Uses upsertBlogSlot so realtime
 * keeps the tracker calendar in sync. Safe even if the slot row doesn't
 * exist yet — the upsert (onConflict: website_id,scheduled_date) creates
 * it. Works for weekly / monthly / custom schedules uniformly.
 */
const quickDone = async (websiteId: string, scheduledDate: string, dow: number) => {
  const key = `${websiteId}|${scheduledDate}`;
  if (savingKey.value) return;
  savingKey.value = key;
  try {
    const existing = followup.blogSlots.find(
      (s) => s.websiteId === websiteId && s.scheduledDate === scheduledDate
    );
    const isDone = existing?.status === 'done' || existing?.status === 'late';
    await followup.upsertBlogSlot({
      id:            existing?.id,
      websiteId,
      scheduledDate,
      dayOfWeek:     dow,
      status:        isDone ? 'pending' : 'done',
      completedBy:   isDone ? null : (auth.user?.id ?? null),
      completedAt:   isDone ? null : new Date().toISOString(),
    });
  } finally {
    savingKey.value = null;
  }
};

const load = async () => {
  loading.value = true;
  error.value   = null;
  try {
    await Promise.all([
      data.fetchWebsites(),
      followup.fetchBlogSlots(),
    ]);
    // Ensure slots exist for every visible website (safe to call repeatedly)
    const ids = websites.value.map((w) => w.id);
    if (ids.length) await followup.syncExistingWebsitesToFollowup(ids);
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.fb-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.fb-error {
  display: flex;
  flex-direction: column;
}

.fb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 1rem;
}

.fb-skeleton {
  height: 11rem;
  border-radius: 18px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.55; }
  50%       { opacity: 1; }
}

.fb-card {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1.1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 150ms, box-shadow 150ms, transform 150ms;
}

.fb-card:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  box-shadow: 0 6px 22px rgba(15, 23, 42, 0.08);
  transform: translateY(-2px);
}

.fb-card-top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.fb-card-initial {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 14px;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

/* Schedule button: small pill in the top-right of the card head.
   margin-left:auto pushes it past the .fb-card-info block. */
.fb-schedule-btn {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-muted);
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  transition: color 140ms, background 140ms, border-color 140ms, transform 140ms;
}
.fb-schedule-btn:hover,
.fb-schedule-btn:focus-visible {
  color: var(--primary);
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
  transform: translateY(-1px);
  outline: none;
}

.fb-favicon {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.fb-card-info {
  min-width: 0;
  flex: 1;
}

.fb-card-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fb-card-domain {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Progress bar */
.fb-progress-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.fb-progress-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
  width: 4.5rem;
}

.fb-progress-track {
  flex: 1;
  height: 6px;
  border-radius: 999px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  overflow: hidden;
}

.fb-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 300ms ease;
}

.fb-progress-fill.complete { background: #16a34a; }
.fb-progress-fill.partial  { background: #f97316; }
.fb-progress-fill.empty    { background: transparent; }

.fb-progress-count {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.88rem;
  font-weight: 900;
  flex-shrink: 0;
  min-width: 1.8rem;
  text-align: right;
}

.fb-progress-count.complete { color: #16a34a; }
.fb-progress-count.partial  { color: #f97316; }
.fb-progress-count.empty    { color: var(--text-muted); }

/* Day chips */
.fb-card-chips {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.fb-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.22rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--text-muted);
}

/* Month progress text — pulled out of the chip row */
.fb-month-line {
  font-size: 0.72rem;
  color: var(--text-muted);
}
.fb-schedule-summary {
  color: var(--primary);
  font-weight: 700;
  margin-left: 0.15rem;
}

/* Footer: paired quick-Done pills + Open link (matches Plugin/Speed cards) */
.fb-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.1rem;
  flex-wrap: wrap;
}
.fb-quick-pair {
  display: inline-flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.fb-no-week {
  font-size: 0.76rem;
  color: var(--text-muted);
  align-self: center;
  padding: 0.35rem 0;
}
.fb-no-week strong {
  color: var(--primary);
  font-weight: 700;
}

.fb-quick-done {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid color-mix(in srgb, #16a34a 40%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, var(--card-bg));
  color: #16a34a;
  border-radius: 999px;
  padding: 0.32rem 0.75rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 140ms, border-color 140ms, transform 140ms, opacity 140ms;
}
.fb-quick-done:hover:not(:disabled) {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
  transform: translateY(-1px);
}
.fb-quick-done:disabled { cursor: wait; opacity: 0.6; }
.fb-quick-done--missed {
  border-color: color-mix(in srgb, #dc2626 40%, var(--border));
  background: color-mix(in srgb, #dc2626 7%, var(--card-bg));
  color: #dc2626;
}
.fb-quick-done--missed:hover:not(:disabled) {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}
.fb-quick-done--done {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.fb-quick-done--saving { opacity: 0.7; }

.fb-quick-done-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.18);
}
.fb-quick-done:not(.fb-quick-done--done) .fb-quick-done-box {
  background: transparent;
  border: 1.5px solid currentColor;
}
.fb-quick-done-dot {
  width: 7px; height: 7px; border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  animation: fb-spin 0.6s linear infinite;
}
@keyframes fb-spin { to { transform: rotate(360deg); } }

.fb-chip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
  opacity: 0.4;
}

.fb-chip.done {
  border-color: rgba(22,163,74,0.3);
  background: rgba(22,163,74,0.08);
  color: #16a34a;
}

.fb-chip.done .fb-chip-dot {
  background: #16a34a;
  opacity: 1;
}

.fb-chip.missed {
  border-color: rgba(220,38,38,0.3);
  background: rgba(220,38,38,0.08);
  color: #dc2626;
}

.fb-chip.missed .fb-chip-dot {
  background: #dc2626;
  opacity: 1;
}

.fb-chip-month {
  font-size: 0.68rem;
  color: var(--text-muted);
  margin-left: auto;
}

.fb-card-open {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  color: var(--primary);
}

.fb-no-match {
  text-align: center;
  padding: 2rem;
}
</style>
