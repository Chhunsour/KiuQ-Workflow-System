<template>
  <div class="fmg">
    <!-- Filters -->
    <div class="fmg-filters">
      <input
        v-model="memberSearch"
        class="input fmg-search"
        type="search"
        placeholder="Search member…"
      />
      <input
        v-if="kind !== 'ebay'"
        v-model="websiteSearch"
        class="input fmg-search"
        type="search"
        placeholder="Search website…"
      />
      <div class="fmg-statusfilter">
        <button
          v-for="opt in statusFilterOptions"
          :key="opt.value"
          type="button"
          class="fmg-statusbtn"
          :class="{ 'fmg-statusbtn--active': statusFilter === opt.value }"
          @click="statusFilter = opt.value"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Week selector — for the Monday report on last week's work -->
      <div class="fmg-weekfilter">
        <button
          type="button"
          class="fmg-statusbtn"
          :class="{ 'fmg-statusbtn--active': weekOffset === 0 }"
          @click="weekOffset = 0"
        >
          This Week
        </button>
        <button
          type="button"
          class="fmg-statusbtn"
          :class="{ 'fmg-statusbtn--active': weekOffset === -1 }"
          @click="weekOffset = -1"
        >
          Last Week
        </button>
      </div>
      <span class="fmg-weekrange">{{ weekRangeLabel }}</span>
    </div>

    <!-- Member groups -->
    <div v-if="visibleGroups.length === 0" class="card card-pad fmg-empty">
      No members match your filters.
    </div>

    <div v-else class="fmg-groups">
      <div
        v-for="g in visibleGroups"
        :key="g.member.id"
        class="fmg-group card"
        :class="{ 'fmg-group--open': isExpanded(g.member.id) }"
      >
        <!-- Clickable member header — toggles the website dropdown -->
        <button
          type="button"
          class="fmg-head"
          :aria-expanded="isExpanded(g.member.id)"
          @click="toggleExpanded(g.member.id)"
        >
          <div class="fmg-head-top">
            <div class="fmg-head-left">
              <div class="fmg-avatar">
                <img
                  v-if="g.member.avatarUrl"
                  :src="g.member.avatarUrl"
                  :alt="g.member.fullName"
                  class="fmg-avatar-img"
                  @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <span v-else>{{ initials(g.member.fullName) }}</span>
                <span class="fmg-presence" :class="`fmg-presence--${presenceOf(g.member)}`" />
              </div>
              <div class="fmg-head-info">
                <div class="fmg-name">{{ g.member.fullName }}</div>
                <div class="fmg-sub">{{ kind === 'ebay' ? ebaySummaryText(g) : websiteSummaryText(g) }}</div>
              </div>
            </div>
            <svg
              class="fmg-chevron"
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          <div class="fmg-head-stats">
            <span class="fmg-stat">
              <span class="fmg-stat-num fmg-stat-num--done">{{ g.done }}</span>
              <span class="fmg-stat-label">done</span>
            </span>
            <span class="fmg-stat-sep" aria-hidden="true">·</span>
            <span class="fmg-stat">
              <span class="fmg-stat-num">{{ g.pending }}</span>
              <span class="fmg-stat-label">pending</span>
            </span>
            <template v-if="g.missed > 0">
              <span class="fmg-stat-sep" aria-hidden="true">·</span>
              <span class="fmg-stat fmg-stat--alert">
                <span class="fmg-stat-num fmg-stat-num--missed">{{ g.missed }}</span>
                <span class="fmg-stat-label">missed</span>
              </span>
            </template>
          </div>

          <div class="fmg-progress">
            <div class="fmg-progress-track">
              <div
                class="fmg-progress-fill"
                :class="g.pct === 100 ? 'is-complete' : g.pct > 0 ? 'is-partial' : 'is-empty'"
                :style="{ width: g.pct + '%' }"
              />
            </div>
            <span class="fmg-pct">{{ g.pct }}%</span>
          </div>
        </button>

        <!-- Smooth dropdown body — collapsed by default -->
        <div class="fmg-dropdown" :class="{ 'fmg-dropdown--open': isExpanded(g.member.id) }">
          <div class="fmg-body">
          <!-- eBay: per-member daily status -->
          <template v-if="kind === 'ebay'">
            <div class="fmg-ebay-detail">
              <div class="fmg-ebay-stat">
                <span class="fmg-ebay-pill" :class="ebayPillClass(ebayTodayStatus(g.member.id))">
                  {{ ebayStatusLabel(ebayTodayStatus(g.member.id), g.member.id) }}
                </span>
                <span class="fmg-ebay-stat-label">Today</span>
              </div>
              <div class="fmg-ebay-stat">
                <span class="fmg-ebay-num">{{ g.ebayWeekDone }}/{{ g.ebayWeekRequired }}</span>
                <span class="fmg-ebay-stat-label">This week</span>
              </div>
              <div class="fmg-ebay-stat">
                <span class="fmg-ebay-num">{{ g.ebayMonthDone }}/{{ g.ebayMonthRequired }}</span>
                <span class="fmg-ebay-stat-label">This month</span>
              </div>
              <RouterLink :to="`/followup/ebay-click/${g.member.id}`" class="btn-secondary fmg-open-btn">
                Open Calendar
              </RouterLink>
            </div>
          </template>

          <!-- Blog / Plugin: per-website blocks — two-row, narrow-card friendly -->
          <template v-else>
            <div v-if="g.websites.length === 0" class="fmg-no-websites">
              No websites match your filters for this member.
            </div>
            <div
              v-for="ws in g.websites"
              :key="ws.website.id"
              class="fmg-ws-row"
              :class="`fmg-ws-row--${ws.statusKind}`"
            >
              <!-- Identity row -->
              <div class="fmg-ws-head">
                <div class="fmg-ws-icon">
                  <img
                    v-if="ws.website.faviconUrl"
                    :src="ws.website.faviconUrl"
                    alt=""
                    class="fmg-ws-favicon"
                    @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')"
                  />
                  <span v-else>{{ ws.website.name.slice(0, 2).toUpperCase() }}</span>
                </div>
                <div class="fmg-ws-name" :title="ws.website.name">{{ ws.website.name }}</div>
                <RouterLink
                  :to="`${trackerBase}/${ws.website.id}`"
                  class="fmg-ws-open"
                  :title="kind === 'blog' ? 'Open blog calendar' : 'Open plugin tracker'"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </RouterLink>
              </div>

              <!-- Action row -->
              <!-- Blog: one button per required day from the website's
                   schedule (weekly weekdays, monthly day-numbers, or
                   legacy Tue+Sat default). -->
              <div v-if="kind === 'blog'" class="fmg-ws-actions">
                <button
                  v-for="d in ws.blogDays"
                  :key="d.date"
                  type="button"
                  class="fmg-day-chip"
                  :class="[
                    `fmg-day-chip--${d.state}`,
                    isPastWeek || d.state === 'done' ? 'fmg-day-chip--locked' : ''
                  ]"
                  :title="d.state === 'done' ? `${d.label}: done` : `Click to mark ${d.label} done`"
                  :disabled="isPastWeek || d.state === 'done' || isSaving(`${ws.website.id}:${d.date}`)"
                  @click="markBlogDay(ws.website.id, d.date, d.dow)"
                >
                  <span v-if="isSaving(`${ws.website.id}:${d.date}`)">Saving…</span>
                  <span v-else-if="d.state === 'done'">✓ {{ d.label }} Done</span>
                  <span v-else-if="d.state === 'missed'">Missed {{ d.label }}</span>
                  <span v-else>Mark {{ d.label }}</span>
                </button>
                <span v-if="ws.blogDays.length === 0" class="fmg-no-days">
                  Nothing scheduled this week
                </span>
              </div>

              <!-- Plugin: single full-width Mark done / Done state -->
              <div v-else class="fmg-ws-actions fmg-ws-actions--single">
                <button
                  type="button"
                  class="fmg-day-chip"
                  :class="[
                    `fmg-day-chip--${ws.statusKind}`,
                    isPastWeek || ws.statusKind === 'done' ? 'fmg-day-chip--locked' : ''
                  ]"
                  :disabled="isPastWeek || ws.statusKind === 'done' || isSaving(`${ws.website.id}:plugin`)"
                  @click="markPluginWeek(ws.website.id)"
                >
                  <span v-if="isSaving(`${ws.website.id}:plugin`)">Saving…</span>
                  <span v-else-if="ws.statusKind === 'done'">✓ Done this week</span>
                  <span v-else-if="ws.statusKind === 'missed'">Missed</span>
                  <span v-else>Mark done</span>
                </button>
              </div>
            </div>
          </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { useDataStore, type Member, type Website } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { presenceStatusFor } from '@/lib/presence';
