<template>
  <div class="cal-page">
    <PageHeader title="Calendar" subtitle="Task deadlines and followups at a glance.">
      <template #actions>
        <MonthSelector v-model="selectedMonth" />
      </template>
    </PageHeader>

    <!-- Legend -->
    <div class="cal-legend">
      <span class="cal-legend-item"><i class="cal-dot cal-dot--task" /> Task due</span>
      <span class="cal-legend-item"><i class="cal-dot cal-dot--overdue" /> Overdue</span>
      <span class="cal-legend-item"><i class="cal-dot cal-dot--blog" /> Blog</span>
      <span class="cal-legend-item"><i class="cal-dot cal-dot--plugin" /> Plugin</span>
      <span class="cal-legend-item"><i class="cal-dot cal-dot--speed" /> Speed</span>
      <span class="cal-legend-item"><i class="cal-dot cal-dot--ebay" /> eBay</span>
    </div>

    <div class="cal-card">
      <!-- Weekday header -->
      <div class="cal-weekdays">
        <div v-for="d in WEEKDAYS" :key="d">{{ d }}</div>
      </div>

      <!-- Grid -->
      <div class="cal-grid">
        <div
          v-for="cell in cells"
          :key="cell.iso"
          class="cal-cell"
          :class="{ 'cal-cell--out': !cell.inMonth, 'cal-cell--today': cell.iso === todayIso }"
        >
          <div class="cal-cell-head">
            <span class="cal-daynum">{{ cell.day }}</span>
            <span v-if="cell.iso === todayIso" class="cal-today-chip">Today</span>
          </div>

          <div class="cal-events">
            <component
              :is="ev.to ? 'RouterLink' : 'div'"
              v-for="ev in cell.events.slice(0, 3)"
              :key="ev.key"
              :to="ev.to"
              class="cal-event"
              :class="[`cal-event--${ev.kind}`, ev.done ? 'cal-event--done' : '']"
              :title="ev.title"
            >
              <i class="cal-dot" :class="`cal-dot--${ev.kind}`" />
              <span class="cal-event-label">{{ ev.title }}</span>
            </component>
            <div v-if="cell.events.length > 3" class="cal-more">+{{ cell.events.length - 3 }} more</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore } from '@/stores/followup';
import { isFollowupParticipant } from '@/lib/roles';

const auth = useAuthStore();
const data = useDataStore();
const followup = useFollowupStore();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayIso = isoOf(new Date());

const monthStr = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
const selectedMonth = ref(monthStr(new Date()));

const taskLink = computed(() => (auth.isAdmin ? '/work-board/members' : '/work-board/my'));

type EventKind = 'task' | 'overdue' | 'blog' | 'plugin' | 'speed' | 'ebay';
interface CalEvent { key: string; title: string; kind: EventKind; to?: string; done?: boolean }

