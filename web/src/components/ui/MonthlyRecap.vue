<template>
  <Teleport to="body">
    <Transition name="rc-fade">
      <div v-if="open" class="rc-overlay" :class="`rc-theme-${step}`">
        <!-- Animated background blobs -->
        <div class="rc-blobs" aria-hidden="true"><span /><span /><span /></div>

        <!-- Confetti on celebratory slides -->
        <div v-if="step === TOTAL || step === 6" class="rc-confetti" aria-hidden="true">
          <span v-for="i in 24" :key="i" :style="{ '--i': i }" />
        </div>

        <!-- Progress dots -->
        <div class="rc-progress">
          <span v-for="n in TOTAL" :key="n" class="rc-dot" :class="{ 'rc-dot--on': n <= step }" />
        </div>

        <button class="rc-skip" type="button" @click="skip">{{ $t('Skip') }}</button>

        <!-- Slides -->
        <div class="rc-stage" @click="next">
          <Transition name="rc-slide" mode="out-in">
            <!-- 1 · Intro -->
            <div v-if="step === 1" key="1" class="rc-slide">
              <div class="rc-emoji rc-emoji--pop">{{ $t('📅✨') }}</div>
              <h2 class="rc-h">{{ monthLabel }}, in review</h2>
              <p class="rc-p">{{ $t('Grab a coffee ☕ — let\'s relive what you pulled off,') }} <strong>{{ stats?.firstName }}</strong> {{ $t('👀') }}</p>
              <span class="rc-hint">{{ $t('tap to continue →') }}</span>
            </div>

            <!-- 2 · Tasks -->
            <div v-else-if="step === 2" key="2" class="rc-slide">
              <p class="rc-kicker">{{ $t('🗂️ Your tasks') }}</p>
              <h2 class="rc-h">{{ $t('You shipped real work') }}</h2>
              <div class="rc-stat-row">
                <div class="rc-stat">
                  <span class="rc-num">{{ aApproved }}</span>
                  <span class="rc-num-label">{{ $t('✅ approved') }}</span>
                </div>
                <div class="rc-stat">
                  <span class="rc-num">{{ aSubmitted }}</span>
                  <span class="rc-num-label">{{ $t('📤 submitted') }}</span>
                </div>
              </div>
              <p class="rc-p">{{ workLine }}</p>
              <span class="rc-hint">{{ $t('tap to continue →') }}</span>
            </div>

            <!-- 3 · Followups -->
            <div v-else-if="step === 3" key="3" class="rc-slide">
              <p class="rc-kicker">{{ $t('🧰 Staying on top') }}</p>
              <div class="rc-bignum">{{ aFollowups }}</div>
              <h2 class="rc-h">{{ $t('followups completed') }}</h2>
              <p class="rc-p">{{ followupLine }}</p>
              <span class="rc-hint">{{ $t('tap to continue →') }}</span>
            </div>

            <!-- 4 · Score -->
            <div v-else-if="step === 4" key="4" class="rc-slide">
              <p class="rc-kicker">{{ $t('⚡ Your score') }}</p>
              <div class="rc-bignum rc-bignum--glow">{{ aPoints }}</div>
              <h2 class="rc-h">{{ $t('points earned') }}</h2>
              <p class="rc-tier">{{ scoreTier }}</p>
              <p class="rc-trend">{{ trendLine }}</p>
              <p class="rc-rankline">{{ rankLine }}</p>
              <span class="rc-hint">{{ $t('tap to continue →') }}</span>
            </div>

            <!-- 5 · Team total -->
            <div v-else-if="step === 5" key="5" class="rc-slide">
              <p class="rc-kicker">{{ $t('🌍 Together as a team') }}</p>
              <h2 class="rc-h">{{ $t('The whole squad delivered') }}</h2>
              <div class="rc-stat-row">
                <div class="rc-stat">
                  <span class="rc-num">{{ aTeamApproved }}</span>
                  <span class="rc-num-label">{{ $t('✅ tasks approved') }}</span>
                </div>
                <div class="rc-stat">
                  <span class="rc-num">{{ aTeamPoints }}</span>
                  <span class="rc-num-label">{{ $t('⚡ team points') }}</span>
                </div>
              </div>
              <p class="rc-p">{{ $t('You\'re a real part of that total. Teamwork makes the dream work 🤝') }}</p>
              <span class="rc-hint">{{ $t('tap to continue →') }}</span>
            </div>

            <!-- 6 · Title reveal -->
            <div v-else-if="step === 6" key="6" class="rc-slide">
              <div class="rc-sparkles" aria-hidden="true"><span>⭐</span><span>✨</span><span>{{ $t('🎉') }}</span><span>{{ $t('💫') }}</span></div>
              <p class="rc-kicker">🏷️ Your {{ monthLabel }} title</p>
              <div class="rc-badge-emoji rc-emoji--pop">{{ badge.emoji }}</div>
              <h2 class="rc-h rc-badge-title">{{ badge.title }}</h2>
              <p class="rc-p">{{ badge.sub }}</p>
              <button class="rc-copy" type="button" @click.stop="copyTitle">
                {{ copied ? 'Copied! ✅' : '📋 Copy my title' }}
              </button>
              <span class="rc-hint">{{ $t('tap to continue →') }}</span>
            </div>

            <!-- 7 · Thank you -->
            <div v-else key="7" class="rc-slide">
              <div class="rc-emoji rc-emoji--beat">{{ $t('🙌💙') }}</div>
              <h2 class="rc-h">{{ $t('Every task moved the team forward.') }}</h2>
              <p class="rc-p">Consistent, real work is how great websites get built — and how clients stay happy. Thank you for showing up, {{ stats?.firstName }}. 🚀</p>
              <p class="rc-p rc-p--small">{{ $t('New month, fresh slate. Let\'s make it your best one yet. 🌟') }}</p>
              <button class="rc-cta" type="button" @click.stop="finish">{{ $t('See who won 🏆') }}</button>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { supabase, supabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/auth';

const auth = useAuthStore();

const TOTAL = 7;
const open = ref(false);
const step = ref(1);
const preview = ref(false);
const copied = ref(false);

interface Stats {
  approved: number; submitted: number; followups: number; points: number;
  rank: number; total: number; firstName: string;
  teamApproved: number; teamPoints: number; prevPoints: number | null;
}
const stats = ref<Stats | null>(null);

// Animated counters
const aApproved = ref(0);
const aSubmitted = ref(0);
const aFollowups = ref(0);
const aPoints = ref(0);
const aTeamApproved = ref(0);
const aTeamPoints = ref(0);

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthKeyBack = (n: number) => {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - n);
  return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: MONTH_NAMES[d.getMonth()] };
};
const prev = monthKeyBack(1);
const prevPrev = monthKeyBack(2);
const monthLabel = ref(prev.label);