import { isFollowupParticipant } from '@/lib/roles';

type Kind = 'blog' | 'plugin' | 'ebay';
type StatusKind = 'done' | 'pending' | 'missed' | 'no_work_day';

const props = defineProps<{ kind: Kind }>();

const data = useDataStore();
const followup = useFollowupStore();

const memberSearch = ref('');
const websiteSearch = ref('');
const statusFilter = ref<'all' | 'done' | 'pending' | 'missed'>('all');

// Cards start collapsed — click the header to expand and see websites.
const expanded = ref<Set<string>>(new Set());
const isExpanded = (memberId: string) => expanded.value.has(memberId);
const toggleExpanded = (memberId: string) => {
  const next = new Set(expanded.value);
  if (next.has(memberId)) next.delete(memberId);
  else next.add(memberId);
  expanded.value = next;
};

const statusFilterOptions = [
  { value: 'all' as const,     label: 'All' },
  { value: 'done' as const,    label: 'Done' },
  { value: 'pending' as const, label: 'Pending' },
  { value: 'missed' as const,  label: 'Missed' }
];

const trackerBase = computed(() =>
  props.kind === 'blog' ? '/followup/blog' : '/followup/plugins'
);

const initials = (name: string) =>
  (name || '?').trim().split(/\s+/).slice(0, 2).map((p) => p[0] ?? '').join('').toUpperCase() || '?';