// ── Collect all events keyed by ISO date ──────────────────────────────────────
const eventsByDate = computed(() => {
  const map = new Map<string, CalEvent[]>();
  const push = (iso: string, ev: CalEvent) => {
    if (!iso) return;
    if (!map.has(iso)) map.set(iso, []);
    map.get(iso)!.push(ev);
  };

  const me = auth.user?.id;
  const isAdmin = auth.isAdmin;

  // Tasks (assignments) — mine, or all for admins
  const assignments = isAdmin ? data.assignments : data.assignments.filter((a) => a.assignedMemberId === me);
  assignments.forEach((a) => {
    const due = a.dueDate || data.projectById(a.projectId ?? null)?.deadline || '';
    if (!due) return;
    const iso = due.slice(0, 10);
    const open = !['approved', 'rejected'].includes(a.status);
    const overdue = open && iso < todayIso;
    push(iso, {
      key: `a:${a.id}`,
      title: data.promptById(a.promptId)?.title || 'Assigned task',
      kind: overdue ? 'overdue' : 'task',
      to: taskLink.value,
      done: a.status === 'approved',
    });
  });

  // Section tasks
  const sectionTasks = isAdmin ? data.sectionTasks : data.sectionTasks.filter((t) => t.assignedMemberId === me);
  sectionTasks.forEach((t) => {
    const due = (t.dueDate || t.deadline || '').slice(0, 10);
    if (!due) return;
    const open = !['approved', 'completed'].includes(t.status);
    const overdue = open && due < todayIso;
    push(due, {
      key: `st:${t.id}`,
      title: t.name || 'Task',
      kind: overdue ? 'overdue' : 'task',
      to: taskLink.value,
      done: ['approved', 'completed'].includes(t.status),
    });
  });

  // Group and roll up followups
  const ownWebsites = isAdmin ? data.websites : data.websites.filter((w) => w.createdBy === me);
  const ownWebsiteIds = new Set(ownWebsites.map((w) => w.id));

  const blogRollup = new Map<string, { total: number; done: number }>();
  const pluginRollup = new Map<string, { total: number; done: number }>();
  const speedRollup = new Map<string, { total: number; done: number }>();
  const ebayRollup = new Map<string, { total: number; done: number }>();

  // Rollup Blog Slots
  followup.blogSlots.forEach((s) => {
    if (!s.scheduledDate) return;
    const dateStr = s.scheduledDate.slice(0, 10);
    if (!isAdmin && !ownWebsiteIds.has(s.websiteId)) return;
    const stats = blogRollup.get(dateStr) || { total: 0, done: 0 };
    stats.total++;
    if (s.status === 'done' || s.status === 'late') stats.done++;
    blogRollup.set(dateStr, stats);
  });

  // Rollup Plugin Slots
  followup.pluginSlots.forEach((s) => {
    if (!s.weekStart) return;
    const dateStr = s.weekStart.slice(0, 10);
    if (!isAdmin && !ownWebsiteIds.has(s.websiteId)) return;
    const stats = pluginRollup.get(dateStr) || { total: 0, done: 0 };
    stats.total++;
    if (s.status === 'done') stats.done++;
    pluginRollup.set(dateStr, stats);
  });

  // Rollup Speed Slots
  followup.speedSlots.forEach((s) => {
    if (!s.weekStart) return;
    const dateStr = s.weekStart.slice(0, 10);
    if (!isAdmin && !ownWebsiteIds.has(s.websiteId)) return;
    const stats = speedRollup.get(dateStr) || { total: 0, done: 0 };
    stats.total++;
    if (s.status === 'done') stats.done++;
    speedRollup.set(dateStr, stats);
  });

  // Rollup eBay Clicks
  const activeMembersCount = data.members.filter(isFollowupParticipant).length;
  const totalEbayRequired = isAdmin ? activeMembersCount : 1;

  followup.ebayEntries
    .filter((e) => isAdmin || e.userId === me)
    .forEach((e) => {
      if (!e.date) return;
      const dateStr = e.date.slice(0, 10);
      const stats = ebayRollup.get(dateStr) || { total: totalEbayRequired, done: 0 };
      if (e.status === 'done') stats.done++;
      ebayRollup.set(dateStr, stats);
    });

  // Push rollups into map
  blogRollup.forEach((stats, dateStr) => {
    push(dateStr, {
      key: `blog:${dateStr}`,
      title: `Blogs: ${stats.done}/${stats.total}`,
      kind: 'blog',
      to: '/followup/blog',
      done: stats.done === stats.total,
    });
  });

  pluginRollup.forEach((stats, dateStr) => {
    push(dateStr, {
      key: `plugin:${dateStr}`,
      title: `Plugins: ${stats.done}/${stats.total}`,
      kind: 'plugin',
      to: '/followup/plugins',
      done: stats.done === stats.total,
    });
  });

  speedRollup.forEach((stats, dateStr) => {
    push(dateStr, {
      key: `speed:${dateStr}`,
      title: `Speed: ${stats.done}/${stats.total}`,
      kind: 'speed',
      to: '/followup/speed-optimization',
      done: stats.done === stats.total,
    });
  });

  ebayRollup.forEach((stats, dateStr) => {
    push(dateStr, {
      key: `ebay:${dateStr}`,
      title: `eBay: ${stats.done}/${stats.total}`,
      kind: 'ebay',
      to: '/followup/ebay-click',
      done: stats.done === stats.total,
    });
  });

  return map;
});