const seenKey = () => `kiuq-monthly-recap-seen:${auth.user?.id ?? 'anon'}:${prev.key}`;
const rankLine = ref('');

// ── Dynamic, stat-aware copy ──────────────────────────────────────────────────
const workLine = computed(() => {
  const s = stats.value; if (!s) return '';
  const total = s.approved + s.submitted;
  if (total === 0) return 'Fresh slate this month — your wins are loading. 🌱';
  if (s.approved >= 10) return `${s.approved} approvals?! You were unstoppable. 🔥`;
  if (total >= 5) return `That's ${total} tasks you pushed forward. Solid grind! 💪`;
  return `Every one of those ${total} counts. Keep stacking them. 🧱`;
});
const followupLine = computed(() => {
  const f = stats.value?.followups ?? 0;
  if (f === 0) return 'A fresh start on followups awaits this month. 🌅';
  if (f >= 10) return 'Followup machine — clients love this consistency. 🤝';
  if (f >= 4) return 'Nice and steady. Upkeep keeps sites healthy. 🧰';
  return 'Every check keeps a website happy. 🌿';
});
const scoreTier = computed(() => {
  const p = stats.value?.points ?? 0;
  if (p >= 150) return '🔥🔥 Absolutely on fire!';
  if (p >= 80) return '👏 Strong, strong month!';
  if (p >= 30) return '💪 Great grind — momentum is building!';
  if (p > 0) return '🌱 Every point is a step forward!';
  return '🌅 A brand new month to shine!';
});
const trendLine = computed(() => {
  const s = stats.value; if (!s) return '';
  if (s.prevPoints === null) return '✨ Your first scored month — welcome to the board!';
  const d = s.points - s.prevPoints;
  if (d > 0) return `📈 +${d} points vs last month — you're climbing!`;
  if (d < 0) return `📉 ${Math.abs(d)} fewer than last month — bounce-back time! 💪`;
  return '➡️ Right on par with last month — steady hands!';
});
const badge = computed(() => {
  const s = stats.value;
  if (!s) return { emoji: '🌟', title: 'Team Player', sub: 'Part of what makes this team work.' };
  if (s.rank === 1) return { emoji: '👑', title: 'Team MVP', sub: `#1 on the entire team for ${monthLabel.value}. Royalty. 👑` };
  const max = Math.max(s.approved, s.submitted, s.followups);
  if (max === 0) return { emoji: '🌅', title: 'The Comeback Kid', sub: 'Your breakout month is loading… this is your sign. 💫' };
  if (s.approved === max) return { emoji: '🎯', title: 'The Closer', sub: 'You get work over the line and approved.' };
  if (s.followups === max) return { emoji: '🤝', title: 'Followup Hero', sub: 'Always on top of the upkeep. Clients adore you.' };
  return { emoji: '⚙️', title: 'The Machine', sub: 'You keep the whole pipeline moving.' };
});