const presenceOf = (m: Member) => presenceStatusFor(m);

// ── Date helpers ──────────────────────────────────────────────────────────────
// Timezone-safe: build YYYY-MM-DD from LOCAL date parts. Never use
// toISOString() (it converts to UTC and shifts the day in non-UTC zones,
// which previously pulled slots into the wrong week/month).
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = iso(new Date());

// 0 = this week, -1 = last week (for the Monday report on last week's work)
const weekOffset = ref(0);
const isPastWeek = computed(() => weekOffset.value < 0);

const weekBounds = () => {
  const t = new Date();
  const dow = t.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(t);
  mon.setDate(t.getDate() + diffToMon + weekOffset.value * 7);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return { monStr: iso(mon), sunStr: iso(sun), monStrDate: iso(mon) };
};

// Human label for the selected week, e.g. "May 11 – May 17"
const weekRangeLabel = computed(() => {
  const { monStr, sunStr } = weekBounds();
  const fmt = (s: string) =>
    new Date(`${s}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(monStr)} – ${fmt(sunStr)}`;
});

const monthBounds = () => {
  const t = new Date();
  return {
    start: iso(new Date(t.getFullYear(), t.getMonth(), 1)),
    end: iso(new Date(t.getFullYear(), t.getMonth() + 1, 0))
  };
};

// ── Members shown as groups ───────────────────────────────────────────────────
// All active members (admins included). Blog/Plugin: admin cards only
// appear if they actually own websites (empty groups hidden in
// visibleGroups). eBay: admins now appear too since they also do the
// daily click. Admins remain excluded from the leaderboard separately.
const activeMembers = computed(() =>
  data.members.filter(isFollowupParticipant)
);

// Per-day blog status for THIS week, scoped to the website's saved
// schedule. Admins see exactly the days that website actually requires —
// weekly weekdays, monthly day-numbers falling in this week, or the
// legacy Tue+Sat default for websites with no schedule row.
type DayState = 'done' | 'pending' | 'missed' | 'upcoming';
interface BlogDay {
  /** Short label shown on the chip ("Tue", "Sat", "13", "28"). */
  label: string;
  /** ISO YYYY-MM-DD — the exact date this chip represents this week. */
  date: string;
  /** Day-of-week 0..6 — needed when upserting the slot row. */
  dow: number;
  state: DayState;
}

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const blogWeekDays = (websiteId: string): BlogDay[] => {
  const { monStr, sunStr } = weekBounds();
  const schedule = followup.scheduleFor(websiteId);

  // Pre-resolve the per-kind "is required today?" check.
  const weeklyDows = new Set<number>(
    !schedule
      ? [2, 6]                                                  // legacy default
      : schedule.kind === 'weekly' && schedule.weekdays.length > 0
        ? schedule.weekdays
        : []
  );
  const customSet = new Set<string>(
    schedule?.kind === 'custom' ? schedule.customDates : []
  );

  const days: BlogDay[] = [];
  const cur = new Date(`${monStr}T12:00:00`);
  const end = new Date(`${sunStr}T12:00:00`);
  while (cur <= end) {
    const dateStr = iso(cur);
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
          (s) => s.websiteId === websiteId && s.scheduledDate === dateStr
        );
        if (slot) {
          required = true;
          label = String(dayOfMonth);
        }
      }
    } else if (customSet.has(dateStr)) {
      required = true;
      label = String(dayOfMonth);
    } else if (weeklyDows.has(dow)) {
      required = true;
      label = SHORT_DAY[dow];
    }

    if (required) {
      const slot = followup.blogSlots.find(
        (s) => s.websiteId === websiteId && s.scheduledDate === dateStr
      );
      let state: DayState = 'pending';
      if (slot && (slot.status === 'done' || slot.status === 'late')) {
        state = 'done';
      } else if (slot && slot.status === 'missed') {
        state = 'missed';
      } else if (dateStr < today) {
        state = 'missed';
      } else if (dateStr > today) {
        state = 'upcoming';
      }
      days.push({ label, date: dateStr, dow, state });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return days;
};

