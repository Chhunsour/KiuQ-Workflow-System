<template>
  <div class="fp-page">
    <PageHeader title="Website Optimization" subtitle="Track weekly speed-optimization checks for every website.">
      <template #actions>
        <RouterLink to="/followup" class="btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><path d="m12 5-7 7 7 7"/></svg>
          Back
        </RouterLink>
      </template>
    </PageHeader>

    <!-- Error -->
    <div v-if="error" class="card card-pad">
      <p class="font-semibold text-status-needs-fix-fg">Failed to load websites.</p>
      <p class="text-sm text-text-muted mt-1">{{ error }}</p>
      <button class="btn-primary mt-3 w-fit" type="button" @click="load">Retry</button>
    </div>

    <!-- Loading -->
    <div v-else-if="loading" class="fp-grid">
      <div v-for="i in 6" :key="i" class="fp-skeleton" />
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

    <!-- Website cards (admin sees all, members see their own/assigned) -->
    <div v-else>
      <div class="mb-5">
        <input v-model="search" class="input max-w-sm" type="search" placeholder="Search websites…" />
      </div>

      <div v-if="filtered.length === 0" class="card card-pad text-sm text-text-muted text-center py-6">
        No websites match your search.
      </div>

      <div v-else class="fp-grid">
        <RouterLink
          v-for="w in filtered"
          :key="w.id"
          :to="`/followup/speed-optimization/${w.id}`"
          class="fp-card"
        >
          <div class="fp-card-top">
            <div class="fp-card-initial">
              <img v-if="w.faviconUrl" :src="w.faviconUrl" alt="" class="fp-favicon" @error="(e) => ((e.target as HTMLImageElement).style.display = 'none')" />
              <span v-else>{{ w.name.slice(0, 2).toUpperCase() }}</span>
            </div>
            <div class="fp-card-info">
              <h3 class="fp-card-name">{{ w.name }}</h3>
              <span class="fp-card-domain">{{ w.domain || 'No domain' }}</span>
              <span v-if="assignedMemberName(w.id)" class="fp-card-assigned">
                Assigned to {{ assignedMemberName(w.id) }}
              </span>
            </div>
          </div>

          <!-- This-week status -->
          <div class="fp-card-week">
            <span class="fp-week-label">This week</span>
            <span class="fp-week-chip" :class="`chip--${thisWeekStatus(w.id)}`">
              <span class="fp-week-dot" />
              {{ statusLabel(thisWeekStatus(w.id)) }}
            </span>
          </div>

          <!-- Month progress (compact: label + count + bar; a missed flag
               only appears when there's actually something to flag) -->
          <div class="fp-card-progress">
            <div class="fp-prog-row">
              <span class="fp-prog-label">This month</span>
              <span class="fp-prog-text">
                {{ monthDone(w.id) }}/{{ monthTotal(w.id) }}
                <span v-if="totalFor(w.id, 'missed') > 0" class="fp-prog-missed">· {{ totalFor(w.id, 'missed') }} missed</span>
              </span>
            </div>
            <div class="fp-prog-track">
              <div
                class="fp-prog-fill"
                :class="monthTotal(w.id) && monthDone(w.id) === monthTotal(w.id) ? 'fill--complete' : ''"
                :style="{ width: monthTotal(w.id) ? (monthDone(w.id) / monthTotal(w.id) * 100) + '%' : '0%' }"
              />
            </div>
          </div>

          <div class="fp-card-footer">
            <button
              type="button"
              class="fp-quick-done"
              :class="{
                'fp-quick-done--done':    thisWeekStatus(w.id) === 'done',
                'fp-quick-done--saving':  savingId === w.id,
              }"
              :disabled="savingId === w.id"
              :title="thisWeekStatus(w.id) === 'done' ? 'Already done this week — click to undo' : 'Mark this week as done'"
              @click.prevent.stop="quickDone(w.id)"
            >
              <span class="fp-quick-done-box">
                <svg v-if="thisWeekStatus(w.id) === 'done'" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                <span v-else-if="savingId === w.id" class="fp-quick-done-dot" />
              </span>
              {{ thisWeekStatus(w.id) === 'done' ? 'Done this week' : 'Mark Done' }}
            </button>
            <span class="fp-card-open" title="Open tracker" aria-label="Open tracker">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </span>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import PageHeader from '@/components/ui/PageHeader.vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore, type SpeedSlotStatus } from '@/stores/followup';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['speed_optimization_slots', 'websites']);

const auth     = useAuthStore();
const data     = useDataStore();
const followup = useFollowupStore();

const search    = ref('');
const loading   = ref(false);
const error     = ref<string | null>(null);
const savingId  = ref<string | null>(null);

const websites = computed(() => {
  if (auth.isAdmin) return data.websites;
  const userId = auth.user?.id ?? '';
  // Members see websites they created or have any speed slot assigned for
  const slotWebsiteIds = new Set(
    followup.speedSlots.filter((s) => s.assignedTo === userId).map((s) => s.websiteId)
  );
  return data.websites.filter(
    (w) => w.createdBy === userId || slotWebsiteIds.has(w.id)
  );
});

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return websites.value;
  return websites.value.filter(
    (w) => w.name.toLowerCase().includes(q) || w.domain.toLowerCase().includes(q)
  );
});

