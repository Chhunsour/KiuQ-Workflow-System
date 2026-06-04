<template>
  <div class="lb-page">
    <!-- ══ Hero ══ -->
    <section class="lb-hero">
      <div class="lb-hero-left">
        <div class="lb-hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 21h8"/><path d="M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a3 3 0 0 0 3 3"/><path d="M17 6h3v2a3 3 0 0 1-3 3"/>
          </svg>
        </div>
        <div>
          <span class="lb-kicker">Team Leaderboard</span>
          <h1 class="lb-title">Member Leaderboard</h1>
          <p class="lb-subtitle">Live ranking from real work — approvals, submissions, and followups.</p>
        </div>
      </div>
      <div class="lb-hero-right">
        <MonthSelector v-model="selectedMonth" />
        <div v-if="auth.isAdmin" class="lb-preview-row">
          <button type="button" class="lb-preview-btn" @click="previewRecap">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3v18l7-5 7 5V3z"/></svg>
            Preview month recap
          </button>
          <button type="button" class="lb-preview-btn" @click="previewWinnersBanner">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Winners only
          </button>
        </div>
      </div>
    </section>

    <!-- ══ Error ══ -->
    <div v-if="error" class="lb-card lb-state">
      <div class="lb-state-title">Could not load the leaderboard.</div>
      <p class="lb-state-sub">{{ error }}</p>
      <button class="btn-primary" type="button" @click="load">Retry</button>
    </div>

    <template v-else>
      <!-- ══ Loading ══ -->
      <section v-if="loading" class="lb-podium">
        <div v-for="n in 3" :key="n" class="lb-podium-card lb-skel-card">
          <div class="lb-skel lb-skel-avatar" />
          <div class="lb-skel lb-skel-line" />
          <div class="lb-skel lb-skel-points" />
        </div>
      </section>

      <!-- ══ Empty ══ -->
      <EmptyState
        v-else-if="rows.length === 0"
        title="No team members yet"
        description="Once members are active, their standings show up here automatically."
      />

      <template v-else>
        <!-- ══ Podium (top 3) ══ -->
        <section class="lb-podium">
          <article
            v-for="slot in podium"
            :key="slot.rank"
            class="lb-podium-card"
            :class="[`lb-rank-${slot.rank}`, slot.row ? '' : 'lb-podium-empty', slot.row && slot.row.userId === myId ? 'lb-mine' : '']"
          >
            <div class="lb-podium-top">
              <span class="lb-medal" :class="`lb-medal-${slot.rank}`">{{ slot.medal }}</span>
              <span class="lb-place">{{ slot.label }}</span>
            </div>

            <template v-if="slot.row">
              <span class="lb-podium-avatar" :class="`lb-ring-${slot.rank}`">
                <img v-if="slot.row.avatarUrl" :src="slot.row.avatarUrl" :alt="slot.row.fullName" />
                <span v-else>{{ initials(slot.row.fullName) }}</span>
              </span>
              <h2 class="lb-podium-name">{{ slot.row.fullName }}</h2>
              <span class="lb-role" :class="roleBadgeClass(slot.row.role)">{{ roleLabel(slot.row.role) }}</span>
              <div class="lb-podium-points">{{ formatNumber(slot.row.totalPoints) }}</div>
              <div class="lb-podium-points-label">points</div>

              <div v-if="slot.row.breakdown.length" class="lb-podium-bd">
                <div v-for="b in slot.row.breakdown" :key="b.label" class="lb-bd-row">
                  <span>{{ b.label }}<span v-if="b.count > 1" class="lb-bd-count"> ×{{ b.count }}</span></span>
                  <strong :class="b.points >= 0 ? 'lb-pos' : 'lb-neg'">{{ b.points >= 0 ? '+' : '' }}{{ b.points }}</strong>
                </div>
              </div>
            </template>

            <div v-else class="lb-podium-empty-body">
              <span class="lb-podium-avatar lb-podium-avatar--empty">{{ slot.rank }}</span>
              <p>Open spot</p>
            </div>
          </article>
        </section>

        <!-- ══ Full standings ══ -->
        <section class="lb-card lb-standings">
          <div class="lb-standings-head">
            <h2>Full standings</h2>
            <span class="lb-standings-count">{{ rows.length }} member{{ rows.length === 1 ? '' : 's' }}</span>
          </div>

          <div class="lb-rows">
            <div
              v-for="row in rows"
              :key="row.userId"
              class="lb-row"
              :class="{ 'lb-row-mine': row.userId === myId }"
            >
              <div class="lb-row-rank" :class="row.rank <= 3 ? `lb-row-rank-${row.rank}` : ''">{{ row.rank }}</div>
              <span class="lb-row-avatar">
                <img v-if="row.avatarUrl" :src="row.avatarUrl" :alt="row.fullName" />
                <span v-else>{{ initials(row.fullName) }}</span>
              </span>
              <div class="lb-row-info">
                <div class="lb-row-name">
                  {{ row.fullName }}
                  <span v-if="row.userId === myId" class="lb-you">You</span>
                </div>
                <div class="lb-row-chips">
                  <span v-if="row.approvedCount" class="lb-chip lb-chip-green">{{ row.approvedCount }} approved</span>
                  <span v-if="row.submittedCount" class="lb-chip">{{ row.submittedCount }} submitted</span>
                  <span v-if="row.followupsCount" class="lb-chip lb-chip-blue">{{ row.followupsCount }} followups</span>
                  <span v-if="row.needsFixCount" class="lb-chip lb-chip-amber">{{ row.needsFixCount }} needs fix</span>
                  <span v-if="row.rejectedCount" class="lb-chip lb-chip-red">{{ row.rejectedCount }} rejected</span>
                  <span v-if="row.adjustmentPoints" class="lb-chip lb-chip-gold">★ {{ row.adjustmentPoints > 0 ? '+' : '' }}{{ row.adjustmentPoints }} bonus</span>
                  <span v-if="!hasActivity(row)" class="lb-chip lb-chip-muted">No points yet</span>
                </div>
              </div>
              <div class="lb-row-points">
                <strong>{{ formatNumber(row.totalPoints) }}</strong>
                <span>pts</span>
              </div>
              <button v-if="auth.isAdmin" type="button" class="lb-adjust-btn" title="Adjust score" @click="openAdjust(row)">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
            </div>
          </div>
        </section>

        <!-- ══ Scoring rules ══ -->
        <section class="lb-card lb-rules">
          <h2>How points are earned</h2>
          <p class="lb-rules-sub">Updated live from real workflow activity — no manual recalculation needed.</p>
          <div class="lb-rules-grid">
            <div v-for="rule in scoreRules" :key="rule.label" class="lb-rule">
              <span>{{ rule.label }}</span>
              <strong :class="rule.points >= 0 ? 'lb-pos' : 'lb-neg'">{{ rule.points >= 0 ? '+' : '' }}{{ rule.points }} pts</strong>
            </div>
          </div>
        </section>
      </template>
    </template>

    <!-- ══ Adjust score (admin / head) ══ -->
    <Modal
      :open="adjustOpen"
      title="Adjust score"
      :subtitle="adjustTarget ? `${adjustTarget.name} · ${selectedMonth}` : ''"
      size="sm"
      @close="closeAdjust"
    >
      <div class="lb-adjust-body">
        <p class="lb-adjust-hint">Add a bonus or penalty for work done outside the system (or to reward something special). Use a negative number to subtract.</p>

        <label class="lb-adjust-label">Points</label>
        <input
          v-model.number="adjustPoints"
          type="number"
          class="lb-adjust-input"
          placeholder="e.g. 25 or -10"
          @keyup.enter="saveAdjust"
        />

        <label class="lb-adjust-label">Reason</label>
        <input
          v-model="adjustReason"
          type="text"
          class="lb-adjust-input"
          placeholder="e.g. Helped a client off-platform 🙌"
          @keyup.enter="saveAdjust"
        />

        <p v-if="adjustError" class="lb-adjust-error">{{ adjustError }}</p>

        <!-- Existing adjustments -->
        <div v-if="adjustList.length" class="lb-adjust-list">
          <div class="lb-adjust-list-head">Previous adjustments this month</div>
          <div v-for="a in adjustList" :key="a.id" class="lb-adjust-item">
            <span class="lb-adjust-item-pts" :class="a.points >= 0 ? 'lb-pos' : 'lb-neg'">{{ a.points > 0 ? '+' : '' }}{{ a.points }}</span>
            <span class="lb-adjust-item-reason">{{ a.reason || 'No reason given' }}</span>
            <span class="lb-adjust-item-date">{{ formatDate(a.created_at) }}</span>
            <button type="button" class="lb-adjust-item-del" title="Remove" @click="removeAdjust(a.id)">✕</button>
          </div>
        </div>
      </div>

      <template #footer>
        <button class="btn-ghost" type="button" @click="closeAdjust">Done</button>
        <button class="btn-primary" type="button" :disabled="adjustSaving" @click="saveAdjust">
          {{ adjustSaving ? 'Saving…' : 'Add adjustment' }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import EmptyState from '@/components/ui/EmptyState.vue';
import Modal from '@/components/ui/Modal.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { roleBadgeClass, roleLabel } from '@/lib/roles';

// ── Scoring (mirrors get_team_leaderboard in migration 0070) ──────────────────
const SCORE = {
  approved:  15,
  submitted: 5,
  followup:  3,
  needs_fix: -3,
  rejected:  -8,
} as const;

const scoreRules = [
  { label: 'Task approved by admin', points: SCORE.approved },
  { label: 'Submit a task for review', points: SCORE.submitted },
  { label: 'Followup done (blog / plugin / speed / eBay)', points: SCORE.followup },
  { label: 'Task needs fix', points: SCORE.needs_fix },
  { label: 'Work rejected', points: SCORE.rejected },
];

interface BreakdownItem { label: string; points: number; count: number }
interface Row {
  userId: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  rank: number;
  totalPoints: number;
  approvedCount: number;
  submittedCount: number;
  followupsCount: number;
  needsFixCount: number;
  rejectedCount: number;
  adjustmentPoints: number;
  breakdown: BreakdownItem[];
}

// Raw shape returned by the RPC.
interface RpcRow {
  member_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  total_points: number;
  approved_count: number;
  submitted_count: number;
  followups_count: number;
  needs_fix_count: number;
  rejected_count: number;
  adjustment_points: number;
  rank: number;
}

const auth = useAuthStore();
const myId = computed(() => auth.user?.id ?? '');

const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const selectedMonth = ref(todayMonth());

const rows = ref<Row[]>([]);
const loading = ref(true);
const error = ref('');

const buildBreakdown = (r: RpcRow): BreakdownItem[] =>
  [
    { label: 'Approved work', points: r.approved_count * SCORE.approved, count: r.approved_count },
    { label: 'Submitted tasks', points: r.submitted_count * SCORE.submitted, count: r.submitted_count },
    { label: 'Followups done', points: r.followups_count * SCORE.followup, count: r.followups_count },
    { label: 'Needs fix', points: r.needs_fix_count * SCORE.needs_fix, count: r.needs_fix_count },
    { label: 'Rejected', points: r.rejected_count * SCORE.rejected, count: r.rejected_count },
    { label: 'Head bonus', points: r.adjustment_points, count: r.adjustment_points !== 0 ? 1 : 0 },
  ].filter((b) => b.count !== 0);

const load = async () => {
  if (!supabaseConfigured) {
    error.value = 'Leaderboard is not configured.';
    loading.value = false;
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    const { data, error: err } = await supabase.rpc('get_team_leaderboard', {
      p_month_key: selectedMonth.value,
    });
    if (err) throw err;
    rows.value = ((data ?? []) as RpcRow[]).map((r) => ({
      userId: r.member_id,
      fullName: r.full_name || 'Team member',
      avatarUrl: r.avatar_url || '',
      role: r.role || 'member',
      rank: r.rank,
      totalPoints: r.total_points,
      approvedCount: r.approved_count,
      submittedCount: r.submitted_count,
      followupsCount: r.followups_count,
      needsFixCount: r.needs_fix_count,
      rejectedCount: r.rejected_count,
      adjustmentPoints: r.adjustment_points,
      breakdown: buildBreakdown(r),
    }));
  } catch (e: unknown) {
    console.error('[leaderboard] get_team_leaderboard failed', e);
    const msg = e instanceof Error ? e.message : (e as { message?: string })?.message;
    error.value = msg
      ? `${msg} — make sure migration 0070_team_leaderboard_live.sql has been run in Supabase.`
      : 'Please try again.';
    rows.value = [];
  } finally {
    loading.value = false;
  }
};

watch(selectedMonth, load);
onMounted(load);

// ── Podium ──
interface PodiumSlot { rank: 1 | 2 | 3; label: string; medal: string; row?: Row }
const podium = computed<PodiumSlot[]>(() => [
  { rank: 1, label: '1st place', medal: '🥇', row: rows.value[0] },
  { rank: 2, label: '2nd place', medal: '🥈', row: rows.value[1] },
  { rank: 3, label: '3rd place', medal: '🥉', row: rows.value[2] },
]);

const previewWinnersBanner = () => window.dispatchEvent(new Event('open-winners-banner'));
const previewRecap = () => window.dispatchEvent(new Event('preview-monthly-recap'));

// ── Manual score adjustment (admin / head) ────────────────────────────────────
interface Adjustment { id: string; points: number; reason: string | null; created_at: string }
const adjustOpen = ref(false);
const adjustTarget = ref<{ id: string; name: string } | null>(null);
const adjustPoints = ref<number | null>(null);
const adjustReason = ref('');
const adjustSaving = ref(false);
const adjustError = ref('');
const adjustList = ref<Adjustment[]>([]);
const adjustListLoading = ref(false);

const fetchAdjustments = async (memberId: string) => {
  adjustListLoading.value = true;
  try {
    const { data, error: err } = await supabase
      .from('leaderboard_adjustments')
      .select('id, points, reason, created_at')
      .eq('month_key', selectedMonth.value)
      .eq('member_id', memberId)
      .order('created_at', { ascending: false });
    if (err) throw err;
    adjustList.value = (data ?? []) as Adjustment[];
  } catch (e) {
    console.error('[leaderboard] fetch adjustments failed', e);
    adjustList.value = [];
  } finally {
    adjustListLoading.value = false;
  }
};

const openAdjust = (row: Row) => {
  adjustTarget.value = { id: row.userId, name: row.fullName };
  adjustPoints.value = null;
  adjustReason.value = '';
  adjustError.value = '';
  adjustOpen.value = true;
  void fetchAdjustments(row.userId);
};
const closeAdjust = () => { adjustOpen.value = false; adjustTarget.value = null; };

const saveAdjust = async () => {
  if (!adjustTarget.value) return;
  const pts = Number(adjustPoints.value);
  if (!Number.isFinite(pts) || pts === 0) { adjustError.value = 'Enter a non-zero points value (e.g. 25 or -10).'; return; }
  adjustSaving.value = true;
  adjustError.value = '';
  try {
    const { error: err } = await supabase.rpc('add_leaderboard_adjustment', {
      p_month_key: selectedMonth.value,
      p_member_id: adjustTarget.value.id,
      p_points: Math.round(pts),
      p_reason: adjustReason.value.trim() || null,
    });
    if (err) throw err;
    adjustPoints.value = null;
    adjustReason.value = '';
    await Promise.all([fetchAdjustments(adjustTarget.value.id), load()]);
  } catch (e: unknown) {
    console.error('[leaderboard] add adjustment failed', e);
    adjustError.value = (e instanceof Error ? e.message : (e as { message?: string })?.message) || 'Could not save adjustment.';
  } finally {
    adjustSaving.value = false;
  }
};

const removeAdjust = async (id: string) => {
  try {
    const { error: err } = await supabase.rpc('delete_leaderboard_adjustment', { p_id: id });
    if (err) throw err;
    if (adjustTarget.value) await Promise.all([fetchAdjustments(adjustTarget.value.id), load()]);
  } catch (e) {
    console.error('[leaderboard] delete adjustment failed', e);
  }
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// ── Helpers ──
const hasActivity = (row: Row) =>
  row.approvedCount + row.submittedCount + row.followupsCount + row.needsFixCount + row.rejectedCount + Math.abs(row.adjustmentPoints) > 0;
const formatNumber = (v: number) => new Intl.NumberFormat().format(v);
const initials = (name: string) =>
  (name || '?').split(/[\s@.]+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();
</script>

<style scoped>
.lb-page { display: flex; flex-direction: column; gap: 1.4rem; padding-bottom: 2.5rem; }

/* ── Hero ── */
.lb-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  border: 1px solid var(--border);
  border-radius: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 12%, transparent), transparent 32%),
    var(--card-bg);
  padding: 1.25rem;
  box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}