const blogWebsiteStatus = (websiteId: string): { kind: StatusKind; label: string } => {
  const days = blogWeekDays(websiteId);
  const done = days.filter((d) => d.state === 'done').length;
  const missed = days.some((d) => d.state === 'missed');
  const dueNow = days.some((d) => d.state === 'pending');
  const weekWord = isPastWeek.value ? 'last week' : 'this week';
  if (done === days.length) return { kind: 'done', label: `All done ${weekWord}` };
  if (missed && done === 0 && !dueNow) return { kind: 'missed', label: 'Missed' };
  if (missed) return { kind: 'pending', label: `${done}/${days.length} done` };
  if (dueNow) return { kind: 'pending', label: 'Due now' };
  return { kind: 'pending', label: done > 0 ? `${done}/${days.length} done` : 'Pending' };
};

const pluginWebsiteStatus = (websiteId: string): { kind: StatusKind; label: string } => {
  const { monStr } = weekBounds();
  const slot = followup.pluginSlots.find(
    (s) => s.websiteId === websiteId && s.weekStart === monStr
  );
  const st = slot?.status ?? 'pending';
  if (st === 'done') return { kind: 'done', label: 'Done' };
  if (st === 'missed') return { kind: 'missed', label: 'Missed' };
  if (st === 'needs_attention') return { kind: 'pending', label: 'Needs Attention' };
  return { kind: 'pending', label: 'Pending' };
};

const websiteStatus = (websiteId: string) =>
  props.kind === 'blog' ? blogWebsiteStatus(websiteId) : pluginWebsiteStatus(websiteId);

const blogMonth = (websiteId: string) => {
  const { start, end } = monthBounds();
  const slots = followup.blogSlots.filter(
    (s) => s.websiteId === websiteId && s.scheduledDate >= start && s.scheduledDate <= end
  );
  return {
    done: slots.filter((s) => s.status === 'done' || s.status === 'late').length,
    total: slots.length
  };
};

const pluginMonth = (websiteId: string) => {
  const { start, end } = monthBounds();
  const slots = followup.pluginSlots.filter(
    (s) => s.websiteId === websiteId && s.weekStart >= start && s.weekStart <= end
  );
  return {
    done: slots.filter((s) => s.status === 'done').length,
    total: slots.length
  };
};

const monthFor = (websiteId: string) =>
  props.kind === 'blog' ? blogMonth(websiteId) : pluginMonth(websiteId);

// ── eBay per-member status ────────────────────────────────────────────────────
const ebayDoneDates = (memberId: string) =>
  new Set(followup.ebayEntries.filter((e) => e.userId === memberId && e.status === 'done').map((e) => e.date));

const ebayTodayEntry = (memberId: string) =>
  followup.ebayEntries.find((e) => e.userId === memberId && e.date === today);

const ebayTodayStatus = (memberId: string): StatusKind => {
  const dow = new Date().getDay();
  if (dow === 0) return 'no_work_day';
  if (ebayDoneDates(memberId).has(today)) return 'done';
  return 'pending';
};