const totalFor = (websiteId: string, status: SpeedSlotStatus) =>
  followup.speedSlots.filter((s) => s.websiteId === websiteId && s.status === status).length;

// Timezone-safe ISO date string from LOCAL date parts.
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthDone = (websiteId: string) => {
  const now   = new Date();
  const start = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const end   = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return followup.speedSlots.filter(
    (s) => s.websiteId === websiteId && s.weekStart >= start && s.weekStart <= end && s.status === 'done'
  ).length;
};

const monthTotal = (websiteId: string) => {
  const now   = new Date();
  const start = isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
  const end   = isoDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return followup.speedSlots.filter(
    (s) => s.websiteId === websiteId && s.weekStart >= start && s.weekStart <= end
  ).length;
};

const getThisWeekStart = () => {
  const today = new Date();
  const dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon);
  return isoDate(mon);
};

const thisWeekStatus = (websiteId: string): SpeedSlotStatus => {
  const weekStart = getThisWeekStart();
  const slot = followup.speedSlots.find(
    (s) => s.websiteId === websiteId && s.weekStart === weekStart
  );
  return slot?.status ?? 'pending';
};

const statusLabel = (s: SpeedSlotStatus) => {
  if (s === 'pending')         return 'Pending';
  if (s === 'done')            return 'Done';
  if (s === 'missed')          return 'Missed';
  if (s === 'needs_attention') return 'Needs Attention';
  return s;
};

const assignedMemberName = (websiteId: string): string | null => {
  // Pick the assignee from this week's slot first, then any other slot
  const thisWeek = getThisWeekStart();
  const slot =
    followup.speedSlots.find((s) => s.websiteId === websiteId && s.weekStart === thisWeek && s.assignedTo)
    ?? followup.speedSlots.find((s) => s.websiteId === websiteId && s.assignedTo);
  if (!slot?.assignedTo) return null;
  const m = data.members.find((x) => x.id === slot.assignedTo);
  return m?.fullName ?? m?.email ?? null;
};