.lb-hero-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
.lb-hero-icon {
  display: flex; height: 3rem; width: 3rem; flex: 0 0 auto;
  align-items: center; justify-content: center;
  border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 13%, var(--card-bg));
  color: var(--primary);
}
.lb-hero-icon svg { height: 1.45rem; width: 1.45rem; }
.lb-kicker {
  display: block;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem; font-weight: 850; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--primary); margin-bottom: 0.2rem;
}
.lb-title {
  margin: 0;
  font-family: 'Raleway', 'Google Sans', sans-serif;
  font-size: 1.4rem; font-weight: 900; color: var(--text-main); line-height: 1.15;
}
.lb-subtitle { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.lb-hero-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.5rem; }
.lb-preview-row { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: flex-end; }
.lb-preview-btn {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.4rem 0.8rem; border-radius: 10px;
  border: 1px solid var(--border); background: var(--card-bg);
  color: var(--text-muted); font-size: 0.78rem; font-weight: 700; cursor: pointer;
  transition: border-color 140ms, color 140ms, background 140ms;
}
.lb-preview-btn:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--primary);
  background: color-mix(in srgb, var(--primary) 6%, var(--card-bg));
}

/* ── Generic card / states ── */
.lb-card {
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--card-bg);
  padding: 1.1rem 1.25rem;
}
.lb-state { text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1.5rem; }
.lb-state-title { font-weight: 800; color: var(--text-main); }
.lb-state-sub { color: var(--text-muted); font-size: 0.85rem; max-width: 32rem; margin: 0; }