const animateNumber = (target: number, setter: (n: number) => void, dur = 900) => {
  const start = performance.now();
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    setter(Math.round(target * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

watch(step, (s) => {
  if (!stats.value) return;
  if (s === 2) {
    animateNumber(stats.value.approved, (v) => (aApproved.value = v));
    animateNumber(stats.value.submitted, (v) => (aSubmitted.value = v));
  } else if (s === 3) {
    animateNumber(stats.value.followups, (v) => (aFollowups.value = v));
  } else if (s === 4) {
    animateNumber(stats.value.points, (v) => (aPoints.value = v));
  } else if (s === 5) {
    animateNumber(stats.value.teamApproved, (v) => (aTeamApproved.value = v));
    animateNumber(stats.value.teamPoints, (v) => (aTeamPoints.value = v));
  }
});

interface Row { member_id: string; full_name: string; total_points: number; rank: number; approved_count: number; submitted_count: number; followups_count: number }
const fetchRows = async (key: string): Promise<Row[]> => {
  const { data, error } = await supabase.rpc('get_team_leaderboard', { p_month_key: key });
  if (error) throw error;
  return (Array.isArray(data) ? data : []) as Row[];
};

const buildStats = (mine: Row, rows: Row[], prevPoints: number | null): Stats => ({
  approved: mine.approved_count,
  submitted: mine.submitted_count,
  followups: mine.followups_count,
  points: mine.total_points,
  rank: mine.rank,
  total: rows.length,
  firstName: (mine.full_name || 'there').split(/\s+/)[0],
  teamApproved: rows.reduce((a, r) => a + r.approved_count, 0),
  teamPoints: rows.reduce((a, r) => a + r.total_points, 0),
  prevPoints,
});
const setRankLine = (rank: number, total: number, sample = false) => {
  rankLine.value = rank <= 3
    ? `🏅 Top ${rank} on the team — incredible!${sample ? ' (sample)' : ''}`
    : `You finished #${rank} of ${total} — every bit counts! 💪`;
};

const loadMine = async () => {
  const rows = await fetchRows(prev.key);
  const mine = rows.find((r) => r.member_id === auth.user?.id);
  if (!mine) return null;
  let prevPoints: number | null = null;
  try {
    const prevRows = await fetchRows(prevPrev.key);
    const myPrev = prevRows.find((r) => r.member_id === auth.user?.id);
    prevPoints = myPrev ? myPrev.total_points : null;
  } catch { prevPoints = null; }
  return buildStats(mine, rows, prevPoints);
};

const checkAuto = async () => {
  if (!supabaseConfigured || !auth.user?.id) return;
  if (localStorage.getItem(seenKey()) === '1') return;
  try {
    const s = await loadMine();
    if (!s) return; // not a leaderboard participant (e.g. admin)
    stats.value = s;
    setRankLine(s.rank, s.total);
    step.value = 1;
    open.value = true;
  } catch (e) {
    console.error('[monthly-recap] load failed', e);
  }
};

const markSeen = () => { if (auth.user?.id) localStorage.setItem(seenKey(), '1'); };

const next = () => { if (step.value < TOTAL) step.value += 1; else finish(); };

const finish = () => {
  if (!preview.value) markSeen();
  open.value = false;
  window.dispatchEvent(new Event(preview.value ? 'open-winners-banner' : 'show-winners-banner'));
};

const skip = () => {
  if (!preview.value) markSeen();
  open.value = false;
};

const copyTitle = async () => {
  const s = stats.value; if (!s) return;
  const text = `I'm ${badge.value.emoji} ${badge.value.title} for ${monthLabel.value} on KiuQ! ${s.approved} approved · ${s.points} pts 🚀`;
  try { await navigator.clipboard.writeText(text); copied.value = true; setTimeout(() => (copied.value = false), 1800); } catch { /* ignore */ }
};

// Admin/head preview — viewer's own stats, or a sample.
const openPreview = async () => {
  preview.value = true;
  try {
    const s = await loadMine();
    if (s) {
      stats.value = s;
      setRankLine(s.rank, s.total);
    } else {
      stats.value = { approved: 11, submitted: 14, followups: 6, points: 192, rank: 1, total: 4, firstName: (auth.profile?.fullName || 'there').split(/\s+/)[0], teamApproved: 34, teamPoints: 540, prevPoints: 150 };
      setRankLine(1, 4, true);
    }
  } catch {
    stats.value = { approved: 11, submitted: 14, followups: 6, points: 192, rank: 1, total: 4, firstName: 'there', teamApproved: 34, teamPoints: 540, prevPoints: 150 };
    setRankLine(1, 4, true);
  }
  aApproved.value = 0; aSubmitted.value = 0; aFollowups.value = 0; aPoints.value = 0; aTeamApproved.value = 0; aTeamPoints.value = 0;
  step.value = 1;
  open.value = true;
};

const onPreviewEvent = () => { void openPreview(); };

onMounted(() => {
  window.addEventListener('preview-monthly-recap', onPreviewEvent);
  void checkAuto();
});
onBeforeUnmount(() => window.removeEventListener('preview-monthly-recap', onPreviewEvent));
</script>

<style scoped>
.rc-overlay {
  position: fixed;
  inset: 0;
  z-index: 320;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  color: #f8fbff;
  background-size: 220% 220%;
  animation: rc-flow 16s ease-in-out infinite;
  transition: background 600ms ease;
}
@keyframes rc-flow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
/* Per-step gradient themes */
.rc-theme-1 { background: linear-gradient(150deg, #1e3a8a, #15D6C2 55%, #6366f1); }
.rc-theme-2 { background: linear-gradient(150deg, #065f46, #10b981 55%, #14b8a6); }
.rc-theme-3 { background: linear-gradient(150deg, #155e75, #06b6d4 55%, #22d3ee); }
.rc-theme-4 { background: linear-gradient(150deg, #7c2d12, #f59e0b 55%, #fbbf24); }
.rc-theme-5 { background: linear-gradient(150deg, #1e3a8a, #6366f1 55%, #8b5cf6); }
.rc-theme-6 { background: linear-gradient(150deg, #581c87, #a855f7 55%, #d946ef); }
.rc-theme-7 { background: linear-gradient(150deg, #9d174d, #ec4899 55%, #fb7185); }

/* Floating blobs */
.rc-blobs { position: absolute; inset: 0; pointer-events: none; }
.rc-blobs span {
  position: absolute; border-radius: 999px; filter: blur(40px); opacity: 0.35;
  background: rgba(248,251,255,0.6);
  animation: rc-drift 9s ease-in-out infinite;
}
.rc-blobs span:nth-child(1) { width: 280px; height: 280px; top: -60px; left: -40px; animation-delay: 0s; }
.rc-blobs span:nth-child(2) { width: 220px; height: 220px; bottom: -50px; right: -30px; animation-delay: 2s; background: rgba(248,251,255,0.4); }
.rc-blobs span:nth-child(3) { width: 180px; height: 180px; top: 40%; right: 20%; animation-delay: 4s; background: rgba(248,251,255,0.3); }
@keyframes rc-drift {
  0%   { transform: translate(0,0) scale(1) rotate(0deg); }
  33%  { transform: translate(28px,-32px) scale(1.16) rotate(40deg); }
  66%  { transform: translate(-22px,20px) scale(0.94) rotate(-28deg); }
  100% { transform: translate(0,0) scale(1) rotate(0deg); }
}

/* Confetti */
.rc-confetti { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.rc-confetti span {
  position: absolute; top: -16px; width: 9px; height: 16px; border-radius: 2px; opacity: 0;
  left: calc(var(--i) * 4.1%);
  background: hsl(calc(var(--i) * 31deg), 90%, 62%);
  animation: rc-fall 3s ease-in calc(var(--i) * 0.06s) infinite;
}
.rc-confetti span:nth-child(3n) { border-radius: 50%; width: 10px; height: 10px; }
.rc-confetti span:nth-child(4n) { width: 6px; height: 18px; }
@keyframes rc-fall {
  0%   { opacity: 0; transform: translate(0, -10px) rotate(0); }
  10%  { opacity: 1; }
  100% { opacity: 0; transform: translate(calc(var(--i) * 0.7px - 20px), 106vh) rotate(640deg); }
}

/* Sparkles (title slide) */
.rc-sparkles { position: absolute; inset: -2rem 0 auto; pointer-events: none; }
.rc-sparkles span { position: absolute; font-size: 1.6rem; opacity: 0; animation: rc-spark 2.2s ease-in-out infinite; }
.rc-sparkles span:nth-child(1) { left: 14%; top: 0; animation-delay: 0s; }
.rc-sparkles span:nth-child(2) { right: 16%; top: 1rem; animation-delay: 0.5s; }
.rc-sparkles span:nth-child(3) { left: 24%; top: 3rem; animation-delay: 1s; }
.rc-sparkles span:nth-child(4) { right: 26%; top: 2.4rem; animation-delay: 1.5s; }
@keyframes rc-spark { 0%,100% { opacity: 0; transform: scale(0.6) translateY(6px); } 50% { opacity: 0.9; transform: scale(1.1) translateY(-6px); } }

/* Progress dots */
.rc-progress { position: absolute; top: 1.4rem; left: 50%; transform: translateX(-50%); display: flex; gap: 0.35rem; z-index: 3; }
.rc-dot { width: 1.5rem; height: 0.34rem; border-radius: 999px; background: rgba(248,251,255,0.3); transition: background 300ms ease; }
.rc-dot--on { background: #f8fbff; box-shadow: 0 0 10px rgba(248,251,255,0.75); }

.rc-skip {
  position: absolute; top: 1.2rem; right: 1.3rem; z-index: 3;
  border: none; background: rgba(248,251,255,0.18); color: #f8fbff;
  font-size: 0.78rem; font-weight: 700; border-radius: 999px; padding: 0.35rem 0.9rem; cursor: pointer;
  backdrop-filter: blur(4px); transition: background 140ms;
}
.rc-skip:hover { background: rgba(248,251,255,0.3); }

/* Stage */
.rc-stage { position: relative; z-index: 2; width: min(580px, 90vw); text-align: center; cursor: pointer; }
.rc-slide { position: relative; display: flex; flex-direction: column; align-items: center; gap: 0.55rem; }

/* Cascade every slide's content in on mount (each slide remounts per step) */
.rc-slide > * { animation: rc-in 0.55s cubic-bezier(0.16,1,0.3,1) both; }
.rc-slide > *:nth-child(1) { animation-delay: 0.04s; }
.rc-slide > *:nth-child(2) { animation-delay: 0.12s; }
.rc-slide > *:nth-child(3) { animation-delay: 0.2s; }
.rc-slide > *:nth-child(4) { animation-delay: 0.28s; }
.rc-slide > *:nth-child(5) { animation-delay: 0.36s; }
.rc-slide > *:nth-child(6) { animation-delay: 0.44s; }
@keyframes rc-in { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }

.rc-emoji { font-size: 4.2rem; line-height: 1; }
.rc-emoji--pop { animation: rc-pop 0.7s cubic-bezier(0.34,1.56,0.64,1) both; }
.rc-emoji--beat { animation: rc-beat 1.4s ease-in-out infinite; }
@keyframes rc-pop {
  0%  { transform: scale(0.2) rotate(-20deg); opacity: 0; }
  55% { transform: scale(1.22) rotate(8deg); opacity: 1; }
  78% { transform: scale(0.94) rotate(-3deg); }
  100% { transform: none; opacity: 1; }
}
@keyframes rc-beat { 0%,100% { transform: scale(1); } 25% { transform: scale(1.18); } 40% { transform: scale(1.02); } 60% { transform: scale(1.12); } }

.rc-kicker { margin: 0; font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 0.8rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9; }
.rc-h { margin: 0; font-family: 'Raleway', 'Google Sans', sans-serif; font-size: clamp(1.5rem, 5vw, 2.2rem); font-weight: 900; line-height: 1.12; text-shadow: 0 2px 16px rgba(0,0,0,0.18); }
.rc-p { margin: 0.3rem 0 0; font-size: 1rem; line-height: 1.5; opacity: 0.96; max-width: 32rem; }
.rc-p--small { font-size: 0.86rem; opacity: 0.82; }
.rc-p strong { font-weight: 800; }
.rc-tier { margin: 0.4rem 0 0; font-size: 1.15rem; font-weight: 900; text-shadow: 0 2px 10px rgba(0,0,0,0.2); }
.rc-trend { margin: 0.2rem 0 0; font-size: 0.95rem; font-weight: 800; opacity: 0.96; }
.rc-rankline { margin: 0.2rem 0 0; font-size: 0.98rem; font-weight: 700; opacity: 0.95; }

/* Stats */
.rc-stat-row { display: flex; gap: 2rem; margin-top: 1.3rem; flex-wrap: wrap; justify-content: center; }
.rc-stat { display: flex; flex-direction: column; align-items: center; animation: rc-rise 0.5s cubic-bezier(0.16,1,0.3,1) both; }
.rc-stat:nth-child(2) { animation-delay: 0.16s; }
@keyframes rc-rise {
  0%  { transform: translateY(24px) scale(0.9); opacity: 0; }
  60% { transform: translateY(-5px) scale(1.05); opacity: 1; }
  100% { transform: none; opacity: 1; }
}
.rc-num { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: clamp(2.8rem, 10vw, 4.4rem); font-weight: 900; line-height: 1; text-shadow: 0 4px 20px rgba(0,0,0,0.22); }
.rc-num-label { margin-top: 0.2rem; font-size: 0.86rem; font-weight: 700; opacity: 0.92; }
.rc-bignum { font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: clamp(4rem, 17vw, 7.5rem); font-weight: 900; line-height: 1; text-shadow: 0 6px 28px rgba(0,0,0,0.25); animation: rc-pop 0.5s cubic-bezier(0.16,1,0.3,1); }
.rc-bignum--glow {
  text-shadow: 0 0 36px rgba(248,251,255,0.55), 0 6px 28px rgba(0,0,0,0.25);
  animation: rc-pop 0.5s cubic-bezier(0.16,1,0.3,1), rc-glow 2.4s ease-in-out 0.5s infinite;
}
@keyframes rc-glow {
  0%,100% { text-shadow: 0 0 24px rgba(248,251,255,0.4), 0 6px 28px rgba(0,0,0,0.25); }
  50%     { text-shadow: 0 0 54px rgba(248,251,255,0.82), 0 6px 28px rgba(0,0,0,0.25); }
}

/* Badge / title */
.rc-badge-emoji { font-size: 5rem; line-height: 1; filter: drop-shadow(0 6px 18px rgba(0,0,0,0.3)); }
.rc-badge-title { font-size: clamp(1.8rem, 6vw, 2.6rem); letter-spacing: -0.01em; }
.rc-copy {
  margin-top: 0.9rem; border: 1.5px solid rgba(248,251,255,0.55); cursor: pointer;
  padding: 0.45rem 1.1rem; border-radius: 999px; background: rgba(248,251,255,0.14); color: #f8fbff;
  font-size: 0.82rem; font-weight: 800; backdrop-filter: blur(4px); transition: background 140ms, transform 140ms;
}
.rc-copy:hover { background: rgba(248,251,255,0.26); transform: translateY(-1px); }

.rc-hint { margin-top: 1.4rem; font-size: 0.72rem; font-weight: 600; opacity: 0.7; letter-spacing: 0.03em; animation: rc-pulse 1.8s ease-in-out infinite, rc-nudge 1.4s ease-in-out infinite; }
@keyframes rc-pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 0.85; } }
@keyframes rc-nudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(5px); } }

.rc-cta {
  position: relative; overflow: hidden;
  margin-top: 1.5rem; border: none; cursor: pointer;
  padding: 0.85rem 1.8rem; border-radius: 999px;
  background: #f8fbff; color: #111827;
  font-family: 'Jost Numbers', 'Google Sans', Arial, sans-serif; font-size: 1rem; font-weight: 800;
  box-shadow: 0 10px 30px rgba(0,0,0,0.28);
  transition: transform 140ms ease, box-shadow 140ms ease;
  animation: rc-cta-pulse 2s ease-in-out infinite;
}
.rc-cta::after {
  content: ''; position: absolute; top: 0; left: -60%; width: 45%; height: 100%;
  background: linear-gradient(100deg, transparent, rgba(248,251,255,0.85), transparent);
  transform: skewX(-20deg); animation: rc-shimmer 2.6s ease-in-out infinite;
}
.rc-cta:hover { transform: translateY(-2px) scale(1.05); box-shadow: 0 16px 42px rgba(0,0,0,0.34); }
@keyframes rc-cta-pulse { 0%,100% { box-shadow: 0 10px 30px rgba(0,0,0,0.28); } 50% { box-shadow: 0 14px 42px rgba(248,251,255,0.4); } }
@keyframes rc-shimmer { 0% { left: -60%; } 55%,100% { left: 130%; } }

/* Transitions */
.rc-fade-enter-active, .rc-fade-leave-active { transition: opacity 250ms ease; }
.rc-fade-enter-from, .rc-fade-leave-to { opacity: 0; }
.rc-slide-enter-active { transition: opacity 0.4s ease, transform 0.55s cubic-bezier(0.16,1,0.3,1), filter 0.45s ease; }
.rc-slide-leave-active { transition: opacity 0.28s ease, transform 0.34s ease, filter 0.3s ease; }
.rc-slide-enter-from { opacity: 0; transform: translateY(34px) scale(0.92); filter: blur(8px); }
.rc-slide-leave-to { opacity: 0; transform: translateY(-26px) scale(0.96); filter: blur(5px); }

@media (prefers-reduced-motion: reduce) {
  .rc-overlay,
  .rc-blobs span, .rc-confetti span, .rc-sparkles span,
  .rc-emoji--pop, .rc-emoji--beat, .rc-bignum, .rc-bignum--glow,
  .rc-slide > *, .rc-stat, .rc-hint, .rc-cta { animation: none !important; }
  .rc-cta::after { display: none; }
  .rc-overlay { transition: none; }
  .rc-slide-enter-from, .rc-slide-leave-to { filter: none; transform: none; }
}
</style>