const ebayWeek = (memberId: string) => {
  const { monStr } = weekBounds();
  const done = ebayDoneDates(memberId);
  let required = 0;
  let completed = 0;
  let missed = 0;
  const mon = new Date(`${monStr}T12:00:00`);
  for (let i = 0; i < 6; i++) {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    const ds = iso(d);
    required++;
    if (done.has(ds)) completed++;
    else if (ds < today) missed++;
  }
  return { required, completed, missed };
};

const ebayMonth = (memberId: string) => {
  const { start, end } = monthBounds();
  const done = ebayDoneDates(memberId);
  let required = 0;
  let completed = 0;
  const startD = new Date(`${start}T12:00:00`);
  const endD = new Date(`${end}T12:00:00`);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const ds = iso(d);
    if (new Date(`${ds}T12:00:00`).getDay() === 0) continue;
    required++;
    if (done.has(ds)) completed++;
  }
  return { required, completed };
};

// ── Grouping ──────────────────────────────────────────────────────────────────
interface WsEntry {
  website: Website;
  statusKind: StatusKind;
  statusLabel: string;
  monthDone: number;
  monthTotal: number;
  blogDays: BlogDay[];   // Tue/Sat chips (blog only)
}
interface Group {
  member: Member;
  websites: WsEntry[];
  done: number;
  pending: number;
  missed: number;
  total: number;
  pct: number;
  ebayWeekDone: number;
  ebayWeekRequired: number;
  ebayMonthDone: number;
  ebayMonthRequired: number;
}

const groups = computed<Group[]>(() => {
  const wq = websiteSearch.value.trim().toLowerCase();

  return activeMembers.value.map((member) => {
    if (props.kind === 'ebay') {
      const w = ebayWeek(member.id);
      const mo = ebayMonth(member.id);
      const todayStatus = ebayTodayStatus(member.id);
      return {
        member,
        websites: [],
        done: w.completed,
        pending: todayStatus === 'pending' ? 1 : 0,
        missed: w.missed,
        total: w.required,
        pct: w.required > 0 ? Math.round((w.completed / w.required) * 100) : 100,
        ebayWeekDone: w.completed,
        ebayWeekRequired: w.required,
        ebayMonthDone: mo.completed,
        ebayMonthRequired: mo.required
      };
    }

    const ownWebsites = data.websites.filter((wsite) => wsite.createdBy === member.id);
    const wsEntries: WsEntry[] = ownWebsites
      .filter((wsite) => {
        if (!wq) return true;
        return (
          wsite.name.toLowerCase().includes(wq) ||
          (wsite.domain || '').toLowerCase().includes(wq)
        );
      })
      .map((wsite) => {
        const st = websiteStatus(wsite.id);
        const mo = monthFor(wsite.id);
        return {
          website: wsite,
          statusKind: st.kind,
          statusLabel: st.label,
          monthDone: mo.done,
          monthTotal: mo.total,
          blogDays: props.kind === 'blog' ? blogWeekDays(wsite.id) : []
        };
      });

    // Slot-level counts. For blog: Tue+Sat day-slots across all owned
    // websites (so "0 done" only when truly 0 days done, not just "any
    // website still has 1/2 incomplete"). For plugin: weekly slot per
    // website. Counts use ALL owned websites (not search-filtered) for
    // accurate member summary.
    let done = 0;
    let pending = 0;
    let missed = 0;
    let total = 0;
    if (props.kind === 'blog') {
      ownWebsites.forEach((wsite) => {
        const days = blogWeekDays(wsite.id);
        days.forEach((d) => {
          total++;
          if (d.state === 'done') done++;
          else if (d.state === 'missed') missed++;
          else pending++;        // pending (today) + upcoming (future)
        });
      });
    } else {
      // plugin — 1 slot per website per week
      ownWebsites.forEach((wsite) => {
        total++;
        const k = pluginWebsiteStatus(wsite.id).kind;
        if (k === 'done') done++;
        else if (k === 'missed') missed++;
        else pending++;
      });
    }

    return {
      member,
      websites: wsEntries,
      done,
      pending,
      missed,
      total,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      ebayWeekDone: 0,
      ebayWeekRequired: 0,
      ebayMonthDone: 0,
      ebayMonthRequired: 0
    };
  });
});

