<template>
  <div v-if="auth.canAccessWinnerCenter" class="wc-page">
    <!-- ══ 1. Header ══ -->
    <header class="wc-header">
      <div class="wc-header-left">
        <div class="wc-header-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8S13 3 16.5 3a2.5 2.5 0 0 1 0 5"/>
          </svg>
        </div>
        <div>
          <span class="wc-kicker">Monthly Team Reward</span>
          <h1 class="wc-title">Winner Center</h1>
          <p class="wc-subtitle">Select monthly winners, manage prizes, and reward team performance.</p>
        </div>
      </div>
      <div class="wc-header-right">
        <MonthSelector v-model="selectedMonth" />
        <div class="wc-header-actions">
          <button type="button" class="wc-btn-ghost" @click="openCreatePrize">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            Create Prize
          </button>
          <button type="button" class="wc-btn-primary" @click="scrollToReview">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Select Winner
          </button>
        </div>
      </div>
    </header>

    <!-- ══ 2. Selected Winner Card ══ -->
    <section v-if="currentWinner" class="wc-winner-card">
      <div class="wc-winner-glow" aria-hidden="true"></div>
      <div class="wc-winner-crown" aria-hidden="true">👑</div>
      <div class="wc-winner-main">
        <span class="wc-winner-avatar">
          <img v-if="winnerProfile?.avatarUrl" :src="winnerProfile.avatarUrl" :alt="winnerProfile.fullName" />
          <span v-else>{{ initials(winnerProfile?.fullName || 'Winner') }}</span>
        </span>
        <div class="wc-winner-info">
          <span class="wc-winner-badge">{{ monthLabel(currentWinner.monthKey) }} Winner</span>
          <h2 class="wc-winner-name">{{ winnerProfile?.fullName || 'Selected member' }}</h2>
          <p class="wc-winner-role">{{ winnerProfile?.position || roleLabel(winnerProfile?.role) }}</p>
          <p class="wc-winner-summary">{{ currentWinner.achievementSummary || 'Outstanding work this month.' }}</p>
          <div class="wc-winner-meta">
            <span><strong>{{ formatNumber(currentWinner.scoreSnapshot) }}</strong> points</span>
            <span>Selected by {{ selectedByLabel(currentWinner) }}</span>
            <span>{{ formatDate(currentWinner.selectedAt) }}</span>
          </div>
        </div>
      </div>

      <div class="wc-winner-side">
        <!-- Prize state -->
        <div v-if="currentWinner.status !== 'selected'" class="wc-prize-won">
          <span class="wc-prize-won-label">Prize won</span>
          <span class="wc-prize-won-name">{{ wonPrizeName(currentWinner) }}</span>
          <span class="wc-status-pill" :class="`wc-status-${currentWinner.status}`">{{ statusLabel(currentWinner.status) }}</span>
        </div>

        <div class="wc-winner-buttons">
          <button
            v-if="currentWinner.status === 'selected'"
            type="button"
            class="wc-btn-primary wc-btn-spin"
            :disabled="activePrizes.length < 2"
            :title="activePrizes.length < 2 ? 'Add at least 2 active prizes first' : ''"
            @click="openWheel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/></svg>
            Spin Prize Wheel
          </button>
          <button
            v-else-if="currentWinner.status === 'prize_spun'"
            type="button"
            class="wc-btn-primary"
            @click="confirmMarkGiven"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Mark Prize as Given
          </button>
          <span v-else class="wc-given-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
            Prize delivered
          </span>
          <button type="button" class="wc-btn-ghost" @click="changeWinner">Change Winner</button>
        </div>
      </div>
    </section>

    <!-- ══ 3. Monthly Leaderboard Review ══ -->
    <section ref="reviewRef" class="wc-card wc-review">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Monthly Leaderboard Review</h2>
          <p class="wc-card-sub">
            {{ monthLabel(selectedMonth) }} · Leaderboard score is a <strong>reference only</strong> — you choose the official winner.
          </p>
        </div>
        <span v-if="!lbLoading" class="wc-count">{{ leaderboardRows.length }} member{{ leaderboardRows.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="lbLoading" class="wc-skeleton-rows">
        <div v-for="n in 4" :key="n" class="wc-skeleton-row" />
      </div>

      <div v-else-if="lbError" class="wc-empty">
        <p>{{ lbError }}</p>
        <button type="button" class="wc-btn-ghost" @click="loadLeaderboard">Retry</button>
      </div>

      <div v-else-if="leaderboardRows.length === 0" class="wc-empty">
        <p>No member activity recorded for {{ monthLabel(selectedMonth) }}.</p>
      </div>

      <div v-else class="wc-review-list">
        <article
          v-for="row in leaderboardRows"
          :key="row.userId"
          class="wc-review-row"
          :class="{ 'wc-review-row--winner': currentWinner?.winnerUserId === row.userId }"
        >
          <div class="wc-review-rank">{{ row.rank }}</div>
          <span class="wc-review-avatar">
            <img v-if="row.avatarUrl" :src="row.avatarUrl" :alt="row.fullName" />
            <span v-else>{{ initials(row.fullName) }}</span>
          </span>
          <div class="wc-review-id">
            <div class="wc-review-name">
              {{ row.fullName }}
              <span v-if="currentWinner?.winnerUserId === row.userId" class="wc-review-tag">Current winner</span>
            </div>
            <div class="wc-review-position">{{ row.position || roleLabel(row.role) }}</div>
          </div>

          <div class="wc-review-stats">
            <div class="wc-stat wc-stat--score"><strong>{{ formatNumber(row.totalPoints) }}</strong><span>score</span></div>
            <div class="wc-stat"><strong>{{ row.approvedCount }}</strong><span>approved</span></div>
            <div class="wc-stat"><strong>{{ row.submittedCount }}</strong><span>completed</span></div>
            <div class="wc-stat"><strong>{{ row.followupsCount }}</strong><span>followups</span></div>
            <div class="wc-stat" :class="{ 'wc-stat--warn': penalties(row) > 0 }"><strong>{{ penalties(row) }}</strong><span>penalties</span></div>
          </div>

          <button
            type="button"
            class="wc-select-btn"
            :class="{ 'wc-select-btn--active': currentWinner?.winnerUserId === row.userId }"
            @click="onSelectWinner(row)"
          >
            {{ currentWinner?.winnerUserId === row.userId ? 'Winner ✓' : 'Select as Winner' }}
          </button>
        </article>
      </div>
    </section>

    <!-- ══ 4. Prize Library ══ -->
    <section class="wc-card">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Prize Library</h2>
          <p class="wc-card-sub">Create and manage the prizes that can appear on the wheel.</p>
        </div>
        <button type="button" class="wc-btn-ghost" @click="openCreatePrize">+ New Prize</button>
      </div>

      <div v-if="store.prizes.length === 0 && !store.loading" class="wc-empty">
        <p>No prizes yet. Create your first reward to get started.</p>
        <button type="button" class="wc-btn-primary" @click="openCreatePrize">Create Prize</button>
      </div>

      <div v-else class="wc-prize-grid">
        <article
          v-for="prize in store.prizes"
          :key="prize.id"
          class="wc-prize-card"
          :class="{ 'wc-prize-card--inactive': !prize.isActive }"
        >
          <div class="wc-prize-top">
            <div class="wc-prize-thumb" :class="{ 'wc-prize-thumb--img': prize.imageUrl }">
              <img v-if="prize.imageUrl" :src="prize.imageUrl" :alt="prize.name" />
              <span v-else>{{ prizeEmoji(prize.prizeType) }}</span>
            </div>
            <button type="button" class="wc-prize-edit" title="Edit prize" @click="openEditPrize(prize)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            </button>
          </div>
          <h3 class="wc-prize-name">{{ prize.name }}</h3>
          <p class="wc-prize-desc">{{ prize.description || '—' }}</p>
          <div class="wc-prize-foot">
            <span class="wc-prize-type">{{ prettyType(prize.prizeType) }}</span>
            <span class="wc-prize-qty">Qty {{ prize.quantity }}</span>
            <span class="wc-prize-state" :class="prize.isActive ? 'wc-prize-state--on' : 'wc-prize-state--off'">
              {{ prize.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </article>
      </div>
    </section>

    <!-- ══ 6. Winner History ══ -->
    <section class="wc-card">
      <div class="wc-card-head">
        <div>
          <h2 class="wc-card-title">Winner History</h2>
          <p class="wc-card-sub">Permanent monthly reward record.</p>
        </div>
        <span class="wc-count">{{ store.winners.length }} month{{ store.winners.length === 1 ? '' : 's' }}</span>
      </div>

      <div v-if="store.winners.length === 0" class="wc-empty">
        <p>No winners recorded yet.</p>
      </div>

      <div v-else class="wc-history-wrap">
        <table class="wc-history">
          <thead>
            <tr>
              <th>Month</th>
              <th>Winner</th>
              <th>Prize won</th>
              <th class="wc-num">Score</th>
              <th>Selected by</th>
              <th>Awarded date</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in sortedHistory" :key="w.id">
              <td data-label="Month">{{ monthLabel(w.monthKey) }}</td>
              <td data-label="Winner">
                <div class="wc-history-winner">
                  <span class="wc-history-avatar">
                    <img v-if="profileMap[w.winnerUserId]?.avatarUrl" :src="profileMap[w.winnerUserId]?.avatarUrl" :alt="profileMap[w.winnerUserId]?.fullName" />
                    <span v-else>{{ initials(profileMap[w.winnerUserId]?.fullName || '?') }}</span>
                  </span>
                  {{ profileMap[w.winnerUserId]?.fullName || 'Member' }}
                </div>
              </td>
              <td data-label="Prize won">{{ wonPrizeName(w) || '—' }}</td>
              <td data-label="Score" class="wc-num">{{ formatNumber(w.scoreSnapshot) }}</td>
              <td data-label="Selected by">{{ selectedByLabel(w) }}</td>
              <td data-label="Awarded date">{{ awardedDate(w) }}</td>
              <td data-label="Status">
                <span class="wc-status-pill" :class="`wc-status-${w.status}`">{{ statusLabel(w.status) }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ══ Prize create/edit modal ══ -->
    <Modal
      :open="prizeModalOpen"
      :title="editingPrize ? 'Edit Prize' : 'Create Prize'"
      subtitle="Prizes can be activated or paused at any time."
      size="md"
      @close="closePrizeModal"
    >
      <div class="wc-form">
        <label class="wc-label">Prize name</label>
        <input v-model="prizeForm.name" type="text" class="wc-input" placeholder="e.g. $20 Bonus" />

        <label class="wc-label">Description</label>
        <textarea v-model="prizeForm.description" rows="2" class="wc-input wc-textarea" placeholder="Short description of the reward"></textarea>

        <div class="wc-form-row">
          <div class="wc-form-col">
            <label class="wc-label">Prize type</label>
            <select v-model="prizeForm.prizeType" class="wc-input">
              <option v-for="t in PRIZE_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
            </select>
          </div>
          <div class="wc-form-col">
            <label class="wc-label">Quantity</label>
            <input v-model.number="prizeForm.quantity" type="number" min="0" class="wc-input" />
          </div>
        </div>

        <label class="wc-label">Prize image URL <span class="wc-optional">(optional)</span></label>
        <input v-model="prizeForm.imageUrl" type="text" class="wc-input" placeholder="https://…" />

        <label class="wc-toggle">
          <input v-model="prizeForm.isActive" type="checkbox" />
          <span>Active (eligible for the prize wheel)</span>
        </label>

        <p v-if="prizeError" class="wc-error">{{ prizeError }}</p>
      </div>

      <template #footer>
        <button v-if="editingPrize" type="button" class="wc-btn-danger" :disabled="prizeSaving" @click="onDeletePrize">Delete</button>
        <button type="button" class="wc-btn-ghost" @click="closePrizeModal">Cancel</button>
        <button type="button" class="wc-btn-primary" :disabled="prizeSaving" @click="onSavePrize">
          {{ prizeSaving ? 'Saving…' : (editingPrize ? 'Save Changes' : 'Create Prize') }}
        </button>
      </template>
    </Modal>

    <!-- ══ 5. Prize Wheel modal ══ -->
    <Modal
      :open="wheelOpen"
      title="Prize Wheel"
      :subtitle="`Reward for ${winnerProfile?.fullName || 'the winner'} · ${monthLabel(selectedMonth)}`"
      size="lg"
      @close="closeWheel"
    >
      <div class="wc-wheel-modal">
        <!-- Prize pool selection -->
        <div v-if="!spinResult" class="wc-pool">
          <div class="wc-pool-head">
            <span>Prize pool</span>
            <span class="wc-pool-hint">{{ selectedPoolPrizes.length }} selected — the wheel picks one at random</span>
          </div>
          <div class="wc-pool-chips">
            <button
              v-for="prize in activePrizes"
              :key="prize.id"
              type="button"
              class="wc-pool-chip"
              :class="{ 'wc-pool-chip--on': poolIds.has(prize.id) }"
              :disabled="spinning"
              @click="togglePool(prize.id)"
            >
              {{ prizeEmoji(prize.prizeType) }} {{ prize.name }}
            </button>
          </div>
        </div>

        <!-- The wheel -->
        <div class="wc-wheel-stage">
          <div class="wc-wheel-pointer" aria-hidden="true"></div>
          <svg
            class="wc-wheel-svg"
            viewBox="0 0 300 300"
            :style="{ transform: `rotate(${wheelRotation}deg)` }"
            :class="{ 'wc-wheel-svg--spinning': spinning }"
          >
            <g v-if="wheelSegments.length">
              <path
                v-for="(seg, i) in wheelSegments"
                :key="seg.prize.id + i"
                :d="seg.path"
                :fill="seg.color"
                stroke="rgba(255,255,255,0.65)"
                stroke-width="1.5"
              />
              <text
                v-for="(seg, i) in wheelSegments"
                :key="'t' + seg.prize.id + i"
                :x="seg.labelX"
                :y="seg.labelY"
                fill="#ffffff"
                font-size="11"
                font-weight="800"
                text-anchor="middle"
                dominant-baseline="middle"
              >{{ truncate(seg.prize.name, 12) }}</text>
            </g>
            <circle v-else cx="150" cy="150" r="140" fill="var(--soft-bg)" />
          </svg>
          <div class="wc-wheel-hub" aria-hidden="true">🎁</div>
        </div>

        <!-- Result -->
        <Transition name="wc-pop">
          <div v-if="spinResult" class="wc-result">
            <div class="wc-result-confetti" aria-hidden="true">
              <span v-for="i in 26" :key="i" :style="confettiStyle(i)" />
            </div>
            <div class="wc-result-emoji">{{ prizeEmoji(spinResult.prizeType) }}</div>
            <h3 class="wc-result-title">{{ winnerProfile?.fullName || 'Winner' }} won</h3>
            <div class="wc-result-prize">{{ spinResult.name }}</div>
            <div class="wc-result-meta">
              <span>{{ monthLabel(selectedMonth) }}</span>
              <span>·</span>
              <span>Awarded {{ formatDate(new Date().toISOString()) }}</span>
            </div>
            <p class="wc-result-saved">✓ Result saved permanently &amp; winner notified.</p>
          </div>
        </Transition>
      </div>

      <template #footer>
        <button v-if="!spinResult" type="button" class="wc-btn-ghost" :disabled="spinning" @click="closeWheel">Cancel</button>
        <button
          v-if="!spinResult"
          type="button"
          class="wc-btn-primary wc-btn-spin"
          :disabled="spinning || selectedPoolPrizes.length < 2"
          @click="spin"
        >
          {{ spinning ? 'Spinning…' : 'Spin Wheel' }}
        </button>
        <button v-else type="button" class="wc-btn-primary" @click="closeWheel">Done</button>
      </template>
    </Modal>
  </div>

  <!-- ══ Access restricted ══ -->
  <div v-else class="wc-restricted">
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--status-needs-fix-fg, #dc2626)" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
    <h2>Access Restricted</h2>
    <p>The Winner Center is available only to Owner, Admin, and Head roles.</p>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import Modal from '@/components/ui/Modal.vue';
import MonthSelector from '@/components/board/MonthSelector.vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';
import { useWinnerCenterStore, type WinnerPrize, type MonthlyWinner } from '@/stores/winnerCenter';
import { useNotificationsStore } from '@/stores/notifications';
import { usePageRealtime, pushToast } from '@/services/realtimeService';
import { roleLabel } from '@/lib/roles';

const auth = useAuthStore();
const store = useWinnerCenterStore();
const notifications = useNotificationsStore();

usePageRealtime(['winner_center_prizes', 'winner_center_monthly_winners', 'winner_center_wheel_spins']);

// ── Month state ────────────────────────────────────────────────────────────────
const todayMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const selectedMonth = ref(todayMonth());

// ── Leaderboard review (reference data only) ────────────────────────────────────
interface LbRow {
  userId: string;
  fullName: string;
  avatarUrl: string;
  role: string;
  position: string;
  rank: number;
  totalPoints: number;
  approvedCount: number;
  submittedCount: number;
  followupsCount: number;
  needsFixCount: number;
  rejectedCount: number;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface LbRpcRow { member_id: string; full_name: string; avatar_url: string | null; role: string; total_points: number; approved_count: number; submitted_count: number; followups_count: number; needs_fix_count: number; rejected_count: number; rank: number; }

const leaderboardRows = ref<LbRow[]>([]);
const lbLoading = ref(true);
const lbError = ref('');

const profileMap = ref<Record<string, { fullName: string; avatarUrl: string; role: string; position: string }>>({});

const fetchProfiles = async () => {
  if (!supabaseConfigured) return;
  try {
    const { data, error } = await supabase
      .from('team_directory')
      .select('id, full_name, avatar_url, role, position');
    if (error) throw error;
    const next: typeof profileMap.value = {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any[] ?? []).forEach((p) => {
      next[p.id] = {
        fullName: p.full_name || 'Member',
        avatarUrl: p.avatar_url || '',
        role: p.role || 'member',
        position: p.position || ''
      };
    });
    profileMap.value = next;
  } catch (e) {
    console.warn('[winner-center] profile directory fetch failed', e);
  }
};

const loadLeaderboard = async () => {
  if (!supabaseConfigured) {
    lbError.value = 'Leaderboard is not configured.';
    lbLoading.value = false;
    return;
  }
  lbLoading.value = true;
  lbError.value = '';
  try {
    const { data, error } = await supabase.rpc('get_team_leaderboard', { p_month_key: selectedMonth.value });
    if (error) throw error;
    leaderboardRows.value = ((data ?? []) as LbRpcRow[]).map((r) => ({
      userId: r.member_id,
      fullName: r.full_name || 'Team member',
      avatarUrl: r.avatar_url || '',
      role: r.role || 'member',
      position: profileMap.value[r.member_id]?.position || '',
      rank: r.rank,
      totalPoints: r.total_points,
      approvedCount: r.approved_count,
      submittedCount: r.submitted_count,
      followupsCount: r.followups_count,
      needsFixCount: r.needs_fix_count,
      rejectedCount: r.rejected_count
    }));
  } catch (e: unknown) {
    console.error('[winner-center] get_team_leaderboard failed', e);
    lbError.value = e instanceof Error ? e.message : 'Could not load leaderboard.';
    leaderboardRows.value = [];
  } finally {
    lbLoading.value = false;
  }
};

const penalties = (row: LbRow) => row.needsFixCount + row.rejectedCount;

// ── Current winner derived state ────────────────────────────────────────────────
const currentWinner = computed(() => store.winnerForMonth(selectedMonth.value));
const activePrizes = computed(() => store.activePrizes);

const winnerProfile = computed(() => {
  const w = currentWinner.value;
  if (!w) return null;
  return profileMap.value[w.winnerUserId]
    ?? (() => {
      const row = leaderboardRows.value.find((r) => r.userId === w.winnerUserId);
      return row ? { fullName: row.fullName, avatarUrl: row.avatarUrl, role: row.role, position: row.position } : null;
    })();
});

const sortedHistory = computed(() =>
  [...store.winners].sort((a, b) => b.monthKey.localeCompare(a.monthKey))
);

const wonPrizeName = (w: MonthlyWinner): string => {
  if (w.prizeId) {
    const prize = store.prizes.find((p) => p.id === w.prizeId);
    if (prize) return prize.name;
  }
  // Fall back to the permanent spin log (survives prize deletion).
  const spin = store.spinsForMonth(w.monthKey)[0];
  return spin?.prizeName ?? '';
};

const selectedByLabel = (w: MonthlyWinner): string => {
  if (w.selectedBy && w.selectedBy === auth.user?.id) return 'you';
  return profileMap.value[w.selectedBy ?? '']?.fullName ?? 'Head';
};

const awardedDate = (w: MonthlyWinner): string => {
  const iso = w.prizeGivenAt || w.prizeSpunAt || w.selectedAt;
  return iso ? formatDate(iso) : '—';
};

// ── Select / change winner ───────────────────────────────────────────────────────
const buildSummary = (row: LbRow): string => {
  const parts: string[] = [];
  if (row.approvedCount) parts.push(`${row.approvedCount} approved task${row.approvedCount === 1 ? '' : 's'}`);
  if (row.submittedCount) parts.push(`${row.submittedCount} completed`);
  if (row.followupsCount) parts.push(`${row.followupsCount} followups`);
  if (!parts.length) return 'Recognised for outstanding monthly performance.';
  return `Top performer this month — ${parts.join(' · ')}.`;
};

const onSelectWinner = async (row: LbRow) => {
  const existing = currentWinner.value;
  if (existing && existing.winnerUserId === row.userId) return;
  if (existing) {
    const existingName = profileMap.value[existing.winnerUserId]?.fullName || 'the current winner';
    if (!confirm(`Replace ${existingName} with ${row.fullName} as ${monthLabel(selectedMonth.value)} winner? Any prize won this month will be reset.`)) return;
  }
  const winner = await store.selectWinner({
    monthKey: selectedMonth.value,
    winnerUserId: row.userId,
    scoreSnapshot: row.totalPoints,
    achievementSummary: buildSummary(row)
  });
  if (!winner) {
    pushToast('Could not select winner', store.error || 'Please try again.', 'warning');
    return;
  }
  pushToast('Winner selected', `${row.fullName} is the ${monthLabel(selectedMonth.value)} winner.`, 'success');
  void notifyWinnerSelected(row.userId);
};

const changeWinner = () => {
  scrollToReview();
  pushToast('Change winner', 'Pick a new winner from the leaderboard review below.', 'info');
};

const confirmMarkGiven = async () => {
  if (!currentWinner.value) return;
  const ok = await store.markPrizeGiven(selectedMonth.value);
  if (ok) pushToast('Prize delivered', 'Marked the prize as given.', 'success');
  else pushToast('Could not update', store.error || 'Please try again.', 'warning');
};

// ── Notifications ────────────────────────────────────────────────────────────────
const notifyWinnerSelected = async (userId: string) => {
  await notifications.createNotification({
    recipientId: userId,
    actorId: auth.user?.id,
    type: 'announcement',
    title: 'Congratulations!',
    message: "You were selected as this month's winner.",
    priority: 'high'
  });
};

const notifyPrizeAwarded = async (userId: string, prizeName: string) => {
  await notifications.createNotification({
    recipientId: userId,
    actorId: auth.user?.id,
    type: 'announcement',
    title: 'Prize Awarded',
    message: `You won ${prizeName} for ${monthLabel(selectedMonth.value)}.`,
    priority: 'high'
  });
};

// ── Prize library CRUD ─────────────────────────────────────────────────────────
const PRIZE_TYPES = [
  { value: 'bonus', label: 'Bonus' },
  { value: 'voucher', label: 'Voucher' },
  { value: 'leave', label: 'Leave' },
  { value: 'mystery', label: 'Mystery' },
  { value: 'reward', label: 'Reward' },
  { value: 'team', label: 'Team Reward' },
  { value: 'custom', label: 'Custom' }
];

const prizeModalOpen = ref(false);
const editingPrize = ref<WinnerPrize | null>(null);
const prizeSaving = ref(false);
const prizeError = ref('');
const prizeForm = ref({ name: '', description: '', prizeType: 'custom', quantity: 1, imageUrl: '', isActive: true });

const openCreatePrize = () => {
  editingPrize.value = null;
  prizeForm.value = { name: '', description: '', prizeType: 'custom', quantity: 1, imageUrl: '', isActive: true };
  prizeError.value = '';
  prizeModalOpen.value = true;
};

const openEditPrize = (prize: WinnerPrize) => {
  editingPrize.value = prize;
  prizeForm.value = {
    name: prize.name,
    description: prize.description,
    prizeType: prize.prizeType,
    quantity: prize.quantity,
    imageUrl: prize.imageUrl ?? '',
    isActive: prize.isActive
  };
  prizeError.value = '';
  prizeModalOpen.value = true;
};

const closePrizeModal = () => {
  prizeModalOpen.value = false;
  editingPrize.value = null;
};

const onSavePrize = async () => {
  if (!prizeForm.value.name.trim()) {
    prizeError.value = 'Prize name is required.';
    return;
  }
  prizeSaving.value = true;
  prizeError.value = '';
  const payload = {
    name: prizeForm.value.name.trim(),
    description: prizeForm.value.description.trim(),
    prizeType: prizeForm.value.prizeType,
    quantity: Math.max(0, Number(prizeForm.value.quantity) || 0),
    imageUrl: prizeForm.value.imageUrl.trim() || null,
    isActive: prizeForm.value.isActive
  };
  const result = editingPrize.value
    ? await store.updatePrize(editingPrize.value.id, payload)
    : await store.createPrize(payload);
  prizeSaving.value = false;
  if (!result) {
    prizeError.value = store.error || 'Could not save prize.';
    return;
  }
  pushToast(editingPrize.value ? 'Prize updated' : 'Prize created', payload.name, 'success');
  closePrizeModal();
};

const onDeletePrize = async () => {
  if (!editingPrize.value) return;
  if (!confirm(`Delete "${editingPrize.value.name}"? This cannot be undone.`)) return;
  prizeSaving.value = true;
  const ok = await store.deletePrize(editingPrize.value.id);
  prizeSaving.value = false;
  if (ok) {
    pushToast('Prize deleted', '', 'info');
    closePrizeModal();
  } else {
    prizeError.value = store.error || 'Could not delete prize.';
  }
};

// ── Prize Wheel ───────────────────────────────────────────────────────────────
const WHEEL_COLORS = ['#15D6C2', '#2563EB', '#0EA5B7', '#3B82F6', '#0891B2', '#14B8A6', '#1D4ED8', '#06B6D4', '#22D3EE', '#0E7490'];

const wheelOpen = ref(false);
const poolIds = ref<Set<string>>(new Set());
const spinning = ref(false);
const wheelRotation = ref(0);
const spinResult = ref<WinnerPrize | null>(null);

const selectedPoolPrizes = computed(() => activePrizes.value.filter((p) => poolIds.value.has(p.id)));

const openWheel = () => {
  if (activePrizes.value.length < 2) {
    pushToast('Not enough prizes', 'Add at least 2 active prizes before spinning.', 'warning');
    return;
  }
  poolIds.value = new Set(activePrizes.value.map((p) => p.id));
  spinResult.value = null;
  spinning.value = false;
  wheelRotation.value = 0;
  wheelOpen.value = true;
};

const closeWheel = () => {
  if (spinning.value) return;
  wheelOpen.value = false;
};

const togglePool = (id: string) => {
  const next = new Set(poolIds.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  poolIds.value = next;
};

// Point on a circle measured clockwise from the top (12 o'clock).
const pointAt = (angleDeg: number, radius: number) => {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: 150 + radius * Math.sin(rad), y: 150 - radius * Math.cos(rad) };
};

const wheelSegments = computed(() => {
  const list = selectedPoolPrizes.value;
  const n = list.length;
  if (n === 0) return [] as { prize: WinnerPrize; path: string; labelX: number; labelY: number; color: string }[];
  const seg = 360 / n;
  return list.map((prize, i) => {
    const start = i * seg;
    const end = (i + 1) * seg;
    const p1 = pointAt(start, 140);
    const p2 = pointAt(end, 140);
    const largeArc = seg > 180 ? 1 : 0;
    const mid = pointAt(start + seg / 2, n <= 2 ? 78 : 90);
    return {
      prize,
      path: `M150 150 L ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A140 140 0 ${largeArc} 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)} Z`,
      labelX: mid.x,
      labelY: mid.y,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length]
    };
  });
});

const spin = async () => {
  const list = selectedPoolPrizes.value;
  if (spinning.value || list.length < 2 || !currentWinner.value) return;
  spinning.value = true;
  spinResult.value = null;

  const n = list.length;
  const seg = 360 / n;
  const idx = Math.floor(Math.random() * n);
  const mid = idx * seg + seg / 2;          // clockwise from top
  const landing = (360 - mid) % 360;        // rotate the winning slice to the top pointer
  const fullSpins = 6;
  const base = wheelRotation.value - (wheelRotation.value % 360);
  wheelRotation.value = base + 360 * fullSpins + landing;

  const result = list[idx];
  // The CSS transition runs for 4.2s — finalize just after it settles.
  await new Promise((resolve) => setTimeout(resolve, 4350));

  const winner = currentWinner.value;
  if (!winner) {
    spinning.value = false;
    return;
  }
  const saved = await store.recordSpin({
    monthKey: selectedMonth.value,
    winnerUserId: winner.winnerUserId,
    prizeId: result.id,
    prizeName: result.name
  });
  spinning.value = false;
  if (!saved) {
    pushToast('Could not save result', store.error || 'Please try again.', 'warning');
    return;
  }
  spinResult.value = result;
  void notifyPrizeAwarded(winner.winnerUserId, result.name);
};

// ── Display helpers ───────────────────────────────────────────────────────────
const monthLabel = (key: string): string => {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatNumber = (v: number) => new Intl.NumberFormat().format(v);

const initials = (name: string) =>
  (name || '?').split(/[\s@.]+/).map((p) => p[0] ?? '').join('').slice(0, 2).toUpperCase();

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const statusLabel = (status: string) =>
  status === 'prize_given' ? 'Prize Given' : status === 'prize_spun' ? 'Prize Spun' : 'Selected';

const prettyType = (t: string) => PRIZE_TYPES.find((p) => p.value === t)?.label ?? (t.charAt(0).toUpperCase() + t.slice(1));

const prizeEmoji = (t: string): string => {
  switch (t) {
    case 'bonus': return '💵';
    case 'voucher': return '🎟️';
    case 'leave': return '🌴';
    case 'mystery': return '🎲';
    case 'team': return '🎊';
    case 'reward': return '🏅';
    default: return '🎁';
  }
};

const confettiStyle = (i: number) => {
  const colors = ['#15D6C2', '#2563EB', '#fbbf24', '#f472b6', '#34d399', '#a78bfa'];
  return {
    left: `${(i * 3.7) % 100}%`,
    background: colors[i % colors.length],
    animationDelay: `${(i % 8) * 0.07}s`,
    '--drift': `${((i % 5) - 2) * 18}px`
  } as Record<string, string>;
};

// ── Scroll to review ──────────────────────────────────────────────────────────
const reviewRef = ref<HTMLElement | null>(null);
const scrollToReview = () => {
  nextTick(() => reviewRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
};

// ── Lifecycle ───────────────────────────────────────────────────────────────────
watch(selectedMonth, loadLeaderboard);

onMounted(async () => {
  if (!auth.canAccessWinnerCenter) return;
  await fetchProfiles();
  await Promise.all([store.fetchAll(), loadLeaderboard()]);
});
</script>

<style scoped>
.wc-page { display: flex; flex-direction: column; gap: 1.4rem; padding-bottom: 3rem; }

/* ── Header ── */
.wc-header {
  display: flex; align-items: center; justify-content: space-between;
  gap: 1.25rem; flex-wrap: wrap;
  border: 1px solid var(--border); border-radius: 18px;
  background:
    radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 14%, transparent), transparent 34%),
    var(--card-bg);
  padding: 1.25rem; box-shadow: 0 14px 34px rgba(15, 23, 42, 0.06);
}
.wc-header-left { display: flex; align-items: center; gap: 1rem; min-width: 0; }
.wc-header-icon {
  display: flex; height: 3rem; width: 3rem; flex: 0 0 auto;
  align-items: center; justify-content: center; border-radius: 14px;
  background: color-mix(in srgb, var(--primary) 14%, var(--card-bg)); color: var(--primary);
}
.wc-header-icon svg { height: 1.5rem; width: 1.5rem; }
.wc-kicker {
  display: block; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif;
  font-size: 0.72rem; font-weight: 850; letter-spacing: 0.06em;
  text-transform: uppercase; color: var(--primary); margin-bottom: 0.2rem;
}
.wc-title { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.45rem; font-weight: 900; color: var(--text-main); line-height: 1.15; }
.wc-subtitle { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.85rem; }
.wc-header-right { display: flex; flex-direction: column; align-items: flex-end; gap: 0.6rem; }
.wc-header-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: flex-end; }

/* ── Buttons ── */
.wc-btn-primary, .wc-btn-ghost, .wc-btn-danger {
  display: inline-flex; align-items: center; gap: 0.45rem;
  padding: 0.5rem 0.95rem; border-radius: 11px; cursor: pointer;
  font-size: 0.82rem; font-weight: 700; border: 1px solid transparent;
  transition: transform 120ms ease, background 140ms, border-color 140ms, color 140ms, box-shadow 140ms;
}
.wc-btn-primary { background: var(--primary); color: #04201d; box-shadow: var(--shadow-primary); }
.wc-btn-primary:hover:not(:disabled) { background: var(--primary-hover); transform: translateY(-1px); }
.wc-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.wc-btn-ghost { background: var(--card-bg); color: var(--text-muted); border-color: var(--border); }
.wc-btn-ghost:hover { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); background: var(--primary-soft); }
.wc-btn-danger { background: rgba(220,38,38,0.1); color: #dc2626; border-color: rgba(220,38,38,0.2); margin-right: auto; }
.wc-btn-danger:hover:not(:disabled) { background: rgba(220,38,38,0.16); }

/* ── Cards ── */
.wc-card { border: 1px solid var(--border); border-radius: 18px; background: var(--card-bg); padding: 1.1rem 1.25rem; }
.wc-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
.wc-card-title { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.05rem; font-weight: 800; color: var(--text-main); }
.wc-card-sub { margin: 0.2rem 0 0; color: var(--text-muted); font-size: 0.82rem; max-width: 48rem; }
.wc-count { font-size: 0.76rem; color: var(--text-muted); font-weight: 600; white-space: nowrap; }

.wc-empty { text-align: center; color: var(--text-muted); font-size: 0.86rem; padding: 2rem 1rem; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; }

/* ── Selected Winner Card ── */
.wc-winner-card {
  position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;
  border: 1px solid color-mix(in srgb, var(--primary) 38%, var(--border)); border-radius: 22px;
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--primary) 18%, transparent), transparent 46%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, var(--card-bg)), var(--card-bg));
  padding: 1.5rem 1.6rem;
  box-shadow: 0 18px 44px color-mix(in srgb, var(--primary) 16%, transparent);
}
.wc-winner-glow { position: absolute; inset: 0; background: radial-gradient(circle at 80% -10%, color-mix(in srgb, var(--primary) 22%, transparent), transparent 40%); pointer-events: none; }
.wc-winner-crown { position: absolute; top: 0.85rem; left: 1.1rem; font-size: 1.5rem; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)); animation: wc-bob 3s ease-in-out infinite; }
.wc-winner-main { display: flex; align-items: center; gap: 1.25rem; min-width: 0; position: relative; z-index: 1; }
.wc-winner-avatar {
  flex: 0 0 auto; display: flex; align-items: center; justify-content: center;
  height: 5.5rem; width: 5.5rem; overflow: hidden; border-radius: 999px;
  background: var(--soft-bg); color: var(--primary);
  font-size: 1.5rem; font-weight: 900;
  border: 4px solid var(--primary); box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary) 18%, transparent);
}
.wc-winner-avatar img { width: 100%; height: 100%; object-fit: cover; }
.wc-winner-info { min-width: 0; }
.wc-winner-badge {
  display: inline-block; font-size: 0.68rem; font-weight: 850; text-transform: uppercase; letter-spacing: 0.05em;
  color: var(--primary); background: var(--primary-soft-strong); padding: 0.2rem 0.6rem; border-radius: 999px;
}
.wc-winner-name { margin: 0.4rem 0 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.6rem; font-weight: 900; color: var(--text-main); line-height: 1.1; }
.wc-winner-role { margin: 0.1rem 0 0; font-size: 0.85rem; color: var(--text-muted); font-weight: 600; }
.wc-winner-summary { margin: 0.5rem 0 0; font-size: 0.86rem; color: var(--text-main); max-width: 30rem; line-height: 1.45; }
.wc-winner-meta { display: flex; flex-wrap: wrap; gap: 0.9rem; margin-top: 0.7rem; font-size: 0.78rem; color: var(--text-muted); }
.wc-winner-meta strong { color: var(--text-main); font-size: 0.95rem; }
.wc-winner-side { display: flex; flex-direction: column; align-items: flex-end; gap: 0.8rem; position: relative; z-index: 1; }
.wc-winner-buttons { display: flex; flex-direction: column; gap: 0.5rem; align-items: stretch; }
.wc-winner-buttons .wc-btn-primary, .wc-winner-buttons .wc-btn-ghost { justify-content: center; }
.wc-btn-spin { font-size: 0.9rem; padding: 0.62rem 1.1rem; }
.wc-prize-won { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; text-align: right; }
.wc-prize-won-label { font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-soft); font-weight: 800; }
.wc-prize-won-name { font-size: 1.05rem; font-weight: 900; color: var(--text-main); }
.wc-given-note { display: inline-flex; align-items: center; gap: 0.35rem; font-size: 0.82rem; font-weight: 700; color: #16a34a; }

/* ── Status pills ── */
.wc-status-pill { display: inline-block; font-size: 0.66rem; font-weight: 800; border-radius: 999px; padding: 0.16rem 0.55rem; white-space: nowrap; }
.wc-status-selected { background: var(--primary-soft-strong); color: var(--primary); }
.wc-status-prize_spun { background: rgba(245,158,11,0.16); color: #d97706; }
.wc-status-prize_given { background: rgba(22,163,74,0.14); color: #16a34a; }

/* ── Leaderboard Review ── */
.wc-review-list { display: flex; flex-direction: column; gap: 0.5rem; }
.wc-review-row {
  display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 0.85rem;
  border: 1px solid var(--border); border-radius: 14px;
  background: color-mix(in srgb, var(--soft-bg) 40%, var(--card-bg)); flex-wrap: wrap;
}
.wc-review-row--winner { border-color: color-mix(in srgb, var(--primary) 50%, var(--border)); background: var(--primary-soft); }
.wc-review-rank { flex-shrink: 0; width: 1.7rem; text-align: center; font-weight: 800; color: var(--text-muted); font-size: 0.9rem; }
.wc-review-avatar {
  flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  height: 2.6rem; width: 2.6rem; overflow: hidden; border-radius: 999px;
  background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary);
  font-size: 0.8rem; font-weight: 800;
}
.wc-review-avatar img { width: 100%; height: 100%; object-fit: cover; }
.wc-review-id { flex: 1 1 9rem; min-width: 0; }
.wc-review-name { display: flex; align-items: center; gap: 0.4rem; font-weight: 700; color: var(--text-main); font-size: 0.9rem; }
.wc-review-tag { font-size: 0.6rem; font-weight: 800; background: var(--primary); color: #04201d; border-radius: 999px; padding: 0.05rem 0.4rem; text-transform: uppercase; letter-spacing: 0.03em; }
.wc-review-position { font-size: 0.74rem; color: var(--text-muted); margin-top: 0.1rem; }
.wc-review-stats { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.wc-stat { display: flex; flex-direction: column; align-items: center; min-width: 3.4rem; padding: 0.3rem 0.4rem; border-radius: 10px; background: var(--card-bg); border: 1px solid var(--border); }
.wc-stat strong { font-size: 0.95rem; font-weight: 800; color: var(--text-main); line-height: 1; }
.wc-stat span { font-size: 0.62rem; color: var(--text-soft); margin-top: 0.15rem; text-transform: uppercase; letter-spacing: 0.02em; }
.wc-stat--score { background: var(--primary-soft); border-color: color-mix(in srgb, var(--primary) 30%, var(--border)); }
.wc-stat--score strong { color: var(--primary); }
.wc-stat--warn strong { color: #d97706; }
.wc-select-btn {
  flex-shrink: 0; padding: 0.5rem 0.9rem; border-radius: 10px; cursor: pointer; font-size: 0.8rem; font-weight: 700;
  border: 1px solid var(--primary); background: var(--card-bg); color: var(--primary); transition: background 140ms, transform 120ms;
}
.wc-select-btn:hover { background: var(--primary); color: #04201d; transform: translateY(-1px); }
.wc-select-btn--active { background: var(--primary); color: #04201d; }

/* ── Skeleton ── */
.wc-skeleton-rows { display: flex; flex-direction: column; gap: 0.5rem; }
.wc-skeleton-row { height: 3.6rem; border-radius: 14px; background: color-mix(in srgb, var(--text-muted) 12%, transparent); animation: wc-pulse 1.3s ease-in-out infinite; }
@keyframes wc-pulse { 0%,100% { opacity: 0.5; } 50% { opacity: 1; } }

/* ── Prize Library ── */
.wc-prize-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.85rem; }
.wc-prize-card { position: relative; border: 1px solid var(--border); border-radius: 16px; background: var(--card-bg); padding: 1rem; display: flex; flex-direction: column; gap: 0.4rem; transition: border-color 140ms, box-shadow 140ms; }
.wc-prize-card:hover { border-color: color-mix(in srgb, var(--primary) 35%, var(--border)); box-shadow: var(--shadow-md); }
.wc-prize-card--inactive { opacity: 0.6; }
.wc-prize-top { display: flex; align-items: flex-start; justify-content: space-between; }
.wc-prize-thumb { display: flex; align-items: center; justify-content: center; height: 3rem; width: 3rem; border-radius: 12px; background: var(--primary-soft); font-size: 1.5rem; overflow: hidden; }
.wc-prize-thumb--img { background: var(--soft-bg); }
.wc-prize-thumb img { width: 100%; height: 100%; object-fit: cover; }
.wc-prize-edit { border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted); border-radius: 8px; width: 1.9rem; height: 1.9rem; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; }
.wc-prize-edit:hover { color: var(--primary); border-color: color-mix(in srgb, var(--primary) 40%, var(--border)); }
.wc-prize-name { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 800; color: var(--text-main); }
.wc-prize-desc { margin: 0; font-size: 0.76rem; color: var(--text-muted); line-height: 1.4; min-height: 2.1em; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wc-prize-foot { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; margin-top: 0.3rem; }
.wc-prize-type { font-size: 0.64rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.03em; color: var(--primary); background: var(--primary-soft); padding: 0.12rem 0.45rem; border-radius: 6px; }
.wc-prize-qty { font-size: 0.7rem; color: var(--text-muted); font-weight: 600; }
.wc-prize-state { margin-left: auto; font-size: 0.64rem; font-weight: 800; border-radius: 999px; padding: 0.1rem 0.45rem; }
.wc-prize-state--on { background: rgba(22,163,74,0.14); color: #16a34a; }
.wc-prize-state--off { background: var(--soft-bg); color: var(--text-soft); }

/* ── Winner History table ── */
.wc-history-wrap { overflow-x: auto; }
.wc-history { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
.wc-history th { text-align: left; padding: 0.55rem 0.7rem; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-soft); font-weight: 800; border-bottom: 1px solid var(--border); white-space: nowrap; }
.wc-history td { padding: 0.65rem 0.7rem; border-bottom: 1px solid var(--border); color: var(--text-main); vertical-align: middle; }
.wc-history tr:last-child td { border-bottom: none; }
.wc-history .wc-num { text-align: right; font-weight: 700; }
.wc-history-winner { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; }
.wc-history-avatar { flex-shrink: 0; display: flex; align-items: center; justify-content: center; height: 1.8rem; width: 1.8rem; overflow: hidden; border-radius: 999px; background: color-mix(in srgb, var(--primary) 12%, transparent); color: var(--primary); font-size: 0.62rem; font-weight: 800; }
.wc-history-avatar img { width: 100%; height: 100%; object-fit: cover; }

/* ── Forms ── */
.wc-form { display: flex; flex-direction: column; gap: 0.4rem; }
.wc-label { font-size: 0.74rem; font-weight: 700; color: var(--text-main); margin: 0.5rem 0 0.1rem; }
.wc-optional { color: var(--text-soft); font-weight: 500; }
.wc-input { width: 100%; border: 1px solid var(--border); border-radius: 10px; background: var(--card-bg); color: var(--text-main); padding: 0.55rem 0.7rem; font-size: 0.86rem; outline: none; }
.wc-input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-ring); }
.wc-textarea { resize: vertical; font-family: inherit; }
.wc-form-row { display: flex; gap: 0.75rem; }
.wc-form-col { flex: 1; display: flex; flex-direction: column; }
.wc-toggle { display: flex; align-items: center; gap: 0.5rem; margin-top: 0.7rem; font-size: 0.83rem; color: var(--text-main); cursor: pointer; }
.wc-toggle input { width: 1rem; height: 1rem; accent-color: var(--primary); }
.wc-error { margin: 0.6rem 0 0; color: #dc2626; font-size: 0.78rem; font-weight: 600; }

/* ── Prize Wheel ── */
.wc-wheel-modal { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
.wc-pool { width: 100%; }
.wc-pool-head { display: flex; align-items: baseline; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.wc-pool-head > span:first-child { font-weight: 800; color: var(--text-main); font-size: 0.85rem; }
.wc-pool-hint { font-size: 0.72rem; color: var(--text-muted); }
.wc-pool-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.wc-pool-chip { font-size: 0.76rem; font-weight: 700; border-radius: 999px; padding: 0.32rem 0.7rem; cursor: pointer; border: 1px solid var(--border); background: var(--card-bg); color: var(--text-muted); transition: all 130ms; }
.wc-pool-chip--on { border-color: var(--primary); background: var(--primary-soft); color: var(--primary); }
.wc-pool-chip:disabled { cursor: not-allowed; opacity: 0.6; }

.wc-wheel-stage { position: relative; width: 300px; max-width: 80vw; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; }
.wc-wheel-svg { width: 100%; height: 100%; border-radius: 999px; box-shadow: 0 14px 40px rgba(15,23,42,0.25), 0 0 0 6px var(--card-bg), 0 0 0 8px color-mix(in srgb, var(--primary) 40%, var(--border)); }
.wc-wheel-svg--spinning, .wc-wheel-svg { transition: transform 4.2s cubic-bezier(0.17, 0.67, 0.16, 1); }
.wc-wheel-pointer { position: absolute; top: -6px; left: 50%; transform: translateX(-50%); width: 0; height: 0; border-left: 14px solid transparent; border-right: 14px solid transparent; border-top: 24px solid var(--primary); z-index: 3; filter: drop-shadow(0 2px 3px rgba(0,0,0,0.3)); }
.wc-wheel-hub { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 3.4rem; height: 3.4rem; border-radius: 999px; background: var(--card-bg); display: flex; align-items: center; justify-content: center; font-size: 1.4rem; box-shadow: 0 2px 8px rgba(0,0,0,0.2); border: 3px solid color-mix(in srgb, var(--primary) 40%, var(--border)); z-index: 2; }
@media (prefers-reduced-motion: reduce) { .wc-wheel-svg { transition: transform 0.6s ease; } }

/* ── Result ── */
.wc-result { position: relative; text-align: center; width: 100%; padding: 0.5rem 0; overflow: hidden; }
.wc-result-emoji { font-size: 2.6rem; animation: wc-bob 2.4s ease-in-out infinite; }
.wc-result-title { margin: 0.3rem 0 0; font-size: 0.95rem; font-weight: 700; color: var(--text-muted); }
.wc-result-prize { font-family: 'Raleway', 'Google Sans', sans-serif; font-size: 1.8rem; font-weight: 900; color: var(--primary); margin-top: 0.1rem; }
.wc-result-meta { display: flex; align-items: center; justify-content: center; gap: 0.4rem; font-size: 0.78rem; color: var(--text-muted); margin-top: 0.3rem; }
.wc-result-saved { margin: 0.7rem 0 0; font-size: 0.78rem; font-weight: 700; color: #16a34a; }
.wc-result-confetti { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.wc-result-confetti span { position: absolute; top: -12px; width: 8px; height: 12px; border-radius: 2px; opacity: 0; animation: wc-confetti 1.5s ease-in forwards; }
@keyframes wc-confetti { 0% { opacity: 0; transform: translateY(-10px) rotate(0); } 12% { opacity: 1; } 100% { opacity: 0; transform: translate(var(--drift), 220px) rotate(540deg); } }
@keyframes wc-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }

.wc-pop-enter-active { transition: opacity 240ms ease, transform 240ms cubic-bezier(0.34,1.3,0.5,1); }
.wc-pop-enter-from { opacity: 0; transform: scale(0.9); }

/* ── Access restricted ── */
.wc-restricted { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem; padding: 5rem 1.5rem; text-align: center; }
.wc-restricted h2 { margin: 0.6rem 0 0; font-size: 1.15rem; font-weight: 800; color: var(--text-main); }
.wc-restricted p { margin: 0; font-size: 0.86rem; color: var(--text-muted); max-width: 24rem; }

/* ── Responsive ── */
@media (max-width: 720px) {
  .wc-header-right { width: 100%; align-items: stretch; }
  .wc-header-actions { justify-content: stretch; }
  .wc-header-actions .wc-btn-primary, .wc-header-actions .wc-btn-ghost { flex: 1; justify-content: center; }
  .wc-winner-card { flex-direction: column; align-items: stretch; }
  .wc-winner-main { flex-direction: column; text-align: center; }
  .wc-winner-info { text-align: center; }
  .wc-winner-meta { justify-content: center; }
  .wc-winner-side { align-items: stretch; }
  .wc-winner-buttons { flex-direction: row; }
  .wc-winner-buttons > * { flex: 1; }
  .wc-prize-won { align-items: center; text-align: center; }
  .wc-review-row { gap: 0.6rem; }
  .wc-review-stats { width: 100%; justify-content: space-between; }
  .wc-select-btn { width: 100%; }

  /* Stacked history "cards" on mobile */
  .wc-history thead { display: none; }
  .wc-history, .wc-history tbody, .wc-history tr, .wc-history td { display: block; width: 100%; }
  .wc-history tr { border: 1px solid var(--border); border-radius: 12px; margin-bottom: 0.6rem; padding: 0.3rem 0.6rem; }
  .wc-history td { border-bottom: 1px solid color-mix(in srgb, var(--border) 60%, transparent); display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .wc-history td:last-child { border-bottom: none; }
  .wc-history td::before { content: attr(data-label); font-size: 0.66rem; text-transform: uppercase; letter-spacing: 0.03em; color: var(--text-soft); font-weight: 800; }
  .wc-history .wc-num { text-align: right; }
}
</style>