const lastCheckedLabel = (websiteId: string): string | null => {
  const done = followup.speedSlots
    .filter((s) => s.websiteId === websiteId && s.status === 'done' && s.completedAt)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))[0];
  if (!done?.completedAt) return null;
  const d = new Date(done.completedAt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

/**
 * Inline "Mark Done" shortcut on the card. Toggles this week's slot between
 * done ↔ pending without leaving the page. Same permission rules as the
 * tracker: members can act on their own site, admins on any.
 */
const quickDone = async (websiteId: string) => {
  if (savingId.value) return;
  savingId.value = websiteId;
  try {
    const weekStart = getThisWeekStart();
    const existing  = followup.speedSlots.find(
      (s) => s.websiteId === websiteId && s.weekStart === weekStart
    );
    const isDone = existing?.status === 'done';
    await followup.upsertSpeedSlot({
      id:          existing?.id,
      websiteId,
      weekStart,
      status:      isDone ? 'pending' : 'done',
      completedBy: isDone ? null : (auth.user?.id ?? null),
      completedAt: isDone ? null : new Date().toISOString(),
    });
  } finally {
    savingId.value = null;
  }
};

const load = async () => {
  loading.value = true;
  error.value   = null;
  try {
    await Promise.all([
      data.fetchWebsites(),
      data.fetchMembers(),
      followup.fetchSpeedSlots(),
    ]);
    // Ensure slots exist for every visible website (idempotent)
    const ids = websites.value.map((w) => w.id);
    if (ids.length) {
      await Promise.all(ids.map((id) => followup.ensureSpeedSlots(id)));
      // Refresh after ensure so the newly-inserted pending rows are visible
      await followup.fetchSpeedSlots();
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error.';
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>

<style scoped>
.fp-page { display: flex; flex-direction: column; gap: 1.25rem; }

.fp-grid {
  display: grid;
  /* ~6 columns on a wide desktop; auto-fills down to fewer on smaller
     screens. */
  grid-template-columns: repeat(auto-fill, minmax(11.5rem, 1fr));
  gap: 0.7rem;
}
@media (max-width: 1280px) { .fp-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 860px)  { .fp-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 560px)  { .fp-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.55rem; } }

.fp-skeleton {
  height: 12rem;
  border-radius: 18px;
  background: color-mix(in srgb, var(--soft-bg) 80%, var(--border));
  animation: pulse 1.4s ease-in-out infinite;
}
@keyframes pulse { 0%, 100% { opacity: 0.55; } 50% { opacity: 1; } }

.fp-card {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  border: 1px solid var(--border);
  border-radius: 13px;
  background: var(--card-bg);
  padding: 0.85rem;
  text-decoration: none;
  color: inherit;
  box-shadow: var(--shadow-sm);
  transition: border-color 150ms, box-shadow 150ms, transform 150ms;
}
.fp-card:hover {
  border-color: color-mix(in srgb, var(--primary) 45%, var(--border));
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.fp-card-top { display: flex; align-items: center; gap: 0.55rem; }
.fp-card-initial {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 10px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}
.fp-favicon { width: 72%; height: 72%; object-fit: contain; }
.fp-card-info { min-width: 0; flex: 1; }
.fp-card-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.82rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fp-card-domain {
  font-size: 0.68rem;
  color: var(--text-muted);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.fp-card-assigned {
  display: block;
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 0.1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* This-week status */
.fp-card-week { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.fp-week-label {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  flex-shrink: 0;
}
.fp-week-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border-radius: 999px;
  padding: 0.18rem 0.55rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem;
  font-weight: 800;
  /* Default = pending: a soft blue "to-do this week" cue. */
  border: 1px solid color-mix(in srgb, var(--primary) 28%, var(--border));
  background: color-mix(in srgb, var(--primary) 10%, var(--soft-bg));
  color: var(--primary);
}
.fp-week-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--primary);
  flex-shrink: 0;
}
.fp-week-chip.chip--done {
  border-color: rgba(22,163,74,0.3);
  background: rgba(22,163,74,0.08);
  color: #16a34a;
}
.fp-week-chip.chip--done .fp-week-dot { background: #16a34a; opacity: 1; }
.fp-week-chip.chip--missed {
  border-color: rgba(220,38,38,0.3);
  background: rgba(220,38,38,0.08);
  color: #dc2626;
}
.fp-week-chip.chip--missed .fp-week-dot { background: #dc2626; opacity: 1; }
.fp-week-chip.chip--needs_attention {
  border-color: rgba(249,115,22,0.3);
  background: rgba(249,115,22,0.08);
  color: #f97316;
}
.fp-week-chip.chip--needs_attention .fp-week-dot { background: #f97316; opacity: 1; }

.fp-last-checked {
  font-size: 0.64rem;
  color: var(--text-muted);
}

/* Month progress */
.fp-card-progress {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  border: 1px solid color-mix(in srgb, var(--primary) 16%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--primary) 6%, var(--soft-bg));
  padding: 0.5rem 0.6rem;
}
.fp-prog-row { display: flex; align-items: center; justify-content: space-between; gap: 0.3rem; }
.fp-prog-label {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.fp-prog-text {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.74rem;
  font-weight: 900;
  color: var(--text-main);
}
.fp-prog-missed {
  font-size: 0.64rem;
  font-weight: 800;
  color: #f87171;
}
.fp-prog-track {
  height: 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 70%, var(--card-bg));
  overflow: hidden;
}
.fp-prog-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--primary), color-mix(in srgb, var(--primary) 75%, #22d3ee));
  transition: width 300ms ease;
}
.fp-prog-fill.fill--complete { background: #16a34a; }
.fp-prog-stats { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.fp-pstat { font-size: 0.62rem; font-weight: 800; }
.fp-pstat.done   { color: var(--primary); }
.fp-pstat.missed { color: #dc2626; }
.fp-pstat.attn   { color: #f97316; }
:global([data-theme='dark-gray']) .fp-pstat.missed { color: #f87171; }
:global([data-theme='dark-gray']) .fp-pstat.attn { color: #fb923c; }

.fp-card-footer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.1rem;
}

.fp-quick-done {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  flex: 1;             /* fills the footer; the Open icon sits beside it */
  min-width: 0;
  /* Pending action = brand blue (clear touch target). */
  border: 1px solid color-mix(in srgb, var(--primary) 40%, var(--border));
  background: color-mix(in srgb, var(--primary) 12%, var(--card-bg));
  color: var(--primary);
  border-radius: 9px;
  padding: 0.4rem 0.6rem;
  min-height: 1.95rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  transition: background 140ms, border-color 140ms, transform 140ms, box-shadow 140ms, opacity 140ms;
}
.fp-quick-done:hover:not(:disabled) {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 32%, transparent);
}
.fp-quick-done:disabled { cursor: wait; opacity: 0.6; }
/* Completed = the one justified green (success confirmation). */
.fp-quick-done--done {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
}
.fp-quick-done--done:hover:not(:disabled) {
  background: #15803d;
  border-color: #15803d;
}
.fp-quick-done--saving { opacity: 0.7; }

.fp-quick-done-box {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.05rem;
  height: 1.05rem;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.18);
}
.fp-quick-done:not(.fp-quick-done--done) .fp-quick-done-box {
  background: transparent;
  border: 1.5px solid currentColor;
}
.fp-quick-done-dot {
  width: 7px; height: 7px; border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  animation: fp-spin 0.6s linear infinite;
}
@keyframes fp-spin { to { transform: rotate(360deg); } }

.fp-card-open {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.95rem;
  height: 1.95rem;
  flex-shrink: 0;
  border-radius: 9px;
  border: 1px solid var(--border);
  color: var(--primary);
  background: var(--card-bg);
  transition: background 140ms ease, border-color 140ms ease;
}
.fp-card:hover .fp-card-open {
  border-color: var(--primary);
  background: color-mix(in srgb, var(--primary) 10%, transparent);
}
.fp-card-open svg { transition: transform 150ms ease; }
.fp-card:hover .fp-card-open svg { transform: translateX(2px); }
</style>