const visibleGroups = computed(() => {
  const mq = memberSearch.value.trim().toLowerCase();
  return groups.value.filter((g) => {
    if (mq && !g.member.fullName.toLowerCase().includes(mq) && !g.member.email.toLowerCase().includes(mq)) {
      return false;
    }
    if (statusFilter.value === 'done' && g.done === 0) return false;
    if (statusFilter.value === 'pending' && g.pending === 0) return false;
    if (statusFilter.value === 'missed' && g.missed === 0) return false;
    // Hide members with no websites entirely (blog/plugin) unless searching
    if (props.kind !== 'ebay' && g.total === 0 && !mq) return false;
    return true;
  });
});

// ── Summary text ──────────────────────────────────────────────────────────────
const periodWord = computed(() => (isPastWeek.value ? 'last week' : 'this week'));

const websiteSummaryText = (g: Group) => {
  if (g.total === 0) return 'No websites assigned';
  const unit = props.kind === 'blog' ? 'blogs' : 'websites';
  const label = props.kind === 'blog' ? 'Blog Followup' : 'Plugin Update';
  return `${label}: ${g.done}/${g.total} ${unit} done ${periodWord.value}`;
};

const ebaySummaryText = (g: Group) =>
  `eBay Click: ${g.ebayWeekDone}/${g.ebayWeekRequired} ${periodWord.value}`;

// ── eBay status pills ─────────────────────────────────────────────────────────
const ebayStatusLabel = (s: StatusKind, memberId?: string) => {
  if (s === 'done') {
    const source = memberId ? ebayTodayEntry(memberId)?.completionSource : 'member';
    if (source === 'admin_auto_fill') return 'Admin Auto Completed';
    if (source === 'not_required_today') return 'Not Required Today';
    if (source === 'admin_manual') return 'Admin Completed';
    return 'Completed by Member';
  }
  return s === 'missed' ? 'Missed' : s === 'no_work_day' ? 'No Work Day' : 'Pending';
};

const ebayPillClass = (s: StatusKind) => ({
  'fmg-pill--done': s === 'done',
  'fmg-pill--missed': s === 'missed',
  'fmg-pill--nowork': s === 'no_work_day',
  'fmg-pill--pending': s === 'pending'
});

// ── Inline mark-done actions ─────────────────────────────────────────────────
// Lets admin/member tick a slot done right on this overview, no need to open
// the calendar for the routine case. Auth + RLS still enforced server-side.
const auth = useAuthStore();
const saving = ref<string | null>(null);   // key: `${websiteId}:${dow}` or `${websiteId}:plugin` or `${websiteId}:all`

const markBlogDay = async (websiteId: string, dateStr: string, dow: number) => {
  if (isPastWeek.value) return;            // never edit history
  const { monStr, sunStr } = weekBounds();
  if (dateStr < monStr || dateStr > sunStr) return;
  const existing = followup.blogSlots.find(
    (s) => s.websiteId === websiteId && s.scheduledDate === dateStr
  );
  // If already done, treat as no-op (avoid accidental undo on overview)
  if (existing && (existing.status === 'done' || existing.status === 'late')) return;
  const key = `${websiteId}:${dateStr}`;
  if (saving.value) return;
  saving.value = key;
  try {
    const isLate = dateStr < today;
    await followup.upsertBlogSlot({
      id: existing?.id,
      websiteId,
      scheduledDate: dateStr,
      dayOfWeek: dow,
      status: isLate ? 'late' : 'done',
      completedBy: auth.user?.id ?? null,
      completedAt: new Date().toISOString()
    });
  } finally {
    saving.value = null;
  }
};

const markPluginWeek = async (websiteId: string) => {
  if (isPastWeek.value) return;
  const { monStr } = weekBounds();
  const existing = followup.pluginSlots.find(
    (s) => s.websiteId === websiteId && s.weekStart === monStr
  );
  if (existing && existing.status === 'done') return;
  const key = `${websiteId}:plugin`;
  if (saving.value) return;
  saving.value = key;
  try {
    await followup.upsertPluginSlot({
      id: existing?.id,
      websiteId,
      weekStart: monStr,
      status: 'done',
      completedBy: auth.user?.id ?? null,
      completedAt: new Date().toISOString()
    });
  } finally {
    saving.value = null;
  }
};

const isSaving = (key: string) => saving.value === key;
</script>