// ── Build the month grid (6 weeks) ────────────────────────────────────────────
interface Cell { iso: string; day: number; inMonth: boolean; events: CalEvent[] }
const cells = computed<Cell[]>(() => {
  const [y, m] = selectedMonth.value.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to Sunday

  const out: Cell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = isoOf(d);
    out.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === m - 1,
      events: eventsByDate.value.get(iso) ?? [],
    });
  }
  return out;
});

const loadAll = async () => {
  await Promise.allSettled([
    data.fetchAssignments(),
    data.fetchSectionTasks(),
    data.fetchProjects(),
    data.fetchPrompts(),
    data.fetchMembers(),
    data.fetchWebsites(),
    followup.fetchBlogSlots(),
    followup.fetchPluginSlots(),
    followup.fetchSpeedSlots(),
    followup.fetchEbayEntries(),
  ]);
};

onMounted(loadAll);
// Followups are fetched per range in some stores; refetch when month changes
watch(selectedMonth, () => {
  void Promise.allSettled([
    followup.fetchBlogSlots(),
    followup.fetchPluginSlots(),
    followup.fetchSpeedSlots(),
    followup.fetchEbayEntries(),
  ]);
});
</script>

<style scoped>
.cal-page { display: flex; flex-direction: column; gap: 1.1rem; padding-bottom: 2.5rem; }

.cal-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  font-size: 0.76rem;
  color: var(--text-muted);
}
.cal-legend-item { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 600; }

.cal-dot { width: 0.6rem; height: 0.6rem; border-radius: 999px; flex-shrink: 0; display: inline-block; }
.cal-dot--task { background: var(--primary); }
.cal-dot--overdue { background: #dc2626; }
.cal-dot--blog { background: #7c3aed; }
.cal-dot--plugin { background: #14b8a6; }
.cal-dot--speed { background: #d97706; }
.cal-dot--ebay { background: #16a34a; }

.cal-card {
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  overflow: hidden;
}
.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--soft-bg) 50%, transparent);
}
.cal-weekdays div {
  padding: 0.55rem 0.5rem;
  text-align: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.cal-cell {
  min-height: 6.5rem;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}
.cal-cell:nth-child(7n) { border-right: none; }
.cal-cell--out { background: color-mix(in srgb, var(--soft-bg) 35%, transparent); }
.cal-cell--out .cal-daynum { color: var(--text-muted); opacity: 0.5; }
.cal-cell--today { background: color-mix(in srgb, var(--primary) 7%, transparent); }

.cal-cell-head { display: flex; align-items: center; justify-content: space-between; }
.cal-daynum {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem; font-weight: 700; color: var(--text-main);
}
.cal-today-chip {
  font-size: 0.58rem; font-weight: 800; color: #fff; background: var(--primary);
  border-radius: 999px; padding: 0.05rem 0.4rem;
}

.cal-events { display: flex; flex-direction: column; gap: 0.2rem; }
.cal-event {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.12rem 0.3rem;
  border-radius: 6px;
  background: var(--soft-bg);
  text-decoration: none;
  cursor: pointer;
  transition: background 120ms;
}
.cal-event:hover { background: color-mix(in srgb, var(--primary) 12%, var(--soft-bg)); }
.cal-event--done { opacity: 0.5; }
.cal-event--done .cal-event-label { text-decoration: line-through; }
.cal-event-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-main);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cal-event--overdue .cal-event-label { color: #dc2626; font-weight: 700; }
.cal-more { font-size: 0.64rem; color: var(--text-muted); font-weight: 600; padding-left: 0.3rem; }

@media (max-width: 700px) {
  .cal-cell { min-height: 5rem; padding: 0.25rem; }
  .cal-event-label { display: none; }
  .cal-events { flex-direction: row; flex-wrap: wrap; gap: 0.15rem; }
  .cal-event { padding: 0.15rem; }
  .cal-more { width: 100%; }
}
</style>
