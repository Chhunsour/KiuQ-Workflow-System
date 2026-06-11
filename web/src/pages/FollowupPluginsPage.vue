<template>
  <div class="fp-page">
    <PageHeader title="Plugin Update" subtitle="Track weekly WordPress plugin update checks for every website.">
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

    <!-- Admin: grouped-by-member overview -->
    <FollowupMemberGroups v-else-if="auth.isAdmin" kind="plugin" />

    <!-- Member: own website grid -->
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
          :to="`/followup/plugins/${w.id}`"
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

          <!-- Month progress -->
          <div class="fp-card-progress">
            <div class="fp-prog-row">
              <span class="fp-prog-label">This month</span>
              <span class="fp-prog-text">{{ monthDone(w.id) }}/{{ monthTotal(w.id) }}</span>
            </div>
            <div class="fp-prog-track">
              <div
                class="fp-prog-fill"
                :class="monthTotal(w.id) && monthDone(w.id) === monthTotal(w.id) ? 'fill--complete' : ''"
                :style="{ width: monthTotal(w.id) ? (monthDone(w.id) / monthTotal(w.id) * 100) + '%' : '0%' }"
              />
            </div>
            <div class="fp-prog-stats">
              <span class="fp-pstat done">{{ totalFor(w.id, 'done') }} Done</span>
              <span class="fp-pstat missed">{{ totalFor(w.id, 'missed') }} Missed</span>
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
            <span class="fp-card-open">
              Open
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
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
import FollowupMemberGroups from '@/components/followup/FollowupMemberGroups.vue';
import { useAuthStore } from '@/stores/auth';
import { useDataStore } from '@/stores/data';
import { useFollowupStore, type PluginSlotStatus } from '@/stores/followup';
import { usePageRealtime } from '@/services/realtimeService';

usePageRealtime(['plugin_update_slots', 'websites']);

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
  // Websites with plugin slots assigned to this user
  const slotWebsiteIds = new Set(
    followup.pluginSlots.filter((s) => s.assignedTo === userId).map((s) => s.websiteId)
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

const totalFor = (websiteId: string, status: PluginSlotStatus) =>
  followup.pluginSlots.filter((s) => s.websiteId === websiteId && s.status === status).length;

// Timezone-safe (local parts, not toISOString which shifts to UTC).
const isoDateLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const monthDone = (websiteId: string) => {
  const now   = new Date();
  const start = isoDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  const end   = isoDateLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return followup.pluginSlots.filter(
    (s) => s.websiteId === websiteId && s.weekStart >= start && s.weekStart <= end && s.status === 'done'
  ).length;
};

const monthTotal = (websiteId: string) => {
  const now   = new Date();
  const start = isoDateLocal(new Date(now.getFullYear(), now.getMonth(), 1));
  const end   = isoDateLocal(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  return followup.pluginSlots.filter(
    (s) => s.websiteId === websiteId && s.weekStart >= start && s.weekStart <= end
  ).length;
};

// Timezone-safe (local parts, not toISOString which shifts to UTC).
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const getThisWeekStart = () => {
  const today = new Date();
  const dow = today.getDay();
  const diffToMon = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(today);
  mon.setDate(today.getDate() + diffToMon);
  return isoDate(mon);
};

const thisWeekStatus = (websiteId: string): PluginSlotStatus => {
  const weekStart = getThisWeekStart();
  const slot = followup.pluginSlots.find(
    (s) => s.websiteId === websiteId && s.weekStart === weekStart
  );
  return slot?.status ?? 'pending';
};

const statusLabel = (s: PluginSlotStatus) => {
  if (s === 'pending')         return 'Pending';
  if (s === 'done')            return 'Done';
  if (s === 'missed')          return 'Missed';
  if (s === 'needs_attention') return 'Needs Attention';
  return s;
};

/**
 * Inline "Mark Done" shortcut on the card. Toggles this week's plugin slot
 * between done ↔ pending without leaving the page. Same upsert path as the
 * tracker, so realtime keeps both views in sync.
 */
const quickDone = async (websiteId: string) => {
  if (savingId.value) return;
  savingId.value = websiteId;
  try {
    const weekStart = getThisWeekStart();
    const existing  = followup.pluginSlots.find(
      (s) => s.websiteId === websiteId && s.weekStart === weekStart
    );
    const isDone = existing?.status === 'done';
    await followup.upsertPluginSlot({
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
      followup.fetchPluginSlots(),
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
.fp-page { display: flex; flex-direction: column; gap: 1.25rem; }

.fp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
  gap: 1rem;
}

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
  gap: 0.85rem;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1.1rem;
  text-decoration: none;
  color: inherit;
  transition: border-color 150ms, box-shadow 150ms, transform 150ms;
}

.fp-card:hover {
  border-color: color-mix(in srgb, #7c3aed 40%, var(--border));
  box-shadow: 0 6px 22px rgba(124,58,237,0.08);
  transform: translateY(-2px);
}

.fp-card-top { display: flex; align-items: center; gap: 0.75rem; }

.fp-card-initial {
  width: 2.8rem;
  height: 2.8rem;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  color: #7c3aed;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.fp-favicon {
  width: 70%;
  height: 70%;
  object-fit: contain;
}

.fp-card-info { min-width: 0; flex: 1; }

.fp-card-name {
  font-family: 'Jost Numbers', 'Raleway', sans-serif;
  font-size: 0.95rem;
  font-weight: 850;
  color: var(--text-main);
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fp-card-domain {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* This-week status */
.fp-card-week {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.fp-week-label {
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
  width: 4.5rem;
  flex-shrink: 0;
}

.fp-week-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  padding: 0.22rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.75rem;
  font-weight: 800;
  border: 1px solid var(--border);
  background: var(--soft-bg);
  color: var(--text-muted);
}

.fp-week-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted);
  flex-shrink: 0;
  opacity: 0.4;
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

/* Month progress */
.fp-card-progress {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--soft-bg);
  padding: 0.6rem 0.75rem;
}

.fp-prog-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.fp-prog-label {
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.fp-prog-text {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.8rem;
  font-weight: 900;
  color: var(--text-main);
}

.fp-prog-track {
  height: 5px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}

.fp-prog-fill {
  height: 100%;
  border-radius: 999px;
  background: #7c3aed;
  transition: width 300ms ease;
}
.fp-prog-fill.fill--complete { background: #16a34a; }

.fp-prog-stats {
  display: flex;
  gap: 0.75rem;
}

.fp-pstat {
  font-size: 0.68rem;
  font-weight: 700;
}
.fp-pstat.done   { color: #16a34a; }
.fp-pstat.missed { color: #dc2626; }

.fp-card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.1rem;
}

.fp-quick-done {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid color-mix(in srgb, #16a34a 40%, var(--border));
  background: color-mix(in srgb, #16a34a 8%, var(--card-bg));
  color: #16a34a;
  border-radius: 999px;
  padding: 0.32rem 0.8rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.76rem;
  font-weight: 800;
  cursor: pointer;
  transition: background 140ms, border-color 140ms, transform 140ms, opacity 140ms;
}
.fp-quick-done:hover:not(:disabled) {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
  transform: translateY(-1px);
}
.fp-quick-done:disabled { cursor: wait; opacity: 0.6; }
.fp-quick-done--done {
  background: #16a34a;
  border-color: #16a34a;
  color: #fff;
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
  gap: 0.35rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem;
  font-weight: 800;
  color: #7c3aed;
}
</style>