<style scoped>
.fmg {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* ── Filters ── */
.fmg-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem;
}
.fmg-search {
  max-width: 16rem;
  flex: 1 1 12rem;
}
.fmg-statusfilter,
.fmg-weekfilter {
  display: inline-flex;
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--card-bg);
}
.fmg-weekrange {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  color: var(--text-muted);
  align-self: center;
}
.fmg-statusbtn {
  padding: 0.42rem 0.8rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--text-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  border-right: 1px solid var(--border);
}
.fmg-statusbtn:last-child { border-right: none; }
.fmg-statusbtn--active {
  background: var(--primary);
  color: #fff;
}

.fmg-empty,
.fmg-no-websites {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}
.fmg-no-websites { padding: 1rem; }

/* ── Groups ── */
/* 3-column grid of member cards. Cards align to top so a tall card
   (many websites) doesn't stretch its row-mates. */
.fmg-groups {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.1rem;
  align-items: start;
}
@media (max-width: 1280px) {
  .fmg-groups { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 760px) {
  .fmg-groups { grid-template-columns: 1fr; }
}
.fmg-group {
  overflow: hidden;
  padding: 0;
}
.fmg-head {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: 100%;
  padding: 1.15rem 1.35rem 1.15rem;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background 140ms ease;
}
.fmg-head:hover {
  background: color-mix(in srgb, var(--primary) 4%, transparent);
}

/* Top row: identity on the left, chevron on the right */
.fmg-head-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
}

.fmg-head-left {
  display: flex;
  align-items: center;
  gap: 0.95rem;
  min-width: 0;
  flex: 1;
}

.fmg-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1), color 140ms;
}
.fmg-group--open .fmg-chevron {
  transform: rotate(180deg);
  color: var(--primary);
}

/* Stat ribbon: typographic, no pill backgrounds. Bold number + soft
   label + thin separator. The "missed" group is conditionally rendered
   in the template — when 0 it doesn't appear at all (no zero-noise). */