/* ── Podium ── */
.lb-podium {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}
.lb-podium-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--card-bg);
  padding: 1.25rem;
  box-shadow: 0 1px 3px rgba(16,24,40,0.06), 0 8px 24px rgba(15,23,42,0.06);
}
.lb-rank-1 { border-color: color-mix(in srgb, #f59e0b 55%, var(--border)); box-shadow: 0 0 0 1px color-mix(in srgb, #f59e0b 20%, transparent), 0 18px 48px color-mix(in srgb, #f59e0b 18%, transparent); }
.lb-rank-2 { border-color: color-mix(in srgb, #94a3b8 45%, var(--border)); }
.lb-rank-3 { border-color: color-mix(in srgb, #d97706 40%, var(--border)); }
.lb-mine { outline: 2px solid color-mix(in srgb, var(--primary) 45%, transparent); outline-offset: 2px; }

.lb-podium-top { display: flex; align-items: center; gap: 0.5rem; }
.lb-medal { font-size: 1.4rem; line-height: 1; }
.lb-place {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.78rem; font-weight: 800; text-transform: uppercase;
  letter-spacing: 0.04em; color: var(--text-muted);
}
.lb-podium-avatar {
  display: flex; align-items: center; justify-content: center;
  height: 4.75rem; width: 4.75rem; margin-top: 0.85rem;
  overflow: hidden; border-radius: 999px;
  background: var(--soft-bg); color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.25rem; font-weight: 800;
  border: 3px solid var(--border);
}
.lb-podium-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-ring-1 { height: 5.5rem; width: 5.5rem; border-color: #f59e0b; box-shadow: 0 0 0 4px color-mix(in srgb, #f59e0b 18%, transparent); }
.lb-ring-2 { border-color: #94a3b8; }
.lb-ring-3 { border-color: #d97706; }
.lb-podium-name {
  margin: 0.7rem 0 0;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.05rem; font-weight: 800; color: var(--text-main); line-height: 1.2;
}
.lb-role {
  margin-top: 0.4rem;
  border-radius: 999px; padding: 0.22rem 0.65rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.7rem; font-weight: 700;
}
.lb-podium-points {
  margin-top: 0.75rem;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: clamp(1.9rem, 3.5vw, 2.4rem); font-weight: 900; line-height: 1;
  color: var(--text-main); letter-spacing: -0.02em;
}
.lb-rank-1 .lb-podium-points { color: #d97706; }
.lb-podium-points-label { color: var(--text-muted); font-size: 0.74rem; margin-top: 0.15rem; }

.lb-podium-bd {
  width: 100%; margin-top: 1rem;
  border: 1px solid var(--border); border-radius: 14px; overflow: hidden;
}
.lb-bd-row {
  display: flex; align-items: center; justify-content: space-between; gap: 0.5rem;
  padding: 0.42rem 0.75rem; font-size: 0.78rem;
  border-bottom: 1px solid var(--border);
}
.lb-bd-row:last-child { border-bottom: none; }
.lb-bd-row span { color: var(--text-muted); }
.lb-bd-count { color: var(--text-main); font-weight: 700; }
.lb-bd-row strong { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-weight: 800; }
.lb-pos { color: #16a34a; }
.lb-neg { color: #dc2626; }

.lb-podium-empty-body { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; padding: 1.5rem 0; }
.lb-podium-avatar--empty { margin: 0; background: var(--soft-bg); color: var(--text-muted); border-style: dashed; }
.lb-podium-empty-body p { margin: 0; color: var(--text-muted); font-size: 0.82rem; }

/* ── Standings ── */
.lb-standings-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; }
.lb-standings-head h2 { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.lb-standings-count { font-size: 0.78rem; color: var(--text-muted); font-weight: 600; }
.lb-rows { display: flex; flex-direction: column; gap: 0.4rem; }
.lb-row {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.7rem 0.75rem;
  border: 1px solid var(--border); border-radius: 14px;
  background: color-mix(in srgb, var(--soft-bg) 40%, var(--card-bg));
}
.lb-row-mine { border-color: color-mix(in srgb, var(--primary) 45%, var(--border)); background: color-mix(in srgb, var(--primary) 6%, var(--card-bg)); }
.lb-row-rank {
  flex-shrink: 0; width: 1.9rem; text-align: center;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.95rem; font-weight: 800; color: var(--text-muted);
}
.lb-row-rank-1 { color: #d97706; }
.lb-row-rank-2 { color: #64748b; }
.lb-row-rank-3 { color: #b45309; }
.lb-row-avatar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  height: 2.5rem; width: 2.5rem; overflow: hidden; border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.78rem; font-weight: 800;
}
.lb-row-avatar img { width: 100%; height: 100%; object-fit: cover; }
.lb-row-info { flex: 1; min-width: 0; }
.lb-row-name {
  display: flex; align-items: center; gap: 0.4rem;
  font-weight: 700; color: var(--text-main); font-size: 0.88rem;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.lb-you {
  flex-shrink: 0;
  background: var(--primary); color: #fff;
  font-size: 0.62rem; font-weight: 800; border-radius: 999px; padding: 0.05rem 0.4rem;
}
.lb-row-chips { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.3rem; }
.lb-chip {
  font-size: 0.68rem; font-weight: 700;
  border-radius: 999px; padding: 0.1rem 0.5rem;
  background: var(--soft-bg); color: var(--text-muted);
}
.lb-chip-green { background: rgba(22,163,74,0.12); color: #16a34a; }
.lb-chip-blue  { background: color-mix(in srgb, var(--primary) 14%, transparent); color: var(--primary); }
.lb-chip-amber { background: rgba(217,119,6,0.14); color: #d97706; }
.lb-chip-red   { background: rgba(220,38,38,0.12); color: #dc2626; }
.lb-chip-gold  { background: rgba(245,158,11,0.16); color: #d97706; }
.lb-chip-muted { opacity: 0.7; }

/* Adjust button */
.lb-adjust-btn {
  flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  width: 2rem; height: 2rem; border-radius: 9px;
  border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted);
  cursor: pointer; transition: border-color 140ms, color 140ms, background 140ms;
}
.lb-adjust-btn:hover {
  border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
  color: var(--primary); background: color-mix(in srgb, var(--primary) 8%, var(--card-bg));
}

/* Adjust modal */
.lb-adjust-body { display: flex; flex-direction: column; }
.lb-adjust-hint { margin: 0 0 0.6rem; font-size: 0.82rem; color: var(--text-muted); line-height: 1.5; }
.lb-adjust-label { font-size: 0.76rem; font-weight: 700; color: var(--text-main); margin: 0.5rem 0 0.25rem; }
.lb-adjust-input {
  width: 100%; border: 1px solid var(--border); border-radius: 10px;
  background: var(--card-bg); color: var(--text-main);
  padding: 0.55rem 0.75rem; font-size: 0.88rem; outline: none;
}
.lb-adjust-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent); }
.lb-adjust-error { margin: 0.6rem 0 0; font-size: 0.78rem; font-weight: 600; color: #dc2626; }
.lb-adjust-list { margin-top: 1rem; border-top: 1px solid var(--border); padding-top: 0.7rem; }
.lb-adjust-list-head { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 0.4rem; }
.lb-adjust-item { display: flex; align-items: center; gap: 0.55rem; padding: 0.4rem 0; border-bottom: 1px solid var(--border); }
.lb-adjust-item:last-child { border-bottom: none; }
.lb-adjust-item-pts { flex-shrink: 0; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-weight: 800; font-size: 0.85rem; min-width: 2.4rem; }
.lb-adjust-item-reason { flex: 1; min-width: 0; font-size: 0.8rem; color: var(--text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-adjust-item-date { flex-shrink: 0; font-size: 0.7rem; color: var(--text-muted); }
.lb-adjust-item-del { flex-shrink: 0; border: none; background: transparent; color: var(--text-muted); cursor: pointer; font-size: 0.85rem; padding: 0.1rem 0.3rem; border-radius: 6px; }
.lb-adjust-item-del:hover { color: #dc2626; background: rgba(220,38,38,0.1); }
.lb-row-points {
  flex-shrink: 0; display: flex; flex-direction: column; align-items: flex-end; line-height: 1;
}
.lb-row-points strong {
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 1.15rem; font-weight: 900; color: var(--text-main);
}
.lb-row-points span { font-size: 0.62rem; color: var(--text-muted); margin-top: 0.1rem; }

/* ── Rules ── */
.lb-rules h2 { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.lb-rules-sub { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.82rem; }
.lb-rules-grid { display: grid; grid-template-columns: 1fr; gap: 0.5rem; margin-top: 0.9rem; }
.lb-rule {
  display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
  border: 1px solid var(--border); border-radius: 12px;
  background: color-mix(in srgb, var(--soft-bg) 60%, transparent);
  padding: 0.6rem 0.8rem;
}
.lb-rule span { color: var(--text-muted); font-size: 0.82rem; }
.lb-rule strong { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-weight: 800; font-size: 0.85rem; }

/* ── Skeleton ── */
.lb-skel { background: color-mix(in srgb, var(--text-muted) 14%, transparent); border-radius: 8px; animation: lb-pulse 1.3s ease-in-out infinite; }
.lb-skel-card { gap: 0.6rem; }
.lb-skel-avatar { height: 4.75rem; width: 4.75rem; border-radius: 999px; margin-top: 0.85rem; }
.lb-skel-line { height: 0.9rem; width: 60%; margin-top: 0.4rem; }
.lb-skel-points { height: 1.6rem; width: 40%; }
@keyframes lb-pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Responsive podium (desktop: 2 · 1 · 3) ── */
@media (min-width: 860px) {
  .lb-podium { grid-template-columns: repeat(3, 1fr); align-items: start; }
  .lb-rank-1 { order: 2; }
  .lb-rank-2 { order: 1; margin-top: 1.75rem; }
  .lb-rank-3 { order: 3; margin-top: 1.75rem; }
  .lb-rules-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>