.fmg-head-stats {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
}
.fmg-avatar {
  position: relative;
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.95rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  flex-shrink: 0;
}
.fmg-avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}
.fmg-presence {
  position: absolute;
  bottom: -1px;
  right: -1px;
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 50%;
  border: 2px solid var(--card-bg);
}
.fmg-presence--online  { background: #16a34a; }
.fmg-presence--away    { background: #f59e0b; }
.fmg-presence--offline { background: #94a3b8; }

.fmg-head-info { min-width: 0; }
.fmg-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 1.05rem;
  font-weight: 850;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}
.fmg-sub {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-top: 0.2rem;
}

.fmg-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 0.3rem;
}
.fmg-stat-num {
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.fmg-stat-num--done   { color: #16a34a; }
.fmg-stat-num--missed { color: #dc2626; }
.fmg-stat-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-muted);
  text-transform: lowercase;
  letter-spacing: 0.01em;
}
.fmg-stat-sep {
  color: var(--text-muted);
  opacity: 0.35;
  font-weight: 400;
  user-select: none;
}
/* Subtle red underline emphasis when a member has misses — only when it matters */
.fmg-stat--alert .fmg-stat-num--missed {
  position: relative;
}
.fmg-stat--alert .fmg-stat-num--missed::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 2px;
  background: #dc2626;
  border-radius: 2px;
  opacity: 0.55;
}

.fmg-progress {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
}
.fmg-progress-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--soft-bg);
  border: 1px solid var(--border);
  overflow: hidden;
}
.fmg-progress-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 300ms ease;
}
.fmg-progress-fill.is-complete { background: #16a34a; }
.fmg-progress-fill.is-partial  { background: #f97316; }
.fmg-progress-fill.is-empty    { background: transparent; }
.fmg-pct {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.82rem;
  font-weight: 900;
  color: var(--text-muted);
  min-width: 2.6rem;
  text-align: right;
}

/* ── Dropdown wrapper: smooth height animation via grid-template-rows.
   Closed = 0fr, open = 1fr. The inner .fmg-body clips content during the
   collapse so it slides cleanly without flicker. ── */
.fmg-dropdown {
  display: grid;
  grid-template-rows: 0fr;
  transition:
    grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 200ms cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 0;
}
.fmg-dropdown--open {
  grid-template-rows: 1fr;
  opacity: 1;
}
.fmg-dropdown > .fmg-body {
  overflow: hidden;
  min-height: 0;
}
@media (prefers-reduced-motion: reduce) {
  .fmg-dropdown { transition: none; }
}

/* ── Body ── */
.fmg-body {
  border-top: 1px solid var(--border);
  padding: 0.85rem 1.1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

/* Website block: two stacked rows (identity, actions). Fits the narrow
   3-column card cleanly; no horizontal cramming, no overlapping text. */
.fmg-ws-row {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: 0.85rem 0.95rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card-bg);
  transition: border-color 140ms, background 140ms;
}
.fmg-ws-row:hover {
  border-color: color-mix(in srgb, var(--primary) 25%, var(--border));
}
/* Subtle tint by overall status so the row reads at a glance */
.fmg-ws-row--done    { background: color-mix(in srgb, #16a34a 4%, var(--card-bg)); }
.fmg-ws-row--missed  { background: color-mix(in srgb, #dc2626 4%, var(--card-bg)); }

/* Identity row: favicon + name + open-calendar icon */
.fmg-ws-head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}
.fmg-ws-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  background: color-mix(in srgb, var(--card-bg) 88%, var(--soft-bg));
  border: 1px solid var(--border);
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.fmg-ws-favicon { width: 70%; height: 70%; object-fit: contain; }
.fmg-ws-name {
  flex: 1;
  min-width: 0;
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fmg-ws-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  color: var(--text-muted);
  flex-shrink: 0;
  text-decoration: none;
  transition: color 140ms, background 140ms;
}
.fmg-ws-open:hover {
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 8%, transparent);
}

/* Action row: full-width buttons. For blog: Tue + Sat side-by-side.
   For plugin: single full-width button. */
/* `auto-fit, minmax(...)` lets the row hold 1, 2, 3, or more chips
   cleanly — needed now that the chip count varies per website schedule
   (was hardcoded at 2 for the old Tue+Sat assumption). */
.fmg-ws-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 0.5rem;
}
.fmg-ws-actions--single { grid-template-columns: 1fr; }
.fmg-no-days {
  grid-column: 1 / -1;
  font-size: 0.78rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 0.5rem 0;
}

.fmg-day-chip {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  border-radius: 8px;
  padding: 0.55rem 0.7rem;
  text-align: center;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--text-muted);
  cursor: pointer;
  transition: background 140ms, border-color 140ms, transform 100ms;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fmg-day-chip:not(.fmg-day-chip--locked):hover {
  background: color-mix(in srgb, var(--primary) 18%, transparent);
  border-color: color-mix(in srgb, var(--primary) 50%, transparent);
  color: var(--primary);
  transform: translateY(-1px);
}
.fmg-day-chip:not(.fmg-day-chip--locked):active { transform: translateY(0); }
.fmg-day-chip--done     { background: rgba(22,163,74,0.14); color: #16a34a; border-color: rgba(22,163,74,0.4); }
.fmg-day-chip--missed   { background: rgba(220,38,38,0.12); color: #dc2626; border-color: rgba(220,38,38,0.4); }
.fmg-day-chip--pending  { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); border-color: color-mix(in srgb, var(--primary) 38%, transparent); }
.fmg-day-chip--upcoming { background: var(--soft-bg); color: var(--text-muted); }
.fmg-day-chip--locked   { cursor: default; opacity: 0.95; }
.fmg-day-chip:disabled  { cursor: not-allowed; }

/* ── eBay detail ── */
.fmg-ebay-detail {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  padding: 0.3rem 0.2rem;
}
.fmg-ebay-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.fmg-ebay-stat-label {
  font-size: 0.68rem;
  color: var(--text-muted);
}
.fmg-ebay-num {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 900;
  color: var(--text-main);
}
.fmg-ebay-pill {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 800;
  border-radius: 999px;
  padding: 0.2rem 0.6rem;
  width: fit-content;
}
.fmg-pill--done    { background: rgba(22,163,74,0.12); color: #16a34a; }
.fmg-pill--missed  { background: rgba(220,38,38,0.10); color: #dc2626; }
.fmg-pill--pending { background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); }
.fmg-pill--nowork  { background: var(--soft-bg); color: var(--text-muted); border: 1px solid var(--border); }
.fmg-open-btn { margin-left: auto; }

/* Website row is column-flex now (identity + actions), so it already
   stacks cleanly on narrow viewports. No special mobile rules needed. */
</style>
